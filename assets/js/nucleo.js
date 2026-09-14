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
  global.LIMITE = 60;

  /* Cada comprobante da derecho a UN juego y a estos intentos. */
  global.INTENTOS = 2;

  var juegoElegido = null;      // el juego que escogio este cliente
  var intentosUsados = 0;
  var relojSalida = null;       // vuelta automatica al final del turno

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
    dom.modalMenu = document.getElementById('modal-menu');
    dom.atractor = document.getElementById('atractor');
    dom.reloj = document.getElementById('reloj');
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
    if (dom.reloj) { dom.reloj.hidden = true; dom.reloj.classList.remove('poco'); }
    cerrarModal();
  }

  /** Sustituye la vista actual con una transicion suave. */
  function pintar(nuevaVista, limpieza) {
    if (typeof limpieza === 'function') limpiarActual = limpieza;
    var anterior = dom.pantalla.firstElementChild;
    if (anterior) {
      anterior.classList.add('saliendo');
      setTimeout(function () {
        if (anterior.parentNode) anterior.parentNode.removeChild(anterior);
      }, 220);
    }
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

  function irMenu() {
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
        h('span', { class: 'emoji', 'aria-hidden': 'true' }, juego.emoji),
        h('span', { class: 'nombre' }, juego.nombre),
        h('span', { class: 'desc' }, juego.desc)
      );
      return tarjeta;
    });

    var vista = h('section', { class: 'vista menu' },
      h('div', { class: 'menu-cabecera' },
        h('img', { src: 'assets/img/logo.png', alt: 'Joana Bernedo Body Aesthetics' }),
        h('h1', {}, 'Zona de Juegos'),
        h('p', { class: 'lema' }, 'Mientras esperas, entretente'),
        h('hr', { class: 'filete' })
      ),
      h('div', { class: 'tarjetas' }, tarjetas),
      h('p', { class: 'menu-pie' }, global.Acceso
        ? 'Elige un juego: tienes ' + global.INTENTOS + ' intentos'
        : 'Elige un juego para comenzar')
    );

    pintar(vista);
    reprogramarReposo();          // en el menu se espera menos
  }

  /* ------------------------- Abrir un juego ------------------------- */

  function abrir(id) {
    var juego = null;
    for (var i = 0; i < catalogo.length; i++) {
      if (catalogo[i].id === id) { juego = catalogo[i]; break; }
    }
    if (!juego) return irMenu();

    /* Un comprobante, un juego: si intenta otro, se le devuelve al suyo. */
    if (juegoElegido && juegoElegido !== juego.id) return;
    juegoElegido = juego.id;
    intentosUsados++;
    pintarIntentos();

    desmontar();
    juegoActual = juego;
    marcarEnlace(juego.id);

    dom.barra.hidden = false;
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
  function pintarIntentos() {
    if (!dom.intentos) return;
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

  function abrirModal(op) {
    dom.modalSello.textContent = op.sello || '✦';
    dom.modalTitulo.textContent = op.titulo || 'Fin del juego';
    dom.modalMensaje.textContent = op.mensaje || '';
    dom.modalDatos.innerHTML = '';
    (op.datos || []).forEach(function (d) {
      dom.modalDatos.appendChild(
        h('div', {},
          h('span', { class: 'val' }, d.val),
          h('span', { class: 'etq' }, d.etq)
        )
      );
    });
    /* Premio: solo aparece cuando el juego dice que se cumplio el objetivo */
    dom.modalPremio.innerHTML = '';
    if (op.premio) {
      dom.modalPremio.hidden = false;
      dom.modalPremio.appendChild(h('span', { class: 'premio-cinta' }, '¡Has ganado!'));
      dom.modalPremio.appendChild(h('span', { class: 'premio-icono', 'aria-hidden': 'true' }, op.premio.icono));
      dom.modalPremio.appendChild(h('strong', { class: 'premio-nombre' }, op.premio.nombre));
      dom.modalPremio.appendChild(h('span', { class: 'premio-nota' }, op.premio.nota));
      dom.modalPremio.appendChild(h('span', { class: 'premio-pie' }, 'Enséñalo en recepción antes de irte'));
      dom.modalSello.textContent = '🏆';
      confeti();
      sonar('premio');
    } else {
      dom.modalPremio.hidden = true;
    }

    /* Intentos: si ya gasto los dos, solo puede salir (y se sale solo) */
    var quedan = global.Acceso ? (global.INTENTOS - intentosUsados) : 1;
    dom.modalRepetir.hidden = quedan <= 0;
    dom.modalRepetir.textContent = op.textoRepetir ||
      (quedan === 1 ? 'Jugar mi último intento' : 'Jugar otra vez');
    dom.modalMenu.textContent = global.Acceso ? 'Salir' : 'Ver otros juegos';

    clearTimeout(relojSalida);
    if (quedan <= 0) {
      dom.modalMensaje.textContent = (op.mensaje ? op.mensaje + ' ' : '') +
        'Se acabaron tus ' + global.INTENTOS + ' intentos.';
      relojSalida = setTimeout(salir, 14000);
    }

    dom.modal.hidden = false;
  }

  function cerrarModal() { dom.modal.hidden = true; }

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

    dom.volver.addEventListener('click', function () { sonar('toque'); salir(); });
    dom.sonido.addEventListener('click', alternarSonido);
    dom.modalRepetir.addEventListener('click', function () { sonar('toque'); reiniciar(); });
    dom.modalMenu.addEventListener('click', function () { sonar('toque'); salir(); });
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
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (!dom.modal.hidden) { cerrarModal(); }
        irMenu();
      }
      if (e.key === 'F5' && e.ctrlKey) return; // recarga normal
    });

    // Evitar menu contextual y zoom por doble toque en el totem
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    /* Volver a pantalla completa en cuanto se pueda. Sin esto, en el totem
       quedan a la vista la barra de titulo y las pestanas del navegador: los
       dedos las tocan, arrastran la ventana y Windows la acopla a un lado.
       El navegador solo deja pedirlo dentro de un gesto del usuario, asi que
       se aprovecha cada toque. Cuando ya esta completa no hace nada. */
    document.addEventListener('pointerdown', pantallaCompleta, true);
    document.addEventListener('fullscreenchange', function () {
      /* Si alguien sale (Escape, F11), el siguiente toque la devuelve. */
      pintarSonido();
    });

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
  function pantallaCompleta() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    var raiz = document.documentElement;
    var pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
    if (!pedir) return;
    try { var r = pedir.call(raiz); if (r && r.catch) r.catch(function () {}); }
    catch (e) { /* hara falta otro gesto */ }
  }

  global.App = {
    registrar: registrar,
    iniciar: iniciar,
    pintar: pintar,
    pantallaCompleta: pantallaCompleta,
    menu: irMenu,
    abrir: abrir,
    sonar: sonar,
    tono: tono
  };

})(window);
