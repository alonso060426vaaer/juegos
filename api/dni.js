/* ==========================================================================
   DNI - comprueba en Odoo que ese DNI hizo una compra y que no la gasto ya

   Corre en Vercel (carpeta api/), nunca en el navegador: aqui viven la
   clave de Odoo y la de la base de datos, y este repositorio es publico.
   La conexion y las fechas estan en _odoo.js; las variables, en Vercel ->
   Settings -> Environment Variables (ODOO_*, DIAS_BOLETA, PRUEBAS_HASTA,
   FECHA_EVENTO y BLOB_READ_WRITE_TOKEN, que la pone Vercel solo).

   Que compras valen:
     - en dias de prueba (hasta PRUEBAS_HASTA): las de los ultimos
       DIAS_BOLETA dias (0 = solo de hoy);
     - despues: SOLO las del dia del evento, FECHA_EVENTO.

   Se buscan las boletas y facturas emitidas a ese DNI (el documento del
   cliente en Odoo). CADA COMPRA ES UNA OPORTUNIDAD: al entrar se gasta la
   compra mas antigua que quede libre. Las gastadas se anotan como un
   archivito en Vercel Blob (boletas-usadas/BE01-...), y Blob se niega a
   crear uno que ya existe: eso impide entrar dos veces con la misma compra.
   A Odoo solo se le pregunta; no se escribe nada en el.
   ========================================================================== */

'use strict';

var blob = require('@vercel/blob');
var firmar = require('./_premios').firmar;
var Odoo = require('./_odoo');

function responder(res, codigo, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(codigo).json(cuerpo);
}

/* Como puede estar guardado en Odoo: tal cual, sin los ceros de delante
   (hay DNIs de 7 cifras a los que se les comio el 0) o con ellos. */
function variantes(dni) {
  var sinCeros = dni.replace(/^0+/, '');
  var lista = [dni, sinCeros];
  if (sinCeros.length < 8) lista.push(('00000000' + sinCeros).slice(-8));
  return lista.filter(function (v, i) { return v && lista.indexOf(v) === i; });
}

/** Compras vigentes de ese DNI. `fechas`: {desde} o {dia}; null = cualquier fecha. */
function comprasDe(dni, fechas) {
  /* 'reversed' = anulada con nota de credito: sigue emitida pero no vale. */
  var dominio = [
    ['move_type', '=', 'out_invoice'],
    ['state', '=', 'posted'],
    ['payment_state', '!=', 'reversed'],
    ['commercial_partner_id.vat', 'in', variantes(dni)]
  ];
  if (fechas && fechas.dia) dominio.push(['invoice_date', '=', fechas.dia]);
  if (fechas && fechas.desde) dominio.push(['invoice_date', '>=', fechas.desde]);
  return Odoo.leer('account.move', 'search_read', [dominio],
    { fields: ['name'], order: 'invoice_date asc, id asc', limit: 30 });
}

/** Anota la compra como gastada. Devuelve false si ya lo estaba. */
async function marcarUsada(numero) {
  try {
    await blob.put('boletas-usadas/' + numero + '.txt', new Date().toISOString(), {
      access: 'private', addRandomSuffix: false, allowOverwrite: false
    });
    return true;
  } catch (e) {
    if (/already exists/i.test(e.message)) return false;
    throw e;
  }
}

/* 2026-10-16 -> "16 de octubre" */
function fechaBonita(iso) {
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var p = iso.split('-');
  return parseInt(p[2], 10) + ' de ' + MESES[parseInt(p[1], 10) - 1];
}

module.exports = async function (req, res) {
  /* La pantalla tambien se abre desde XAMPP o el totem, que son otra
     direccion: el navegador solo deja llamar aqui si se le da permiso. */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return responder(res, 405, { ok: false, mensaje: 'Usa POST' });

  var dni = String((req.body && req.body.dni) || '').replace(/\D/g, '');
  if (dni.length < 8 || dni.length > 12) {
    return responder(res, 200, { ok: false, motivo: 'formato',
      mensaje: 'Escribe tu DNI completo: son 8 números.' });
  }
  /* Cuando no se registra al cliente, caja pone un DNI de relleno
     (11111111, 00000000...). Esos no son de nadie: no dejan jugar. */
  if (/^(\d)\1+$/.test(dni) || '0123456789'.indexOf(dni) !== -1 || '9876543210'.indexOf(dni) !== -1) {
    return responder(res, 200, { ok: false, motivo: 'generico',
      mensaje: 'Ese DNI no es válido. Escribe tu DNI real.' });
  }

  try {
    var pruebas = Odoo.enPruebas();
    var dias = parseInt(process.env.DIAS_BOLETA || '0', 10) || 0;
    var fechas = pruebas ? { desde: Odoo.fechaLima(dias) } : { dia: process.env.FECHA_EVENTO };
    var compras = await comprasDe(dni, fechas);

    if (!compras.length) {
      var antes = await comprasDe(dni, null);
      var cuando = !pruebas ? 'del ' + fechaBonita(process.env.FECHA_EVENTO)
                 : dias ? 'de los últimos ' + dias + ' días' : 'de hoy';
      return responder(res, 200, { ok: false, motivo: antes.length ? 'antigua' : 'sin-compra',
        mensaje: antes.length
          ? 'No encontramos compras ' + cuando + ' con ese DNI.'
          : 'No encontramos compras con ese DNI. Consulta en recepción.' });
    }

    for (var i = 0; i < compras.length; i++) {
      if (await marcarUsada(compras[i].name)) {
        /* el turno firmado es lo que luego permite pedir el premio */
        return responder(res, 200, { ok: true, quedan: compras.length - i - 1,
                                     turno: firmar(compras[i].name) });
      }
    }

    return responder(res, 200, { ok: false, motivo: 'usada',
      mensaje: compras.length > 1
        ? 'Ya usaste las ' + compras.length + ' oportunidades de tus compras.'
        : 'Este DNI ya usó su oportunidad de jugar.' });
  } catch (e) {
    console.error(e);
    return responder(res, 503, { ok: false, motivo: 'servidor',
      mensaje: 'No pudimos comprobar tu compra. Inténtalo otra vez o avisa en recepción.' });
  }
};
