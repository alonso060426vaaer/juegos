/* ==========================================================================
   PREMIOS - lo que se gana al cumplir el objetivo de un juego

   SON EJEMPLOS: cambia esta lista por lo que de verdad quieras regalar.
   Cada premio tiene:
     icono   emoji grande que se ve en la tarjeta
     nombre  el premio, en corto
     nota    la letra pequena (condiciones, tamano de la muestra...)
   ========================================================================== */

(function (global) {
  'use strict';

  var PREMIOS = [
    { icono: '🧴', nombre: 'Sérum de vitamina C',      nota: 'Muestra de 10 ml para llevar' },
    { icono: '💆', nombre: 'Masaje relajante',          nota: '15 minutos de regalo' },
    { icono: '✨', nombre: 'Limpieza facial exprés',    nota: 'En tu próxima cita' },
    { icono: '🎁', nombre: '10 % de descuento',         nota: 'En el tratamiento que elijas' },
    { icono: '🧖', nombre: 'Mascarilla hidratante',     nota: 'Para usar en casa' },
    { icono: '💅', nombre: 'Esmaltado de manos',        nota: 'Regalo de bienvenida' },
    { icono: '🌿', nombre: 'Ritual de aromaterapia',    nota: 'Añadido a tu sesión' },
    { icono: '🫧', nombre: 'Exfoliación corporal',      nota: '20 % de descuento' },
    { icono: '🕯️', nombre: 'Vela aromática',            nota: 'Edición de la casa' },
    { icono: '💧', nombre: 'Consulta de hidratación',   nota: 'Diagnóstico sin coste' }
  ];

  /** Devuelve un premio al azar. */
  function premio() {
    return PREMIOS[Math.floor(Math.random() * PREMIOS.length)];
  }

  global.PREMIOS = PREMIOS;
  global.premio = premio;

})(window);
