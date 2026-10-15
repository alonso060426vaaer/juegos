/* ==========================================================================
   JUEGO 3 - ¿MITO O VERDAD?: decide si la frase es cierta o es un mito
   Viste el tema botanico (crema, verde salvia y oro): insignias del
   marcador, barra de progreso, tarjeta de pregunta, botones Verdad y Mito
   con sus iconos y la mascota que comenta desde su bocadillo. Las imagenes
   salen de assets/img/mitos (ver herramientas/preparar-assets-mitos.py).
   ========================================================================== */

(function () {
  'use strict';

  /* Solo cosas de la clinica: sus tratamientos, sus productos y los
     cuidados de antes y despues. */
  var FRASES = [
    { t: 'La toxina botulínica deja la cara sin expresión.', v: false,
      d: 'Bien aplicada, suaviza las líneas y conserva una expresión natural.' },

    { t: 'Los rellenos de ácido hialurónico son permanentes.', v: false,
      d: 'El cuerpo los reabsorbe poco a poco; suelen durar varios meses.' },

    { t: 'El cuerpo fabrica ácido hialurónico de forma natural.', v: true,
      d: 'Está en la piel y las articulaciones; con la edad se produce menos.' },

    { t: 'Los bioestimuladores rellenan al instante.', v: false,
      d: 'Actúan poco a poco: hacen que la piel fabrique su propio colágeno.' },

    { t: 'Con los años el cuerpo produce menos colágeno.', v: true,
      d: 'Por eso la piel pierde firmeza y aparecen arrugas.' },

    { t: 'La toxina botulínica también se usa en medicina, no solo en estética.', v: true,
      d: 'Por ejemplo, para la sudoración excesiva o algunas migrañas.' },

    { t: 'El efecto de la toxina botulínica dura para siempre.', v: false,
      d: 'Dura entre 3 y 6 meses, y luego se repite.' },

    { t: 'Un relleno de ácido hialurónico se puede disolver si hace falta.', v: true,
      d: 'Se usa una enzima llamada hialuronidasa.' },

    { t: 'Después de un peeling se puede tomar sol sin protector.', v: false,
      d: 'La piel renovada es más sensible: protector siempre.' },

    { t: 'El HIFU necesita cortes o cirugía.', v: false,
      d: 'Es ultrasonido focalizado aplicado sobre la piel, sin incisiones.' },

    { t: 'El plasma rico en plaquetas se saca de la sangre de un donante.', v: false,
      d: 'Se obtiene de tu propia sangre.' },

    { t: 'Con Emsculpt se trabaja el músculo mientras estás tumbado.', v: true,
      d: 'El equipo provoca las contracciones por ti.' },

    { t: 'El JetPeel usa agujas.', v: false,
      d: 'Trabaja con un chorro de aire y suero, sin pinchazos.' },

    { t: 'Morpheus combina microagujas y radiofrecuencia.', v: true,
      d: 'Así tensa la piel desde dentro.' },

    { t: 'La endermología es un masaje con rodillos y succión.', v: true,
      d: 'Ayuda con la celulitis y a reafirmar.' },

    { t: 'Los resultados de la radiofrecuencia siguen mejorando semanas después.', v: true,
      d: 'Es el tiempo que tarda en formarse el colágeno nuevo.' },

    { t: 'Con una sola sesión de cualquier tratamiento basta para siempre.', v: false,
      d: 'Muchos tratamientos necesitan varias sesiones y mantenimiento.' },

    { t: 'El protector solar ayuda a que los resultados de los tratamientos duren más.', v: true,
      d: 'El sol es lo que más acelera el envejecimiento de la piel.' },

    { t: 'La mesoterapia son microinyecciones en la piel.', v: true,
      d: 'Llevan vitaminas, ácido hialurónico u otros activos.' },

    { t: 'Los polinucleótidos son un tipo de toxina.', v: false,
      d: 'Son fragmentos de ADN que ayudan a reparar la piel.' },

    { t: 'Los exosomas son células madre.', v: false,
      d: 'Son vesículas que las células usan para enviarse señales.' },

    { t: 'Los skinboosters sirven para aumentar mucho el volumen de los labios.', v: false,
      d: 'Hidratan y mejoran la calidad de la piel; el volumen se da con fillers.' },

    { t: 'Después de las microagujas hay que esperar para maquillarse.', v: true,
      d: 'Se recomienda dejar descansar la piel al menos un día.' },

    { t: 'El retinol se usa mejor de noche.', v: true,
      d: 'Sensibiliza la piel al sol.' },

    { t: 'La vitamina C en sérum es un antioxidante.', v: true,
      d: 'Protege del daño ambiental y da luminosidad.' },

    { t: 'Los tratamientos estéticos son solo para mujeres.', v: false,
      d: 'Cada vez más hombres se hacen toxina, HIFU o Emsculpt.' },

    { t: 'Hay que contarle al médico qué medicamentos tomas antes de un tratamiento.', v: true,
      d: 'Algunos medicamentos cambian cómo se hace o cuándo.' },

    { t: 'Si una crema pica mucho, es que está funcionando.', v: false,
      d: 'El picor o el ardor suelen ser señal de irritación.' },

    { t: 'Exfoliarse todos los días deja la piel más sana.', v: false,
      d: 'En exceso irrita la piel. Una o dos veces por semana basta.' },

    { t: 'Cosmelan es un tratamiento para las manchas.', v: true,
      d: 'Es de Mesoestetic y trata sobre todo el melasma.' },

    { t: 'Se puede hacer radiofrecuencia con la piel quemada por el sol.', v: false,
      d: 'Primero hay que esperar a que la piel se recupere.' },

    { t: 'Las patas de gallo se pueden suavizar con toxina botulínica.', v: true,
      d: 'Es una de las zonas que mejor responden.' },

    { t: 'La celulitis solo aparece en personas con sobrepeso.', v: false,
      d: 'Es muy común también en personas delgadas; influyen hormonas y genética.' },

    { t: 'Las estrías solo les salen a las mujeres.', v: false,
      d: 'También aparecen en hombres, por ejemplo con cambios de peso o de músculo.' },

    { t: 'Sculptra es un relleno de ácido hialurónico.', v: false,
      d: 'Es ácido poli-L-láctico, un bioestimulador.' },

    { t: 'HArmonyCa combina ácido hialurónico e hidroxiapatita cálcica.', v: true,
      d: 'Da efecto lifting y además estimula colágeno.' },

    { t: 'Los fillers solo se usan en los labios.', v: false,
      d: 'También en pómulos, mentón, mandíbula y ojeras.' },

    { t: 'La papada se puede tratar sin cirugía.', v: true,
      d: 'Hay opciones como el HIFU o la radiofrecuencia, según cada caso.' },

    { t: 'El cuello y las manos también delatan la edad.', v: true,
      d: 'Conviene cuidarlos y ponerles protector igual que a la cara.' },

    { t: 'Las pieles oscuras no necesitan protector solar.', v: false,
      d: 'También sufren manchas y daño por el sol.' }
  ];

  /* Dificultad alta: 10 frases en 35 segundos. */
  var TOTAL = 10;
  var OBJETIVO = 5;                   // aciertos para llevarse el premio
  var ESPERA = 2000;                  // ms que se ve el veredicto antes de pasar solo
  var PUNTOS_ACIERTO = 10;            // puntos por respuesta correcta

  var RUTA = 'assets/img/mitos/';
  function img(archivo, clase) {
    return h('img', { class: clase || null, src: RUTA + archivo, alt: '', 'aria-hidden': 'true' });
  }

  App.registrar({
    id: 'mitos',
    nombre: '¿Mito o Verdad?',
    emoji: '⚖️',
    desc: '¿Cierto o puro cuento?',
    sub: 'Verdad o mito',

    iniciar: function (vista, api) {
      var rondas = tomar(FRASES, TOTAL);
      var indice = 0;
      var aciertos = 0;
      var cuenta = null, acabado = false;
      var respondida = false;

      var puntos = 0;
      var barraI = h('i', { estilo: 'width:0%' });
      var barraEtq = h('span', { class: 'progreso-etq' }, '0/' + TOTAL);
      var valorRonda = h('span', { class: 'val' }, '1');
      var valorAciertos = h('span', { class: 'val' }, '0');
      var valorPuntos = h('span', { class: 'val' }, '0');

      var frase = h('p', { class: 'frase-mito' });
      var veredicto = h('div', { class: 'veredicto', hidden: true });
      var destellos = img('destellos.png', 'destellos');

      var botonVerdad = h('button', { class: 'btn-juicio es-verdad' },
        img('icono-correcto.png', 'juicio-icono'),
        h('span', {}, 'Verdad')
      );
      var botonMito = h('button', { class: 'btn-juicio es-mito' },
        img('icono-incorrecto.png', 'juicio-icono'),
        h('span', {}, 'Mito')
      );
      var botones = h('div', { class: 'juicios' }, botonVerdad, botonMito);

      botonVerdad.addEventListener('click', function () { responder(true); });
      botonMito.addEventListener('click', function () { responder(false); });

      /* la mascota comenta desde su bocadillo */
      var aviso = h('p', { class: 'aviso bocadillo-texto' }, 'Lee la frase y decide: ¿verdad o mito?');
      var bocadillo = h('div', { class: 'bocadillo' }, aviso);
      var guia = h('div', { class: 'guia' }, bocadillo, img('avatar.png', 'guia-avatar'));

      vista.classList.add('tema-botanico');
      vista.appendChild(h('div', { class: 'botanico-deco', 'aria-hidden': 'true' },
        img('hojas.png', 'deco-hojas-izq'),
        img('hojas.png', 'deco-hojas-der'),
        img('anillo.png', 'deco-anillo')
      ));

      function dato(insignia, val, etq) {
        return h('div', { class: 'dato dato-insignia' },
          img(insignia),
          h('div', { class: 'dato-texto' }, val, h('span', { class: 'etq' }, etq)));
      }

      vista.appendChild(h('div', { class: 'marcador' },
        dato('insignia-ronda.png', valorRonda, 'Ronda'),
        dato('insignia-aciertos.png', valorAciertos, 'Aciertos'),
        dato('insignia-puntos.png', valorPuntos, 'Puntos')
      ));
      vista.appendChild(h('div', { class: 'progreso-fila' }, h('div', { class: 'progreso' }, barraI), barraEtq));
      vista.appendChild(h('div', { class: 'centro' },
        h('div', { class: 'panel tarjeta-mito' },
          h('span', { class: 'rotulo' }, 'Pregunta'),
          frase,
          veredicto,
          destellos
        ),
        botones,
        guia
      ));
      vista.appendChild(h('p', { class: 'pie-botanico' },
        img('hoja.png', 'pie-hoja'),
        h('span', {}, 'Ciencia · Estética · Bienestar')));
      pintar();

      /** El bocadillo cambia de cara: '' normal, 'ok' verde, 'mal' rosa. */
      function animo(estado) {
        bocadillo.classList.remove('ok', 'mal');
        if (estado) bocadillo.classList.add(estado);
      }

      function pintarProgreso(hechas) {
        barraI.style.width = (hechas / TOTAL * 100) + '%';
        barraEtq.textContent = hechas + '/' + TOTAL;
      }

      function pintar() {
        respondida = false;
        var actual = rondas[indice];
        api.sub('Ronda ' + (indice + 1) + ' de ' + TOTAL);
        valorRonda.textContent = (indice + 1);
        pintarProgreso(indice);

        frase.textContent = actual.t;
        veredicto.hidden = true;
        veredicto.className = 'veredicto';
        destellos.classList.remove('brilla');
        animo('');
        aviso.textContent = 'Lee la frase y decide: ¿verdad o mito?';
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

        if (correcto) {
          aciertos++;
          puntos += PUNTOS_ACIERTO;
          valorAciertos.textContent = aciertos;
          valorPuntos.textContent = puntos;
          api.sonar('bien');
          destellos.classList.add('brilla');
          animo('ok');
          aviso.textContent = '¡Muy bien! Sigue así.';
        } else {
          api.sonar('mal');
          animo('mal');
          aviso.textContent = 'Casi. Fíjate en la explicación.';
        }
        pintarProgreso(indice + 1);

        veredicto.innerHTML = '';
        veredicto.className = 'veredicto ' + (correcto ? 'ok' : 'mal');
        veredicto.appendChild(h('p', { class: 'veredicto-titulo' },
          correcto
            ? '¡Correcto! Es ' + (actual.v ? 'verdad' : 'un mito') + '  ·  +' + PUNTOS_ACIERTO + ' puntos'
            : 'Incorrecto. En realidad es ' + (actual.v ? 'verdad' : 'un mito')));
        veredicto.appendChild(h('p', { class: 'veredicto-texto' }, actual.d));
        veredicto.hidden = false;

        /* Pasa solo a la siguiente: en el totem nadie tiene que buscar el boton */
        api.luego(function () {
          if (!acabado) avanzar();
        }, ESPERA);
      }

      function avanzar() {
        if (indice < TOTAL - 1) { indice++; pintar(); }
        else { pintarProgreso(TOTAL); terminar(); }
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
            { val: puntos, etq: 'Puntos' },
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
            { val: puntos, etq: 'Puntos' },
            { val: (TOTAL - aciertos), etq: 'Fallos' }
          ]
        });
      }

      return null;
    }
  });

})();
