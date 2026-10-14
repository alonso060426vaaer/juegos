/* ==========================================================================
   PREMIO - sortea el premio de un turno ganado y lo descuenta del inventario

   Lo pide la pantalla cuando el cliente llega a la meta. Trae el turno que
   le dio api/dni.js; sin turno valido no hay premio. Un turno, un premio:
   la primera llamada lo sortea y lo guarda en premios-entregados/<boleta>,
   y si la pantalla vuelve a preguntar (se recargo, se corto la red) se le
   devuelve el mismo, sin sortear ni descontar otra vez.

   Devuelve cuantos sobres ensenar: tantos como premios distintos queden,
   hasta 3. Si se acabo todo, premio:null y no hay sobres.
   ========================================================================== */

'use strict';

var P = require('./_premios');

function responder(res, codigo, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(codigo).json(cuerpo);
}

async function sortearYDescontar(boleta) {
  for (var intento = 0; intento < 8; intento++) {
    var inv = await P.leerInventario();
    if (!inv) throw new Error('No hay inventario de premios cargado');
    var items = inv.datos.items;

    var quedan = items.filter(function (i) { return i.cantidad > 0; });
    var sobres = Math.min(3, quedan.length);
    var ganado = P.sortear(items);
    if (!ganado) return { premio: null, otros: [], sobres: 0 };

    ganado.cantidad -= 1;
    inv.datos.entregas = inv.datos.entregas || [];
    inv.datos.entregas.push({ fecha: new Date().toISOString(), boleta: boleta,
                              id: ganado.id, producto: ganado.servicio || ganado.producto });
    inv.datos.actualizado = new Date().toISOString();

    if (await P.guardarInventario(inv.datos, inv.etag)) {
      var otros = P.mezclar(quedan.filter(function (i) { return i.id !== ganado.id; }))
        .slice(0, sobres - 1).map(P.publico);
      return { premio: P.publico(ganado), otros: otros, sobres: sobres };
    }
    /* otro totem escribio a la vez: se vuelve a leer y se sortea de nuevo */
  }
  throw new Error('El inventario estuvo ocupado demasiadas veces');
}

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return responder(res, 405, { ok: false });

  var boleta = P.verificar(req.body && req.body.turno);
  if (!boleta) return responder(res, 403, { ok: false, mensaje: 'Turno no válido.' });

  var ruta = 'premios-entregados/' + boleta + '.json';
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

    var resultado = await sortearYDescontar(boleta);
    await P.guardarJson(ruta, { estado: 'entregado', fecha: new Date().toISOString(), resultado: resultado },
                        { allowOverwrite: true });
    return responder(res, 200, Object.assign({ ok: true }, resultado));
  } catch (e) {
    console.error(e);
    return responder(res, 503, { ok: false, mensaje: 'No pudimos preparar tus sobres. Avisa en recepción.' });
  }
};
