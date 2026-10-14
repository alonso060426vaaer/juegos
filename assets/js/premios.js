/* ==========================================================================
   PREMIOS - cuando un juego llega a su meta

   Los juegos llaman a premio() al cumplir el objetivo; eso solo marca que
   GANO. QUE premio se lleva no lo decide la pantalla sino el servidor
   (api/premio.js): lo sortea entre lo que queda del inventario real
   (hoja INVENTARIO_MUESTRAS de Muestras.xlsx, cargada en Vercel Blob) y lo
   descuenta. El inventario se ve y se baja en Excel desde inventario.html.
   ========================================================================== */

(function (global) {
  'use strict';

  /** Marca de partida ganada: el contenido lo pone el servidor. */
  function premio() {
    return { gano: true };
  }

  global.premio = premio;

})(window);
