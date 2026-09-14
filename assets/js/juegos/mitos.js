/* ==========================================================================
   JUEGO 3 - MITOS Y VERDADES: decide si la frase es cierta o es un mito
   ========================================================================== */

(function () {
  'use strict';

  var FRASES = [
    { t: 'El protector solar solo hace falta en verano o en la playa.', v: false,
      d: 'Los rayos UV atraviesan las nubes y las ventanas. Se usa todo el año.' },

    { t: 'Dormir bien mejora el aspecto de la piel.', v: true,
      d: 'Durante el sueño el cuerpo repara tejidos y regula hormonas del estrés.' },

    { t: 'Depilarse hace que el vello salga más grueso y más oscuro.', v: false,
      d: 'El vello se ve más áspero al crecer con la punta cortada, pero no cambia de grosor.' },

    { t: 'La piel grasa no necesita hidratación.', v: false,
      d: 'También se deshidrata. Basta con una textura ligera, en gel o sin aceites.' },

    { t: 'El estrés puede empeorar problemas de la piel.', v: true,
      d: 'Influye en brotes de acné, dermatitis y caída del cabello.' },

    { t: 'El agua muy caliente reseca la piel.', v: true,
      d: 'Arrastra la grasa natural que la protege. Mejor tibia y duchas cortas.' },

    { t: 'Los labios no necesitan protección solar.', v: false,
      d: 'Tienen poca melanina y se queman con facilidad: usa bálsamo con FPS.' },

    { t: 'Fumar acelera el envejecimiento de la piel.', v: true,
      d: 'Reduce el oxígeno y daña el colágeno: más arrugas y tono apagado.' },

    { t: 'Una crema puede eliminar la celulitis por completo.', v: false,
      d: 'Puede mejorar el aspecto de la piel, pero no eliminarla del todo.' },

    { t: 'Si te arrancas una cana, salen siete más.', v: false,
      d: 'De cada folículo sale un solo pelo. Arrancarlo solo puede dañarlo.' },

    { t: 'Beber agua ayuda al buen funcionamiento de todo el organismo.', v: true,
      d: 'Regula la temperatura, transporta nutrientes y ayuda a eliminar desechos.' },

    { t: 'Las camas solares son una forma segura de broncearse.', v: false,
      d: 'Emiten radiación UV y aumentan el riesgo de cáncer de piel.' },

    { t: 'Tronarse los dedos causa artritis.', v: false,
      d: 'El sonido viene de burbujas de gas en el líquido de la articulación.' },

    { t: 'El ejercicio regular mejora la circulación y el ánimo.', v: true,
      d: 'Libera endorfinas y favorece el retorno venoso de las piernas.' },

    { t: 'Cuanto más producto te apliques, mejores resultados.', v: false,
      d: 'El exceso puede irritar. La constancia importa más que la cantidad.' },

    { t: 'Desmaquillarse antes de dormir ayuda a prevenir los poros obstruidos.', v: true,
      d: 'El maquillaje mezclado con grasa y polvo favorece imperfecciones.' },

    { t: 'Leer con poca luz daña la vista de forma permanente.', v: false,
      d: 'Causa fatiga visual y dolor de cabeza, pero no un daño permanente.' },

    { t: 'La alimentación influye en la salud de la piel y el cabello.', v: true,
      d: 'Proteínas, vitaminas y minerales son la materia prima de ambos.' }
  ];

  /* Dificultad alta: 10 frases en minuto y medio. */
  var TOTAL = 10;
  var OBJETIVO = 7;                   // aciertos para llevarse el premio
  var ESPERA = 2000;                  // ms que se ve el veredicto antes de pasar solo

  /* Dibujos del tema spa (SVG para que se vean nitidos en la tele). */
  var ICO_RONDA = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#35C49B"/>' +
    '<path d="m12 5.6 1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#fff"/></svg>';

  var ICO_ACIERTOS = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#3E8FE0"/>' +
    '<circle cx="12" cy="12" r="6.4" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="12" cy="12" r="2.2" fill="#fff"/></svg>';

  /* El sello de la tarjeta cambia con el tema de la frase. */
  var ICO_SELLO = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#E4F6EF"/>' +
    '<circle cx="12" cy="12" r="4.2" stroke="#2FB98A" stroke-width="1.8"/>' +
    '<path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" ' +
    'stroke="#2FB98A" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var HOJA = '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">' +
    '<path d="M6 94C6 52 30 20 82 8c6 44-16 76-76 86z" fill="#7BC9A0" opacity=".85"/>' +
    '<path d="M8 92C24 58 46 34 80 12" stroke="#4FA87E" stroke-width="2.4" opacity=".7"/>' +
    '<path d="M30 70c8-14 4-26-2-34M52 46c10-10 12-22 10-30M22 84c-2-14-10-22-16-26" ' +
    'stroke="#4FA87E" stroke-width="2" opacity=".5"/></svg>';

  var LOTO = '<svg viewBox="0 0 40 24" fill="none" aria-hidden="true">' +
    '<path d="M20 3c3 4 4 8 0 13-4-5-3-9 0-13z" fill="#35C49B"/>' +
    '<path d="M12 8c4 2 6 5 7 10-6-1-8-5-7-10zM28 8c-4 2-6 5-7 10 6-1 8-5 7-10z" fill="#5FD3B0"/>' +
    '<path d="M5 13c5 0 9 2 12 6-6 2-11-1-12-6zM35 13c-5 0-9 2-12 6 6 2 11-1 12-6z" fill="#8FE3C8"/></svg>';

  var DECORADO_SPA =
    '<span class="spa-luz"></span>' +
    '<span class="spa-espejo"></span>' +
    '<span class="spa-hoja h1">' + HOJA + '</span>' +
    '<span class="spa-hoja h2">' + HOJA + '</span>' +
    '<span class="spa-hoja h3">' + HOJA + '</span>' +
    '<div class="spa-cartel">Tu piel<br>también importa<span class="spa-corazon">♥</span></div>' +
    '<span class="spa-tarro t1"></span><span class="spa-tarro t2"></span>';

  App.registrar({
    id: 'mitos',
    nombre: 'Mitos y Verdades',
    emoji: '⚖️',
    desc: '¿Cierto o puro cuento?',
    sub: 'Verdad o mito',

    iniciar: function (vista, api) {
      var rondas = tomar(FRASES, TOTAL);
      var indice = 0;
      var aciertos = 0;
      var cuenta = null, acabado = false;
      var respondida = false;

      var barra = h('i', { estilo: 'width:0%' });
      var valorRonda = h('span', { class: 'val' }, '1');
      var valorAciertos = h('span', { class: 'val' }, '0');

      var frase = h('p', { class: 'frase-mito' });
      var veredicto = h('div', { class: 'veredicto', hidden: true });

      var botonVerdad = h('button', { class: 'btn-juicio es-verdad' },
        h('span', { class: 'juicio-emoji', 'aria-hidden': 'true' }, '✔'),
        h('span', {}, 'Verdad')
      );
      var botonMito = h('button', { class: 'btn-juicio es-mito' },
        h('span', { class: 'juicio-emoji', 'aria-hidden': 'true' }, '✖'),
        h('span', {}, 'Mito')
      );
      var botones = h('div', { class: 'juicios' }, botonVerdad, botonMito);

      botonVerdad.addEventListener('click', function () { responder(true); });
      botonMito.addEventListener('click', function () { responder(false); });

      vista.classList.add('tema-spa');
      document.body.classList.add('spa');          // tiñe tambien la barra de arriba
      vista.appendChild(h('div', { class: 'spa-deco', html: DECORADO_SPA, 'aria-hidden': 'true' }));

      vista.appendChild(h('div', { class: 'marcador' },
        h('div', { class: 'dato' },
          h('span', { class: 'dato-icono', html: ICO_RONDA, 'aria-hidden': 'true' }),
          h('span', { class: 'dato-texto' }, valorRonda, h('span', { class: 'etq' }, 'Ronda'))),
        h('div', { class: 'dato' },
          h('span', { class: 'dato-icono', html: ICO_ACIERTOS, 'aria-hidden': 'true' }),
          h('span', { class: 'dato-texto' }, valorAciertos, h('span', { class: 'etq' }, 'Aciertos')))
      ));
      vista.appendChild(h('div', { class: 'progreso' }, barra));
      vista.appendChild(h('div', { class: 'centro' },
        h('div', { class: 'panel tarjeta-mito' },
          h('div', { class: 'mito-fila' },
            h('span', { class: 'mito-sello', html: ICO_SELLO, 'aria-hidden': 'true' }),
            h('div', { class: 'mito-texto' },
              h('span', { class: 'comilla', 'aria-hidden': 'true' }, '“'),
              frase)
          ),
          veredicto
        ),
        botones
      ));
      vista.appendChild(h('p', { class: 'spa-pie' },
        h('span', { class: 'spa-loto', html: LOTO, 'aria-hidden': 'true' }),
        h('span', {}, 'Ciencia · Belleza · Bienestar')));
      pintar();

      function pintar() {
        respondida = false;
        var actual = rondas[indice];
        api.sub('Ronda ' + (indice + 1) + ' de ' + TOTAL);
        valorRonda.textContent = (indice + 1);
        barra.style.width = (indice / TOTAL * 100) + '%';

        frase.textContent = actual.t;
        veredicto.hidden = true;
        botones.classList.remove('inactivos');
        botonVerdad.classList.remove('acierto', 'error');
        botonMito.classList.remove('acierto', 'error');
      }

      function responder(eleccion) {
        if (respondida) return;
        respondida = true;

        var actual = rondas[indice];
        var correcto = (eleccion === actual.v);
        var elegido = eleccion ? botonVerdad : botonMito;

        botones.classList.add('inactivos');
        elegido.classList.add(correcto ? 'acierto' : 'error');
        if (!correcto) {
          elegido.classList.add('temblor');
          (actual.v ? botonVerdad : botonMito).classList.add('acierto');
        }

        if (correcto) { aciertos++; valorAciertos.textContent = aciertos; api.sonar('bien'); }
        else { api.sonar('mal'); }

        veredicto.innerHTML = '';
        veredicto.appendChild(h('p', { class: 'veredicto-titulo' },
          (correcto ? '¡Bien! Es ' : 'En realidad es ') + (actual.v ? 'VERDAD' : 'UN MITO')));
        veredicto.appendChild(h('p', { class: 'veredicto-texto' }, actual.d));
        veredicto.hidden = false;

        /* Pasa solo a la siguiente: en el totem nadie tiene que buscar el boton */
        api.luego(function () {
          if (!acabado) avanzar();
        }, ESPERA);
      }

      function avanzar() {
        if (indice < TOTAL - 1) { indice++; pintar(); }
        else { barra.style.width = '100%'; terminar(); }
      }

      /* Minuto y medio para toda la ronda. */
      cuenta = api.cuenta(LIMITE, function () {
        if (acabado) return;
        acabado = true;
        api.sonar('fin');
        api.fin({
          sello: '✦',
          titulo: '¡Se acabó el tiempo!',
          mensaje: 'No hace falta pensarlo tanto: casi siempre la primera intuición acierta.',
          premio: aciertos >= OBJETIVO ? premio() : null,
          datos: [
            { val: aciertos, etq: 'Aciertos' },
            { val: indice + '/' + TOTAL, etq: 'Frases' }
          ]
        });
      });

      function terminar() {
        acabado = true;
        if (cuenta) cuenta.parar();
        var mensaje;
        if (aciertos === TOTAL) { mensaje = '¡Perfecto! No te engaña ningún mito.'; api.sonar('gana'); }
        else if (aciertos >= 5) { mensaje = '¡Muy bien! Distingues casi siempre el dato real del cuento.'; api.sonar('gana'); }
        else { mensaje = 'Hay varios mitos muy repetidos... ahora ya sabes cuáles son.'; api.sonar('fin'); }

        api.fin({
          sello: '✦',
          titulo: aciertos + ' de ' + TOTAL,
          premio: aciertos >= OBJETIVO ? premio() : null,
          mensaje: mensaje,
          datos: [
            { val: aciertos, etq: 'Aciertos' },
            { val: (TOTAL - aciertos), etq: 'Fallos' }
          ]
        });
      }

      /* Al salir del juego se devuelve el color de siempre a la app. */
      return function () { document.body.classList.remove('spa'); };
    }
  });

})();
