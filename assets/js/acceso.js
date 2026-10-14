/* ==========================================================================
   ACCESO - la puerta de entrada a los juegos

   No hay usuarios ni contrasenas: el cliente escribe el numero de su boleta
   o factura y, si esta bien escrito, pasa a jugar.

   Aqui se revisa el FORMATO. Despues, en Vercel, api/boleta.js comprueba
   en Odoo que el comprobante exista, este emitido y sea reciente, y lo
   anota para que no sirva dos veces. Sin esa respuesta no se entra.

   Formatos que se aceptan:
     Electronico   B001-00001234   boleta    (B + 3 y hasta 8 digitos)
                   F001-00001234   factura   (F + 3 y hasta 8 digitos)
     Impreso       001-0001234     serie de 3 o 4 digitos y el correlativo
   Se admite escribirlo sin guion y en minusculas.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     Dibujos de la pantalla. Van en SVG y no como fotos: se ven
     nitidos en la pantalla grande del totem, pesan cuatro lineas y
     toman el color de donde esten, asi que siguen al tema sin tener
     que reexportar nada.
     --------------------------------------------------------------- */
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';

  var ICO_BOLETA = SVG + '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>' +
                   '<path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 16.5h4"/></svg>';
  var ICO_PISTA  = SVG + '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5"/>' +
                   '<circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none"/></svg>';
  var ICO_SELLO  = SVG + '<path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6z"/>' +
                   '<path d="M9 12.2l2.1 2.1L15.4 10"/></svg>';
  var ICO_FLECHA = SVG + '<path d="M5 12h13"/><path d="M12.5 6l6 6-6 6"/></svg>';
  var ICO_BORRAR = SVG + '<path d="M8.6 5h10.4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8.6L2.2 12z"/>' +
                   '<path d="M12.2 9.6l4.8 4.8"/><path d="M17 9.6l-4.8 4.8"/></svg>';

  /* Las sedas del fondo: cintas doradas por dos esquinas, como en la
     papeleria de la clinica. Van detras de la tarjeta y no se tocan. */
  var SEDA =
    '<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="seda-a" x1="0" y1="1" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#EFE2C7"/><stop offset=".55" stop-color="#D9BE8B"/>' +
    '<stop offset="1" stop-color="#F6EEDD"/></linearGradient>' +
    '<linearGradient id="seda-b" x1="1" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#F3E8D3"/><stop offset=".5" stop-color="#CFAE78"/>' +
    '<stop offset="1" stop-color="#F7F1E4"/></linearGradient>' +
    '</defs>' +
    '<g opacity=".55">' +
    '<path d="M-60 300 C 120 280 250 160 310 -40 L 500 -40 C 420 180 250 360 -60 400 Z" fill="url(#seda-a)"/>' +
    '<path d="M-60 170 C 60 160 150 90 190 -40 L 265 -40 C 215 110 110 230 -60 250 Z" fill="url(#seda-b)" opacity=".8"/>' +
    '<path d="M1260 500 C 1080 520 950 640 890 840 L 700 840 C 780 620 950 440 1260 400 Z" fill="url(#seda-a)"/>' +
    '<path d="M1260 630 C 1140 640 1050 710 1010 840 L 935 840 C 985 690 1090 570 1260 550 Z" fill="url(#seda-b)" opacity=".8"/>' +
    '</g>' +
    '<g fill="none" stroke="#C9A96E" stroke-opacity=".38" stroke-width="2">' +
    '<path d="M-40 430 C 200 400 340 250 400 -30"/>' +
    '<path d="M1240 370 C 1000 400 860 550 800 830"/>' +
    '</g></svg>';

  var ELECTRONICO = /^([BF][A-Z0-9]{3})-?(\d{1,8})$/;
  var IMPRESO     = /^(\d{3,4})-(\d{3,8})$/;

  /* Siempre se consulta a Odoo, se abra desde donde se abra: en Vercel
     con la ruta corta y desde XAMPP, el totem o un archivo suelto con la
     direccion completa. Si no hay respuesta, no se entra. */
  var API = /\.vercel\.app$/.test(location.hostname)
    ? 'api/boleta'
    : 'https://juegos-silk.vercel.app/api/boleta';

  var autorizado = false;
  var practica = false;         // entro a probar, sin boleta y sin premio
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

    var PISTA = 'Lo encuentras arriba a la derecha de tu comprobante';

    var campo = h('div', { class: 'acceso-campo' },
      h('span', { class: 'acceso-icono', 'aria-hidden': 'true', html: ICO_BOLETA }),
      h('span', { class: 'acceso-valor' }, ''),
      h('span', { class: 'acceso-cursor' }, '')
    );
    var valor = campo.querySelector('.acceso-valor');

    /* el icono va aparte del texto: el texto cambia con cada aviso */
    var avisoTexto = h('span', {}, PISTA);
    var aviso = h('p', { class: 'acceso-aviso' },
      h('span', { class: 'acceso-aviso-ico', 'aria-hidden': 'true', html: ICO_PISTA }),
      avisoTexto);

    var entrar = h('button', {
      class: 'btn btn-primario acceso-entrar',
      onclick: function () { probar(); }
    }, h('span', {}, 'Entrar a los juegos'),
       h('span', { class: 'acceso-flecha', 'aria-hidden': 'true', html: ICO_FLECHA }));

    function pintarCampo() {
      valor.textContent = escrito;
      campo.classList.toggle('vacio', !escrito);
      if (!escrito) valor.textContent = 'B001-00000000';
    }

    function escribir(caracter) {
      if (escrito.length >= 14) return;
      escrito += caracter;
      aviso.className = 'acceso-aviso';
      avisoTexto.textContent = PISTA;
      pintarCampo();
      App.sonar('toque');
    }

    function borrar() {
      escrito = escrito.slice(0, -1);
      pintarCampo();
      App.sonar('toque');
    }

    function rechazar(texto) {
      aviso.className = 'acceso-aviso mal';
      avisoTexto.textContent = texto;
      campo.classList.add('temblor');
      App.sonar('mal');
      setTimeout(function () { campo.classList.remove('temblor'); }, 400);
    }

    var comprobando = false;

    function probar() {
      if (comprobando) return;
      var r = revisar(escrito);
      if (r.error) { rechazar(r.error); return; }

      comprobando = true;
      entrar.disabled = true;
      aviso.className = 'acceso-aviso';
      avisoTexto.textContent = 'Comprobando tu boleta…';

      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: r.numero })
      })
        .then(function (resp) { return resp.json(); })
        .catch(function () {
          return { ok: false, mensaje: 'Sin conexión. Inténtalo otra vez o avisa en recepción.' };
        })
        .then(function (d) {
          comprobando = false;
          entrar.disabled = false;
          if (d.ok) dejarPasar(r);
          else rechazar(d.mensaje || 'No pudimos comprobar la boleta.');
        });
    }

    function dejarPasar(r) {
      autorizado = true;
      comprobante = r.numero;
      /* Este toque es un gesto del usuario, que es lo unico que el navegador
         acepta para ponerse a pantalla completa. Es el mejor momento: a
         partir de aqui empieza el turno y no debe verse nada del navegador. */
      App.pantallaCompleta();
      aviso.className = 'acceso-aviso bien';
      avisoTexto.textContent = r.tipo + ' ' + r.numero + ' · ¡Adelante!';
      valor.textContent = r.numero;
      App.sonar('gana');
      setTimeout(function () { alEntrar(); }, 900);
    }

    /* --- teclado en pantalla: en el totem no hay teclado fisico --- */
    var teclado = h('div', { class: 'acceso-teclado' });
    var TECLAS = ['B', 'F', '-', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '\u232B'];
    TECLAS.forEach(function (t) {
      var esBorrar = t === '\u232B';
      var clase = 'acceso-tecla';
      if (esBorrar) clase += ' borrar';
      if (/[BF-]/.test(t)) clase += ' letra';
      if (t === '0') clase += ' ancha';          // el cero ocupa dos huecos
      var tecla = h('button', {
        class: clase,
        'aria-label': esBorrar ? 'Borrar' : t,
        onclick: function () { esBorrar ? borrar() : escribir(t); }
      }, esBorrar ? h('span', { class: 'acceso-borrar-ico', html: ICO_BORRAR }) : t);
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

    /* Practica: para conocer los juegos sin gastar la boleta. Se entra
       tocando el logo; no da premio ni cuenta intentos. */
    function practicar() {
      if (comprobando) return;
      autorizado = true;
      practica = true;
      comprobante = '';
      App.pantallaCompleta();
      App.sonar('toque');
      alEntrar();
    }

    var vista = h('section', { class: 'vista acceso' },
      h('div', { class: 'acceso-seda', 'aria-hidden': 'true', html: SEDA }),
      h('div', { class: 'acceso-caja' },
        h('div', { class: 'acceso-lado' },
          h('img', { class: 'acceso-logo', src: 'assets/img/logo.png', alt: 'Joana Bernedo Body Aesthetics',
                     onclick: practicar }),
          h('h1', { class: 'acceso-titulo' }, 'Zona de Juegos'),
          h('p', { class: 'acceso-lema' }, 'Escribe el número de tu boleta o factura para jugar'),
          campo,
          aviso
        ),
        h('div', { class: 'acceso-panel' },
          h('p', { class: 'acceso-firma', 'aria-hidden': 'true' }, 'Cuidamos tu mejor versión'),
          teclado, entrar),
        h('p', { class: 'acceso-nota' },
          h('span', { class: 'acceso-nota-ico', 'aria-hidden': 'true', html: ICO_SELLO }),
          h('span', {}, 'Cada boleta sirve una sola vez. No se guarda ningún dato tuyo.'))
      )
    );

    App.pintar(vista, function () { document.removeEventListener('keydown', tecleado); });
    pintarCampo();
  }

  global.Acceso = {
    pedir: pedir,
    revisar: revisar,
    autorizado: function () { return autorizado; },
    practica: function () { return practica; },
    comprobante: function () { return comprobante; },
    olvidar: function () { autorizado = false; practica = false; comprobante = ''; }
  };

})(window);
