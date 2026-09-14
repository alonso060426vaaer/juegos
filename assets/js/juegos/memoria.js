/* ==========================================================================
   JUEGO 1 - MEMORIA: encuentra las parejas (12 parejas, tablero de 24)
   Los dibujos son productos de estetica hechos en SVG, con color vivo y
   contorno grueso para que se vean de lejos en la pantalla del totem.
   ========================================================================== */

(function () {
  'use strict';

  var LINEA = '#4A3A2C';
  var CORAL = '#F2685C', ROSA = '#EE6FA0', ORO = '#F3B12B', MIEL = '#FFD97A';
  var JADE = '#2FB5A8', MENTA = '#5CC79B', CIELO = '#4EA8E8', LILA = '#9B7EDE';
  var CREMA = '#FFF6E6', BLANCO = '#FFFFFF';

  /** Una ficha: circulo de color de fondo y encima el dibujo. */
  function ficha(fondo, cuerpo) {
    return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" ' +
           'stroke-linecap="round" stroke-linejoin="round">' +
           '<circle cx="12" cy="12" r="11.6" fill="' + fondo + '"/>' + cuerpo + '</svg>';
  }

  function raya(d, ancho, color) {
    return '<path d="' + d + '" stroke="' + (color || LINEA) + '" stroke-width="' + ancho + '"/>';
  }

  /* ---------------------------------------------------------------
     Que se ve al voltear la carta: 'numeros' (grandes, faciles de
     emparejar) o 'productos' (los dibujos de abajo). Cambia esta linea
     y ya esta.
     --------------------------------------------------------------- */
  var MODO = 'numeros';

  /* Hay mas numeros que parejas en el tablero: cada partida saca doce al
     azar de estos veinte, asi no sale nunca la misma baraja.
     El color se reparte con el angulo aureo para que los tonos no se repitan. */
  var TOTAL_NUMEROS = 20;

  var NUMEROS = [];
  for (var n = 1; n <= TOTAL_NUMEROS; n++) {
    var tono = Math.round((n * 137.5) % 360);
    NUMEROS.push({
      id: 'n' + n,
      nombre: String(n),
      d: ficha('hsl(' + tono + ',72%,91%)',
          '<circle cx="12" cy="12" r="8.4" fill="hsl(' + tono + ',66%,55%)" stroke="' + LINEA + '" stroke-width="1.5"/>' +
          '<text x="12" y="12.4" text-anchor="middle" dominant-baseline="central" fill="#FFF8EC" ' +
          'font-family="Georgia, serif" font-weight="700" ' +
          'font-size="' + (n > 9 ? 8.4 : 10.4) + '">' + n + '</text>')
    });
  }

  /* Cada producto: un identificador (para emparejar) y su dibujo. */
  var PRODUCTOS = [
    { id: 'serum', nombre: 'sérum', d: ficha('#CFF0EA',
        '<rect x="8.6" y="2.6" width="6.8" height="3.6" rx="1.8" fill="' + CORAL + '" stroke="' + LINEA + '" stroke-width="1.3"/>' +
        '<rect x="10.2" y="6" width="3.6" height="1.8" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.2"/>' +
        '<rect x="6.8" y="7.6" width="10.4" height="13.4" rx="2.6" fill="' + JADE + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<path d="M8.4 14.2h7.2v4.2a2.6 2.6 0 0 1-2.6 2.6h-2a2.6 2.6 0 0 1-2.6-2.6z" fill="' + MENTA + '"/>' +
        raya('M9.3 10v3', 1.4, BLANCO)) },

    { id: 'crema', nombre: 'crema', d: ficha('#FBD9E4',
        '<rect x="4.8" y="9" width="14.4" height="11.4" rx="3.2" fill="' + BLANCO + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<rect x="3.4" y="4.4" width="17.2" height="5" rx="2.4" fill="' + ROSA + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<ellipse cx="12" cy="14.8" rx="4.2" ry="2.2" fill="' + ROSA + '" opacity=".45"/>' +
        raya('M6.6 6.2h3', 1.4, BLANCO)) },

    { id: 'labial', nombre: 'labial', d: ficha('#E5DBFA',
        '<path d="M8.4 9.6V5.4L15.6 1.8v7.8z" fill="' + CORAL + '" stroke="' + LINEA + '" stroke-width="1.4"/>' +
        '<rect x="7.8" y="9.4" width="8.4" height="2.8" rx=".8" fill="' + MIEL + '" stroke="' + LINEA + '" stroke-width="1.3"/>' +
        '<rect x="8.4" y="12" width="7.2" height="9.8" rx="1.6" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        raya('M10.2 14.4v5', 1.3, BLANCO)) },

    { id: 'esmalte', nombre: 'esmalte', d: ficha('#CFE6FB',
        '<rect x="9.6" y="1.8" width="4.8" height="6" rx="1.6" fill="' + LINEA + '"/>' +
        '<path d="M11.2 7.8h1.6l-.4 3h-.8z" fill="' + LINEA + '"/>' +
        '<path d="M5.8 13.6c0-1.8 1.4-3.2 3.2-3.2h6c1.8 0 3.2 1.4 3.2 3.2v5.2a2.8 2.8 0 0 1-2.8 2.8H8.6a2.8 2.8 0 0 1-2.8-2.8z" fill="' + ROSA + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        raya('M8.2 15.4a3 3 0 0 1 2-1.6', 1.4, BLANCO)) },

    { id: 'perfume', nombre: 'perfume', d: ficha('#FFE9BE',
        '<rect x="9.2" y="2" width="5.6" height="3" rx="1.2" fill="' + LINEA + '"/>' +
        '<rect x="10.8" y="4.8" width="2.4" height="3" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.2"/>' +
        '<rect x="6.2" y="7.6" width="11.6" height="13.6" rx="2.8" fill="' + CIELO + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<rect x="8.6" y="12.4" width="6.8" height="5.4" rx="1.4" fill="' + BLANCO + '" opacity=".55"/>' +
        '<circle cx="19.6" cy="3.8" r="1.1" fill="' + BLANCO + '" stroke="' + LINEA + '" stroke-width="1"/>' +
        '<circle cx="21.4" cy="6.6" r=".7" fill="' + BLANCO + '"/>') },

    { id: 'rodillo', nombre: 'rodillo de jade', d: ficha('#D5F2E4',
        '<rect x="2.2" y="10.8" width="11.4" height="2.4" rx="1.2" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.3"/>' +
        '<circle cx="4.2" cy="12" r="1.9" fill="' + MIEL + '" stroke="' + LINEA + '" stroke-width="1.3"/>' +
        '<ellipse cx="17.2" cy="12" rx="4.6" ry="3.4" fill="' + JADE + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<ellipse cx="16.2" cy="10.8" rx="1.5" ry="1" fill="' + BLANCO + '" opacity=".7"/>') },

    { id: 'mascarilla', nombre: 'mascarilla', d: ficha('#E5DBFA',
        '<path d="M12 2.4c4.7 0 7.4 2.9 7.4 8s-3.3 11.2-7.4 11.2S4.6 15.5 4.6 10.4 7.3 2.4 12 2.4z" fill="' + BLANCO + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<ellipse cx="9" cy="10" rx="1.8" ry="1.3" fill="' + MENTA + '" stroke="' + LINEA + '" stroke-width="1.1"/>' +
        '<ellipse cx="15" cy="10" rx="1.8" ry="1.3" fill="' + MENTA + '" stroke="' + LINEA + '" stroke-width="1.1"/>' +
        raya('M10 15.6h4', 1.6) +
        '<circle cx="7.4" cy="13.6" r=".7" fill="' + ROSA + '"/>' +
        '<circle cx="16.6" cy="13.6" r=".7" fill="' + ROSA + '"/>') },

    { id: 'brocha', nombre: 'brocha', d: ficha('#FBD9E4',
        '<path d="M12 1.6c3.2 0 5.8 2.7 5.8 6 0 .9-.2 1.8-.5 2.6H6.7a7 7 0 0 1-.5-2.6c0-3.3 2.6-6 5.8-6z" fill="' + CORAL + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        raya('M9.4 3.2v6.6M12 2.2v7.6M14.6 3.2v6.6', 1) +
        '<rect x="6.4" y="9.6" width="11.2" height="3" rx="1" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.4"/>' +
        '<path d="M10.2 12.8h3.6l-.8 9h-2z" fill="' + LINEA + '"/>') },

    { id: 'espejo', nombre: 'espejo', d: ficha('#FFE9BE',
        '<ellipse cx="12" cy="8.6" rx="6.6" ry="7" fill="' + CIELO + '" stroke="' + LINEA + '" stroke-width="1.6"/>' +
        raya('M9 6.8a4 4 0 0 1 3.2-2.6', 1.6, BLANCO) +
        '<rect x="10.5" y="14.6" width="3" height="7.4" rx="1.5" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.4"/>') },

    { id: 'vela', nombre: 'vela', d: ficha('#FFDDD6',
        '<path d="M12 1.8c1.9 2 2.9 3.2 2.9 4.6a2.9 2.9 0 0 1-5.8 0c0-1.4 1-2.6 2.9-4.6z" fill="' + ORO + '" stroke="' + LINEA + '" stroke-width="1.4"/>' +
        '<path d="M12 4.6c.9 1 1.3 1.6 1.3 2.3a1.3 1.3 0 0 1-2.6 0c0-.7.4-1.3 1.3-2.3z" fill="' + MIEL + '"/>' +
        '<rect x="6.4" y="9.6" width="11.2" height="11.8" rx="2.4" fill="' + CREMA + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<rect x="8.2" y="12.6" width="7.6" height="6.2" rx="1.2" fill="' + MIEL + '" opacity=".8"/>') },

    { id: 'peine', nombre: 'peine', d: ficha('#CFF0EA',
        '<rect x="2.6" y="7.2" width="18.8" height="4.6" rx="2" fill="' + LILA + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        raya('M5.2 11.8v5.6M8.4 11.8v7M11.6 11.8v7M14.8 11.8v7M18 11.8v5.6', 1.7) +
        raya('M5.4 9.2h4', 1.3, BLANCO)) },

    { id: 'toalla', nombre: 'toallas', d: ficha('#CFE6FB',
        '<rect x="3.4" y="12.6" width="17.2" height="6.4" rx="2.4" fill="' + CIELO + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        '<rect x="5" y="6.4" width="14" height="6.4" rx="2.4" fill="' + BLANCO + '" stroke="' + LINEA + '" stroke-width="1.5"/>' +
        raya('M5 9.6h14', 1.2) +
        '<rect x="10.4" y="4.6" width="3.2" height="9.8" rx="1.2" fill="' + ROSA + '" stroke="' + LINEA + '" stroke-width="1.3"/>' +
        '<path d="M12 5.6 10.2 3.2h3.6z" fill="' + ROSA + '" stroke="' + LINEA + '" stroke-width="1.2"/>')
    }
  ];

  var FICHAS = MODO === 'numeros' ? NUMEROS : PRODUCTOS;

  /* Dificultad alta: 12 parejas en minuto y medio, y las cartas falladas
     se tapan antes (menos tiempo para memorizarlas). */
  var PAREJAS = 12;
  var VISTAZO = 620;

  var CONSEJOS = [
    'Un buen descanso se nota en la piel: intenta dormir entre 7 y 9 horas.',
    'Bebe agua a lo largo del día, no todo de golpe.',
    'El protector solar también se usa en días nublados.',
    'Cinco minutos de respiración profunda bajan el estrés.',
    'Limpiar el rostro antes de dormir evita que se obstruyan los poros.'
  ];

  App.registrar({
    id: 'memoria',
    nombre: 'Memoria',
    emoji: '🧴',
    desc: 'Encuentra las 12 parejas',
    sub: 'Parejas',

    iniciar: function (vista, api) {
      var movimientos = 0;
      var encontradas = 0;
      var primera = null;
      var bloqueado = false;
      var terminado = false;
      var cuenta = null;

      /* --- Marcador --- */
      var valorMovimientos = h('span', { class: 'val' }, '0');
      var valorParejas = h('span', { class: 'val' }, '0/' + PAREJAS);
      var marcador = h('div', { class: 'marcador' },
        h('div', { class: 'dato' }, valorMovimientos, h('span', { class: 'etq' }, 'Intentos')),
        h('div', { class: 'dato' }, valorParejas, h('span', { class: 'etq' }, 'Parejas'))
      );

      /* --- Tablero --- */
      var elegidas = tomar(FICHAS, PAREJAS);
      var cartas = mezclar(elegidas.concat(elegidas));
      var tablero = h('div', { class: 'tablero-memoria' });

      cartas.forEach(function (ficha, indice) {
        var carta = h('button', {
          class: 'carta',
          'aria-label': 'Carta ' + (indice + 1),
          estilo: 'animation-delay:' + (indice * 28) + 'ms'
        },
          h('span', { class: 'carta-cara carta-frente', 'aria-hidden': 'true' }, '✦'),
          h('span', { class: 'carta-cara carta-reverso', 'aria-hidden': 'true', html: ficha.d })
        );
        carta.dataset.simbolo = ficha.id;
        carta.addEventListener('click', function () { destapar(carta); });
        tablero.appendChild(carta);
      });

      vista.appendChild(marcador);
      vista.appendChild(h('div', { class: 'centro' }, tablero));
      vista.appendChild(h('p', { class: 'aviso' }, 'Toca dos cartas y memoriza dónde está cada ' +
        (MODO === 'numeros' ? 'número' : 'producto')));

      /* --- Cuenta atras: la partida dura minuto y medio --- */
      cuenta = api.cuenta(LIMITE, function () {
        if (terminado) return;
        terminado = true;
        bloqueado = true;
        api.sonar('fin');
        api.fin({
          sello: '✦',
          titulo: '¡Se acabó el tiempo!',
          mensaje: encontradas >= PAREJAS - 2
            ? 'Te faltó muy poco. ¿Otra vuelta?'
            : 'Fíjate bien en las primeras cartas: ahí se gana tiempo.',
          datos: [
            { val: encontradas + '/' + PAREJAS, etq: 'Parejas' },
            { val: movimientos, etq: 'Intentos' }
          ]
        });
      });

      /* --- Logica --- */
      function destapar(carta) {
        if (bloqueado || terminado) return;
        if (carta.classList.contains('volteada') || carta.classList.contains('lograda')) return;

        carta.classList.add('volteada');
        api.sonar('voltea');

        if (!primera) { primera = carta; return; }

        movimientos++;
        valorMovimientos.textContent = movimientos;

        if (primera.dataset.simbolo === carta.dataset.simbolo) {
          var a = primera, b = carta;
          primera = null;
          encontradas++;
          valorParejas.textContent = encontradas + '/' + PAREJAS;
          api.sonar('bien');
          api.luego(function () {
            a.classList.add('lograda');
            b.classList.add('lograda');
            if (encontradas === PAREJAS) ganar();
          }, 320);
        } else {
          bloqueado = true;
          var x = primera, y = carta;
          primera = null;
          api.sonar('mal');
          api.luego(function () {
            x.classList.remove('volteada');
            y.classList.remove('volteada');
            bloqueado = false;
          }, VISTAZO);
        }
      }

      function ganar() {
        terminado = true;
        if (cuenta) cuenta.parar();
        api.sonar('gana');
        var mensaje = movimientos <= 16
          ? '¡Memoria de oro! Lo resolviste en muy pocos intentos.'
          : 'Completaste el tablero. ' + CONSEJOS[entero(0, CONSEJOS.length - 1)];

        api.luego(function () {
          api.fin({
            sello: '✦',
            titulo: '¡Parejas completas!',
            mensaje: mensaje,
            premio: premio(),            // objetivo: completar el tablero
            datos: [
              { val: movimientos, etq: 'Intentos' },
              { val: reloj(cuenta ? cuenta.usado() : 0), etq: 'Tiempo' }
            ]
          });
        }, 500);
      }

      /* Sin nada que limpiar: los temporizadores los cancela el nucleo */
      return null;
    }
  });

})();
