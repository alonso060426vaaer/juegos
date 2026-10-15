/* ==========================================================================
   JUEGO 2 - TRIVIA DE BIENESTAR: preguntas con opcion multiple
   Viste el tema clinica con las piezas de assets/img/trivia: la escena de
   spa de fondo, los iconos de pregunta, estrella y cerebro, las letras de
   las opciones, la tarjeta "Tu bienestar nos importa", la frase en letra
   inglesa y las hojas (ver herramientas/preparar-assets-trivia.py).
   ========================================================================== */

(function () {
  'use strict';

  /* Preguntas de la clinica pensadas para cualquier cliente: sencillas,
     sin palabras tecnicas y con opciones falsas que se notan. */
  var BANCO = [
    { p: '¿Para qué sirve la toxina botulínica (bótox)?',
      o: ['Para suavizar las arrugas de expresión', 'Para bajar de peso', 'Para teñir el pelo', 'Para curar caries'], r: 0,
      d: 'Relaja el músculo que forma la arruga y la línea se suaviza.' },

    { p: '¿En qué zona de la cara se aplica más el bótox?',
      o: ['En la frente y alrededor de los ojos', 'En los pies', 'En las rodillas', 'En la espalda'], r: 0,
      d: 'Son las arrugas que aparecen al gesticular.' },

    { p: '¿Cuánto dura más o menos el efecto del bótox?',
      o: ['Unos meses', 'Para siempre', 'Un día', 'Una hora'], r: 0,
      d: 'Suele durar de 3 a 6 meses; luego se repite.' },

    { p: '¿Para qué sirven los rellenos o fillers?',
      o: ['Para dar volumen a labios, pómulos o mentón', 'Para quitar el vello', 'Para limpiar los dientes', 'Para cortar el pelo'], r: 0,
      d: 'Devuelven el volumen que se pierde con los años.' },

    { p: '¿Qué parte de la cara se trata más con rellenos?',
      o: ['Labios y pómulos', 'Uñas', 'Dientes', 'Cabello'], r: 0,
      d: 'También el mentón, la mandíbula y las ojeras.' },

    { p: '¿Qué se usa más para rellenar los labios?',
      o: ['Ácido hialurónico', 'Silicona de cocina', 'Agua con sal', 'Azúcar'], r: 0,
      d: 'Es una sustancia que el propio cuerpo fabrica.' },

    { p: '¿El ácido hialurónico quema la piel?',
      o: ['No, la hidrata', 'Sí, la quema', 'La tiñe de color', 'La arruga'], r: 0,
      d: 'A pesar de su nombre, retiene agua y da hidratación.' },

    { p: '¿Qué es el colágeno?',
      o: ['Lo que le da firmeza a la piel', 'Un tipo de azúcar', 'Un perfume', 'Un maquillaje'], r: 0,
      d: 'Es una proteína que mantiene la piel firme y elástica.' },

    { p: '¿Qué le pasa al colágeno con los años?',
      o: ['Va disminuyendo', 'Aumenta sin parar', 'Cambia de color', 'Nada'], r: 0,
      d: 'Por eso aparecen la flacidez y las arrugas.' },

    { p: '¿Qué es lo que más envejece la piel?',
      o: ['El sol sin protección', 'Dormir bien', 'Tomar agua', 'Sonreír'], r: 0,
      d: 'Por eso el protector solar es el mejor antiedad.' },

    { p: '¿Cada cuánto hay que volver a ponerse protector solar al aire libre?',
      o: ['Cada 2 horas', 'Una vez al año', 'Nunca', 'Una vez por semana'], r: 0,
      d: 'También después de nadar o sudar mucho.' },

    { p: '¿Hay que usar protector solar en los días nublados?',
      o: ['Sí, siempre', 'No, nunca', 'Solo en la playa', 'Solo de noche'], r: 0,
      d: 'Los rayos del sol atraviesan las nubes.' },

    { p: '¿Qué producto se usa a diario para proteger la piel del sol?',
      o: ['Protector solar', 'Perfume', 'Champú', 'Desodorante'], r: 0,
      d: 'Todos los días, en la cara, el cuello y las manos.' },

    { p: '¿Qué hace un peeling?',
      o: ['Renueva la piel y mejora las manchas', 'Rellena los labios', 'Pinta las uñas', 'Corta el pelo'], r: 0,
      d: 'Deja la piel más lisa y luminosa.' },

    { p: '¿Qué tratamiento ayuda con las manchas de la piel?',
      o: ['Un peeling', 'Un corte de pelo', 'Un masaje de pies', 'Una manicura'], r: 0,
      d: 'Después, protector solar siempre.' },

    { p: '¿Qué tratamiento ayuda a tonificar el abdomen sin hacer ejercicio?',
      o: ['Emsculpt', 'Un tinte', 'Una limpieza dental', 'Una manicura'], r: 0,
      d: 'El equipo contrae el músculo por ti mientras estás tumbado.' },

    { p: '¿En qué parte del cuerpo se aplica Emsculpt?',
      o: ['En el abdomen o los glúteos', 'En los ojos', 'En los dientes', 'En el pelo'], r: 0,
      d: 'Tonifica el músculo y define la figura.' },

    { p: '¿Qué tratamiento tensa la piel con ultrasonido, sin cirugía?',
      o: ['HIFU', 'Una manicura', 'La depilación con cera', 'Un tatuaje'], r: 0,
      d: 'Levanta y reafirma sin cortes.' },

    { p: '¿Qué tratamiento corporal reafirma la piel con radiofrecuencia?',
      o: ['Exilis', 'Un tinte', 'Un corte de pelo', 'Una manicura'], r: 0,
      d: 'El calor suave estimula el colágeno.' },

    { p: '¿Qué tratamiento limpia e hidrata la cara con un chorro de aire, sin agujas?',
      o: ['JetPeel', 'Una cirugía', 'Un tatuaje', 'Un piercing'], r: 0,
      d: 'Deja la piel fresca y luminosa al momento.' },

    { p: '¿Duele mucho el JetPeel?',
      o: ['No, no usa agujas', 'Muchísimo', 'Hay que dormir al paciente', 'Hay que operar'], r: 0,
      d: 'Se siente como una brisa fresca sobre la piel.' },

    { p: '¿Qué se usa en el tratamiento de plasma rico en plaquetas?',
      o: ['Tu propia sangre', 'Agua de mar', 'Leche', 'Barro'], r: 0,
      d: 'Se separa la parte de la sangre que ayuda a regenerar la piel.' },

    { p: '¿Qué es la celulitis?',
      o: ['La piel de naranja en muslos y glúteos', 'Una vitamina', 'Un champú', 'Un ejercicio'], r: 0,
      d: 'Es muy común, también en personas delgadas.' },

    { p: '¿Qué tratamiento ayuda con la celulitis con un masaje de rodillos?',
      o: ['La endermología', 'Un tinte de pelo', 'Una limpieza dental', 'La ortodoncia'], r: 0,
      d: 'Masajea, reafirma y mejora el aspecto de la piel.' },

    { p: '¿Qué son las patas de gallo?',
      o: ['Las arrugas al lado de los ojos', 'Un plato de comida', 'Un tatuaje', 'Un tipo de uña'], r: 0,
      d: 'Aparecen al sonreír y se suavizan con bótox.' },

    { p: '¿Qué son las líneas de expresión?',
      o: ['Arrugas que salen al gesticular', 'Tatuajes', 'Cicatrices', 'Lunares'], r: 0,
      d: 'Salen al repetir gestos como fruncir el ceño o sonreír.' },

    { p: '¿Para qué sirve una mesoterapia facial?',
      o: ['Para nutrir e hidratar la piel', 'Para blanquear los dientes', 'Para cortar el pelo', 'Para bajar la fiebre'], r: 0,
      d: 'Son pequeñas inyecciones de vitaminas en la piel.' },

    { p: '¿Qué tratamiento hidrata la piel desde dentro con pequeñas inyecciones?',
      o: ['Un skinbooster', 'Un tinte', 'Un masaje de pies', 'Una depilación'], r: 0,
      d: 'Deja la piel más luminosa y elástica.' },

    { p: '¿Qué tratamiento ayuda a mejorar las cicatrices de acné?',
      o: ['Las microagujas', 'Un champú', 'Una pedicura', 'Un tinte'], r: 0,
      d: 'Estimulan la piel para que se renueve.' },

    { p: '¿Qué es la papada?',
      o: ['La grasa o piel bajo el mentón', 'Un tipo de pelo', 'Una mancha en la mano', 'Una uña'], r: 0,
      d: 'Puede aparecer por genética, peso o flacidez.' },

    { p: '¿Se puede tratar la papada sin cirugía?',
      o: ['Sí, con equipos como el HIFU', 'No, nunca', 'Solo con dieta', 'Solo con cremas'], r: 0,
      d: 'El médico elige la mejor opción para cada caso.' },

    { p: '¿Quién debe aplicar los tratamientos con inyecciones?',
      o: ['Un médico especialista', 'Cualquier persona', 'Un amigo', 'Uno mismo en casa'], r: 0,
      d: 'Por seguridad, siempre en una clínica y con un profesional.' },

    { p: '¿Qué conviene hacer antes de cualquier tratamiento?',
      o: ['Una evaluación con el médico', 'Nada', 'Broncearse mucho', 'No comer en tres días'], r: 0,
      d: 'Así se elige el tratamiento adecuado para ti.' },

    { p: '¿Qué hay que hacer después de un tratamiento facial?',
      o: ['Seguir las indicaciones y usar protector', 'Tomar sol enseguida', 'Frotarse la cara fuerte', 'Nada'], r: 0,
      d: 'Así los resultados son mejores y duran más.' },

    { p: '¿Qué conviene evitar antes de un tratamiento con calor?',
      o: ['Quemarse con el sol', 'Dormir', 'Tomar agua', 'Desayunar'], r: 0,
      d: 'Con la piel quemada hay que esperar a que se recupere.' },

    { p: '¿Qué ayuda a que los resultados de un tratamiento duren más?',
      o: ['Cuidarse del sol e hidratarse', 'Fumar', 'Dormir poco', 'Tomar sol sin protector'], r: 0,
      d: 'Los buenos hábitos alargan los resultados.' },

    { p: '¿Qué hábito ayuda a tener una piel bonita?',
      o: ['Dormir bien y tomar agua', 'Fumar', 'Trasnochar', 'Tomar sol sin protección'], r: 0,
      d: 'La piel refleja cómo te cuidas.' },

    { p: '¿Qué vitamina ayuda a dar luminosidad a la piel?',
      o: ['La vitamina C', 'La sal', 'El azúcar', 'El café'], r: 0,
      d: 'Se usa mucho en sérums por la mañana.' },

    { p: '¿Los tratamientos estéticos son solo para mujeres?',
      o: ['No, también para hombres', 'Sí, solo para mujeres', 'Solo para niños', 'Solo para mayores de 80'], r: 0,
      d: 'Cada vez más hombres se hacen bótox, HIFU o Emsculpt.' },

    { p: '¿Qué zonas también conviene cuidar además de la cara?',
      o: ['El cuello y las manos', 'Solo las uñas', 'Solo el pelo', 'Ninguna'], r: 0,
      d: 'También muestran la edad y agradecen el protector.' }
  ];

  /* Dificultad alta: 8 preguntas en 35 segundos, hay que ir rapido. */
  var TOTAL = 8;
  var OBJETIVO = 4;                   // aciertos para llevarse el premio

  /* Piezas del tema: fotos de assets/img/trivia. */
  var RUTA = 'assets/img/trivia/';
  function foto(archivo, clase) {
    return '<img src="' + RUTA + archivo + '" alt="" aria-hidden="true"' +
           (clase ? ' class="' + clase + '"' : '') + '>';
  }
  var ICO_PREGUNTA = foto('icono-pregunta.png');
  var ICO_ESTRELLA = foto('icono-estrella.png');
  var ICO_CEREBRO  = foto('icono-cerebro.png');

  /* Fondo: la rama y las hojas, la tarjeta de bienestar, la frase en letra
     inglesa y el bloque de texto. */
  var DECORADO =
    foto('rama.png', 'deco-rama') +
    foto('hojas.png', 'deco-hojas-sueltas') +
    foto('bienestar.png', 'deco-bienestar') +
    foto('habitos.png', 'deco-habitos') +
    '<p class="deco-lema">Una vida más saludable también se nota por fuera</p>';

  App.registrar({
    id: 'trivia',
    nombre: '¿Cuánto sabes de tu piel?',
    emoji: '❓',
    desc: '¿Cuánto sabes de nuestros tratamientos?',
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
      vista.appendChild(h('p', { class: 'pie-trivia' },
        h('span', {}, 'Bienestar'), h('i', {}), h('span', {}, 'Conocimiento'), h('i', {}), h('span', {}, 'Una vida más plena')));

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
        if (aciertos >= 8) { mensaje = '¡Excelente! Conoces muy bien nuestros tratamientos.'; api.sonar('gana'); }
        else if (aciertos >= OBJETIVO) { mensaje = '¡Muy bien! Se nota que te cuidas.'; api.sonar('gana'); }
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
