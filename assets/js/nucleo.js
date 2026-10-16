/* ==========================================================================
   NUCLEO - motor comun de la zona de juegos
   Navegacion entre pantallas, sonido, modal de resultado, reposo por
   inactividad y utilidades que usan todos los juegos.
   No usa librerias externas ni modulos: funciona en XAMPP y en archivo local.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
     Utilidades generales (globales para que las usen los juegos)
     --------------------------------------------------------------- */

  /**
   * Crea un elemento. h('div', {class:'x', onclick:fn}, 'texto', otroNodo)
   */
  function h(etiqueta, atributos) {
    var nodo = document.createElement(etiqueta);
    var attrs = atributos || {};
    for (var clave in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, clave)) continue;
      var valor = attrs[clave];
      if (valor === null || valor === undefined || valor === false) continue;
      if (clave === 'class') nodo.className = valor;
      else if (clave === 'html') nodo.innerHTML = valor;
      else if (clave === 'texto') nodo.textContent = valor;
      else if (clave === 'estilo') nodo.setAttribute('style', valor);
      else if (clave.indexOf('on') === 0 && typeof valor === 'function') {
        nodo.addEventListener(clave.slice(2), valor);
      } else if (valor === true) nodo.setAttribute(clave, '');
      else nodo.setAttribute(clave, valor);
    }
    for (var i = 2; i < arguments.length; i++) {
      var hijo = arguments[i];
      if (hijo === null || hijo === undefined || hijo === false) continue;
      if (Array.isArray(hijo)) {
        for (var j = 0; j < hijo.length; j++) {
          if (hijo[j]) nodo.appendChild(hijo[j]);
        }
      } else if (typeof hijo === 'object') nodo.appendChild(hijo);
      else nodo.appendChild(document.createTextNode(String(hijo)));
    }
    return nodo;
  }

  /** Baraja una copia del arreglo (Fisher-Yates). */
  function mezclar(lista) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copia[i]; copia[i] = copia[j]; copia[j] = tmp;
    }
    return copia;
  }

  /** Toma n elementos al azar, sin repetir. */
  function tomar(lista, n) {
    return mezclar(lista).slice(0, n);
  }

  /** Entero aleatorio entre min y max (ambos incluidos). */
  function entero(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** Segundos -> "m:ss" */
  function reloj(segundos) {
    var m = Math.floor(segundos / 60);
    var s = segundos % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  global.h = h;
  global.mezclar = mezclar;
  global.tomar = tomar;
  global.entero = entero;
  global.reloj = reloj;

  /* ---------------------------------------------------------------
     Sonido (WebAudio, sin archivos)
     --------------------------------------------------------------- */

  var audio = null;
  var sonidoActivo = true;
  try {
    sonidoActivo = localStorage.getItem('jb_sonido') !== '0';
  } catch (e) { /* modo privado: se queda encendido */ }

  function contexto() {
    if (!audio) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  /** Nota simple. */
  function tono(frecuencia, duracion, volumen, tipo) {
    if (!sonidoActivo) return;
    var ctx = contexto();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gan = ctx.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.value = frecuencia;
    gan.gain.setValueAtTime(0.0001, ctx.currentTime);
    gan.gain.exponentialRampToValueAtTime(volumen || 0.18, ctx.currentTime + 0.012);
    gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (duracion || 0.18));
    osc.connect(gan); gan.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (duracion || 0.18) + 0.03);
  }

  /** Rafaga de ruido filtrado: disparos, golpes, viento. */
  function ruido(duracion, volumen, freqIni, freqFin) {
    if (!sonidoActivo) return;
    var ctx = contexto();
    if (!ctx) return;
    var dur = duracion || 0.3;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var datos = buf.getChannelData(0);
    for (var i = 0; i < n; i++) datos[i] = Math.random() * 2 - 1;
    var fuente = ctx.createBufferSource();
    fuente.buffer = buf;
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(freqIni || 3000, ctx.currentTime);
    filtro.frequency.exponentialRampToValueAtTime(freqFin || 200, ctx.currentTime + dur);
    var gan = ctx.createGain();
    gan.gain.setValueAtTime(volumen || 0.3, ctx.currentTime);
    gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    fuente.connect(filtro); filtro.connect(gan); gan.connect(ctx.destination);
    fuente.start();
    fuente.stop(ctx.currentTime + dur + 0.05);
  }

  var EFECTOS = {
    toque:  function () { tono(660, 0.08, 0.10, 'triangle'); },
    voltea: function () { tono(880, 0.10, 0.10, 'triangle'); },
    bien:   function () { tono(784, 0.12, 0.16); setTimeout(function () { tono(1046, 0.20, 0.14); }, 90); },
    mal:    function () { tono(200, 0.22, 0.14, 'sawtooth'); },
    gana:   function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { tono(f, 0.28, 0.15); }, i * 110);
      });
    },
    fin:    function () { tono(392, 0.30, 0.14, 'sine'); setTimeout(function () { tono(294, 0.40, 0.12); }, 160); },
    premio: function () {                       // fanfarria del premio
      [523, 659, 784, 1046, 1318].forEach(function (f, i) {
        setTimeout(function () { tono(f, 0.22, 0.16, 'triangle'); }, i * 95);
      });
      setTimeout(function () { tono(1568, 0.5, 0.13, 'sine'); }, 560);
    }
  };

  function sonar(nombre) {
    if (!sonidoActivo) return;
    var efecto = EFECTOS[nombre];
    if (efecto) { try { efecto(); } catch (e) { /* sin audio disponible */ } }
  }

  /* ---------------------------------------------------------------
     Aplicacion
     --------------------------------------------------------------- */

  /* Duracion maxima de una partida, igual en todos los juegos. */
  global.LIMITE = 35;

  /* Cada comprobante da derecho a UN juego y a estos intentos. */
  global.INTENTOS = 2;

  var juegoElegido = null;      // el juego que escogio este cliente
  var intentosUsados = 0;
  var premioGanado = null;      // lo que se llevo en CUALQUIERA de sus intentos
  var relojSalida = null;       // vuelta automatica al final del turno
  var relojModal = null;        // los primeros milisegundos el modal no oye

  var catalogo = [];            // juegos registrados
  var limpiarActual = null;     // funcion de limpieza del juego en curso
  var juegoActual = null;       // definicion del juego en curso
  var temporizadores = [];      // timeouts/intervalos del juego en curso

  var dom = {};

  function cache() {
    dom.pantalla = document.getElementById('pantalla');
    dom.barra = document.getElementById('barra');
    dom.titulo = document.getElementById('barra-titulo');
    dom.sub = document.getElementById('barra-sub');
    dom.volver = document.getElementById('btn-volver');
    dom.sonido = document.getElementById('btn-sonido');
    dom.iconoSonido = document.getElementById('icono-sonido');
    dom.modal = document.getElementById('modal');
    dom.modalTitulo = document.getElementById('modal-titulo');
    dom.modalMensaje = document.getElementById('modal-mensaje');
    dom.modalDatos = document.getElementById('modal-datos');
    dom.modalPremio = document.getElementById('modal-premio');
    dom.modalSello = document.getElementById('modal-sello');
    dom.modalRepetir = document.getElementById('modal-repetir');
    dom.atractor = document.getElementById('atractor');
    dom.reloj = document.getElementById('reloj');
    dom.botonPantalla = document.getElementById('btn-pantalla');
    dom.intentos = document.getElementById('intentos');
    dom.relojNum = document.getElementById('reloj-num');
  }

  /** Limpia timers y estado del juego que estaba activo. */
  function desmontar() {
    temporizadores.forEach(function (t) {
      clearTimeout(t.id); clearInterval(t.id);
    });
    temporizadores = [];
    if (typeof limpiarActual === 'function') {
      try { limpiarActual(); } catch (e) { /* el juego ya no existe */ }
    }
    limpiarActual = null;
    /* Al salir de un juego, fuera todo lo que quedara a medio irse: asi no
       se cuela ningun fotograma viejo en la vista siguiente. */
    limpiarSalidas();
    if (dom.reloj) { dom.reloj.hidden = true; dom.reloj.classList.remove('poco'); }
    cerrarModal();
  }

  /** Sustituye la vista actual con una transicion suave. */
  /* Vistas que se estan yendo, con su temporizador de borrado. Hay que
     llevar la cuenta: si no, una que se quede a medias no se borra nunca. */
  var salidas = [];

  /** Saca del DOM ahora mismo todo lo que estuviera saliendo. */
  function limpiarSalidas() {
    for (var i = 0; i < salidas.length; i++) {
      clearTimeout(salidas[i].id);
      var v = salidas[i].vista;
      if (v.parentNode) v.parentNode.removeChild(v);
    }
    salidas = [];
  }

  /* Cambia la vista de pantalla con una transicion suave.

     Antes esto cogia solo dom.pantalla.firstElementChild, y ahi estaba el
     fallo: las vistas son position:absolute e inset:0, o sea que se apilan
     una encima de otra. Al cambiar dos veces seguidas antes de que acabara
     la animacion de 220 ms (volver al menu nada mas entrar a un juego, o la
     salida automatica del turno), la segunda llamada volvia a coger LA
     PRIMERA vista, que ya estaba saliendo, y la de en medio se quedaba
     huerfana para siempre y a opacidad completa. Resultado: el ultimo
     fotograma del juego, congelado, visible junto al menu.

     Ahora salen TODAS las que hubiera, y lo que ya estaba saliendo se
     borra de golpe en vez de esperar otra animacion. */
  function pintar(nuevaVista, limpieza) {
    if (typeof limpieza === 'function') limpiarActual = limpieza;

    limpiarSalidas();

    var viejas = [];
    for (var i = 0; i < dom.pantalla.children.length; i++) {
      viejas.push(dom.pantalla.children[i]);
    }
    viejas.forEach(function (vieja) {
      vieja.classList.add('saliendo');
      var s = { vista: vieja, id: 0 };
      s.id = setTimeout(function () {
        if (vieja.parentNode) vieja.parentNode.removeChild(vieja);
        var j = salidas.indexOf(s);
        if (j !== -1) salidas.splice(j, 1);
      }, 220);
      salidas.push(s);
    });

    dom.pantalla.appendChild(nuevaVista);
  }

  /* ------------------------- Menu ------------------------- */

  /** Deja la direccion como .../index.html#memoria (util para accesos directos). */
  function marcarEnlace(id) {
    try {
      var base = location.pathname + location.search;
      history.replaceState(null, '', id ? base + '#' + id : base);
    } catch (e) { /* en file:// algunos navegadores no lo permiten */ }
  }

  /* El arco y la flecha del menu, en SVG: se ven nitidos en la pantalla
     grande y toman el color de donde estan. */
  var ARCO_MENU =
    '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs><linearGradient id="arco-a" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#E7D6B6"/><stop offset="1" stop-color="#F7F0E3"/>' +
    '</linearGradient></defs>' +
    '<g fill="none" stroke="url(#arco-a)" stroke-width="26" opacity=".75">' +
    '<path d="M-120 620 C 60 260 420 40 900 -40"/>' +
    '<path d="M1720 300 C 1540 660 1180 880 700 960"/>' +
    '</g>' +
    '<g fill="none" stroke="#C9A96E" stroke-opacity=".22" stroke-width="2">' +
    '<path d="M-120 700 C 80 320 460 90 960 10"/>' +
    '<path d="M1720 220 C 1520 600 1140 830 640 910"/>' +
    '</g></svg>';

  var FLECHA_MENU =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M5 12h13"/><path d="M12.5 6l6 6-6 6"/></svg>';

  /* Sin boleta validada no se ve ni el menu ni un juego, se llegue por
     donde se llegue (Escape o Retroceso con teclado fisico abrian el menu
     encima de la pantalla de la boleta). Quien la pide ya esta en pantalla. */
  function sinBoleta() {
    return !!global.Acceso && !global.Acceso.autorizado();
  }

  /* Practica: entro desde la pantalla de la boleta sin boleta. Puede probar
     todos los juegos las veces que quiera, pero nunca hay sobres. */
  function enPractica() {
    return !!global.Acceso && !!global.Acceso.practica && global.Acceso.practica();
  }

  function irMenu() {
    if (sinBoleta()) return;
    desmontar();
    juegoActual = null;
    marcarEnlace(null);
    dom.barra.hidden = true;

    var tarjetas = catalogo.map(function (juego, i) {
      var tarjeta = h('button', {
        class: 'tarjeta',
        estilo: 'animation-delay:' + (i * 60) + 'ms',
        'aria-label': juego.nombre + '. ' + juego.desc,
        onclick: function () { sonar('toque'); abrir(juego.id); }
      },
        h('span', { class: 'medalla', 'aria-hidden': 'true' },
          h('span', { class: 'emoji' }, juego.emoji)),
        h('span', { class: 'nombre' }, juego.nombre),
        h('span', { class: 'desc' }, juego.desc),
        h('span', { class: 'tarjeta-ir', 'aria-hidden': 'true', html: FLECHA_MENU })
      );
      return tarjeta;
    });

    var vista = h('section', { class: 'vista menu' },
      h('div', { class: 'menu-arco', 'aria-hidden': 'true', html: ARCO_MENU }),
      h('p', { class: 'menu-margen izq', 'aria-hidden': 'true' },
        'Belleza también es disfrutar'),
      h('p', { class: 'menu-margen der', 'aria-hidden': 'true' },
        'Cuida tu belleza en cada detalle'),
      h('div', { class: 'menu-cabecera' },
        h('img', { src: 'assets/img/logo.png', alt: 'Joana Bernedo Body Aesthetics' }),
        h('h1', {}, 'Zona de Juegos'),
        h('p', { class: 'lema' }, 'Mientras esperas, entretente'),
        h('p', { class: 'filete-corazon', 'aria-hidden': 'true' }, '\u2665'),
        h('p', { class: 'menu-invita' },
          h('span', {}, enPractica()
            ? 'Prueba los juegos las veces que quieras'
            : 'Elige un juego y disfruta un momento para ti'),
          global.Acceso
            ? h('span', { class: 'menu-intentos' + (enPractica() ? ' practica' : '') },
                enPractica() ? 'Modo práctica' : global.INTENTOS + ' intentos')
            : null),
        enPractica()
          ? h('button', { class: 'menu-boleta', onclick: function () { sonar('toque'); salir(); } },
              h('span', {}, 'Ya quiero jugar con mi DNI'),
              h('span', { class: 'menu-boleta-flecha', 'aria-hidden': 'true', html: FLECHA_MENU }))
          : null
      ),
      h('div', { class: 'tarjetas' }, tarjetas),
      h('p', { class: 'menu-pie' },
        h('i', { 'aria-hidden': 'true' }),
        h('span', {}, 'Pequeños momentos, gran bienestar'),
        h('i', { 'aria-hidden': 'true' }))
    );

    pintar(vista);
    reprogramarReposo();          // en el menu se espera menos
  }

  /* ------------------------- Abrir un juego ------------------------- */

  var ultimoAbrir = 0;

  function abrir(id) {
    if (sinBoleta()) return;
    var juego = null;
    for (var i = 0; i < catalogo.length; i++) {
      if (catalogo[i].id === id) { juego = catalogo[i]; break; }
    }
    if (!juego) return irMenu();

    /* Dos toques seguidos en la misma tarjeta gastaban DOS intentos de
       golpe, y el cliente se quedaba sin turno antes de jugar. En el totem
       pasa constantemente: la pantalla tarda en responder, se vuelve a
       tocar y ya van dos. Nadie abre un juego dos veces en medio segundo
       a proposito, asi que el segundo toque se ignora. */
    var ahora = Date.now();
    if (ahora - ultimoAbrir < 700) return;
    ultimoAbrir = ahora;

    var practica = enPractica();
    if (!practica) {
      /* Un comprobante, un juego: si intenta otro, se le devuelve al suyo. */
      if (juegoElegido && juegoElegido !== juego.id) return;
      juegoElegido = juego.id;
      intentosUsados++;
    }
    pintarIntentos(practica);

    desmontar();
    juegoActual = juego;
    marcarEnlace(juego.id);

    dom.barra.hidden = false;
    /* Con comprobante no hay salida a medias: se juega hasta el final y
       se termina en los sobres o en la despedida. La flecha solo se ve sin
       comprobante o en practica. */
    dom.volver.style.visibility = global.Acceso && !practica ? 'hidden' : '';
    dom.titulo.textContent = juego.nombre;
    dom.sub.textContent = juego.sub || '';

    var vista = h('section', { class: 'vista' });
    pintar(vista);

    limpiarActual = juego.iniciar(vista, crearApi(juego)) || null;
    reprogramarReposo();          // dentro de un juego se espera mas
  }

  function reiniciar() {
    if (juegoActual) abrir(juegoActual.id);
    else irMenu();
  }

  /** Marca cuantos intentos le quedan al cliente en la barra de arriba. */
  function pintarIntentos(practica) {
    if (!dom.intentos) return;
    dom.intentos.classList.toggle('practica', !!practica);
    if (practica) {
      dom.intentos.hidden = false;
      dom.intentos.classList.remove('ultimo');
      dom.intentos.textContent = 'Práctica';
      return;
    }
    if (!juegoElegido || !global.Acceso) { dom.intentos.hidden = true; return; }
    dom.intentos.hidden = false;
    dom.intentos.textContent = 'Intento ' + Math.min(intentosUsados, global.INTENTOS) +
                               ' de ' + global.INTENTOS;
    dom.intentos.classList.toggle('ultimo', intentosUsados >= global.INTENTOS);
  }

  /** Se acabo el turno de este cliente: vuelta al numero de comprobante. */
  function salir() {
    clearTimeout(relojSalida);
    if (!global.Acceso) { irMenu(); return; }
    desmontar();
    juegoActual = null;
    juegoElegido = null;
    intentosUsados = 0;
    premioGanado = null;
    marcarEnlace(null);
    dom.barra.hidden = true;
    pintarIntentos();
    global.Acceso.olvidar();
    global.Acceso.pedir(irMenu);
    reprogramarReposo();
  }

  /** API que recibe cada juego. */
  function crearApi(juego) {
    return {
      /* Texto pequeno bajo el titulo (nivel, ronda, pista...) */
      sub: function (texto) { dom.sub.textContent = texto || ''; },

      /* Temporizadores que se cancelan solos al salir del juego */
      luego: function (fn, ms) {
        var t = { id: setTimeout(fn, ms) };
        temporizadores.push(t);
        return t.id;
      },
      cada: function (fn, ms) {
        var t = { id: setInterval(fn, ms) };
        temporizadores.push(t);
        return t.id;
      },
      parar: function (id) { clearTimeout(id); clearInterval(id); },

      /* ---------------------------------------------------------------
         Cuenta atras de la partida. Todas duran lo mismo (ver LIMITE) y
         el reloj se ve arriba a la derecha; cuando quedan 15 segundos se
         pone en rojo. Devuelve {parar, queda, usado} por si el juego
         termina antes de tiempo.
         --------------------------------------------------------------- */
      cuenta: function (segundos, alFinal) {
        var restante = segundos;
        dom.reloj.hidden = false;
        dom.reloj.classList.remove('poco');
        dom.relojNum.textContent = reloj(restante);

        var t = {};
        t.id = setInterval(function () {
          restante--;
          dom.relojNum.textContent = reloj(Math.max(0, restante));
          if (restante <= 15) dom.reloj.classList.add('poco');
          if (restante <= 8 && restante > 0) tono(880, 0.06, 0.07, 'triangle');
          if (restante <= 0) {
            clearInterval(t.id);
            tono(300, 0.35, 0.12, 'sawtooth');
            if (typeof alFinal === 'function') alFinal();
          }
        }, 1000);
        temporizadores.push(t);

        return {
          parar: function () { clearInterval(t.id); dom.reloj.hidden = true; },
          queda: function () { return Math.max(0, restante); },
          usado: function () { return segundos - Math.max(0, restante); }
        };
      },

      sonar: sonar,
      reiniciar: reiniciar,
      menu: irMenu,

      /* Pantalla final del juego */
      fin: function (opciones) { abrirModal(opciones || {}); }
    };
  }

  /* ---------------------------------------------------------------
     Confeti de celebracion. Se monta un lienzo por encima de todo,
     cae durante unos segundos y se quita solo.
     --------------------------------------------------------------- */
  var COLORES_CONFETI = ['#F0B429', '#E8574C', '#EE6FA0', '#7C6BE0', '#2FB58C', '#3E9AE0', '#FFFFFF'];

  function confeti() {
    var viejo = document.querySelector('.confeti');
    if (viejo && viejo.parentNode) viejo.parentNode.removeChild(viejo);

    var lienzo = document.createElement('canvas');
    lienzo.className = 'confeti';
    document.body.appendChild(lienzo);
    var ctx = lienzo.getContext && lienzo.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var an = global.innerWidth, al = global.innerHeight;
    lienzo.width = an * dpr;
    lienzo.height = al * dpr;

    /* La mitad estalla desde el centro (como un canon de fiesta) y la otra
       mitad llueve desde justo encima del borde, para que se vea al instante. */
    var piezas = [];
    for (var i = 0; i < 160; i++) {
      var estalla = i < 70;
      var ang = Math.random() * 6.2832;
      var fuerza = 280 + Math.random() * 460;
      piezas.push({
        x: estalla ? an / 2 + (Math.random() - 0.5) * 60 : Math.random() * an,
        y: estalla ? al * 0.42 : -10 - Math.random() * 200,
        vx: estalla ? Math.cos(ang) * fuerza : (Math.random() - 0.5) * 140,
        vy: estalla ? Math.sin(ang) * fuerza * 0.8 : 220 + Math.random() * 320,
        r: 4 + Math.random() * 8,
        giro: Math.random() * 6.2832,
        gv: (Math.random() - 0.5) * 9,
        color: COLORES_CONFETI[i % COLORES_CONFETI.length],
        tira: Math.random() < 0.55
      });
    }

    var inicio = 0, ultimo = 0;
    function paso(t) {
      if (!inicio) { inicio = t; ultimo = t; }
      var dt = Math.min(0.05, (t - ultimo) / 1000);
      ultimo = t;
      var vida = (t - inicio) / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, an, al);
      ctx.globalAlpha = vida > 3.4 ? Math.max(0, 1 - (vida - 3.4) / 1.1) : 1;

      for (var j = 0; j < piezas.length; j++) {
        var p = piezas[j];
        p.vy += 120 * dt;                      // gravedad
        p.vx *= 0.995;
        p.x += (p.vx + Math.sin(vida * 3 + p.giro) * 22) * dt;
        p.y += p.vy * dt;
        p.giro += p.gv * dt;
        if (p.y > al + 30) { p.y = -20; p.vy = 160 + Math.random() * 200; }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillStyle = p.color;
        if (p.tira) ctx.fillRect(-p.r * 0.35, -p.r * 0.9, p.r * 0.7, p.r * 1.8);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (vida < 4.5) requestAnimationFrame(paso);
      else if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
    }
    requestAnimationFrame(paso);
  }

  /* ------------------------- Modal ------------------------- */

  /* Iconos de trazo fino para las tarjetas de datos del final. Cada dato
     coge el suyo por la etiqueta; si no hay uno propio, sale la estrella. */
  var TRAZO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
              'stroke-linecap="round" stroke-linejoin="round">';
  var ICONOS = {
    personas: TRAZO + '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3.2 2.5-5.4 5.5-5.4s5.5 2.2 5.5 5.4"/>' +
              '<circle cx="16.6" cy="9.4" r="2.6"/><path d="M15.4 14c3 .1 5.1 2.1 5.1 5"/></svg>',
    diana:    TRAZO + '<circle cx="11" cy="13" r="7.5"/><circle cx="11" cy="13" r="4.2"/><circle cx="11" cy="13" r="1.2"/>' +
              '<path d="M11 13l8.5-8.5"/><path d="M16.8 4.2l2.7.3.3 2.7"/></svg>',
    trofeo:   TRAZO + '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/>' +
              '<path d="M12 13v3.5"/><path d="M8.5 20h7"/><path d="M9.5 16.5h5V20h-5z"/></svg>',
    reloj:    TRAZO + '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.6 1.8"/><path d="M9.5 3h5"/></svg>',
    nivel:    TRAZO + '<path d="M4 20h16"/><path d="M6 20v-5h3v5"/><path d="M10.5 20v-9h3v9"/><path d="M15 20V6h3v14"/></svg>',
    subir:    TRAZO + '<path d="M12 20V5"/><path d="M6.5 10.5L12 5l5.5 5.5"/><path d="M5 20h14"/></svg>',
    avion:    TRAZO + '<path d="M3 13.5l7-1.5 5-6.5c.8-1 2.4-1 2.8.2.3.8 0 1.6-.6 2.2L13 12l1.5 7-1.8.9-3.1-5.6-4.2 1-1.6 2.2-1.2-.6.6-2.6z"/></svg>',
    bombilla: TRAZO + '<path d="M9 17h6"/><path d="M10 20.5h4"/><path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.6.5 1 1.2 1 2V17h4.4v-1.5c0-.8.4-1.5 1-2a5.5 5.5 0 0 0-3.2-10z"/></svg>',
    cruz:     TRAZO + '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/></svg>',
    globo:    TRAZO + '<path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H11l-4 3.5V16H6.5a2 2 0 0 1-2-2z"/>' +
              '<path d="M8.5 10.3l2 2 4-4"/></svg>',
    billete:  TRAZO + '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>' +
              '<path d="M6.5 9.5v5"/><path d="M17.5 9.5v5"/></svg>',
    estrella: TRAZO + '<path d="M12 3.8l2.5 5.2 5.6.8-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z"/></svg>',
    otraVez:  TRAZO + '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3.7h3.7"/><path d="M10.5 9.5l4 2.5-4 2.5z"/></svg>',
    flecha:   TRAZO + '<path d="M4 12h15"/><path d="M13.5 6.5L19 12l-5.5 5.5"/></svg>'
  };
  var ICONO_DATO = {
    'parejas': 'personas', 'intentos': 'diana', 'aciertos': 'diana', 'puntos': 'diana',
    'puntaje': 'diana', 'récord': 'trofeo', 'tiempo': 'reloj', 'nivel': 'nivel',
    'metros': 'subir', 'tubos': 'avion', 'pistas': 'bombilla', 'fallos': 'cruz',
    'frases': 'globo', 'respondidas': 'globo', 'billetes': 'billete'
  };

  /** Boton con icono a la izquierda, raya, texto y flecha (como en la mockup). */
  function botonFinal(boton, texto, icono) {
    boton.innerHTML = '';
    if (icono) {
      boton.appendChild(h('span', { class: 'btn-final-icono', 'aria-hidden': 'true', html: ICONOS[icono] }));
      boton.appendChild(h('span', { class: 'btn-final-raya', 'aria-hidden': 'true' }));
    }
    boton.appendChild(h('span', { class: 'btn-final-texto' }, texto));
    if (icono) boton.appendChild(h('span', { class: 'btn-final-flecha', 'aria-hidden': 'true', html: ICONOS.flecha }));
  }

  function abrirModal(op) {
    dom.modal.classList.remove('revelado', 'registrando');
    var viejo = dom.modal.querySelector('.modal-caja > .premio-volver');
    if (viejo) viejo.parentNode.removeChild(viejo);
    var extras = dom.modal.querySelectorAll('.practica-extra');
    for (var x = 0; x < extras.length; x++) extras[x].parentNode.removeChild(extras[x]);
    dom.modalSello.textContent = op.sello || '✦';
    dom.modalTitulo.textContent = op.titulo || 'Fin del juego';
    dom.modalMensaje.textContent = op.mensaje || '';
    dom.modalDatos.innerHTML = '';
    dom.modalDatos.className = 'modal-datos datos-' + Math.min((op.datos || []).length, 4);
    (op.datos || []).forEach(function (d) {
      var icono = ICONOS[ICONO_DATO[String(d.etq).toLowerCase()] || 'estrella'];
      dom.modalDatos.appendChild(
        h('div', { class: 'dato-final' },
          h('span', { class: 'dato-final-icono', 'aria-hidden': 'true', html: icono }),
          h('span', { class: 'dato-final-texto' },
            h('span', { class: 'val' }, d.val),
            h('span', { class: 'etq' }, d.etq))
        )
      );
    });
    /* ---------------------------------------------------------------
       EL PREMIO, UNA SOLA VEZ Y AL FINAL

       Los tres sobres salen cuando el cliente ha gastado TODOS sus
       intentos, no al acabar cada partida: el premio es del comprobante,
       no de la partida, y saliendo dos veces se llevaria dos.

       Lo que gano en cualquiera de los intentos se guarda, asi que
       clavarlo en el primero y fallar el segundo no le quita nada. Si no
       llego a la meta en ninguno, no hay sobres: se le despide con un
       'buena suerte, nos vemos el proximo ano' y vuelve solo al inicio.
       --------------------------------------------------------------- */
    dom.modalPremio.innerHTML = '';
    if (enPractica()) {
      /* en la practica TODOS se llevan premio: si llego a la meta, de los de
         practica (y muy rara vez una sesion de regalo); si no, uno de
         consuelo (los mas baratos: sobre todo bolsas). Al abrir el suyo y
         registrar su DNI vuelve solo al inicio: un premio por practica. */
      var consueloP = !op.premio;
      clearTimeout(relojSalida);
      dom.modal.classList.toggle('con-datos', (op.datos || []).length > 0);
      dom.modalTitulo.textContent = consueloP ? '¡Gracias por jugar!' : '¡Muy bien, lo lograste!';
      dom.modalMensaje.textContent = consueloP ? 'Te llevas un premio de regalo. Elige tu sobre.' : '¡Excelente partida! Elige tu sobre.';
      dom.modalRepetir.hidden = true;
      dom.modalPremio.hidden = false;
      dom.modalSello.textContent = '🎁';
      /* sobres -> ve su premio -> y recien ahi su DNI: nadie se lleva un
         premio sin registrar. No vuelve solo al inicio hasta registrarlo. */
      prepararSobres(function (ganado) {
        relojSalida = setTimeout(function () {
          registroPractica(ganado, function (aviso) {
            if (aviso) dom.modalMensaje.textContent = aviso;
            volverSolo(aviso ? 6 : 5);
          });
        }, 2000);
      }, consueloP);
      mostrarModal();
      return;
    }

    if (op.premio) premioGanado = op.premio;

    var esperandoSobre = false;
    var quedan = global.Acceso ? (global.INTENTOS - intentosUsados) : 1;
    /* Su turno acaba al gastar los dos intentos o al GANAR: si llega a la
       meta no se le hace jugar otra vez, elige su sobre en ese momento. */
    var acaba = !global.Acceso || quedan <= 0 || !!op.premio;
    var ultimo = acaba;
    var elPremio = ultimo ? premioGanado : null;
    var sinPremio = ultimo && !premioGanado;

    /* TODOS se llevan premio: quien no llego a la meta en sus intentos
       recibe uno de consuelo (los mas baratos: sobre todo bolsas) */
    if (elPremio || (sinPremio && global.Acceso)) {
      dom.modalPremio.hidden = false;
      esperandoSobre = true;
      dom.modalSello.textContent = '🎁';
      prepararSobres(function () {
        /* ya tiene su premio: tiempo para ensenarlo en recepcion, y luego
           la sala se prepara sola para el siguiente */
        if (acaba && global.Acceso) volverSolo(6);     // corto: lo pidio el equipo para que la fila avance
      }, !elPremio);
    } else {
      dom.modalPremio.hidden = true;
    }

    /* Otro intento solo si no gano y aun le queda alguno */
    dom.modalRepetir.hidden = acaba && !!global.Acceso;
    botonFinal(dom.modalRepetir, op.textoRepetir ||
      (quedan === 1 ? 'Jugar mi último intento' : 'Jugar otra vez'), 'otraVez');
    /* No hay boton de salir: o juega su otro intento, o elige su sobre (o
       se le despide), y la vuelta al inicio se hace sola. */
    dom.modal.classList.toggle('con-datos', (op.datos || []).length > 0);

    clearTimeout(relojSalida);
    if (sinPremio) {
      dom.modalTitulo.textContent = '¡Gracias por jugar!';
      dom.modalMensaje.textContent = 'Te llevas un premio de regalo. Elige tu sobre.';
    } else if (op.premio) {
      /* gano esta partida: se le felicita, sea el intento que sea */
      dom.modalTitulo.textContent = '¡Muy bien, lo lograste!';
      dom.modalMensaje.textContent = '¡Excelente partida! Elige tu sobre.';
    } else if (quedan <= 0) {
      dom.modalMensaje.textContent = (op.mensaje ? op.mensaje + ' ' : '') +
        'Se acabaron tus ' + global.INTENTOS + ' intentos.';
    }
    /* con sobres sin abrir no se cuenta todavia: la cuenta arranca al abrirlo */
    if (acaba && global.Acceso && !esperandoSobre) volverSolo(3);

    mostrarModal();
  }

  function mostrarModal() {
    /* Recien abierto no acepta toques: si el cliente venia dando golpes a
       la pantalla, el ultimo caia sobre un boton del modal y se saltaba el
       final de la partida sin verlo. */
    dom.modal.classList.add('recien');
    clearTimeout(relojModal);
    relojModal = setTimeout(function () { dom.modal.classList.remove('recien'); }, 450);

    dom.modal.hidden = false;
  }

  /** Final de una partida de practica SIN llegar a la meta: ni sobres ni
      premio, solo se le dice que ya sabe jugar. (Si llega a la meta hay
      sobres: ver abrirModal.) */
  function finPractica(op) {
    clearTimeout(relojSalida);
    dom.modalPremio.hidden = true;
    dom.modalSello.textContent = '✦';
    dom.modal.classList.toggle('con-datos', (op.datos || []).length > 0);
    dom.modalTitulo.textContent = 'Fin de la práctica';
    dom.modalMensaje.textContent = '¡Ya sabes cómo se juega!';

    dom.modalRepetir.hidden = false;
    botonFinal(dom.modalRepetir, 'Practicar otra vez', 'otraVez');

    var botones = dom.modalRepetir.parentNode;
    var otros = h('button', { class: 'btn btn-final btn-final-salir practica-extra',
      onclick: function () { sonar('toque'); irMenu(); } }, 'Probar otro juego');
    var conBoleta = h('button', { class: 'btn btn-final btn-final-salir practica-extra',
      onclick: function () { sonar('toque'); salir(); } }, 'Jugar con mi DNI');
    botones.appendChild(otros);
    botones.appendChild(conBoleta);

    mostrarModal();
  }

  /* ---------------------------------------------------------------
     LOS SOBRES

     El premio lo decide el SERVIDOR (api/premio.js), no la pantalla: lo
     sortea entre lo que queda en el inventario (Muestras.xlsx) y lo
     descuenta. Hay tantos sobres como premios distintos queden, hasta 3;
     si se acabo todo no hay sobres. Los otros sobres ensenan premios que
     tambien quedaban, para que se vea que habia mas cosas en juego.
     --------------------------------------------------------------- */
  function prepararSobres(alAbrir, consuelo) {
    var caja = dom.modalPremio;
    caja.innerHTML = '';
    caja.classList.remove('eligiendo');
    caja.appendChild(h('p', { class: 'sobres-pista' }, 'Preparando tus sobres…'));

    global.Acceso.pedirPremio(juegoActual && juegoActual.nombre, !!consuelo).then(function (d) {
      if (dom.modal.hidden) return;           // ya se fue de esta pantalla
      caja.innerHTML = '';
      if (!d.ok) {
        caja.appendChild(h('p', { class: 'sobres-pista' },
          d.mensaje || 'No pudimos preparar tus sobres.'));
        caja.appendChild(h('button', { class: 'btn btn-final btn-final-salir',
          onclick: function () { sonar('toque'); prepararSobres(alAbrir); } }, 'Intentar otra vez'));
        return;
      }
      if (!d.premio) {
        /* llego a la meta, pero ya no queda ningun premio que dar */
        caja.hidden = true;
        dom.modalSello.textContent = '✦';
        dom.modalMensaje.textContent = '¡Lo lograste! Los premios de hoy ya se entregaron todos. ¡Gracias por jugar!';
        volverSolo(4);
        return;
      }
      pintarSobres(d, alAbrir);
    });
  }

  /* ---------------------------------------------------------------
     REGISTRO DE LA PRACTICA: quien gana sin DNI lo escribe antes de abrir
     su sobre (api/registro.js lo busca en Odoo, solo leyendo). Si no esta,
     escribe sus apellidos y nombres y recepcion lo registra luego.
     --------------------------------------------------------------- */
  var registrando = false;       // escribiendo su DNI: Retroceso no saca al menu

  function registroPractica(ganado, alListo) {
    var caja = dom.modalPremio;
    registrando = true;
    dom.modal.classList.remove('revelado');
    dom.modal.classList.add('registrando');
    dom.modalTitulo.textContent = '¡Lo lograste!';
    var paso = 'dni', escrito = '', dniOk = '', ocupado = false;

    function teclado(teclas, columnas) {
      var t = h('div', { class: 'registro-teclado', estilo: 'grid-template-columns:repeat(' + columnas + ',1fr)' });
      teclas.forEach(function (k) {
        var etq = k === '⌫' ? '⌫' : k === ' ' ? 'ESPACIO' : k;
        t.appendChild(h('button', {
          class: 'registro-tecla' + (k === ' ' ? ' ancha' : '') + (k === '⌫' ? ' borrar' : ''),
          'aria-label': k === '⌫' ? 'Borrar' : k === ' ' ? 'Espacio' : k,
          onclick: function () { pulsar(k); }
        }, etq));
      });
      return t;
    }

    var campo = h('div', { class: 'registro-campo' }, '');
    var aviso = h('p', { class: 'registro-aviso' }, '');
    var titulo = h('p', { class: 'sobres-pista' }, '');
    var zona = h('div', { class: 'registro-zona' });
    var boton = h('button', { class: 'btn btn-final registro-enviar', onclick: function () { enviar(); } }, 'Registrar mi premio');

    function pintar() {
      campo.textContent = escrito || (paso === 'dni' ? 'Tu DNI' : 'Apellidos y nombres');
      campo.classList.toggle('vacio', !escrito);
    }
    function pulsar(k) {
      if (ocupado) return;
      sonar('toque');
      if (k === '⌫') escrito = escrito.slice(0, -1);
      else if (paso === 'dni' && escrito.length < 12) escrito += k;
      else if (paso === 'nombre' && escrito.length < 60 && !(k === ' ' && (!escrito || / $/.test(escrito)))) escrito += k;
      aviso.className = 'registro-aviso'; aviso.textContent = '';
      pintar();
    }
    function mal(t) { aviso.className = 'registro-aviso mal'; aviso.textContent = t; sonar('mal'); }

    function pasoDni() {
      paso = 'dni'; escrito = '';
      titulo.textContent = 'Escribe tu DNI para registrar tu premio';
      zona.innerHTML = '';
      zona.appendChild(teclado(['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'], 3));
      pintar();
    }
    function pasoNombre() {
      paso = 'nombre'; escrito = '';
      titulo.textContent = 'No te encontramos: escribe tus apellidos y nombres';
      zona.innerHTML = '';
      zona.appendChild(teclado('QWERTYUIOPASDFGHJKLÑZXCVBNM'.split('').concat(['⌫', ' ']), 10));
      pintar();
    }

    function enviar() {
      if (ocupado) return;
      if (paso === 'dni' && escrito.length < 8) { mal('Tu DNI tiene 8 números.'); return; }
      if (paso === 'nombre' && escrito.trim().split(/\s+/).length < 2) { mal('Escribe tus apellidos y tu nombre.'); return; }
      ocupado = true; boton.disabled = true;
      aviso.className = 'registro-aviso'; aviso.textContent = 'Registrando…';
      var dni = paso === 'dni' ? escrito : dniOk;
      global.Acceso.registrarPractica(dni, paso === 'nombre' ? escrito.trim() : undefined).then(function (d) {
        ocupado = false; boton.disabled = false;
        if (dom.modal.hidden) return;
        if (!d.ok && !d.devuelto) { mal(d.mensaje || 'No se pudo registrar.'); return; }
        if (d.falta === 'nombre') { dniOk = dni; pasoNombre(); return; }
        document.removeEventListener('keydown', tecla);
        registrando = false;
        dom.modal.classList.remove('registrando');
        dom.modal.classList.add('revelado');
        /* listo: una confirmacion corta, en la misma vista quieta */
        caja.innerHTML = '';
        if (d.devuelto) {
          dom.modalTitulo.textContent = 'Ya tienes tu premio';
          caja.appendChild(h('p', { class: 'sobres-pista' }, d.mensaje));
        } else {
          dom.modalTitulo.textContent = '¡Premio registrado!';
          caja.appendChild(h('span', { class: 'premio-cinta' }, '✓ Registrado'));
          caja.appendChild(h('strong', { class: 'premio-tarjeta-nombre registro-listo' }, nombrePremio(ganado)));
          caja.appendChild(h('span', { class: 'premio-pie' }, ganado.especial
            ? 'Reserva tu cita en recepción con tu DNI' : 'Recógelo en recepción con tu DNI'));
        }
        alListo();
      });
    }

    /* con teclado fisico tambien (por si se prueba en un PC) */
    function tecla(e) {
      if (dom.modal.hidden) { document.removeEventListener('keydown', tecla); registrando = false; return; }
      var k = e.key;
      if (k === 'Enter') { enviar(); e.preventDefault(); }
      else if (k === 'Backspace') { pulsar('⌫'); e.preventDefault(); }
      else if (paso === 'dni' && /^[0-9]$/.test(k)) { pulsar(k); e.preventDefault(); }
      else if (paso === 'nombre' && /^[a-zA-ZñÑ ]$/.test(k)) { pulsar(k.toUpperCase()); e.preventDefault(); }
    }
    document.addEventListener('keydown', tecla);

    caja.innerHTML = '';
    caja.classList.remove('eligiendo');
    caja.appendChild(h('span', { class: 'premio-cinta' }, 'Tu premio: ' + nombrePremio(ganado)));
    caja.appendChild(titulo);
    caja.appendChild(campo);
    caja.appendChild(aviso);
    caja.appendChild(zona);
    caja.appendChild(boton);
    pasoDni();
  }

  /* EXILIS VAGINAL V24 -> Exilis Vaginal V24 (en el Excel hay nombres en mayusculas) */
  function bonito(texto) {
    texto = String(texto || '');
    if (texto !== texto.toUpperCase()) return texto;
    return texto.toLowerCase().replace(/(^|[\s(\-/])(\S)/g, function (m, a, b) {
      return a + b.toUpperCase();
    });
  }

  function nombrePremio(p) { return p.especial && p.servicio ? p.servicio : bonito(p.producto); }

  /** La tarjeta que sale del sobre: foto si la hay; si no, el nombre bien
      puesto. Los premios especiales salen con una tarjeta dorada propia. */
  function tarjetaPremio(p) {
    if (p.especial) {
      /* debajo, la marca y lo que no repita el titulo */
      var detalle = [p.marca, p.servicio && p.servicio !== p.producto ? bonito(p.producto) : p.presentacion]
        .filter(Boolean).join(' · ');
      return h('div', { class: 'premio-tarjeta especial' },
        h('span', { class: 'premio-tarjeta-sello' }, '✦ Sesión de regalo ✦'),
        h('strong', { class: 'premio-tarjeta-nombre' }, nombrePremio(p)),
        detalle ? h('span', { class: 'premio-tarjeta-detalle' }, detalle) : null);
    }
    return h('div', { class: 'premio-tarjeta' + (p.foto ? ' con-foto' : '') },
      p.foto ? h('img', { class: 'premio-foto', src: p.foto, alt: '' }) : null,
      p.marca ? h('span', { class: 'premio-tarjeta-marca' }, p.marca) : null,
      h('strong', { class: 'premio-tarjeta-nombre' }, nombrePremio(p)),
      p.presentacion ? h('span', { class: 'premio-tarjeta-detalle' }, p.presentacion) : null);
  }

  function pintarSobres(d, alAbrir) {
    var caja = dom.modalPremio;
    var ganado = d.premio;
    var otros = d.otros || [];
    var cuantos = Math.max(1, Math.min(3, d.sobres || 1));
    var elegido = false;

    caja.classList.add('eligiendo');
    caja.appendChild(h('span', { class: 'premio-cinta' }, '¡Has ganado un premio!'));
    caja.appendChild(h('p', { class: 'sobres-pista' },
      cuantos === 1 ? 'Toca el sobre para descubrirlo' : 'Elige un sobre para descubrirlo'));

    var fila = h('div', { class: 'sobres sobres-' + cuantos });
    for (var i = 0; i < cuantos; i++) {
      (function () {
        /* capas, de atras hacia delante: el fondo, la tarjeta que asoma al
           abrir, el bolsillo con su forma de V, la solapa y el lacre JB */
        var sobre = h('button', { class: 'sobre', 'aria-label': 'Sobre ' + (i + 1) },
          h('span', { class: 'sobre-fondo', 'aria-hidden': 'true' }),
          h('span', { class: 'sobre-carta', 'aria-hidden': 'true' }, h('i', {}, '✦')),
          h('span', { class: 'sobre-bolsillo', 'aria-hidden': 'true' }),
          h('span', { class: 'sobre-solapa', 'aria-hidden': 'true' }),
          h('span', { class: 'sobre-sello', 'aria-hidden': 'true' }));
        sobre.addEventListener('click', function () {
          if (elegido) return;
          elegido = true;
          abrirSobre(fila, sobre, ganado, otros, alAbrir);
        });
        fila.appendChild(sobre);
      })();
    }
    caja.appendChild(fila);
  }

  function abrirSobre(fila, sobre, ganado, otros, alAbrir) {
    var todos = fila.querySelectorAll('.sobre');
    for (var i = 0; i < todos.length; i++) {
      todos[i].disabled = true;
      if (todos[i] !== sobre) todos[i].classList.add('descartado');
    }
    sobre.classList.add('abierto');
    tono(660, 0.09, 0.10, 'triangle');

    setTimeout(function () {
      var caja = dom.modalPremio;
      caja.classList.remove('eligiendo');
      caja.innerHTML = '';
      caja.appendChild(h('span', { class: 'premio-cinta' }, '¡Has ganado!'));
      caja.appendChild(tarjetaPremio(ganado));

      /* vista limpia y quieta: solo el premio (sin los de los otros sobres,
         sin los datos de la partida), que entre entera sin desplazarse */
      dom.modal.classList.add('revelado');
      dom.modalTitulo.textContent = '¡Ganaste!';
      /* una sesion de regalo no se recoge: se agenda */
      caja.appendChild(h('span', { class: 'premio-pie' }, ganado.especial
        ? 'Reserva tu cita en recepción' : 'Enséñalo en recepción antes de irte'));

      /* se repite la animacion de entrada de la tarjeta */
      caja.classList.remove('premio');
      void caja.offsetWidth;
      caja.classList.add('premio');

      dom.modalSello.textContent = '🏆';
      confeti();
      sonar('premio');
      if (typeof alAbrir === 'function') alAbrir(ganado);
    }, 900);
  }

  /* ---------------------------------------------------------------
     LA RULETA (se entra tocando el logo de la pantalla del DNI)

     El premio lo decide el SERVIDOR, con las mismas reglas de la practica
     (bolsas y sachets segun su stock, y una sesion de regalo con la
     probabilidad de la practica). La ruleta solo lo muestra: gira hasta
     el sector de ese premio. Luego se ve el premio y se registra el DNI
     (registroPractica: Odoo, hoja del aniversario si es sesion de regalo).
     --------------------------------------------------------------- */
  var SECTORES = [
    { clave: 'playera', texto: 'Bolsa playera' },
    { clave: 'serum', texto: 'Sérum' },
    { clave: 'ecologica', texto: 'Bolsa ecológica' },
    { clave: 'playera', texto: 'Bolsa playera' },
    { clave: 'sesion', texto: 'Sesión de regalo' },
    { clave: 'playera', texto: 'Bolsa playera' },
    { clave: 'ecologica', texto: 'Bolsa ecológica' },
    { clave: 'serum', texto: 'Sérum' }
  ];

  function claveSector(p) {
    if (p.especial) return 'sesion';
    var n = String(p.producto || '').toLowerCase();
    if (/playera/.test(n)) return 'playera';
    if (/ecol/.test(n)) return 'ecologica';
    return 'serum';
  }

  function ruedaSvg() {
    var n = SECTORES.length, ang = 360 / n, r = 100, svg = '';
    function punto(a, rr) { var t = (a - 90) * Math.PI / 180; return (rr * Math.cos(t)).toFixed(2) + ' ' + (rr * Math.sin(t)).toFixed(2); }
    SECTORES.forEach(function (s, i) {
      var a0 = i * ang, a1 = a0 + ang;
      var color = s.clave === 'sesion' ? '#3B2E22' : i % 2 ? '#E9D3A8' : '#FBF4E6';
      svg += '<path d="M0 0 L' + punto(a0, r) + ' A' + r + ' ' + r + ' 0 0 1 ' + punto(a1, r) + ' Z" fill="' + color + '" stroke="#B9924F" stroke-width="1.2"/>';
      var am = a0 + ang / 2, pr = punto(am, 62).split(' ');
      svg += '<text x="' + pr[0] + '" y="' + pr[1] + '" transform="rotate(' + am + ' ' + pr[0] + ' ' + pr[1] + ')" text-anchor="middle" dominant-baseline="middle" ' +
             'font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="' + (s.texto.length > 13 ? 8.4 : 9.6) + '" fill="' +
             (s.clave === 'sesion' ? '#E9C98C' : '#5A4630') + '">' + s.texto + '</text>';
    });
    svg += '<circle r="23" fill="#8B6A38"/><circle r="21" fill="#B9924F"/>';
    return '<svg viewBox="-104 -104 208 208" aria-hidden="true"><circle r="103" fill="#B9924F"/>' + svg + '</svg>';
  }

  function ruleta() {
    desmontar();
    juegoActual = null;
    marcarEnlace(null);
    dom.barra.hidden = true;
    var girando = false, giro = 0;

    var rueda = h('div', { class: 'ruleta-rueda', html: ruedaSvg() });
    var centro = h('img', { class: 'ruleta-centro', src: 'assets/img/sello-jb.png', alt: '' });
    var aviso = h('p', { class: 'ruleta-aviso' }, '');
    var boton = h('button', { class: 'btn btn-primario ruleta-girar', onclick: function () { girar(); } }, '¡Girar la ruleta!');

    function girar() {
      if (girando) return;
      girando = true; boton.disabled = true; boton.textContent = 'Girando…';
      aviso.textContent = '';
      sonar('toque');
      /* empieza a girar ya; cuando llega el premio, frena en su sector */
      giro += 720;
      rueda.style.transition = 'transform 1.6s linear';
      rueda.style.transform = 'rotate(' + giro + 'deg)';
      global.Acceso.pedirPremio('Ruleta', false).then(function (d) {
        if (!d.ok || !d.premio) {
          girando = false; boton.disabled = false; boton.textContent = '¡Girar la ruleta!';
          aviso.textContent = d.ok ? 'Ya se entregaron todos los premios. ¡Gracias!' : (d.mensaje || 'No se pudo girar. Inténtalo otra vez.');
          if (d.ok) volverAlInicio(4);
          return;
        }
        var clave = claveSector(d.premio), cand = [];
        SECTORES.forEach(function (s, i) { if (s.clave === clave) cand.push(i); });
        var i = cand[Math.floor(Math.random() * cand.length)], ang = 360 / SECTORES.length;
        /* el puntero esta arriba: el centro del sector i tiene que quedar en 0 grados */
        var destino = 360 - (i * ang + ang / 2) + (Math.random() - 0.5) * ang * 0.5;
        var vueltas = Math.ceil((giro + 1440) / 360) * 360;
        giro = vueltas + destino;
        rueda.style.transition = 'transform 4.2s cubic-bezier(.12,.6,.18,1)';
        rueda.style.transform = 'rotate(' + giro + 'deg)';
        setTimeout(function () { premioRuleta(d.premio); }, 4400);
      });
    }

    function volverAlInicio(seg) { setTimeout(function () { salir(); }, seg * 1000); }

    var vista = h('section', { class: 'vista ruleta' },
      h('img', { class: 'ruleta-logo', src: 'assets/img/logo.png', alt: 'Joana Bernedo Body Aesthetics' }),
      h('h1', { class: 'ruleta-titulo' }, 'Ruleta de premios'),
      h('p', { class: 'ruleta-lema' }, 'Gira y descubre tu regalo'),
      h('div', { class: 'ruleta-marco' },
        h('span', { class: 'ruleta-puntero', 'aria-hidden': 'true' }),
        rueda, centro),
      boton, aviso,
      h('button', { class: 'ruleta-volver', onclick: function () { if (!girando) { sonar('toque'); salir(); } } }, 'Volver'));
    pintar(vista);
    reprogramarReposo();
  }

  /** El premio de la ruleta: se ve en la misma vista quieta que el de los
      sobres, y a los 2 s se le pide su DNI. */
  function premioRuleta(p) {
    clearTimeout(relojSalida);
    var extras = dom.modal.querySelectorAll('.practica-extra');
    for (var x = 0; x < extras.length; x++) extras[x].parentNode.removeChild(extras[x]);
    dom.modal.classList.remove('registrando');
    dom.modal.classList.add('revelado');
    dom.modalSello.textContent = '🏆';
    dom.modalTitulo.textContent = '¡Ganaste!';
    dom.modalMensaje.textContent = '';
    dom.modalDatos.innerHTML = '';
    dom.modalRepetir.hidden = true;
    var caja = dom.modalPremio;
    caja.hidden = false;
    caja.classList.remove('eligiendo');
    caja.innerHTML = '';
    caja.appendChild(h('span', { class: 'premio-cinta' }, '¡Has ganado!'));
    caja.appendChild(tarjetaPremio(p));
    caja.appendChild(h('span', { class: 'premio-pie' }, p.especial
      ? 'Reserva tu cita en recepción' : 'Enséñalo en recepción antes de irte'));
    confeti();
    sonar('premio');
    mostrarModal();
    relojSalida = setTimeout(function () {
      registroPractica(p, function (aviso) {
        if (aviso) dom.modalMensaje.textContent = aviso;
        volverSolo(aviso ? 6 : 5);
      });
    }, 2000);
  }

  /** Abierto el sobre, la vuelta al inicio se hace sola: el cliente no
      tiene que tocar nada mas, y el siguiente se encuentra la pantalla del
      comprobante. Se ve la cuenta atras para que no parezca que se corta. */
  function volverSolo(segundos) {
    clearTimeout(relojSalida);
    var aviso = h('span', { class: 'premio-volver' }, '');
    /* sin tarjeta de premio a la vista, el aviso va suelto en el modal */
    if (dom.modalPremio.hidden) dom.modalDatos.parentNode.insertBefore(aviso, dom.modalDatos.nextSibling);
    else dom.modalPremio.appendChild(aviso);
    (function tic() {
      aviso.textContent = segundos > 0
        ? 'Volviendo al inicio en ' + segundos + '…'
        : 'Volviendo al inicio…';
      if (segundos <= 0) { salir(); return; }
      segundos--;
      relojSalida = setTimeout(tic, 1000);
    })();
  }

  function cerrarModal() { dom.modal.hidden = true; registrando = false; }

  /* ------------------------- Sonido on/off ------------------------- */

  function alternarSonido() {
    sonidoActivo = !sonidoActivo;
    try { localStorage.setItem('jb_sonido', sonidoActivo ? '1' : '0'); } catch (e) {}
    pintarSonido();
    if (sonidoActivo) sonar('toque');
  }

  function pintarSonido() {
    dom.iconoSonido.textContent = sonidoActivo ? '♪' : '♪';
    dom.sonido.classList.toggle('apagado', !sonidoActivo);
    dom.sonido.setAttribute('aria-pressed', sonidoActivo ? 'true' : 'false');
  }

  /* ------------------------- Reposo por inactividad ------------------------- */

  var ESPERA_JUEGO = 120000;   // 2 min dentro de un juego -> vuelve al menu
  var ESPERA_MENU = 60000;     // 1 min en el menu -> protector de pantalla
  var relojReposo = null;

  function reprogramarReposo() {
    clearTimeout(relojReposo);
    if (!dom.atractor.hidden) return;          // ya esta en reposo
    var espera = juegoActual ? ESPERA_JUEGO : ESPERA_MENU;
    relojReposo = setTimeout(function () {
      if (juegoActual) { salir(); }
      else { dom.atractor.hidden = false; }
    }, espera);
  }

  function despertar() {
    if (dom.atractor.hidden) return;
    dom.atractor.hidden = true;
    /* Quien llega ahora es otra persona: se le pide su comprobante. */
    if (global.Acceso) {
      desmontar();
      juegoActual = null;
      juegoElegido = null;
      intentosUsados = 0;
      premioGanado = null;
      dom.barra.hidden = true;
      global.Acceso.olvidar();
      global.Acceso.pedir(irMenu);
    } else {
      irMenu();
    }
    reprogramarReposo();
  }

  /* ------------------------- Arranque ------------------------- */

  function registrar(juego) { catalogo.push(juego); }

  function iniciar() {
    cache();
    pintarSonido();

    dom.volver.addEventListener('click', function () {
      sonar('toque');
      if (enPractica()) irMenu(); else salir();
    });
    dom.sonido.addEventListener('click', alternarSonido);
    dom.modalRepetir.addEventListener('click', function () { sonar('toque'); reiniciar(); });
    dom.atractor.addEventListener('pointerdown', despertar);

    // Cualquier interaccion reinicia el contador de reposo
    ['pointerdown', 'keydown', 'wheel'].forEach(function (evento) {
      document.addEventListener(evento, function () {
        if (!dom.atractor.hidden) return;
        reprogramarReposo();
      }, { passive: true });
    });

    /* Arrastrar el dedo tambien cuenta como actividad (juegos de accion, donde
       se puede estar un buen rato sin levantar el dedo de la pantalla).
       Se mira solo una vez por segundo para no gastar recursos. */
    var ultimoArrastre = 0;
    document.addEventListener('pointermove', function () {
      var ahora = Date.now();
      if (ahora - ultimoArrastre < 1000) return;
      ultimoArrastre = ahora;
      if (!dom.atractor.hidden) return;
      reprogramarReposo();
    }, { passive: true });

    // Atajos de teclado (util si el totem tiene control remoto o teclado)
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Backspace') && !sinBoleta() && !registrando) {
        if (!dom.modal.hidden) { cerrarModal(); }
        irMenu();
      }
      if (e.key === 'F5' && e.ctrlKey) return; // recarga normal
    });

    // Evitar menu contextual y zoom por doble toque en el totem
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    /* ---------------------------------------------------------------
       EL TOQUE, SIN ESPERAR AL CLICK

       En una laptop el raton responde al instante; en el totem no. Entre
       que el dedo se levanta y el navegador decide que eso fue un 'click'
       pasan decenas de milisegundos (a veces mas de cien): tiene que
       descartar antes que fuera un arrastre o un doble toque. Se nota, y
       el cliente vuelve a tocar creyendo que no le ha hecho caso.

       Aqui el boton se dispara ya al levantar el dedo, si no se ha movido.
       El click de verdad llega detras y se descarta, para que la accion no
       se haga dos veces. Solo aplica al dedo: con raton no hace falta.
       --------------------------------------------------------------- */
    var toque = null, tragarClick = false;

    function botonDe(destino) {
      return destino && destino.closest ? destino.closest('button') : null;
    }

    document.addEventListener('pointerdown', function (e) {
      tragarClick = false;
      if (e.pointerType === 'mouse') { toque = null; return; }
      var b = botonDe(e.target);
      toque = b ? { b: b, x: e.clientX, y: e.clientY } : null;
    }, true);

    document.addEventListener('pointerup', function (e) {
      var t = toque;
      toque = null;
      if (!t || e.pointerType === 'mouse') return;
      if (botonDe(e.target) !== t.b || t.b.disabled) return;
      if (Math.abs(e.clientX - t.x) > 14 || Math.abs(e.clientY - t.y) > 14) return;
      t.b.click();              // este pasa: es el que queremos
      tragarClick = true;       // el que mande el navegador despues, no
    }, true);

    document.addEventListener('click', function (e) {
      if (!tragarClick) return;
      tragarClick = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);

    /* Volver a pantalla completa en cuanto se pueda. Sin esto, en el totem
       quedan a la vista la barra de titulo y las pestanas del navegador: los
       dedos las tocan, arrastran la ventana y Windows la acopla a un lado.
       El navegador solo deja pedirlo dentro de un gesto del usuario, asi que
       se aprovecha cada toque. Cuando ya esta completa no hace nada. */
    document.addEventListener('pointerdown', pantallaCompleta, true);
    document.addEventListener('fullscreenchange', pintarBotonPantalla);
    document.addEventListener('webkitfullscreenchange', pintarBotonPantalla);
    if (dom.botonPantalla) {
      dom.botonPantalla.addEventListener('click', function () {
        sonar('toque');
        pantallaCompleta();
        pintarBotonPantalla();
      });
    }
    pintarBotonPantalla();

    // Permite abrir un juego directamente: index.html#trivia
    var atajo = (location.hash || '').replace('#', '');
    function arrancar() {
      if (atajo) abrir(atajo); else irMenu();
      atajo = '';                       // solo la primera vez
      reprogramarReposo();
    }

    /* Antes de jugar hay que pasar por el numero de boleta. */
    if (global.Acceso && !global.Acceso.autorizado()) {
      dom.barra.hidden = true;
      global.Acceso.pedir(arrancar);
      reprogramarReposo();
    } else {
      arrancar();
    }
  }

  /** Pide pantalla completa si no lo esta ya. Silencioso si el navegador
      la rechaza: se volvera a intentar en el proximo toque. */
  var ultimaPantalla = 0;

  function pantallaCompleta() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    /* Mientras el navegador esta entrando a pantalla completa, pedirsela otra
       vez la CANCELA: con toques rapidos la aplicacion se salia sola y
       aparecian las pestanas del navegador. Se pide como mucho cada segundo
       y medio, que es de sobra para lo que hace falta. */
    var ahora = Date.now();
    if (ahora - ultimaPantalla < 1500) return;
    ultimaPantalla = ahora;
    var raiz = document.documentElement;
    var pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
    if (!pedir) return;
    try { var r = pedir.call(raiz); if (r && r.catch) r.catch(function () {}); }
    catch (e) { /* hara falta otro gesto */ }
  }

  /** Ensena el boton solo mientras el navegador siga a la vista. */
  function pintarBotonPantalla() {
    if (!dom.botonPantalla) return;
    var raiz = document.documentElement;
    var sePuede = !!(raiz.requestFullscreen || raiz.webkitRequestFullscreen);
    var yaEsta = !!(document.fullscreenElement || document.webkitFullscreenElement);
    dom.botonPantalla.hidden = !sePuede || yaEsta;
  }

  global.App = {
    registrar: registrar,
    iniciar: iniciar,
    pintar: pintar,
    pantallaCompleta: function () { pantallaCompleta(); pintarBotonPantalla(); },
    menu: irMenu,
    ruleta: ruleta,
    abrir: abrir,
    sonar: sonar,
    tono: tono,
    ruido: ruido
  };

})(window);
