/* ==========================================================================
   JUEGO - ADIVINA LA PALABRA: cuatro pistas y un hueco por letra
   Al estilo del clasico "4 fotos 1 palabra", con vocabulario de estetica.
   ========================================================================== */

(function () {
  'use strict';

  var PALABRAS = [
    { p: 'SERUM',    fotos: ['💧', '🧴', '🔬', '✨'],
      dato: 'El sérum es más concentrado que una crema: se pone antes.' },
    { p: 'MASAJE',   fotos: ['💆', '🤲', '🪷', '🛁'],
      dato: 'El masaje activa la circulación y ayuda a soltar la tensión.' },
    { p: 'CEJAS',    fotos: ['👁️', '✏️', '🪞', '💇'],
      dato: 'Unas cejas bien definidas enmarcan la mirada.' },
    { p: 'FACIAL',   fotos: ['💆', '🧴', '🪞', '✨'],
      dato: 'Un facial completo limpia, exfolia, hidrata y protege.' },
    { p: 'AROMA',    fotos: ['🕯️', '🌸', '👃', '🌿'],
      dato: 'La aromaterapia usa aceites esenciales para relajar.' },
    { p: 'BELLEZA',  fotos: ['🌸', '💄', '🪞', '✨'],
      dato: 'La belleza se cuida por dentro y por fuera.' },
    { p: 'RELAJAR',  fotos: ['🧘', '🕯️', '🛀', '🎵'],
      dato: 'Relajarse también es un tratamiento: el estrés se nota en la piel.' },
    { p: 'LIMPIEZA', fotos: ['🧼', '🫧', '🚿', '✨'],
      dato: 'La limpieza facial retira maquillaje, grasa y contaminación.' },
    { p: 'HIDRATAR', fotos: ['💧', '🥤', '🧴', '🌊'],
      dato: 'Hidratar es retener el agua en la piel, no solo mojarla.' },
    { p: 'EXFOLIAR', fotos: ['🧂', '🧽', '🤲', '✨'],
      dato: 'Exfoliar una o dos veces por semana basta; más irrita.' },
    { p: 'RADIANTE', fotos: ['☀️', '✨', '💫', '🌟'],
      dato: 'Una piel radiante suele ser una piel bien descansada.' },
    { p: 'VITAMINA', fotos: ['🍊', '💊', '🥝', '☀️'],
      dato: 'La vitamina C ayuda a unificar el tono de la piel.' },
    { p: 'COLAGENO', fotos: ['🧬', '💊', '🪷', '✨'],
      dato: 'El colágeno da firmeza y baja de forma natural con los años.' },
    { p: 'DEPILAR',  fotos: ['🪒', '🌿', '🦵', '✨'],
      dato: 'Depilar con cera arranca el vello desde la raíz.' },
    { p: 'MANOS',    fotos: ['🤲', '💅', '🧴', '💍'],
      dato: 'Las manos delatan la edad: también necesitan protector solar.' },
    { p: 'SOMBRA',   fotos: ['👁️', '🎨', '🖌️', '✨'],
      dato: 'La sombra de ojos se difumina siempre hacia fuera.' }
  ];

  /* Fondos de las cuatro pistas, para que parezcan cuatro fotos distintas. */
  var PAPELES = [
    'linear-gradient(155deg,#CDE7F7 0%,#8FBEDF 100%)',
    'linear-gradient(155deg,#FBE4D3 0%,#EFB694 100%)',
    'linear-gradient(155deg,#F9DCE6 0%,#E3A6BD 100%)',
    'linear-gradient(155deg,#DBF0E2 0%,#A5CCB3 100%)'
  ];

  var RONDA = 7;                      // palabras por partida
  var FICHAS = 14;                    // letras que se ofrecen (mas paja)
  var PISTAS_MAX = 2;                 // pistas disponibles en toda la partida
  var OBJETIVO = 5;                   // palabras acertadas para llevarse el premio
  var ABECEDARIO = 'ABCDEFGHIJLMNOPRSTUV';

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

      var btnPista = h('button', {
        class: 'btn btn-suave btn-ancho',
        onclick: function () { darPista(); }
      }, 'Pista: descubrir una letra (' + PISTAS_MAX + ')');

      vista.appendChild(h('div', { class: 'marcador' },
        h('div', { class: 'dato' }, valPalabra, h('span', { class: 'etq' }, 'Palabra')),
        h('div', { class: 'dato' }, valAciertos, h('span', { class: 'etq' }, 'Aciertos'))
      ));
      vista.appendChild(h('div', { class: 'centro centro-palabra' }, fotos, filaHuecos, filaLetras, aviso));
      vista.appendChild(h('div', { class: 'pie-accion' }, btnPista));

      /* Minuto y medio para toda la ronda. */
      cuenta = api.cuenta(LIMITE, function () {
        if (acabado) return;
        acabado = true;
        bloqueado = true;
        api.sonar('fin');
        api.fin({
          sello: '✦',
          titulo: '¡Se acabó el tiempo!',
          mensaje: aciertos >= 4
            ? 'Buen ritmo. Con un poco más de prisa las sacas todas.'
            : 'Truco: mira primero cuántas letras tiene la palabra.',
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
        actual.fotos.forEach(function (emoji, i) {
          /* --papel es el fondo de cada "foto": cuatro tonos distintos */
          fotos.appendChild(h('div', {
            class: 'foto',
            estilo: 'animation-delay:' + (i * 70) + 'ms; --papel:' + PAPELES[i % PAPELES.length],
            'aria-hidden': 'true'
          }, h('span', {}, emoji)));
        });

        filaHuecos.innerHTML = '';
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

        /* letras de la palabra + relleno hasta completar la bandeja */
        var letras = actual.p.split('');
        while (letras.length < FICHAS) {
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
        var ficha = fichas[iFicha];
        if (ficha.usada) return;
        var hueco = primerVacio();
        if (hueco < 0) return;

        ficha.usada = true;
        ficha.el.classList.add('usada');
        huecos[hueco].textContent = ficha.letra;
        huecos[hueco].dataset.ficha = String(iFicha);
        huecos[hueco].classList.add('lleno');
        api.sonar('toque');

        if (primerVacio() < 0) api.luego(comprobar, 260);
      }

      function quitar(iHueco) {
        if (bloqueado) return;
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
        var hueco = primerVacio();
        if (hueco < 0) return;
        var buscada = actual.p.charAt(hueco);
        for (var i = 0; i < fichas.length; i++) {
          if (!fichas[i].usada && fichas[i].letra === buscada) {
            pistas++;
            btnPista.textContent = pistas >= PISTAS_MAX
              ? 'Sin pistas'
              : 'Pista: descubrir una letra (' + (PISTAS_MAX - pistas) + ')';
            btnPista.disabled = pistas >= PISTAS_MAX;
            poner(i);
            return;
          }
        }
      }

      /* ------------------------- Comprobar ------------------------- */
      function comprobar() {
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
          aviso.textContent = 'Esa no es. Prueba otra vez';
          api.luego(function () {
            for (var k = huecos.length - 1; k >= 0; k--) {
              huecos[k].classList.remove('mal');
              quitarSuave(k);
            }
            bloqueado = false;
          }, 700);
        }
      }

      function quitarSuave(iHueco) {
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
