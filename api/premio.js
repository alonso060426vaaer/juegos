/* ==========================================================================
   PREMIO - sortea el premio de un turno ganado y lo descuenta del inventario

   Lo pide la pantalla cuando el cliente llega a la meta. Trae el turno que
   le dio api/dni.js; sin turno valido no hay premio. Un turno, un premio:
   la primera llamada lo sortea y lo guarda en premios-entregados/<boleta>,
   y si la pantalla vuelve a preguntar (se recargo, se corto la red) se le
   devuelve el mismo, sin sortear ni descontar otra vez.

   Devuelve cuantos sobres ensenar: tantos como premios distintos queden,
   hasta 3. Si se acabo todo, premio:null y no hay sobres.

   A LA HOJA DEL ANIVERSARIO: el premio ganado se manda al Members Club
   (oftalmolaser.com.pe/aniversario, accion premioJuego) con el DNI de la
   boleta, y sale en la hoja de impresion de su compra pagada de hoy.
   Variables: ANIVERSARIO_URL (su api/index.php) y PREMIOS_A_HOJA
   ("todos" o "tratamientos"). Si el Members Club no responde, el premio
   se entrega igual y queda apuntado el motivo para recepcion.

   PRACTICA: con {practica:true, sesion} (sin DNI) se sortea solo entre
   los premios practica:true del inventario, uno por sesion, sin Odoo ni
   hoja. La entrega queda como boleta "PRÁCTICA".
   ========================================================================== */

'use strict';

var P = require('./_premios');
var Odoo = require('./_odoo');

function responder(res, codigo, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(codigo).json(cuerpo);
}

/* `practica` (el codigo de la practica, o null): entran los premios
   practica:true (bolsa ecologica y sachets) y las sesiones de regalo, estas
   con la probabilidad propia de la practica (P.probPractica). */
async function sortearYDescontar(boleta, cliente, practica, juego) {
  for (var intento = 0; intento < 8; intento++) {
    var inv = await P.leerInventario();
    if (!inv) throw new Error('No hay inventario de premios cargado');
    var items = inv.datos.items;
    var posibles = practica
      ? items.filter(function (i) { return i.especial || i.practica; })
      : items;

    var quedan = posibles.filter(function (i) { return i.cantidad > 0; });
    var sobres = Math.min(3, quedan.length);
    var ganado = practica ? P.sortear(posibles, P.probPractica()) : P.sortear(posibles);
    if (!ganado) return { resultado: { premio: null, otros: [], sobres: 0 }, ganado: null };

    ganado.cantidad -= 1;
    inv.datos.entregas = inv.datos.entregas || [];
    var entrega = { fecha: new Date().toISOString(), boleta: boleta, id: ganado.id,
                    producto: ganado.servicio || ganado.producto,
                    tipo: ganado.especial ? 'tratamiento' : practica ? 'practica' : 'producto' };
    if (practica) { entrega.practica = true; entrega.sesion = practica; }
    if (juego) entrega.juego = String(juego).slice(0, 60);
    if (cliente) { entrega.dni = cliente.dni; entrega.nombre = cliente.nombre; }
    if (cliente && cliente.codigo) entrega.paciente = cliente.codigo;
    if (cliente && cliente.enOdoo === false) entrega.registrar = true;   // no esta en Odoo: recepcion lo registra
    inv.datos.entregas.push(entrega);
    inv.datos.actualizado = new Date().toISOString();

    if (await P.guardarInventario(inv.datos, inv.etag)) {
      var otros = P.mezclar(quedan.filter(function (i) { return i.id !== ganado.id; }))
        .slice(0, sobres - 1).map(P.publico);
      return { resultado: { premio: P.publico(ganado), otros: otros, sobres: sobres }, ganado: ganado };
    }
    /* otro totem escribio a la vez: se vuelve a leer y se sortea de nuevo */
  }
  throw new Error('El inventario estuvo ocupado demasiadas veces');
}

/** Manda el premio a la hoja del Members Club. Devuelve "ok" o el motivo. */
/* `practica`: el premio salio en el juego de prueba (otra oportunidad del
   paciente). En la hoja se lee "PREMIO DEL JUEGO: <nombre> (JUEGO DE PRUEBA)". */
