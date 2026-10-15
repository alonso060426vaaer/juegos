/* ==========================================================================
   PREMIOS - lo comun a api/dni.js, api/premio.js y api/inventario.js

   El inventario vive en Vercel Blob como premios/inventario.json. Salio de
   la hoja INVENTARIO_MUESTRAS de Muestras.xlsx y cada premio entregado se
   descuenta ahi mismo. Para que dos totems no descuenten a la vez sobre la
   misma cuenta, se guarda con ifMatch: si otro escribio entre medias, se
   vuelve a leer y se repite.

   Variables en Vercel:
     TURNO_SECRETO   firma el turno que da api/dni.js (sin el, no hay premio)
     ADMIN_CLAVE     para ver el inventario en inventario.html
     PROB_ESPECIAL   probabilidad de CADA sesion de regalo el dia del evento
     PROB_PRUEBAS    la misma, en los dias de prueba (hasta PRUEBAS_HASTA)
   ========================================================================== */

'use strict';

var crypto = require('crypto');
var blob = require('@vercel/blob');

/* INVENTARIO_RUTA solo se cambia para probar sobre una copia */
var RUTA_INVENTARIO = process.env.INVENTARIO_RUTA || 'premios/inventario.json';

/* ---- turno: prueba de que este DNI gasto esta compra ahora mismo ---- */

function firmar(boleta) {
  var firma = crypto.createHmac('sha256', process.env.TURNO_SECRETO || '')
    .update(boleta).digest('hex').slice(0, 32);
  return boleta + '.' + firma;
}

/** Devuelve el numero de la boleta si el turno es autentico, o null. */
function verificar(turno) {
  var m = /^([A-Z0-9-]+)\.([0-9a-f]{32})$/.exec(String(turno || ''));
  if (!m || !process.env.TURNO_SECRETO) return null;
  var esperado = firmar(m[1]).split('.')[1];
  var a = Buffer.from(m[2]), b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? m[1] : null;
}

/* ---- inventario ---- */

async function leerJson(ruta) {
  var r = await blob.get(ruta, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  var texto = await new Response(r.stream).text();
  /* Los archivos grandes llegan comprimidos y su etag viene "debil"
     (W/"..."): con ese prefijo, ifMatch no coincide nunca. */
  return { datos: JSON.parse(texto), etag: String(r.blob.etag || '').replace(/^W\//, '') };
}

async function guardarJson(ruta, datos, opciones) {
  return blob.put(ruta, JSON.stringify(datos), Object.assign({
    access: 'private', addRandomSuffix: false, contentType: 'application/json'
  }, opciones));
}

function leerInventario() { return leerJson(RUTA_INVENTARIO); }

/** Guarda solo si nadie lo cambio desde que se leyo. False si hubo choque. */
async function guardarInventario(datos, etag) {
  try {
    await guardarJson(RUTA_INVENTARIO, datos, { ifMatch: etag });
    return true;
  } catch (e) {
    if (e instanceof blob.BlobPreconditionFailedError || /precondition/i.test(e.message)) return false;
    throw e;
  }
}

/* ---- sorteo ---- */

/** Numero al azar en [0, 1) con el generador seguro del servidor. */
function azar() { return crypto.randomInt(0, 1e9) / 1e9; }

/**
 * Elige el premio entre los que quedan. Cada premio especial (los caros,
 * premio:true) sale con PROB_ESPECIAL; si no toca ninguno, sale uno normal
 * con mas probabilidad cuanto mas stock tenga, para que se gasten parejos.
 */
function sortear(items) {
  var quedan = items.filter(function (i) { return i.cantidad > 0; });
  /* en los dias de prueba salen mas, para poder verlos; el dia del evento, casi nunca */
  var prob = parseFloat(require('./_odoo').enPruebas()
    ? (process.env.PROB_PRUEBAS || process.env.PROB_ESPECIAL || '0.01')
    : (process.env.PROB_ESPECIAL || '0.0005'));
  var especiales = quedan.filter(function (i) { return i.especial; });
  for (var e = 0; e < especiales.length; e++) {
    if (azar() < prob) return especiales[e];
  }
  var normales = quedan.filter(function (i) { return !i.especial; });
  var total = normales.reduce(function (s, i) { return s + i.cantidad; }, 0);
  if (!total) return null;
  var tiro = azar() * total;
  for (var n = 0; n < normales.length; n++) {
    tiro -= normales[n].cantidad;
    if (tiro < 0) return normales[n];
  }
  return normales[normales.length - 1];
}

/** Lo que se le ensena al cliente de un premio (sin cantidades). */
function publico(i) {
  return i && { id: i.id, producto: i.producto, marca: i.marca, presentacion: i.presentacion,
                foto: i.foto || null, especial: !!i.especial, servicio: i.servicio || null };
}

function mezclar(lista) {
  var a = lista.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = crypto.randomInt(0, i + 1);
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

module.exports = {
  firmar: firmar, verificar: verificar,
  leerJson: leerJson, guardarJson: guardarJson,
  leerInventario: leerInventario, guardarInventario: guardarInventario,
  sortear: sortear, publico: publico, mezclar: mezclar
};
