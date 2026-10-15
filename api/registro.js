/* ==========================================================================
   REGISTRO - el DNI de quien gano en la PRACTICA, DESPUES de ver su premio

   Flujo: juega en practica -> sobres -> abre el suyo -> ve el premio ->
   escribe su DNI aqui. Entonces:
     1. se busca ese DNI en Odoo, SOLO LEYENDO (no se crea ni se cambia nada);
        si no esta, escribe sus apellidos y nombres y queda marcado
        "Registrar en recepcion";
     2. el premio de esa practica (su entrega en el inventario) queda con su
        DNI, nombre y codigo de paciente;
     3. si el premio es una sesion de regalo, va a la hoja del aniversario
        (Members Club), igual que en el juego con compra.
   Un premio de practica por DNI: si ese DNI ya tenia uno, este premio
   vuelve al inventario. Al totem (publico) nunca se le devuelve el nombre
   de nadie.
   ========================================================================== */

'use strict';

var P = require('./_premios');
var Odoo = require('./_odoo');
var aLaHoja = require('./premio').aLaHoja;

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

/** Cambia la entrega de esta practica en el inventario (con reintento si choca). */
async function tocarEntrega(sesion, cambio) {
  for (var intento = 0; intento < 8; intento++) {
    var inv = await P.leerInventario();
    var e = (inv.datos.entregas || []).filter(function (x) { return x.sesion === sesion; }).pop();
    if (!e) return null;
    var item = inv.datos.items.filter(function (i) { return i.id === e.id; })[0] || null;
    cambio(e, item);
    if (await P.guardarInventario(inv.datos, inv.etag)) return { entrega: e, item: item };
  }
  throw new Error('El inventario estuvo ocupado demasiadas veces');
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
    /* primero tiene que haber abierto su sobre */
    var sobre = await P.leerJson('premios-practica/' + sesion + '.json');
    if (!sobre || sobre.datos.estado !== 'entregado' || !sobre.datos.id) {
      return responder(res, 200, { ok: false, mensaje: 'Primero abre tu sobre.' });
    }
    var hecho = await P.leerJson(rutaSesion);
    if (hecho) return responder(res, 200, hecho.datos.devuelto
      ? { ok: false, devuelto: true, mensaje: 'Este DNI ya recibió su premio de práctica.' }
      : { ok: true, registrado: true });

    /* un premio de practica por DNI: si ya tenia uno, este vuelve al inventario */
    var previo = await P.leerJson(rutaDni);
    if (previo && previo.datos.sesion !== sesion) {
      await tocarEntrega(sesion, function (e, item) {
        if (e.anulada) return;
        e.anulada = 'el DNI ' + dni + ' ya tenía premio de práctica';
        if (item) item.cantidad += 1;
      });
      await P.guardarJson(rutaSesion, { devuelto: true, dni: dni, fecha: new Date().toISOString() }, { allowOverwrite: true });
      return responder(res, 200, { ok: false, devuelto: true,
        mensaje: 'Este DNI ya recibió su premio de práctica. Este premio vuelve al sorteo.' });
    }

    var odoo = await buscarEnOdoo(dni);
    if (!odoo && !escrito) return responder(res, 200, { ok: true, falta: 'nombre' });

    var dato = { sesion: sesion, dni: dni, fecha: new Date().toISOString(),
                 nombre: odoo ? odoo.nombre : escrito, codigo: odoo ? odoo.codigo : '', enOdoo: !!odoo };
    try {
      await P.guardarJson(rutaDni, dato, { allowOverwrite: false });
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
      return responder(res, 200, { ok: false, mensaje: 'Este DNI ya recibió su premio de práctica.' });
    }

    /* el premio de esta practica queda a su nombre */
    var t = await tocarEntrega(sesion, function (e) {
      e.dni = dni; e.nombre = dato.nombre;
      if (dato.codigo) e.paciente = dato.codigo;
      if (!dato.enOdoo) e.registrar = true;
    });

    /* sesion de regalo: tambien a su hoja del aniversario */
    if (t && t.item && t.item.especial) {
      var hoja = await aLaHoja({ dni: dni }, t.item, sobre.datos.juego);
      await tocarEntrega(sesion, function (e) { e.hoja = hoja; });
    }

    await P.guardarJson(rutaSesion, dato, { allowOverwrite: true });
    return responder(res, 200, { ok: true, registrado: true });
  } catch (e) {
    console.error(e);
    return responder(res, 503, { ok: false, mensaje: 'No pudimos registrar tu DNI. Inténtalo otra vez o avisa en recepción.' });
  }
};