async function aLaHoja(cliente, ganado, juego, practica) {
  var url = process.env.ANIVERSARIO_URL;
  if (!url) return 'sin conexión configurada';
  if (!ganado.especial && (process.env.PREMIOS_A_HOJA || 'todos') === 'tratamientos') return 'no va a la hoja';
  if (!cliente || !cliente.dni) return 'la boleta no tiene DNI';
  var nombre = (ganado.servicio || ganado.producto) + (!ganado.especial && ganado.presentacion ? ' · ' + ganado.presentacion : '');
  if (practica) {
    nombre = nombre.slice(0, 80 - ' (juego de prueba)'.length) + ' (juego de prueba)';
    juego = 'de prueba';             // corto: en la hoja la linea de detalle no da para mas
  }
  var corte = new AbortController();
  var reloj = setTimeout(function () { corte.abort(); }, 7000);
  try {
    var r = await fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'accion=premioJuego', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni: cliente.dni, premio: nombre.slice(0, 80),
                             nota: ganado.especial ? 'Sesión de regalo' : '', juego: String(juego || '').slice(0, 60) }),
      signal: corte.signal
    });
    var j = await r.json();
    return j.ok ? 'ok' : (j.error || 'error ' + r.status);
  } catch (e) {
    return 'el Members Club no respondió';
  } finally {
    clearTimeout(reloj);
  }
}

/** Apunta en la entrega si llego o no a la hoja (para verlo en inventario.html). */
async function anotarHoja(boleta, estado) {
  for (var intento = 0; intento < 6; intento++) {
    var inv = await P.leerInventario();
    var e = (inv.datos.entregas || []).filter(function (x) { return x.boleta === boleta; }).pop();
    if (!e) return;
    e.hoja = estado;
    if (await P.guardarInventario(inv.datos, inv.etag)) return;
  }
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return responder(res, 405, { ok: false });

  /* PRACTICA (se entra tocando el logo, sin DNI): tambien da premio de
     verdad (bolsa ecologica, sachets y, muy rara vez, una sesion de regalo)
     y uno por practica: cada practica trae su propio codigo, que es su
     candado. El DNI se registra despues de ver el premio (api/registro.js). */
  var practica = !!(req.body && req.body.practica);
  var boleta, ruta;
  if (practica) {
    var sesion = String(req.body.sesion || '');
    if (!/^[a-z0-9]{16,48}$/.test(sesion)) return responder(res, 403, { ok: false, mensaje: 'Práctica no válida.' });
    boleta = 'PRÁCTICA';
    ruta = 'premios-practica/' + sesion + '.json';
  } else {
    boleta = P.verificar(req.body && req.body.turno);
    if (!boleta) return responder(res, 403, { ok: false, mensaje: 'Turno no válido.' });
    ruta = 'premios-entregados/' + boleta + '.json';
  }
  try {
    /* El candado: solo la primera llamada de este turno pasa de aqui. */
    try {
      await P.guardarJson(ruta, { estado: 'sorteando', fecha: new Date().toISOString() },
                          { allowOverwrite: false });
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
      var previo = await P.leerJson(ruta);
      var d = previo && previo.datos;
      if (d && d.estado === 'entregado') return responder(res, 200, Object.assign({ ok: true }, d.resultado));
      /* se quedo a medias hace rato (se corto a mitad): se sortea otra vez */
      if (!d || Date.now() - Date.parse(d.fecha) < 30000) {
        return responder(res, 409, { ok: false, mensaje: 'Tu premio se está preparando.' });
      }
    }

    /* Quien es: su DNI y su nombre, sacados de Odoo con la boleta. Si Odoo
       no responde, el premio se entrega igual. */
    /* (en la practica el DNI se pide DESPUES de ver el premio: api/registro.js) */
    var cliente = null;
    if (!practica) {
      try { cliente = await Odoo.clienteDeBoleta(boleta); } catch (e) { console.error(e); }
    }

    var s = await sortearYDescontar(boleta, cliente, practica ? sesion : null, req.body && req.body.juego);
    await P.guardarJson(ruta, { estado: 'entregado', fecha: new Date().toISOString(), resultado: s.resultado,
                                id: s.ganado && s.ganado.id, juego: String((req.body && req.body.juego) || '').slice(0, 60) },
                        { allowOverwrite: true });

    if (s.ganado && !practica) {
      var hoja = await aLaHoja(cliente, s.ganado, req.body && req.body.juego);
      try { await anotarHoja(boleta, hoja); } catch (e) { console.error(e); }
    }
    return responder(res, 200, Object.assign({ ok: true }, s.resultado));
  } catch (e) {
    console.error(e);
    return responder(res, 503, { ok: false, mensaje: 'No pudimos preparar tus sobres. Avisa en recepción.' });
  }
};

/* para probar la conexion con la hoja sin sortear nada, y para registro.js */
module.exports.aLaHoja = aLaHoja;
