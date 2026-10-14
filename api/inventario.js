/* ==========================================================================
   INVENTARIO - cuanto queda de cada premio y a quien se entrego

   Lo usa inventario.html, que tambien lo baja en Excel. Pide la clave de
   ADMIN_CLAVE (variable de Vercel) en la cabecera X-Clave.
   ========================================================================== */

'use strict';

var crypto = require('crypto');
var P = require('./_premios');

function igual(a, b) {
  var x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-Clave');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!process.env.ADMIN_CLAVE || !igual(req.headers['x-clave'], process.env.ADMIN_CLAVE)) {
    return res.status(403).json({ ok: false, mensaje: 'Clave incorrecta.' });
  }
  try {
    var inv = await P.leerInventario();
    if (!inv) return res.status(404).json({ ok: false, mensaje: 'No hay inventario cargado.' });
    return res.status(200).json(Object.assign({ ok: true }, inv.datos));
  } catch (e) {
    console.error(e);
    return res.status(503).json({ ok: false, mensaje: 'No se pudo leer el inventario.' });
  }
};
