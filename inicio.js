/* ==========================================================================
   ARRANQUE - se ejecuta al final, cuando todos los juegos ya se registraron
   ========================================================================== */

(function () {
  'use strict';

  function arrancar() {
    App.iniciar();

    /* En el tótem conviene pantalla completa: se activa con el primer toque
       (los navegadores no permiten hacerlo sin una interacción del usuario). */
    var yaPedido = false;
    document.addEventListener('pointerdown', function () {
      if (yaPedido) return;
      yaPedido = true;
      var raiz = document.documentElement;
      var pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
      if (pedir) { try { pedir.call(raiz); } catch (e) { /* el navegador lo rechazó */ } }
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

})();
