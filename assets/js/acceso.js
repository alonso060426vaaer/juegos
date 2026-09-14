/* ==========================================================================
   ACCESO - la puerta de entrada a los juegos

   No hay usuarios ni contrasenas: el cliente escribe el numero de su boleta
   o factura y, si esta bien escrito, pasa a jugar.

   IMPORTANTE: esto comprueba el FORMATO del comprobante (que sea un numero
   con pinta de boleta o factura de verdad), no que exista de verdad. Para
   comprobarlo contra SUNAT o contra la caja haria falta un servidor.

   Formatos que se aceptan:
     Electronico   B001-00001234   boleta    (B + 3 y hasta 8 digitos)
                   F001-00001234   factura   (F + 3 y hasta 8 digitos)
     Impreso       001-0001234     serie de 3 o 4 digitos y el correlativo
   Se admite escribirlo sin guion y en minusculas.
   ========================================================================== */

(function (global) {
  'use strict';

  var ELECTRONICO = /^([BF][A-Z0-9]{3})-?(\d{1,8})$/;
  var IMPRESO     = /^(\d{3,4})-(\d{3,8})$/;

  var autorizado = false;
  var comprobante = '';

  /**
   * Devuelve el numero ya ordenado (B001-00001234) si esta bien escrito,
   * o un texto explicando que falla.
   */
  function revisar(texto) {
    var limpio = String(texto || '').toUpperCase().replace(/\s+/g, '');

    if (!limpio) return { error: 'Escribe el número de tu boleta o factura.' };
    if (limpio.length < 5) return { error: 'Faltan números. Míralo otra vez en tu comprobante.' };

    var m = ELECTRONICO.exec(limpio);
    var tipo = null, serie = null, correlativo = null;

    if (m) {
      tipo = m[1].charAt(0) === 'B' ? 'Boleta' : 'Factura';
      serie = m[1];
      correlativo = m[2];
    } else {
      m = IMPRESO.exec(limpio);
      if (m) { tipo = 'Comprobante'; serie = m[1]; correlativo = m[2]; }
    }

    if (!tipo) {
      /* serie correcta pero correlativo demasiado largo */
      var casi = /^([BF][A-Z0-9]{3})-?(\d+)$/.exec(limpio);
      if (casi && casi[2].length > 8) {
        return { error: 'El número del comprobante tiene 8 dígitos como máximo.' };
      }
      if (/^[BF]/.test(limpio)) {
        return { error: 'Tras la letra van 3 caracteres de serie y el número. Ejemplo: B001-00001234' };
      }
      if (/^\d+$/.test(limpio)) {
        return { error: 'Falta la serie. Escríbelo con guion, así: 001-0001234' };
      }
      return { error: 'Ese número no parece una boleta ni una factura. Ejemplo: B001-00001234' };
    }

    /* Un correlativo de solo ceros no existe en ningun comprobante. */
    if (/^0+$/.test(correlativo)) {
      return { error: 'El número del comprobante no puede ser cero.' };
    }

    while (correlativo.length < 8) correlativo = '0' + correlativo;
    return { tipo: tipo, numero: serie + '-' + correlativo };
  }

  /* ------------------------- Pantalla ------------------------- */

  function pedir(alEntrar) {
    var escrito = '';

    var campo = h('div', { class: 'acceso-campo' },
      h('span', { class: 'acceso-valor' }, ''),
      h('span', { class: 'acceso-cursor' }, '')
    );
    var valor = campo.querySelector('.acceso-valor');
    var aviso = h('p', { class: 'acceso-aviso' }, 'Lo encuentras arriba a la derecha de tu comprobante');

    var entrar = h('button', {
      class: 'btn btn-primario acceso-entrar',
      onclick: function () { probar(); }
    }, 'Entrar a los juegos');

    function pintarCampo() {
      valor.textContent = escrito;
      campo.classList.toggle('vacio', !escrito);
      if (!escrito) valor.textContent = 'B001-00000000';
    }

    function escribir(caracter) {
      if (escrito.length >= 14) return;
      escrito += caracter;
      aviso.className = 'acceso-aviso';
      aviso.textContent = 'Lo encuentras arriba a la derecha de tu comprobante';
      pintarCampo();
      App.sonar('toque');
    }

    function borrar() {
      escrito = escrito.slice(0, -1);
      pintarCampo();
      App.sonar('toque');
    }

    function probar() {
      var r = revisar(escrito);
      if (r.error) {
        aviso.className = 'acceso-aviso mal';
        aviso.textContent = r.error;
        campo.classList.add('temblor');
        App.sonar('mal');
        setTimeout(function () { campo.classList.remove('temblor'); }, 400);
        return;
      }
      autorizado = true;
      comprobante = r.numero;
      aviso.className = 'acceso-aviso bien';
      aviso.textContent = r.tipo + ' ' + r.numero + ' · ¡Adelante!';
      valor.textContent = r.numero;
      App.sonar('gana');
      setTimeout(function () { alEntrar(); }, 900);
    }

    /* --- teclado en pantalla: en el totem no hay teclado fisico --- */
    var teclado = h('div', { class: 'acceso-teclado' });
    var TECLAS = ['B', 'F', '-', '1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    TECLAS.forEach(function (t) {
      if (t === '') { teclado.appendChild(h('span', {})); return; }
      var esBorrar = t === '⌫';
      var tecla = h('button', {
        class: 'acceso-tecla' + (esBorrar ? ' borrar' : '') + (/[BF-]/.test(t) ? ' letra' : ''),
        'aria-label': esBorrar ? 'Borrar' : t,
        onclick: function () { esBorrar ? borrar() : escribir(t); }
      }, t);
      teclado.appendChild(tecla);
    });

    /* Con teclado fisico (por si se prueba en un PC) */
    function tecleado(e) {
      var k = e.key;
      if (/^[0-9]$/.test(k) || /^[bBfF-]$/.test(k)) { escribir(k.toUpperCase()); e.preventDefault(); }
      else if (k === 'Backspace') { borrar(); e.preventDefault(); }
      else if (k === 'Enter') { probar(); e.preventDefault(); }
    }
    document.addEventListener('keydown', tecleado);

    var vista = h('section', { class: 'vista acceso' },
      h('div', { class: 'acceso-caja' },
        h('img', { class: 'acceso-logo', src: 'assets/img/logo.png', alt: 'Joana Bernedo Body Aesthetics' }),
        h('h1', { class: 'acceso-titulo' }, 'Zona de Juegos'),
        h('p', { class: 'acceso-lema' }, 'Escribe el número de tu boleta o factura para jugar'),
        campo,
        aviso,
        teclado,
        entrar,
        h('p', { class: 'acceso-nota' }, 'Solo sirve para entrar. No se guarda ningún dato tuyo.')
      )
    );

    App.pintar(vista, function () { document.removeEventListener('keydown', tecleado); });
    pintarCampo();
  }

  global.Acceso = {
    pedir: pedir,
    revisar: revisar,
    autorizado: function () { return autorizado; },
    comprobante: function () { return comprobante; },
    olvidar: function () { autorizado = false; comprobante = ''; }
  };

})(window);
