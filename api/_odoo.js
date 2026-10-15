/* ==========================================================================
   ODOO - la conexion a la facturacion, comun a api/dni.js y api/premio.js

   Variables en Vercel: ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD (la
   clave de API del usuario). A Odoo solo se le pregunta; nunca se escribe.

   Fechas del evento (para no tener que tocar nada el mismo dia):
     PRUEBAS_HASTA   ultimo dia de pruebas (AAAA-MM-DD). Hasta ese dia valen
                     las compras de los ultimos DIAS_BOLETA dias.
     FECHA_EVENTO    desde el dia siguiente, SOLO valen compras de esta fecha.
   ========================================================================== */

'use strict';

var uid = null;   // se guarda mientras Vercel mantenga viva la funcion

/** Fecha de hoy en Peru (Vercel trabaja en UTC), menos `dias`, como AAAA-MM-DD. */
function fechaLima(dias) {
  var ahora = new Date(Date.now() - 5 * 3600 * 1000 - (dias || 0) * 86400 * 1000);
  return ahora.toISOString().slice(0, 10);
}

/** Todavia estamos en los dias de prueba (o no hay fecha de evento puesta). */
function enPruebas() {
  return !process.env.FECHA_EVENTO || fechaLima(0) <= (process.env.PRUEBAS_HASTA || '');
}

async function rpc(service, method, args) {
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

/** execute_kw con inicio de sesion perezoso. */
async function leer(modelo, metodo, args, opciones) {
  var db = process.env.ODOO_DB, pwd = process.env.ODOO_PASSWORD;
  try {
    if (!uid) {
      uid = await rpc('common', 'login', [db, process.env.ODOO_USER, pwd]);
      if (!uid) throw new Error('Odoo rechazo el usuario o la contrasena');
    }
    return await rpc('object', 'execute_kw', [db, uid, pwd, modelo, metodo, args, opciones || {}]);
  } catch (e) {
    uid = null;
    throw e;
  }
}

/** Nombre y documento del cliente de una boleta (para los regalos). */
async function clienteDeBoleta(boleta) {
  var m = await leer('account.move', 'search_read',
    [[['name', '=', boleta], ['move_type', '=', 'out_invoice']]],
    { fields: ['commercial_partner_id', 'invoice_date'], limit: 1 });
  if (!m.length || !m[0].commercial_partner_id) return null;
  var p = await leer('res.partner', 'read', [[m[0].commercial_partner_id[0]]], { fields: ['name', 'vat'] });
  return p.length ? { nombre: p[0].name, dni: p[0].vat || '', fecha: m[0].invoice_date } : null;
}

module.exports = { fechaLima: fechaLima, enPruebas: enPruebas, leer: leer, clienteDeBoleta: clienteDeBoleta };
