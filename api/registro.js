/* ==========================================================================
   REGISTRO - el DNI de quien gano en la PRACTICA, antes de abrir su sobre

   En la practica se entra sin DNI, pero si llega a la meta su premio tiene
   que quedar a nombre de alguien (nadie se va sin registrar). Aqui:
     1. se busca ese DNI en Odoo, SOLO LEYENDO (no se crea ni se cambia nada);
     2. si no esta, la persona escribe sus apellidos y nombres en la pantalla
        y queda marcado "registrar en recepcion";
     3. se apunta para esta practica en Blob, y api/premio.js lo pone en la
        entrega del inventario (inventario.html).
   Un premio de practica por DNI. Al totem (publico) nunca se le devuelve
   el nombre de nadie: solo si quedo registrado.
   ========================================================================== */

'use strict';

var P = require('./_premios');
var Odoo = require('./_odoo');

function responder(res, codigo, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(codigo).json(cuerpo);
}

function variantes(dni) {
  var sinCeros = dni.replace(/^0+/, '');
  var lista = [dni, sinCeros];
  if (sinCeros.length < 8) lista.push(('00000000' + sinCeros).slice(-8));
  return lista.filter(function (v, i) { return v && lista.indexOf(v) === i; });
}

/** Contacto y ficha de paciente de ese DNI en Odoo, o null. Solo lectura. */
async function buscarEnOdoo(dni) {
  var socios = await Odoo.leer('res.partner', 'search_read',
    [[['vat', 'in', variantes(dni)]]], { fields: ['name'], limit: 1, order: 'id asc' });
  if (!socios.length) return null;
  var fichas = await Odoo.leer('hms.patient', 'search_read',
    [[['partner_id', '=', socios[0].id]]], { fields: ['code'], limit: 1 });
  return { nombre: socios[0].name, codigo: fichas.length ? fichas[0].code : '' };
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return responder(res, 405, { ok: false });

  var b = req.body || {};
  var sesion = String(b.sesion || '');
  if (!/^[a-z0-9]{16,48}$/.test(sesion)) return responder(res, 403, { ok: false, mensaje: 'Práctica no válida.' });
  var dni = String(b.dni || '').replace(/\D/g, '');
  if (dni.length < 8 || dni.length > 12) {
    return responder(res, 200, { ok: false, mensaje: 'Escribe tu DNI completo: son 8 números.' });
  }
  if (/^(\d)\1+$/.test(dni) || '0123456789'.indexOf(dni) !== -1 || '9876543210'.indexOf(dni) !== -1) {
    return responder(res, 200, { ok: false, mensaje: 'Ese DNI no es válido. Escribe tu DNI real.' });
  }
  /* "APELLIDOS NOMBRES", como los guarda Odoo: solo letras y espacios, al menos dos palabras */
  var escrito = b.nombre === undefined ? null
    : String(b.nombre).toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ ]/g, '').replace(/\s+/g, ' ').trim();
  if (escrito !== null && escrito.split(' ').length < 2) {
    return responder(res, 200, { ok: false, mensaje: 'Escribe tus apellidos y tu nombre.' });
  }

  var rutaDni = 'practica-dni/' + dni + '.json';
  var rutaSesion = 'premios-practica/' + sesion + '-registro.json';
  try {
    /* un premio de practica por DNI */
    var previo = await P.leerJson(rutaDni);
    if (previo && previo.datos.sesion !== sesion) {
      return responder(res, 200, { ok: false, mensaje: 'Este DNI ya recibió su premio de práctica.' });
    }
    if (previo) return responder(res, 200, { ok: true, registrado: true });

    var odoo = await buscarEnOdoo(dni);
    if (!odoo && !escrito) return responder(res, 200, { ok: true, falta: 'nombre' });

    var dato = { sesion: sesion, dni: dni, fecha: new Date().toISOString(),
                 nombre: odoo ? odoo.nombre : escrito, codigo: odoo ? odoo.codigo : '',
                 enOdoo: !!odoo };
    try {
      await P.guardarJson(rutaDni, dato, { allowOverwrite: false });
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
      return responder(res, 200, { ok: false, mensaje: 'Este DNI ya recibió su premio de práctica.' });
    }
    await P.guardarJson(rutaSesion, dato, { allowOverwrite: true });
    return responder(res, 200, { ok: true, registrado: true });
  } catch (e) {
    console.error(e);
    return responder(res, 503, { ok: false, mensaje: 'No pudimos registrar tu DNI. Inténtalo otra vez o avisa en recepción.' });
  }
};
