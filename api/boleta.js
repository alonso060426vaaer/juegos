/* ==========================================================================
   BOLETA - comprueba en Odoo que el comprobante existe y que no se uso ya

   Corre en Vercel (carpeta api/), nunca en el navegador: aqui viven la
   clave de Odoo y la de la base de datos, y este repositorio es publico.
   Todo se configura en Vercel -> Settings -> Environment Variables:

     ODOO_URL        https://test-oftalmolaser.meditech.team
     ODOO_DB         test-oftalmolaser
     ODOO_USER       usuario de Odoo (basta con que pueda LEER facturas)
     ODOO_PASSWORD   su contrasena
     DIAS_BOLETA     0 = solo boletas de hoy; 7 = de los ultimos 7 dias
     BLOB_READ_WRITE_TOKEN
                     lo pone Vercel solo al conectar el almacen Blob

   A Odoo solo se le pregunta; no se escribe nada en el. Cada boleta usada
   se anota como un archivito en Vercel Blob (boletas-usadas/B001-...).
   Blob se niega a crear un archivo que ya existe, y eso es justo lo que
   impide entrar dos veces con la misma boleta.
   ========================================================================== */

'use strict';

var blob = require('@vercel/blob');

var ELECTRONICO = /^([BF][A-Z0-9]{3})-?(\d{1,8})$/;

function responder(res, codigo, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(codigo).json(cuerpo);
}

/** B001-51569 -> B001-00051569, que es como lo guarda Odoo. */
function normalizar(texto) {
  var m = ELECTRONICO.exec(String(texto || '').toUpperCase().replace(/\s+/g, ''));
  if (!m) return null;
  var correlativo = m[2];
  while (correlativo.length < 8) correlativo = '0' + correlativo;
  return m[1] + '-' + correlativo;
}

/** Fecha de hoy en Peru (Vercel trabaja en UTC), menos `dias`, como AAAA-MM-DD. */
function fechaLima(dias) {
  var ahora = new Date(Date.now() - 5 * 3600 * 1000 - dias * 86400 * 1000);
  return ahora.toISOString().slice(0, 10);
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

async function buscarEnOdoo(numero) {
  var db = process.env.ODOO_DB, pwd = process.env.ODOO_PASSWORD;
  if (!uid) {
    uid = await odoo('common', 'login', [db, process.env.ODOO_USER, pwd]);
    if (!uid) throw new Error('Odoo rechazo el usuario o la contrasena');
  }
  /* Sin filtrar por empresa: valen las tres (ADVANCED, ADVANCED BODY y RVM). */
  return odoo('object', 'execute_kw', [db, uid, pwd, 'account.move', 'search_read',
    [[['name', '=', numero], ['move_type', '=', 'out_invoice']]],
    { fields: ['state', 'invoice_date'], limit: 5 }]);
}

/** Anota la boleta. Devuelve false si ya estaba anotada. */
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
  if (req.method !== 'POST') return responder(res, 405, { ok: false, mensaje: 'Usa POST' });

  var numero = normalizar(req.body && req.body.numero);
  if (!numero) {
    return responder(res, 200, { ok: false, motivo: 'formato',
      mensaje: 'Escribe el número de la boleta electrónica, por ejemplo B001-00001234.' });
  }

  try {
    var filas = await buscarEnOdoo(numero);
    var emitidas = filas.filter(function (f) { return f.state === 'posted'; });

    if (!emitidas.length) {
      return responder(res, 200, { ok: false, motivo: filas.length ? 'anulada' : 'no-existe',
        mensaje: filas.length
          ? 'Esa boleta no está vigente. Consulta en recepción.'
          : 'No encontramos esa boleta. Revisa el número en tu comprobante.' });
    }

    var dias = parseInt(process.env.DIAS_BOLETA || '0', 10) || 0;
    var desde = fechaLima(dias);
    var reciente = emitidas.some(function (f) { return f.invoice_date && f.invoice_date >= desde; });
    if (!reciente) {
      return responder(res, 200, { ok: false, motivo: 'antigua',
        mensaje: dias ? 'Esa boleta tiene más de ' + dias + ' días.' : 'Esa boleta no es de hoy.' });
    }

    if (!(await marcarUsada(numero))) {
      return responder(res, 200, { ok: false, motivo: 'usada',
        mensaje: 'Esta boleta ya se usó para jugar.' });
    }

    return responder(res, 200, { ok: true, numero: numero });
  } catch (e) {
    uid = null;
    console.error(e);
    return responder(res, 503, { ok: false, motivo: 'servidor',
      mensaje: 'No pudimos comprobar la boleta. Inténtalo otra vez o avisa en recepción.' });
  }
};
