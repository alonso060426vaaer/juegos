/* ==========================================================================
   JUEGO - ADIVINA LA PALABRA: cuatro pistas y un hueco por letra
   Al estilo del clasico "4 fotos 1 palabra", con los tratamientos de la
   clinica: cuatro fotos de verdad y el cliente adivina cual es.
   Viste el tema crema (crema, oro y marron): el fondo con las ondas y las
   hojas doradas, pastillas con corona y estrella, fichas de letra con canto
   y el boton de pista con su bombilla. Las imagenes salen de
   assets/img/palabra (ver herramientas/preparar-assets-palabra.py).
   ========================================================================== */

(function () {
  'use strict';

  /* Cada tratamiento con sus cuatro fotos. 'fotos' es el nombre de los
     archivos: <fotos>-1.jpg ... <fotos>-4.jpg, recortados de las laminas
     del escritorio (ver herramientas/preparar-fotos-tratamientos.py). En
     los recortes no sale ni el nombre del tratamiento ni los pies de foto:
     seria regalar la respuesta. */
  var PALABRAS = [
    { p: 'TOXINA', fotos: 'toxina',
      dato: 'La toxina botulínica relaja el músculo y suaviza las líneas de expresión.' },
    { p: 'FILLERS', fotos: 'fillers',
      dato: 'Los fillers son ácido hialurónico: devuelven volumen y definen el contorno.' },
    { p: 'EXION', fotos: 'exion',
      dato: 'Exion trabaja con radiofrecuencia y ultrasonido, sin agujas ni pinchazos.' },
    { p: 'EXOSOMAS', fotos: 'exosomas',
      dato: 'Los exosomas llevan a las células las señales para regenerar la piel.' },
    { p: 'MORPHEUS', fotos: 'morpheus',
      dato: 'Morpheus une microagujas y radiofrecuencia: tensa la piel desde dentro.' },
    { p: 'MESOTERAPIA', fotos: 'mesoterapia',
      dato: 'La mesoterapia son microinyecciones de vitaminas e hialurónico en la piel.' },
    { p: 'POLINUCLEOTIDOS', fotos: 'polinucleotidos',
      dato: 'Los polinucleótidos reparan la piel por dentro y mejoran su calidad.' },
    { p: 'BIOESTIMULADORES', fotos: 'bioestimuladores',
      dato: 'Los bioestimuladores no rellenan: hacen que tu piel fabrique su colágeno.' },
    /* Estos nueve vienen de internet, no de las laminas: ver
       herramientas/preparar-fotos-tratamientos-web.py */
    { p: 'PEELING', fotos: 'peeling',
      dato: 'El peeling renueva la capa superficial de la piel y unifica el tono.' },
    { p: 'HIFU', fotos: 'hifu',
      dato: 'El HIFU es ultrasonido focalizado: tensa la piel en profundidad, sin cirugía.' },
    { p: 'EXILIS', fotos: 'exilis',
      dato: 'Exilis combina radiofrecuencia y ultrasonido para reafirmar y reducir grasa.' },
    { p: 'EMSCULPT', fotos: 'emsculpt',
      dato: 'Emsculpt contrae el músculo miles de veces por sesión: tonifica sin ejercicio.' },
    { p: 'JETPEEL', fotos: 'jetpeel',
      dato: 'JetPeel limpia e hidrata con un chorro de aire y suero, sin agujas.' },
    { p: 'ENDERMOLOGIA', fotos: 'endermologia',
      dato: 'La endermología masajea con rodillos y succión: reafirma y combate la celulitis.' },
    { p: 'SKINBOOSTER', fotos: 'skinbooster',
      dato: 'Un skinbooster hidrata la piel desde dentro con microinyecciones de hialurónico.' },
    { p: 'PLASMA', fotos: 'plasma',
      dato: 'El plasma rico en plaquetas usa tu propia sangre para regenerar la piel y el cabello.' },
    { p: 'MICROAGUJAS', fotos: 'microagujas',
      dato: 'Las microagujas estimulan el colágeno y ayudan a que los activos penetren mejor.' }
  ];

  /* Fondos de las cuatro pistas: los mismos cuatro tonos del kit. */
  var PAPELES = [
    'linear-gradient(155deg,#BFE2F5 0%,#8FC7E8 100%)',
    'linear-gradient(155deg,#FAD9C4 0%,#F2B896 100%)',
    'linear-gradient(155deg,#F8C9DC 0%,#EFA6C2 100%)',
    'linear-gradient(155deg,#C7EAD2 0%,#9FD3B2 100%)'
  ];

  var RUTA = 'assets/img/palabra/';
  var RUTA_FOTOS = 'assets/img/palabra/tratamientos/';
  function img(archivo, clase) {
    return h('img', { class: clase || null, src: RUTA + archivo, alt: '', 'aria-hidden': 'true' });
  }

  /* ---------------------------------------------------------------
     CUANTA AYUDA SE DA

     Los nombres de los tratamientos son largos y tecnicos: dieciseis
     huecos vacios y una bandeja de veinte letras no se sacan en un minuto
     y el cliente se rinde. Asi que el juego reparte ayuda de tres maneras,
     y con eso si sale:

       1. De salida ya vienen puestas un tercio de las letras.
       2. El boton de pista destapa otra, y hay de sobra.
       3. Si falla el intento, se destapa una gratis. Nunca se retrocede.

     Las letras regaladas quedan fijas: tocarlas no las quita, para que
     nadie deshaga sin querer lo que ya tenia ganado.
     --------------------------------------------------------------- */
  var RONDA = 4;                      // palabras por partida (de las 17 que hay)
  var PISTAS_MAX = 6;                 // pistas para toda la partida
  var OBJETIVO = 2;                   // palabras acertadas para llevarse el premio
  var REGALO = 0.34;                  // parte de la palabra que viene ya puesta
  var PAJA = 4;                       // letras de sobra en la bandeja
  var LARGA = 10;                     // de aqui en adelante los huecos se encogen
  var ABECEDARIO = 'ABCDEFGHILMNOPRSTUX';

  App.registrar({
    id: 'palabra',
    nombre: 'Adivina la Palabra',
    emoji: '🔤',
    desc: 'Cuatro pistas, una sola palabra',
    sub: 'Vocabulario',

    iniciar: function (vista, api) {

      var lista = tomar(PALABRAS, RONDA);
      var indice = 0, aciertos = 0, pistas = 0;
      var actual = null, huecos = [], fichas = [], bloqueado = false;
      var cuenta = null, acabado = false;

      /* ------------------------- Pantalla ------------------------- */
      var valPalabra = h('span', { class: 'val' }, '1/' + RONDA);
      var valAciertos = h('span', { class: 'val' }, '0');

      var fotos = h('div', { class: 'fotos' });
      var filaHuecos = h('div', { class: 'huecos' });
      var filaLetras = h('div', { class: 'letras' });
      var aviso = h('p', { class: 'aviso' }, 'Mira las cuatro pistas y forma la palabra');

      var textoPista = h('span', { class: 'pista-texto' },
        'Pista: descubrir una letra (' + PISTAS_MAX + ')');
      var btnPista = h('button', {
        class: 'btn btn-pista btn-ancho',
        onclick: function () { darPista(); }
      }, img('bombilla.png', 'pista-bombilla'), textoPista);

      vista.classList.add('tema-crema');
      vista.appendChild(h('div', { class: 'crema-deco', 'aria-hidden': 'true' },
        img('hoja-1.png', 'deco-hoja-1'),
        img('hoja-2.png', 'deco-hoja-2'),
        img('trazo.png', 'deco-trazo'),
        img('destello.png', 'deco-destello')
      ));

      function dato(icono, val, etq) {
        return h('div', { class: 'dato' },
          img(icono, 'dato-icono'),
          h('span', { class: 'dato-texto' }, val, h('span', { class: 'etq' }, etq)));
      }

      vista.appendChild(h('div', { class: 'marcador' },
        dato('corona.png', valPalabra, 'Palabra'),
        dato('estrella.png', valAciertos, 'Aciertos')
      ));
      vista.appendChild(h('div', { class: 'centro centro-palabra' }, fotos, filaHuecos, filaLetras, aviso));
      vista.appendChild(h('div', { class: 'pie-accion' }, btnPista));
      vista.appendChild(img('divisor.png', 'crema-divisor'));

      /* Minuto y medio para toda la ronda. */
      cuenta = api.cuenta(LIMITE, function () {
        if (acabado) return;
        acabado = true;
        bloqueado = true;
        api.sonar('fin');
        api.fin({
          sello: '✦',
          titulo: '¡Se acabó el tiempo!',
          mensaje: aciertos >= OBJETIVO
            ? 'Buen ritmo. Con un poco más de prisa las sacas todas.'
            : 'Truco: toca la bombilla, que hay pistas de sobra.',
          premio: aciertos >= OBJETIVO ? premio() : null,
          datos: [
            { val: aciertos + '/' + RONDA, etq: 'Aciertos' },
            { val: pistas, etq: 'Pistas' }
          ]
        });
      });

      /* ------------------------- Montar palabra ------------------------- */
      function montar() {
        actual = lista[indice];
        bloqueado = false;
        huecos = [];
        fichas = [];
        valPalabra.textContent = (indice + 1) + '/' + RONDA;
        api.sub('Palabra ' + (indice + 1) + ' de ' + RONDA);
        aviso.textContent = 'Mira las cuatro pistas y forma la palabra';
        btnPista.disabled = pistas >= PISTAS_MAX;

        fotos.innerHTML = '';
        for (var f = 0; f < 4; f++) {
          /* --papel es el color del marco mientras la foto no ha cargado */
          fotos.appendChild(h('div', {
            class: 'foto',
            estilo: 'animation-delay:' + (f * 70) + 'ms; --papel:' + PAPELES[f % PAPELES.length],
            'aria-hidden': 'true'
          }, h('img', {
            src: RUTA_FOTOS + actual.fotos + '-' + (f + 1) + '.jpg',
            alt: '', loading: 'eager'
          })));
        }

        filaHuecos.innerHTML = '';
        filaHuecos.className = 'huecos' + (actual.p.length > LARGA ? ' larga' : '');
        actual.p.split('').forEach(function (letra, i) {
          var hueco = h('button', {
            class: 'hueco',
            'aria-label': 'Letra ' + (i + 1),
            onclick: function () { quitar(i); }
          }, '');
          hueco.dataset.ficha = '';
          huecos.push(hueco);
          filaHuecos.appendChild(hueco);
        });

        /* letras de la palabra + relleno hasta completar la bandeja. La
           bandeja va en filas completas: dos filas si son pocas letras y
           tres si son muchas, y se rellena hasta cerrar la ultima. */
        var letras = actual.p.split('');
        var total = actual.p.length + PAJA;
        var filas = total <= 10 ? 2 : 3;
        var cols = Math.ceil(total / filas);
        var cupo = filas * cols;
        filaLetras.style.setProperty('--cols', cols);
        while (letras.length < cupo) {
          letras.push(ABECEDARIO.charAt(entero(0, ABECEDARIO.length - 1)));
        }
        letras = mezclar(letras);

        filaLetras.innerHTML = '';
        letras.forEach(function (letra, i) {
          var ficha = h('button', {
            class: 'letra-ficha',
            estilo: 'animation-delay:' + (i * 30) + 'ms',
            onclick: function () { poner(i); }
          }, letra);
          fichas.push({ letra: letra, el: ficha, usada: false });
          filaLetras.appendChild(ficha);
        });

        repartirSalida();
      }

      /* ------------------------- La ayuda ------------------------- */
      /** Que huecos vienen ya puestos: el primero y el resto repartidos. */
      function sitiosDeSalida(palabra) {
        /* las de doce letras para arriba llevan dos de propina: con un
           minuto de reloj, un nombre asi no sale de otra manera */
        var cuantas = Math.max(1, Math.round(palabra.length * REGALO)) +
                      (palabra.length > 12 ? 2 : 0);
        var paso = palabra.length / cuantas;
        var sitios = [0];
        for (var i = 1; i < cuantas; i++) {
          var s = Math.round(i * paso);
          if (s < palabra.length && sitios.indexOf(s) < 0) sitios.push(s);
        }
        return sitios;
      }

      function repartirSalida() {
        var sitios = sitiosDeSalida(actual.p);
        for (var i = 0; i < sitios.length; i++) destapar(sitios[i]);
      }

      /** Pone en ese hueco la letra que le toca y la deja fija. */
      function destapar(iHueco) {
        if (iHueco < 0 || iHueco >= huecos.length) return false;
        if (huecos[iHueco].dataset.ficha !== '') return false;
        var buscada = actual.p.charAt(iHueco);
        for (var vuelta = 0; vuelta < 2; vuelta++) {
          for (var i = 0; i < fichas.length; i++) {
            if (!fichas[i].usada && fichas[i].letra === buscada) {
              colocar(i, iHueco);
              huecos[iHueco].classList.add('dado');
              return true;
            }
          }
          /* Todas las fichas con esa letra estan puestas en otros huecos
             (mal colocadas): se quita una y se vuelve a buscar. Antes la
             pista se quedaba sin hacer nada en ese caso. */
          for (var k = 0; k < huecos.length; k++) {
            if (k !== iHueco && huecos[k].textContent === buscada &&
                !huecos[k].classList.contains('dado')) {
              quitarSuave(k);
              break;
            }
          }
        }
        return false;
      }

      /** Destapa la primera letra que falte; dice si lo consiguio. */
      function destaparUna() {
        return destapar(primerVacio());
      }

      /* ------------------------- Poner y quitar ------------------------- */
      function primerVacio() {
        for (var i = 0; i < huecos.length; i++) {
          if (huecos[i].dataset.ficha === '') return i;
        }
        return -1;
      }

      function poner(iFicha) {
        if (bloqueado) return;
        if (fichas[iFicha].usada) return;
        var hueco = primerVacio();
        if (hueco < 0) return;
        colocar(iFicha, hueco);
        api.sonar('toque');
        if (primerVacio() < 0) api.luego(comprobar, 260);
      }

      /** El trabajo de poner una ficha en un hueco, sin sonido ni
          comprobaciones: lo usan el dedo del cliente y tambien las ayudas. */
      function colocar(iFicha, iHueco) {
        var ficha = fichas[iFicha];
        ficha.usada = true;
        ficha.el.classList.add('usada');
        huecos[iHueco].textContent = ficha.letra;
        huecos[iHueco].dataset.ficha = String(iFicha);
        huecos[iHueco].classList.add('lleno');
      }

      function quitar(iHueco) {
        if (bloqueado) return;
        if (huecos[iHueco].classList.contains('dado')) return;   // regalada: se queda
        var ref = huecos[iHueco].dataset.ficha;
        if (ref === '') return;
        var ficha = fichas[parseInt(ref, 10)];
        ficha.usada = false;
        ficha.el.classList.remove('usada');
        huecos[iHueco].textContent = '';
        huecos[iHueco].dataset.ficha = '';
        huecos[iHueco].classList.remove('lleno');
        api.sonar('toque');
      }

      function darPista() {
        if (bloqueado || pistas >= PISTAS_MAX) return;
        if (!destaparUna()) return;
        pistas++;
        api.sonar('toque');
        textoPista.textContent = pistas >= PISTAS_MAX
          ? 'Sin pistas'
          : 'Pista: descubrir una letra (' + (PISTAS_MAX - pistas) + ')';
        btnPista.disabled = pistas >= PISTAS_MAX;
        if (primerVacio() < 0) api.luego(comprobar, 260);
      }

      /* ------------------------- Comprobar ------------------------- */
      function comprobar() {
        if (bloqueado || primerVacio() >= 0) return;   // ya resuelta, o le quitaron una letra
        var intento = '';
        for (var i = 0; i < huecos.length; i++) intento += huecos[i].textContent;

        if (intento === actual.p) {
          bloqueado = true;
          aciertos++;
          valAciertos.textContent = aciertos;
          api.sonar('bien');
          for (var b = 0; b < huecos.length; b++) huecos[b].classList.add('bien');
          aviso.textContent = actual.dato;
          btnPista.disabled = true;
          api.luego(siguiente, 2200);
        } else {
          bloqueado = true;
          api.sonar('mal');
          for (var m = 0; m < huecos.length; m++) huecos[m].classList.add('mal');
          aviso.textContent = 'Esa no es. Te dejo una letra más';
          api.luego(function () {
            for (var k = huecos.length - 1; k >= 0; k--) {
              huecos[k].classList.remove('mal');
              quitarSuave(k);
            }
            destaparUna();                      // nunca se retrocede: una gratis
            aviso.textContent = 'Casi: ya tienes una letra más. Prueba otra vez';
            bloqueado = false;
            if (primerVacio() < 0) api.luego(comprobar, 260);
          }, 700);
        }
      }

      function quitarSuave(iHueco) {
        if (huecos[iHueco].classList.contains('dado')) return;    // regalada: se queda
        var ref = huecos[iHueco].dataset.ficha;
        if (ref === '') return;
        var ficha = fichas[parseInt(ref, 10)];
        ficha.usada = false;
        ficha.el.classList.remove('usada');
        huecos[iHueco].textContent = '';
        huecos[iHueco].dataset.ficha = '';
        huecos[iHueco].classList.remove('lleno');
      }

      function siguiente() {
        indice++;
        if (indice >= lista.length) { acabar(); return; }
        montar();
      }

      function acabar() {
        acabado = true;
        if (cuenta) cuenta.parar();
        api.sonar('gana');
        api.fin({
          sello: '✦',
          titulo: aciertos === RONDA ? '¡Todas acertadas!' : 'Fin de la ronda',
          mensaje: aciertos === RONDA
            ? (pistas === 0 ? 'Y sin usar ni una pista. Impecable.' : 'Muy bien, con ' + pistas + ' pista(s).')
            : 'Has acertado ' + aciertos + ' de ' + RONDA + '. ¿Otra ronda?',
          premio: aciertos >= OBJETIVO ? premio() : null,
          datos: [
            { val: aciertos + '/' + RONDA, etq: 'Aciertos' },
            { val: pistas, etq: 'Pistas' }
          ]
        });
      }

      montar();
      return null;
    }
  });

})();
