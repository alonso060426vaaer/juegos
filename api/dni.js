/* ==========================================================================
   DNI - comprueba en Odoo que ese DNI hizo una compra y que no la gasto ya

   Corre en Vercel (carpeta api/), nunca en el navegador: aqui viven la
   clave de Odoo y la de la base de datos, y este repositorio es publico.
   Todo se configura en Vercel -> Settings -> Environment Variables:

     ODOO_URL        https://test-oftalmolaser.meditech.team
     ODOO_DB         test-oftalmolaser
     ODOO_USER       usuario de Odoo (basta con que pueda LEER facturas)
     ODOO_PASSWORD   su contrasena
     DIAS_BOLETA     0 = solo compras de hoy; 7 = de los ultimos 7 dias
     BLOB_READ_WRITE_TOKEN
                     lo pone Vercel solo al conectar el almacen Blob

   Se buscan las boletas y facturas emitidas a ese DNI (el documento del
   cliente en Odoo), en cualquiera de las tres empresas. CADA COMPRA ES UNA
   OPORTUNIDAD: al entrar se gasta la compra mas antigua que quede libre.
   Las gastadas se anotan como un archivito en Vercel Blob
   (boletas-usadas/B001-...), y Blob se niega a crear uno que ya existe:
   eso impide entrar dos veces con la misma compra. El DNI no se guarda.
   A Odoo solo se le pregunta; no se escribe nada en el.
   ========================================================================== */

'use strict';

var blob = require('@vercel/blob');
var firmar = require('./_premios').firmar;

function responder(res, codigo, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(codigo).json(cuerpo);
}

/** Fecha de hoy en Peru (Vercel trabaja en UTC), menos `dias`, como AAAA-MM-DD. */
function fechaLima(dias) {
  var ahora = new Date(Date.now() - 5 * 3600 * 1000 - dias * 86400 * 1000);
  return ahora.toISOString().slice(0, 10);
}

/* Como puede estar guardado en Odoo: tal cual, sin los ceros de delante
   (hay DNIs de 7 cifras a los que se les comio el 0) o con ellos. */
function variantes(dni) {
  var sinCeros = dni.replace(/^0+/, '');
  var lista = [dni, sinCeros];
  if (sinCeros.length < 8) lista.push(('00000000' + sinCeros).slice(-8));
  return lista.filter(function (v, i) { return v && lista.indexOf(v) === i; });
}

async function odoo(service, method, args) {
  var r = await fetch(process.env.ODOO_URL.replace(/\/+$/, '') + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call',
                           params: { service: service, method: method, args: args } })
  });
  var datos = await r.json();
  if (datos.error) throw new Error('Odoo: ' + (datos.error.data && datos.error.data.message || datos.error.message));
  return datos.result;
}

var uid = null;   // se guarda mientras Vercel mantenga viva la funcion

/** Compras vigentes de ese DNI desde `desde` (o de cualquier fecha si es null). */
async function comprasDe(dni, desde) {
  var db = process.env.ODOO_DB, pwd = process.env.ODOO_PASSWORD;
  if (!uid) {
    uid = await odoo('common', 'login', [db, process.env.ODOO_USER, pwd]);
    if (!uid) throw new Error('Odoo rechazo el usuario o la contrasena');
  }
  /* 'reversed' = anulada con nota de credito: sigue emitida pero no vale.
     Sin filtrar por empresa: valen las tres (ADVANCED, ADVANCED BODY y RVM). */
  var dominio = [
    ['move_type', '=', 'out_invoice'],
    ['state', '=', 'posted'],
    ['payment_state', '!=', 'reversed'],
    ['commercial_partner_id.vat', 'in', variantes(dni)]
  ];
  if (desde) dominio.push(['invoice_date', '>=', desde]);
  return odoo('object', 'execute_kw', [db, uid, pwd, 'account.move', 'search_read',
    [dominio], { fields: ['name'], order: 'invoice_date asc, id asc', limit: 30 }]);
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
    var dias = parseInt(process.env.DIAS_BOLETA || '0', 10) || 0;
    var compras = await comprasDe(dni, fechaLima(dias));

    if (!compras.length) {
      var antes = await comprasDe(dni, null);
      return responder(res, 200, { ok: false, motivo: antes.length ? 'antigua' : 'sin-compra',
        mensaje: antes.length
          ? (dias ? 'No encontramos compras de los últimos ' + dias + ' días con ese DNI.'
                  : 'No encontramos compras de hoy con ese DNI.')
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
    uid = null;
    console.error(e);
    return responder(res, 503, { ok: false, motivo: 'servidor',
      mensaje: 'No pudimos comprobar tu compra. Inténtalo otra vez o avisa en recepción.' });
  }
};
