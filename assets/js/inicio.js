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
    precargar();
  }

  /* Las fotos mas pesadas de cada juego se piden en segundo plano mientras
     el cliente mira el menu: asi la primera partida no da tirones cargando. */
  function precargar() {
    var fotos = [
      'patos/playa.jpg', 'patos/doctora-cuerpo.png', 'patos/perro.png', 'patos/palmera.png',
      'patos/pelota.png', 'patos/billete.png', 'patos/sombrilla.png', 'patos/sol.png',
      'saltos/ciudad.png', 'saltos/doctora-cuerpo.png', 'saltos/arbol-1.png', 'saltos/arbol-2.png',
      'saltos/nube-1.png', 'saltos/nube-2.png', 'saltos/nube-3.png',
      'saltos/plataforma-1.png', 'saltos/plataforma-2.png', 'saltos/plataforma-3.png', 'saltos/plataforma-4.png',
      'ladrillos/fondo.png', 'ladrillos/pala.png', 'ladrillos/bola.png',
      'trivia/fondo.jpg', 'mitos/fondo-1.png', 'mitos/avatar.png',
      'memoria/carta-frente.png', 'memoria/carta-marco.png',
      'flappy/avion-doctores.png', 'flappy/fondo.jpg', 'flappy/suelo.jpg'
    ];
    var i = 0;
    function siguiente() {
      if (i >= fotos.length) return;
      var im = new Image();
      im.onload = im.onerror = function () { setTimeout(siguiente, 60); };
      im.src = 'assets/img/' + fotos[i++];
    }
    setTimeout(siguiente, 1200);           // despues de que el menu ya este pintado
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

})();
