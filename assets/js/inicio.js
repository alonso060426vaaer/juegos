/* ==========================================================================
   ARRANQUE - se ejecuta al final, cuando todos los juegos ya se registraron
   ========================================================================== */

(function () {
  'use strict';

  function arrancar() {
    App.iniciar();

    /* En el tótem conviene pantalla completa. Antes se pedía UNA sola vez:
       si el navegador lo rechazaba o alguien salía con Escape, ya no volvía a
       intentarse y quedaban a la vista las pestañas y la barra de título, que
       es justo lo que la gente toca sin querer. Ahora lo lleva el núcleo y lo
       reintenta en cada toque hasta conseguirlo. */
    App.pantallaCompleta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

})();
