/* ==========================================================================
   JUEGO 2 - TRIVIA DE BIENESTAR: 10 preguntas con opcion multiple
   ========================================================================== */

(function () {
  'use strict';

  var BANCO = [
    { p: '¿Cuál es el órgano más grande del cuerpo humano?',
      o: ['El hígado', 'La piel', 'Los pulmones', 'El corazón'], r: 1,
      d: 'La piel de un adulto mide cerca de 2 m² y pesa unos 4 kg.' },

    { p: '¿Cada cuánto conviene reaplicar el protector solar si estás al aire libre?',
      o: ['Cada 2 horas', 'Una vez al día', 'Cada 8 horas', 'Solo al mediodía'], r: 0,
      d: 'También después de nadar o sudar mucho.' },

    { p: '¿Qué vitamina produce el cuerpo al exponerse al sol?',
      o: ['Vitamina C', 'Vitamina B12', 'Vitamina D', 'Vitamina K'], r: 2,
      d: 'Con pocos minutos al día suele bastar; el resto del tiempo, protección.' },

    { p: '¿Cuántos minutos de actividad física moderada recomienda la OMS por semana?',
      o: ['30 minutos', '60 minutos', '150 minutos', '400 minutos'], r: 2,
      d: 'Son unos 20-30 minutos al día. Caminar cuenta.' },

    { p: '¿Qué proteína le da firmeza y elasticidad a la piel?',
      o: ['Colágeno', 'Queratina', 'Insulina', 'Hemoglobina'], r: 0,
      d: 'Su producción baja con los años; por eso la piel pierde firmeza.' },

    { p: '¿Cuántas horas de sueño se recomiendan para un adulto?',
      o: ['4 a 5 horas', '7 a 9 horas', '10 a 12 horas', 'Da igual'], r: 1,
      d: 'Dormir bien mejora el ánimo, la memoria y el aspecto de la piel.' },

    { p: '¿Con qué temperatura de agua es mejor lavarse la cara?',
      o: ['Muy caliente', 'Tibia', 'Con hielo', 'Solo con toallitas'], r: 1,
      d: 'El agua muy caliente reseca y puede irritar la piel.' },

    { p: '¿Qué significa el número del FPS en un protector solar?',
      o: ['Los mililitros del envase', 'El nivel de protección frente al sol',
          'Las horas que dura', 'El precio del producto'], r: 1,
      d: 'Un FPS 30 o más es lo habitual para el uso diario.' },

    { p: '¿Cuál de estos hábitos envejece más rápido la piel?',
      o: ['Caminar', 'Fumar', 'Leer', 'Tomar agua'], r: 1,
      d: 'El tabaco reduce el oxígeno que llega a la piel y favorece las arrugas.' },

    { p: '¿Qué fruta es especialmente rica en vitamina C?',
      o: ['Kiwi', 'Plátano', 'Pera', 'Sandía'], r: 0,
      d: 'La vitamina C participa en la formación de colágeno.' },

    { p: '¿Para qué sirve la exfoliación de la piel?',
      o: ['Para broncearse', 'Para eliminar células muertas',
          'Para blanquear la piel', 'Para cerrar heridas'], r: 1,
      d: 'Hacerla con suavidad y sin excederse: 1 o 2 veces por semana.' },

    { p: '¿Cuántos litros de agua al día se suelen recomendar para un adulto?',
      o: ['Medio litro', 'Alrededor de 2 litros', '5 litros', '10 litros'], r: 1,
      d: 'Varía según la persona, el clima y la actividad física.' },

    { p: '¿Qué parte del cuerpo se olvida más al poner protector solar?',
      o: ['Las orejas y el cuello', 'La frente', 'Las mejillas', 'La nariz'], r: 0,
      d: 'Orejas, cuello, escote y el dorso de las manos son los grandes olvidados.' },

    { p: '¿Cuál es el músculo más fuerte del cuerpo en proporción a su tamaño?',
      o: ['El bíceps', 'El masetero (mandíbula)', 'El gemelo', 'El corazón'], r: 1,
      d: 'Es el músculo que usas para masticar.' },

    { p: '¿Qué ayuda a mejorar la circulación en las piernas?',
      o: ['Estar sentado sin moverse', 'Caminar y elevar las piernas',
          'Usar ropa muy ajustada', 'Cruzar las piernas mucho tiempo'], r: 1,
      d: 'Levantarse cada hora ya hace una gran diferencia.' },

    { p: '¿Cada cuánto se renueva por completo la capa superficial de la piel?',
      o: ['Cada 24 horas', 'Cada 3 o 4 semanas', 'Cada 6 meses', 'Nunca'], r: 1,
      d: 'Por eso los cambios en la piel tardan semanas en notarse.' },

    { p: '¿Qué bebida hidrata mejor durante el día?',
      o: ['Agua', 'Refresco', 'Café', 'Bebidas energéticas'], r: 0,
      d: 'El agua sigue siendo la mejor opción, sin azúcar ni calorías.' },

    { p: '¿Qué es el estrés oxidativo?',
      o: ['Una dieta', 'Un daño celular que acelera el envejecimiento',
          'Un tipo de masaje', 'Una vitamina'], r: 1,
      d: 'Los antioxidantes de frutas y verduras ayudan a contrarrestarlo.' },

    { p: '¿Cuántos huesos tiene aproximadamente un adulto?',
      o: ['106', '206', '306', '406'], r: 1,
      d: 'Un bebé nace con cerca de 300; algunos se fusionan al crecer.' },

    { p: '¿Qué conviene hacer antes de una sesión de depilación láser?',
      o: ['Broncearse mucho', 'Evitar la exposición solar',
          'Depilarse con cera', 'Aplicar perfume'], r: 1,
      d: 'La piel bronceada o irritada puede obligar a posponer la sesión.' }
  ];

  /* Dificultad alta: 8 preguntas en minuto y medio, hay que ir rapido. */
  var TOTAL = 8;
  var OBJETIVO = 6;                   // aciertos para llevarse el premio

  /* Dibujos sueltos del tema clinica (SVG, para que se vean nitidos). */
  var ICO_PREGUNTA = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#5AA2E8"/>' +
    '<path d="M9.2 9.3a2.9 2.9 0 1 1 3.9 2.7c-.8.3-1.1.9-1.1 1.7v.4" stroke="#fff" stroke-width="2" ' +
    'stroke-linecap="round" fill="none"/><circle cx="12" cy="17.4" r="1.3" fill="#fff"/></svg>';

  var ICO_ESTRELLA = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#A78BFA"/>' +
    '<path d="m12 5.8 1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#fff"/></svg>';

  var ICO_CEREBRO = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#3B82D6"/>' +
    '<path d="M9.6 6.4a2.3 2.3 0 0 0-2.3 2.3 2.2 2.2 0 0 0-.9 4 2.3 2.3 0 0 0 2.2 2.9h1v2.1h2V6.9a1.5 1.5 0 0 0-2-.5z" fill="#fff"/>' +
    '<path d="M14.4 6.4a2.3 2.3 0 0 1 2.3 2.3 2.2 2.2 0 0 1 .9 4 2.3 2.3 0 0 1-2.2 2.9h-1v2.1h-1.4" stroke="#fff" ' +
    'stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';

  /* Fondo: hojas, cartel de la clinica y burbujas suaves. */
  var DECORADO =
    '<svg class="deco-hojas" viewBox="0 0 120 200" fill="none" aria-hidden="true">' +
      '<path d="M8 30c22 6 34 24 36 48-24 2-40-14-36-48z" fill="#86C9A8" opacity=".55"/>' +
      '<path d="M2 62c20 10 28 30 26 52-22-2-34-22-26-52z" fill="#5FB48C" opacity=".5"/>' +
      '<path d="M18 10c14 12 16 30 10 46-16-8-20-28-10-46z" fill="#A5DCC0" opacity=".5"/>' +
    '</svg>' +
    '<div class="deco-cartel"><span class="deco-cruz">✚</span>Tu bienestar<br>nos importa<span class="deco-corazon">♥</span></div>' +
    '<span class="deco-burbuja b1"></span><span class="deco-burbuja b2"></span><span class="deco-burbuja b3"></span>';

  App.registrar({
    id: 'trivia',
    nombre: 'Trivia',
    emoji: '❓',
    desc: 'Preguntas de salud y belleza',
    sub: 'Bienestar',

    iniciar: function (vista, api) {
      var preguntas = tomar(BANCO, TOTAL);
      var indice = 0;
      var aciertos = 0;
      var cuenta = null, acabado = false;
      var respondida = false;

      var barra = h('i', { estilo: 'width:0%' });
      var progreso = h('div', { class: 'progreso' }, barra);

      var valorPregunta = h('span', { class: 'val' }, '1');
      var valorAciertos = h('span', { class: 'val' }, '0');
      var marcador = h('div', { class: 'marcador' },
        h('div', { class: 'dato' },
          h('span', { class: 'dato-icono', html: ICO_PREGUNTA, 'aria-hidden': 'true' }),
          h('span', { class: 'dato-texto' }, valorPregunta, h('span', { class: 'etq' }, 'Pregunta'))),
        h('div', { class: 'dato' },
          h('span', { class: 'dato-icono', html: ICO_ESTRELLA, 'aria-hidden': 'true' }),
          h('span', { class: 'dato-texto' }, valorAciertos, h('span', { class: 'etq' }, 'Aciertos')))
      );

      var enunciado = h('h3', { class: 'enunciado' });
      var opciones = h('div', { class: 'opciones' });
      var explicacion = h('div', { class: 'explicacion', hidden: true });
      var siguiente = h('button', {
        class: 'btn btn-primario btn-ancho', hidden: true,
        onclick: function () { api.sonar('toque'); avanzar(); }
      }, 'Siguiente');

      vista.classList.add('tema-clinica');
      document.body.classList.add('clinica');     // tiñe tambien la barra de arriba
      vista.appendChild(h('div', { class: 'clinica-deco', html: DECORADO, 'aria-hidden': 'true' }));
      vista.appendChild(marcador);
      vista.appendChild(progreso);
      vista.appendChild(h('div', { class: 'centro' },
        h('div', { class: 'panel tarjeta-pregunta' },
          h('div', { class: 'pregunta-fila' },
            h('span', { class: 'pregunta-icono', html: ICO_CEREBRO, 'aria-hidden': 'true' }),
            enunciado),
          opciones, explicacion)
      ));
      vista.appendChild(h('div', { class: 'pie-accion' }, siguiente));

      pintar();

      function pintar() {
        var actual = preguntas[indice];
        respondida = false;

        api.sub('Pregunta ' + (indice + 1) + ' de ' + TOTAL);
        valorPregunta.textContent = (indice + 1);
        barra.style.width = (indice / TOTAL * 100) + '%';

        enunciado.textContent = actual.p;
        explicacion.hidden = true;
        siguiente.hidden = true;
        opciones.innerHTML = '';

        var orden = mezclar([0, 1, 2, 3]);
        orden.forEach(function (posicion, i) {
          var boton = h('button', { class: 'opcion' },
            h('span', { class: 'opcion-letra l' + i, 'aria-hidden': 'true' }, 'ABCD'.charAt(i)),
            h('span', { class: 'opcion-texto' }, actual.o[posicion]),
            h('span', { class: 'opcion-flecha', 'aria-hidden': 'true' }, '›')
          );
          boton.addEventListener('click', function () {
            responder(boton, posicion === actual.r, actual);
          });
          opciones.appendChild(boton);
        });
      }

      function responder(boton, correcta, actual) {
        if (respondida) return;
        respondida = true;

        var botones = opciones.querySelectorAll('.opcion');
        for (var i = 0; i < botones.length; i++) {
          botones[i].classList.add('inactiva');
          if (botones[i].querySelector('.opcion-texto').textContent === actual.o[actual.r]) {
            botones[i].classList.add('correcta');
            botones[i].querySelector('.opcion-letra').textContent = '✓';
          }
        }

        if (correcta) {
          aciertos++;
          valorAciertos.textContent = aciertos;
          boton.classList.add('pulso');
          api.sonar('bien');
        } else {
          boton.classList.add('incorrecta', 'temblor');
          boton.querySelector('.opcion-letra').textContent = '✕';
          api.sonar('mal');
        }

        explicacion.innerHTML = '';
        explicacion.appendChild(
          h('p', { class: 'explicacion-titulo' }, correcta ? '¡Correcto!' : 'La respuesta era: ' + actual.o[actual.r])
        );
        explicacion.appendChild(h('p', { class: 'explicacion-texto' }, actual.d));
        explicacion.hidden = false;

        siguiente.textContent = (indice === TOTAL - 1) ? 'Ver resultado' : 'Siguiente';
        siguiente.hidden = false;
      }

      function avanzar() {
        if (indice < TOTAL - 1) {
          indice++;
          pintar();
        } else {
          barra.style.width = '100%';
          terminar();
        }
      }

      /* Minuto y medio para toda la ronda. */
      cuenta = api.cuenta(LIMITE, function () {
        if (acabado) return;
        acabado = true;
        api.sonar('fin');
        api.fin({
          sello: '✦',
          titulo: '¡Se acabó el tiempo!',
          mensaje: 'Respondiste ' + (indice + (respondida ? 1 : 0)) + ' de ' + TOTAL +
                   '. Lee rápido y fíate del primer instinto.',
          premio: aciertos >= OBJETIVO ? premio() : null,
          datos: [
            { val: aciertos, etq: 'Aciertos' },
            { val: (indice + (respondida ? 1 : 0)) + '/' + TOTAL, etq: 'Respondidas' }
          ]
        });
      });

      function terminar() {
        acabado = true;
        if (cuenta) cuenta.parar();
        var mensaje;
        if (aciertos >= 8) { mensaje = '¡Excelente! Sabes muchísimo de bienestar.'; api.sonar('gana'); }
        else if (aciertos >= 6) { mensaje = '¡Muy bien! Se nota que te cuidas.'; api.sonar('gana'); }
        else { mensaje = 'Buen intento. Cada partida es una oportunidad para aprender algo nuevo.'; api.sonar('fin'); }

        api.fin({
          sello: '✦',
          titulo: aciertos + ' de ' + TOTAL,
          mensaje: mensaje,
          premio: aciertos >= OBJETIVO ? premio() : null,
          datos: [
            { val: aciertos, etq: 'Aciertos' },
            { val: Math.round(aciertos / TOTAL * 100) + '%', etq: 'Puntaje' }
          ]
        });
      }

      /* Al salir del juego se devuelve el color de siempre a la app. */
      return function () { document.body.classList.remove('clinica'); };
    }
  });

})();
