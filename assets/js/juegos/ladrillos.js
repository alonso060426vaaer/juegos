/* ==========================================================================
   JUEGO 7 - ROMPE LADRILLOS (el arcade clasico de toda la vida)
   Version de cristal: el fondo con el rostro, los ladrillos, la paleta y la
   bola salen de las fotos de assets/img/ladrillos, y el marcador (score,
   level, lives) va dentro del lienzo, en una barra de cristal.
   Se juega arrastrando el dedo.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     El campo se mide en unidades propias (100 de ancho x 140 de alto)
     y al dibujar se escala al tamano real del canvas. Asi la partida
     se juega igual en el totem, en la tablet y en el movil.
     --------------------------------------------------------------- */
  var FW = 100;
  var FH = 140;                                        // se ajusta al hueco disponible
  var FH_MIN = 115, FH_MAX = 190;

  var HUD_ALTO = 14;                                   // barra de cristal de arriba
  var TECHO    = HUD_ALTO + 2;                         // borde de arriba del campo
  var LADO     = 2;                                    // bordes laterales del campo

  var COLUMNAS = 9;
  var MARGEN   = 5;                                    // borde lateral libre
  var HUECO    = 0.9;                                  // separacion entre ladrillos
  var LAD_W    = (FW - MARGEN * 2 - HUECO * (COLUMNAS - 1)) / COLUMNAS;
  var LAD_H    = 4.6;
  var LAD_Y0   = 24;                                   // altura de la primera fila

  var PALA_W = 24, PALA_H = 3.8;                     // la paleta es una jeringa
  var PALA_ALTO = 11;                                  // separacion de la paleta al fondo
  var PALA_Y = FH - PALA_ALTO;
  var PALA_MIN = 19, PALA_ANCHA = 38;
  var RADIO  = 3.3;                                    // radio de la bola (lleva el logo JB)

  /* Dificultad alta: la bola sale rapida y cada nivel y cada golpe de
     paleta la aceleran mas. La paleta es algo mas corta que en la facil. */
  var VEL_BASE = 150, VEL_MAX = 240;                   // unidades por segundo
  var DURA_INICIO = 7;                                 // segundos de bola perforante al arrancar
  var DURA_REGALO = 6;                                 // y los que da la capsula
  var VIDAS_INICIO = 3, VIDAS_MAX = 5;
  var OBJETIVO = 550;                                  // puntos para llevarse el premio
  var CAIDA = 27;                                      // velocidad de las capsulas
  var SUERTE = 0.11;                                   // probabilidad de capsula

  /* Filas de arriba (mas dificiles de alcanzar) valen mas puntos. Los
     colores van en ciclo: oro, rojo, turquesa, morado, y vuelta a empezar. */
  var FILAS = [
    { color: '#F0B429', luz: '#FFE08A', osc: '#A9700D', brillo: '255,190,60',  puntos: 90, nota: 880 },
    { color: '#E8574C', luz: '#FF9A8E', osc: '#96271E', brillo: '255,110,90',  puntos: 80, nota: 784 },
    { color: '#4FD1C5', luz: '#A8F0EA', osc: '#1E8C82', brillo: '80,210,200',  puntos: 70, nota: 698 },
    { color: '#7C6BE0', luz: '#B2A6FF', osc: '#443A94', brillo: '150,130,255', puntos: 60, nota: 659 },
    { color: '#F0B429', luz: '#FFE08A', osc: '#A9700D', brillo: '255,190,60',  puntos: 50, nota: 587 },
    { color: '#E8574C', luz: '#FF9A8E', osc: '#96271E', brillo: '255,110,90',  puntos: 40, nota: 523 },
    { color: '#4FD1C5', luz: '#A8F0EA', osc: '#1E8C82', brillo: '80,210,200',  puntos: 30, nota: 494 },
    { color: '#7C6BE0', luz: '#B2A6FF', osc: '#443A94', brillo: '150,130,255', puntos: 20, nota: 440 }
  ];
  /* que foto de ladrillo lleva cada fila */
  var FOTO_FILA = [1, 2, 3, 4, 1, 2, 3, 4];

  var REGALOS = [
    { tipo: 'ancha', letra: 'A', color: '#B9924F', aviso: 'Paleta mas ancha' },
    { tipo: 'lenta', letra: 'L', color: '#4E8C6A', aviso: 'Bola mas lenta' },
    { tipo: 'vida',  letra: '+', color: '#C0614F', aviso: 'Una vida mas' },
    { tipo: 'dura',  letra: 'P', color: '#3FA7E0', aviso: 'Bola perforante: atraviesa todo' }
  ];

  /* ---------------------------------------------------------------
     Imagenes. Se cargan una vez por sesion y se comparten entre partidas.
     --------------------------------------------------------------- */
  var RUTA = 'assets/img/ladrillos/';
  var ARCHIVOS = {
    fondo: 'fondo.png',
    bola: 'bola-marca.png',                            // herramientas/preparar-bola-marca.py
    corazon: 'corazon.png',
    guia: 'guia.png',
    ladrillo1: 'ladrillo-1.png',
    ladrillo2: 'ladrillo-2.png',
    ladrillo3: 'ladrillo-3.png',
    ladrillo4: 'ladrillo-4.png'
  };
  var IMG = {};

  function cargar(alTerminar) {
    var faltan = 0;
    function una() { if (--faltan === 0) alTerminar(); }
    Object.keys(ARCHIVOS).forEach(function (n) {
      var im = IMG[n];
      if (!im) {
        im = new Image();
        im.src = RUTA + ARCHIVOS[n];
        IMG[n] = im;
      }
      if (im.complete) return;
      faltan++;
      im.addEventListener('load', una);
      im.addEventListener('error', una);
    });
    if (faltan === 0) alTerminar();
  }

  function lista(n) {
    var im = IMG[n];
    return !!(im && im.complete && im.naturalWidth > 0);
  }

  function imagen(g, n, x, y, w, hh) {
    if (!lista(n)) return;
    var im = IMG[n];
    if (hh === undefined || hh === null) hh = w * im.naturalHeight / im.naturalWidth;
    g.drawImage(im, x, y, w, hh);
  }

  var FUENTE = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  /** Rectangulo con esquinas redondeadas (sin depender de roundRect). */
  function caja(g, x, y, an, al, r) {
    r = Math.min(r, an / 2, al / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + an, y, x + an, y + al, r);
    g.arcTo(x + an, y + al, x, y + al, r);
    g.arcTo(x, y + al, x, y, r);
    g.arcTo(x, y, x + an, y, r);
    g.closePath();
  }

  App.registrar({
    id: 'ladrillos',
    nombre: 'Rompe Arrugas',
    emoji: '🕹️',
    desc: 'El arcade de siempre: no dejes caer la bola',
    sub: 'Reflejos',

    iniciar: function (vista, api) {

      /* ------------------------- Estado ------------------------- */
      var puntos = 0, nivel = 1, vidas = VIDAS_INICIO, golpes = 0;
      var jugando = false, lanzada = false, terminado = false;
      var ladrillos = [], regalos = [], trozos = [], estela = [];
      var destellos = [], ecos = [], luces = [];      // efectos y luces del fondo
      var sacudida = 0;
      var cuenta = null;
      var tiempo = 0, finAncha = 0, finLenta = 0, lento = 1;
      var dura = false, finDura = 0, primera = true;   // bola perforante en el primer lanzamiento de cada nivel
      var duraInicio = false;                          // la del arranque se acaba al primer rebote en la paleta
      var teclaIzq = false, teclaDer = false;

      var mejor = 0;
      try { mejor = parseInt(localStorage.getItem('jb_ladrillos') || '0', 10) || 0; } catch (e) {}

      var pala = { x: (FW - PALA_W) / 2, w: PALA_W, destino: (FW - PALA_W) / 2 };
      var bola = { x: FW / 2, y: PALA_Y - RADIO - 0.6, vx: 0, vy: 0, giro: 0 };

      /* ------------------------- Pantalla ------------------------- */
      /* El marcador y los avisos se pintan dentro del lienzo; estos tres
         solo quedan para que el resto del codigo siga escribiendo en ellos. */
      var valPuntos = {}, valNivel = {}, valVidas = {};
      var mensaje = { texto: '', t: 0 };
      function avisar(t, seg) { mensaje.texto = t; mensaje.t = seg || 2.4; }

      vista.classList.add('ladrillos-vista');
      var lienzo = h('canvas', { class: 'ladrillos' });
      var zona = h('div', { class: 'ladrillos-zona' }, lienzo);
      vista.appendChild(zona);

      api.sub('Nivel 1' + (mejor ? '  ·  Récord ' + mejor : ''));

      var ctx = lienzo.getContext ? lienzo.getContext('2d') : null;
      var pista = document.createElement('canvas');        // fondo fijo, se pinta una vez
      var pctx = pista.getContext ? pista.getContext('2d') : null;
      var escala = 1;
      var degFondo = null;

      /* El lienzo se mide desde aqui (y no desde el CSS) para que ocupe
         siempre todo el hueco libre, tambien si el navegador se ha quedado
         con una hoja de estilos antigua en la cache. */
      function medir() {
        if (!ctx) return;
        var libreAn = zona.clientWidth, libreAl = zona.clientHeight;
        if (libreAn < 40 || libreAl < 40) return;

        /* El campo se adapta al hueco: mas cuadrado en pantallas anchas,
           mas alargado en el totem vertical. */
        FH = Math.max(FH_MIN, Math.min(FH_MAX, Math.round(FW * libreAl / libreAn)));
        PALA_Y = FH - PALA_ALTO;
        degFondo = null;

        /* luces que flotan por la pista */
        luces = [];
        for (var q = 0; q < 14; q++) {
          luces.push({
            x: Math.random() * FW,
            y: Math.random() * (FH + 30),
            r: 4 + Math.random() * 10,
            v: 2 + Math.random() * 5,
            a: (0.10 + Math.random() * 0.14).toFixed(2),
            tono: Math.random() < 0.5 ? '255,255,255' : '190,230,255'
          });
        }
        pintarPista2();

        var an = Math.min(libreAn, libreAl * FW / FH);
        var al = an * FH / FW;
        lienzo.style.width  = Math.round(an) + 'px';
        lienzo.style.height = Math.round(al) + 'px';

        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // mas no se nota y pesa el doble
        lienzo.width  = Math.round(an * dpr);
        lienzo.height = Math.round(al * dpr);
        escala = (an * dpr) / FW;

        /* Si el campo se encoge, la bola no puede quedarse fuera. */
        if (bola.y > PALA_Y - RADIO) colocar();
      }

      /* ------------------------- Marcador ------------------------- */
      function pintarPuntos() { valPuntos.textContent = puntos; }

      function pintarVidas() {
        var texto = '';
        for (var i = 0; i < vidas; i++) texto += '♥';
        valVidas.textContent = texto || '–';
      }

      /* ------------------------- Montar nivel ------------------------- */
      function anchoBase() { return Math.max(PALA_MIN, PALA_W - (nivel - 1) * 1.4); }

      function armar() {
        ladrillos = [];
        var filas = Math.min(FILAS.length, 5 + nivel);
        for (var f = 0; f < filas; f++) {
          for (var c = 0; c < COLUMNAS; c++) {
            ladrillos.push({
              x: MARGEN + c * (LAD_W + HUECO),
              y: LAD_Y0 + f * (LAD_H + HUECO),
              w: LAD_W, h: LAD_H,
              def: FILAS[f],
              foto: 'ladrillo' + FOTO_FILA[f],
              vida: 1,
              vivo: true, chispa: 0, deg: null
            });
          }
        }
      }

      function colocar() {
        lanzada = false;
        estela = [];
        bola.vx = 0; bola.vy = 0;
        bola.x = pala.x + pala.w / 2;
        bola.y = PALA_Y - RADIO - 0.6;
      }

      function velocidad() {
        return Math.min(VEL_MAX, VEL_BASE + (nivel - 1) * 14 + golpes * 0.6) * lento;
      }

      function lanzar() {
        if (lanzada || terminado || !jugando) return;
        lanzada = true;
        var v = velocidad();
        var ang = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
        bola.vx = Math.cos(ang) * v;
        bola.vy = Math.sin(ang) * v;
        api.sonar('toque');
        if (primera) {
          primera = false;
          endurecer(DURA_INICIO, true);
          avisar('¡Bola perforante! Atraviesa todo lo que toca', 3);
        } else {
          avisar('Arrastra el dedo para mover la paleta');
        }
      }

      /** La bola atraviesa los ladrillos (los rompe sin rebotar) durante unos segundos. */
      function endurecer(segundos, deInicio) {
        dura = true;
        duraInicio = !!deInicio;
        finDura = tiempo + segundos;
      }

      /** La perforante del arranque dura hasta que la bola vuelve a la paleta:
          rebota en los muros y sigue perforando; al primer toque de paleta se acaba. */
      function rebote() {
        if (!dura || !duraInicio) return;
        dura = false; duraInicio = false; finDura = 0;
        avisar('La bola vuelve a rebotar', 1.4);
      }

      /* ------------------------- Movimiento ------------------------- */
      function paso(dt) {

        if (finAncha && tiempo > finAncha) { finAncha = 0; pala.w = anchoBase(); }
        if (finLenta && tiempo > finLenta) { finLenta = 0; lento = 1; reajustar(); }
        if (finDura && tiempo > finDura) { finDura = 0; dura = false; duraInicio = false; avisar('La bola vuelve a rebotar', 1.6); }

        if (teclaIzq) pala.destino -= 75 * dt;
        if (teclaDer) pala.destino += 75 * dt;
        pala.destino = Math.max(LADO, Math.min(FW - LADO - pala.w, pala.destino));
        pala.x += (pala.destino - pala.x) * Math.min(1, dt * 22);
        if (Math.abs(pala.destino - pala.x) < 0.04) pala.x = pala.destino;

        if (!lanzada) {
          bola.x = pala.x + pala.w / 2;
          bola.y = PALA_Y - RADIO - 0.6;
        } else {
          mover(dt);
        }

        caerRegalos(dt);
        moverTrozos(dt);

        for (var i = 0; i < ladrillos.length; i++) {
          if (ladrillos[i].chispa > 0) ladrillos[i].chispa -= dt;
        }
      }

      /** La bola avanza en pasos pequenos para que nunca atraviese nada. */
      function mover(dt) {
        var v = Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy);
        var partes = Math.max(1, Math.ceil((v * dt) / (RADIO * 0.6)));
        var paso2 = dt / partes;
        for (var i = 0; i < partes && lanzada; i++) avanzar(paso2);

        estela.push({ x: bola.x, y: bola.y });
        if (estela.length > 9) estela.shift();
        bola.giro += (v * dt / RADIO) * 0.45 * (bola.vx >= 0 ? 1 : -1);
      }

      function avanzar(dt) {
        bola.x += bola.vx * dt;
        bola.y += bola.vy * dt;

        if (bola.x < LADO + RADIO)      { bola.x = LADO + RADIO;      bola.vx =  Math.abs(bola.vx); muro('izq', bola.y); }
        if (bola.x > FW - LADO - RADIO) { bola.x = FW - LADO - RADIO; bola.vx = -Math.abs(bola.vx); muro('der', bola.y); }
        if (bola.y < TECHO + RADIO)     { bola.y = TECHO + RADIO;     bola.vy =  Math.abs(bola.vy); muro('alto', bola.x); }

        chocarLadrillo();
        chocarPala();

        if (bola.y > FH + RADIO) perder();
      }

      function muro(lado, donde) {
        App.tono(330, 0.05, 0.07, 'triangle');
        destellos.push({ lado: lado, donde: donde, t: 0 });
      }

      function chocarPala() {
        if (bola.vy <= 0) return;
        if (bola.y + RADIO < PALA_Y || bola.y - RADIO > PALA_Y + PALA_H) return;
        if (bola.x < pala.x - RADIO || bola.x > pala.x + pala.w + RADIO) return;

        /* El rebote depende de donde golpee: en el centro sube recta y en
           los extremos sale muy abierta, asi se puede apuntar. */
        var rel = (bola.x - (pala.x + pala.w / 2)) / (pala.w / 2);
        rel = Math.max(-1, Math.min(1, rel));
        var ang = rel * 1.05;
        golpes++;
        var v = velocidad();
        bola.vx = Math.sin(ang) * v;
        bola.vy = -Math.cos(ang) * v;
        bola.y = PALA_Y - RADIO - 0.02;
        rebote();
        App.tono(520 + rel * 60, 0.06, 0.10, 'triangle');
        for (var ch = 0; ch < 7; ch++) {
          trozos.push({
            x: bola.x, y: PALA_Y - 0.4,
            vx: (Math.random() - 0.5) * 26, vy: -6 - Math.random() * 18,
            vida: 0.4, color: '#FFFFFF'
          });
        }
      }

      /** Recalcula la velocidad sin cambiar la direccion. */
      function reajustar() {
        if (!lanzada) return;
        var v = Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy) || 1;
        var nueva = velocidad();
        bola.vx = bola.vx / v * nueva;
        bola.vy = bola.vy / v * nueva;
      }

      function chocarLadrillo() {
        for (var i = 0; i < ladrillos.length; i++) {
          var l = ladrillos[i];
          if (!l.vivo) continue;

          var cx = Math.max(l.x, Math.min(bola.x, l.x + l.w));
          var cy = Math.max(l.y, Math.min(bola.y, l.y + l.h));
          var dx = bola.x - cx, dy = bola.y - cy;
          if (dx * dx + dy * dy > RADIO * RADIO) continue;

          if (dura) { romper(l); continue; }        // perforante: rompe y sigue de largo

          /* Rebota por el lado mas cercano y se separa para no golpear dos veces. */
          if (Math.abs(dx) > Math.abs(dy)) {
            bola.vx = dx >= 0 ? Math.abs(bola.vx) : -Math.abs(bola.vx);
            bola.x  = dx >= 0 ? l.x + l.w + RADIO + 0.01 : l.x - RADIO - 0.01;
          } else {
            bola.vy = dy >= 0 ? Math.abs(bola.vy) : -Math.abs(bola.vy);
            bola.y  = dy >= 0 ? l.y + l.h + RADIO + 0.01 : l.y - RADIO - 0.01;
          }

          romper(l);
          return;                                 // un ladrillo por paso
        }
      }

      function romper(l) {
        l.vida--;
        if (l.vida > 0) {
          l.chispa = 0.16;
          App.tono(l.def.nota * 0.75, 0.06, 0.09, 'square');
          return;
        }
        l.vivo = false;
        ecos.push({ x: l.x, y: l.y, w: l.w, h: l.h, brillo: l.def.brillo, t: 0 });
        puntos += l.def.puntos;
        pintarPuntos();
        App.tono(l.def.nota, 0.07, 0.11, 'triangle');
        chispazo(l);

        if (Math.random() < SUERTE && regalos.length < 2) {
          var def = REGALOS[entero(0, REGALOS.length - 1)];
          regalos.push({ x: l.x + l.w / 2, y: l.y + l.h / 2, def: def, giro: 0 });
        }

        if (!quedan()) superar();
      }

      function quedan() {
        for (var i = 0; i < ladrillos.length; i++) if (ladrillos[i].vivo) return true;
        return false;
      }

      function chispazo(l) {
        for (var i = 0; i < 7; i++) {
          trozos.push({
            x: l.x + Math.random() * l.w,
            y: l.y + Math.random() * l.h,
            vx: (Math.random() - 0.5) * 34,
            vy: (Math.random() - 0.6) * 26,
            vida: 0.55, color: l.def.color
          });
        }
        if (trozos.length > 90) trozos.splice(0, trozos.length - 90);
      }

      function moverTrozos(dt) {
        for (var i = trozos.length - 1; i >= 0; i--) {
          var t = trozos[i];
          t.vy += 90 * dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          t.vida -= dt;
          if (t.vida <= 0) trozos.splice(i, 1);
        }
      }

      /* ------------------------- Capsulas ------------------------- */
      function caerRegalos(dt) {
        for (var i = regalos.length - 1; i >= 0; i--) {
          var c = regalos[i];
          c.y += CAIDA * dt;
          c.giro += dt * 2.4;
          var cogida = c.y + 1.8 > PALA_Y && c.y - 1.8 < PALA_Y + PALA_H &&
                       c.x + 4.2 > pala.x && c.x - 4.2 < pala.x + pala.w;
          if (cogida) { regalos.splice(i, 1); aplicar(c.def); continue; }
          if (c.y > FH + 4) regalos.splice(i, 1);
        }
      }

      function aplicar(def) {
        api.sonar('bien');
        if (def.tipo === 'ancha') {
          pala.w = Math.min(PALA_ANCHA, anchoBase() * 1.5);
          finAncha = tiempo + 14;
        } else if (def.tipo === 'lenta') {
          lento = 0.75;
          finLenta = tiempo + 12;
          reajustar();
        } else if (def.tipo === 'dura') {
          endurecer(DURA_REGALO);
        } else {
          if (vidas < VIDAS_MAX) vidas++;
          pintarVidas();
        }
        avisar(def.aviso);
      }

      /* ------------------------- Vidas y final ------------------------- */
      function perder() {
        lanzada = false;
        sacudida = 1;
        vidas--;
        pintarVidas();
        api.sonar('mal');
        regalos = [];
        finAncha = 0; finLenta = 0; lento = 1;
        finDura = 0; dura = false;
        pala.w = anchoBase();

        if (vidas <= 0) { acabar(); return; }
        colocar();
        avisar(vidas === 1
          ? 'Te queda una vida. Toca para lanzar'
          : 'Te quedan ' + vidas + ' vidas. Toca para lanzar');
      }

      function superar() {
        jugando = false;
        colocar();
        puntos += 100 * nivel;
        pintarPuntos();
        api.sonar('gana');
        avisar('¡Nivel ' + nivel + ' superado!');

        api.luego(function () {
          nivel++;
          valNivel.textContent = nivel;
          api.sub('Nivel ' + nivel + (mejor ? '  ·  Récord ' + mejor : ''));
          pala.w = anchoBase();
          regalos = []; trozos = [];
          primera = true;                    // cada nivel arranca con la bola perforante
          armar();
          colocar();
          avisar('Toca la pantalla para lanzar la bola');
          jugando = true;
        }, 1500);
      }

      function acabar(porTiempo) {
        if (terminado) return;
        terminado = true;
        jugando = false;
        if (cuenta && !porTiempo) cuenta.parar();
        avisar(porTiempo ? 'Tiempo cumplido' : 'Se acabaron las vidas');
        if (puntos > mejor) {
          mejor = puntos;
          try { localStorage.setItem('jb_ladrillos', String(mejor)); } catch (e) {}
        }
        api.sonar('fin');
        api.luego(function () {
          api.fin({
            sello: '✦',
            titulo: porTiempo ? '¡Se acabó el tiempo!'
                  : (nivel >= 4 ? '¡Gran partida!' : 'Fin del juego'),
            premio: (puntos >= OBJETIVO || nivel >= 2) ? premio() : null,
            mensaje: nivel >= 4
              ? 'Muy buenos reflejos. ¿Te atreves a superar tu récord?'
              : 'La puntería mejora con cada intento. ¿Jugamos otra?',
            datos: [
              { val: puntos, etq: 'Puntos' },
              { val: nivel, etq: 'Nivel' },
              { val: mejor, etq: 'Récord' }
            ]
          });
        }, 800);
      }

      /* ------------------------- Dibujo ------------------------- */
      function dibujar() {
        if (!ctx) return;
        /* al perder una vida la pista tiembla un momento */
        var sx = sacudida > 0 ? (Math.random() - 0.5) * 3.2 * sacudida : 0;
        var sy = sacudida > 0 ? (Math.random() - 0.5) * 3.2 * sacudida : 0;
        ctx.setTransform(escala, 0, 0, escala, sx * escala, sy * escala);
        ctx.clearRect(-4, -4, FW + 8, FH + 8);
        fondo();
        pintarEcos();
        pintarLadrillos();
        pintarTrozos();
        pintarRegalos();
        pintarPala();
        pintarEstela();
        pintarBola();
        pintarDestellos();
        if (!lanzada && !terminado && jugando) pintarPista();
        pintarHud();
        pintarAviso();
      }

      /* ---------------------------------------------------------------
         Marcador de cristal: score, level y lives en tres pastillas.
         --------------------------------------------------------------- */
      function pastilla(x, y, w, hh) {
        caja(ctx, x, y, w, hh, hh / 2);
        var deg = ctx.createLinearGradient(0, y, 0, y + hh);
        deg.addColorStop(0, 'rgba(255,255,255,.72)');
        deg.addColorStop(1, 'rgba(215,236,250,.55)');
        ctx.fillStyle = deg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = 0.45;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(120,185,235,.55)';
        ctx.lineWidth = 0.25;
        caja(ctx, x + 0.5, y + 0.5, w - 1, hh - 1, hh / 2 - 0.5);
        ctx.stroke();
      }

      function texto(t, x, y, tam, alinea, peso, color) {
        ctx.font = (peso || 600) + ' ' + tam + 'px ' + FUENTE;
        ctx.textAlign = alinea || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color || '#2B4F86';
        ctx.fillText(t, x, y);
      }

      function seisCifras(n) {
        return n < 1000000 ? ('000000' + n).slice(-6) : String(n);
      }

      function pintarHud() {
        /* la barra entera */
        caja(ctx, 1.5, 1.2, FW - 3, HUD_ALTO - 2.4, 5);
        var deg = ctx.createLinearGradient(0, 1, 0, HUD_ALTO);
        deg.addColorStop(0, 'rgba(255,255,255,.60)');
        deg.addColorStop(1, 'rgba(200,228,246,.45)');
        ctx.fillStyle = deg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        var y = 2.6, hh = HUD_ALTO - 5.2;
        pastilla(4, y, 32, hh);
        texto('SCORE', 20, y + hh * 0.3, 2.3, 'center', 600, '#4A78B0');
        texto(seisCifras(puntos), 20, y + hh * 0.7, 4.2, 'center', 700);

        ctx.strokeStyle = 'rgba(110,170,220,.7)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(38.5, y + 1); ctx.lineTo(38.5, y + hh - 1);
        ctx.moveTo(61.5, y + 1); ctx.lineTo(61.5, y + hh - 1);
        ctx.stroke();

        texto('LEVEL', 50, y + hh * 0.3, 2.3, 'center', 600, '#4A78B0');
        texto(String(nivel), 50, y + hh * 0.7, 4.2, 'center', 700);

        pastilla(64, y, 32, hh);
        texto('LIVES', 80, y + hh * 0.3, 2.3, 'center', 600, '#4A78B0');
        var n = Math.max(vidas, 0), cw = n > 3 ? 3.4 : 4.2, sep = 0.7;
        var x0 = 80 - (n * cw + (n - 1) * sep) / 2;
        for (var i = 0; i < n; i++) {
          if (lista('corazon')) imagen(ctx, 'corazon', x0 + i * (cw + sep), y + hh * 0.7 - cw * 0.42, cw, cw * 0.9);
          else texto('\u2665', x0 + i * (cw + sep) + cw / 2, y + hh * 0.7, 3.6, 'center', 700, '#2BB5D8');
        }
      }

      /** Aviso sobre la paleta: la pista para lanzar, o lo ultimo que paso. */
      function pintarAviso() {
        var t = mensaje.t > 0 ? mensaje.texto : '';
        var alfa = mensaje.t > 0 ? Math.min(1, mensaje.t / 0.4) : 1;
        if (!t && !lanzada && jugando && !terminado) { t = 'Toca la pantalla para lanzar la bola'; alfa = 0.9; }
        if (!t) return;
        ctx.globalAlpha = alfa;
        ctx.font = '600 3px ' + FUENTE;
        var w = ctx.measureText(t).width + 7, hh = 6, x = (FW - w) / 2, y = PALA_Y - 22;
        caja(ctx, x, y, w, hh, 3);
        ctx.fillStyle = 'rgba(40,80,130,.55)';
        ctx.fill();
        texto(t, FW / 2, y + hh / 2, 3, 'center', 600, '#FFFFFF');
        ctx.globalAlpha = 1;
      }

      /* La pista no cambia: se pinta una sola vez en un lienzo aparte y cada
         cuadro solo se copia. Es la foto del fondo (el rostro, la pipeta y
         las burbujas) recortada al campo, con el marco de cristal encima. */
      function pintarPista2() {
        if (!pctx) return;
        pista.width = lienzo.width;
        pista.height = lienzo.height;
        var g = pctx;
        g.setTransform(escala, 0, 0, escala, 0, 0);

        var deg = g.createLinearGradient(0, 0, 0, FH);
        deg.addColorStop(0, '#EAF4FB');
        deg.addColorStop(1, '#D3E8F6');
        g.fillStyle = deg;
        g.fillRect(0, 0, FW, FH);

        /* el campo, con la foto cubriendolo entero (como background-size: cover) */
        var cx = 1.2, cy = HUD_ALTO + 0.4, cw = FW - 2.4, ch = FH - cy - 1.2;
        g.save();
        caja(g, cx, cy, cw, ch, 4);
        g.clip();
        if (lista('fondo')) {
          var im = IMG.fondo;
          var sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
          var iw = im.naturalWidth * sc, ih = im.naturalHeight * sc;
          g.drawImage(im, cx + (cw - iw) / 2, cy + (ch - ih) / 2, iw, ih);
        } else {
          g.fillStyle = '#DCEEF9';
          g.fillRect(cx, cy, cw, ch);
        }
        g.restore();

        /* marco de cristal: linea blanca con halo azul */
        g.strokeStyle = 'rgba(120,190,240,.55)';
        g.lineWidth = 1.6;
        caja(g, cx, cy, cw, ch, 4);
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.95)';
        g.lineWidth = 0.6;
        caja(g, cx, cy, cw, ch, 4);
        g.stroke();
      }

      function fondo() {
        ctx.fillStyle = '#DCEEF9';
        ctx.fillRect(-4, -4, FW + 8, FH + 8);
        ctx.drawImage(pista, 0, 0, FW, FH);

        /* luces flotando hacia arriba */
        for (var i = 0; i < luces.length; i++) {
          var lz = luces[i];
          var y = lz.y - (tiempo * lz.v) % (FH + 30);
          if (y < -15) y += FH + 30;
          var g = ctx.createRadialGradient(lz.x, y, 0, lz.x, y, lz.r);
          g.addColorStop(0, 'rgba(' + lz.tono + ',' + lz.a + ')');
          g.addColorStop(1, 'rgba(' + lz.tono + ',0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lz.x, y, lz.r, 0, Math.PI * 2);
          ctx.fill();
        }

        /* barrido de luz que cruza despacio */
        var bx = ((tiempo * 11) % (FW + 70)) - 35;
        var br = ctx.createLinearGradient(bx - 16, 0, bx + 16, FH);
        br.addColorStop(0, 'rgba(255,255,255,0)');
        br.addColorStop(0.5, 'rgba(255,255,255,.14)');
        br.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = br;
        ctx.fillRect(0, 0, FW, FH);

        /* guia de rebote: la linea de guiones de abajo, latiendo */
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(tiempo * 3);
        if (lista('guia')) {
          for (var gx = 4; gx < FW - 4; gx += 6) imagen(ctx, 'guia', gx, FH - 4.4, 4.2, 1.1);
        } else {
          ctx.strokeStyle = '#3FB2E8';
          ctx.setLineDash([4.2, 1.8]);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(4, FH - 3.9);
          ctx.lineTo(FW - 4, FH - 3.9);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
      }

      /** Eco que deja el ladrillo al romperse. */
      function pintarEcos() {
        for (var i = 0; i < ecos.length; i++) {
          var e = ecos[i];
          var f = e.t / 0.4;
          var an = e.w * (1 + f * 1.4), al = e.h * (1 + f * 1.4);
          ctx.globalAlpha = (1 - f) * 0.5;
          ctx.fillStyle = 'rgb(' + e.brillo + ')';
          caja(ctx, e.x - (an - e.w) / 2, e.y - (al - e.h) / 2, an, al, 1.3);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /** Chispazo en el muro donde rebota la bola. */
      function pintarDestellos() {
        for (var i = 0; i < destellos.length; i++) {
          var d = destellos[i];
          var f = 1 - d.t / 0.35;
          var g;
          ctx.globalAlpha = f * 0.85;
          if (d.lado === 'alto') {
            g = ctx.createLinearGradient(0, TECHO, 0, TECHO + 8);
            g.addColorStop(0, 'rgba(150,215,255,.95)');
            g.addColorStop(1, 'rgba(150,215,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(d.donde - 10, TECHO, 20, 8);
          } else if (d.lado === 'izq') {
            g = ctx.createLinearGradient(LADO, 0, LADO + 8, 0);
            g.addColorStop(0, 'rgba(150,215,255,.95)');
            g.addColorStop(1, 'rgba(150,215,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(LADO, d.donde - 10, 8, 20);
          } else {
            g = ctx.createLinearGradient(FW - LADO, 0, FW - LADO - 8, 0);
            g.addColorStop(0, 'rgba(150,215,255,.95)');
            g.addColorStop(1, 'rgba(150,215,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(FW - LADO - 8, d.donde - 10, 8, 20);
          }
        }
        ctx.globalAlpha = 1;
      }

      function pintarLadrillos() {
        for (var i = 0; i < ladrillos.length; i++) {
          var l = ladrillos[i];
          if (!l.vivo) continue;

          /* sombra suave debajo, para que el cristal se despegue del fondo */
          ctx.fillStyle = 'rgba(' + l.def.brillo + ',.16)';
          caja(ctx, l.x - 0.6, l.y - 0.2, l.w + 1.2, l.h + 1.6, 1.5);
          ctx.fill();

          if (lista(l.foto)) {
            imagen(ctx, l.foto, l.x - 0.25, l.y - 0.25, l.w + 0.5, l.h + 0.5);
          } else {
            if (!l.deg) {
              l.deg = ctx.createLinearGradient(0, l.y, 0, l.y + l.h);
              l.deg.addColorStop(0, l.def.luz);
              l.deg.addColorStop(0.45, l.def.color);
              l.deg.addColorStop(1, l.def.osc);
            }
            caja(ctx, l.x, l.y, l.w, l.h, 1);
            ctx.fillStyle = l.deg;
            ctx.fill();
          }

          if (l.vida > 1) {                       // ladrillo reforzado
            ctx.strokeStyle = 'rgba(255,255,255,.9)';
            ctx.lineWidth = 0.4;
            caja(ctx, l.x + 1.1, l.y + 1.1, l.w - 2.2, l.h - 2.2, 0.7);
            ctx.stroke();
          }
          if (l.chispa > 0) {
            caja(ctx, l.x, l.y, l.w, l.h, 1);
            ctx.fillStyle = 'rgba(255,255,255,' + (l.chispa * 3) + ')';
            ctx.fill();
          }
        }
      }

      function pintarTrozos() {
        for (var i = 0; i < trozos.length; i++) {
          var t = trozos[i];
          ctx.globalAlpha = Math.max(0, t.vida / 0.55);
          ctx.fillStyle = t.color;
          ctx.fillRect(t.x - 0.5, t.y - 0.5, 1.1, 1.1);
        }
        ctx.globalAlpha = 1;
      }

      function pintarRegalos() {
        for (var i = 0; i < regalos.length; i++) {
          var c = regalos[i];
          var an = 8.4, al = 3.6;
          ctx.save();
          ctx.translate(c.x, c.y);
          var br = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 8);
          br.addColorStop(0, 'rgba(255,255,255,.35)');
          br.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = br;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.scale(1, Math.max(0.35, Math.abs(Math.cos(c.giro))));   // gira como en el arcade
          caja(ctx, -an / 2, -al / 2, an, al, al / 2);
          ctx.fillStyle = c.def.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 0.35;
          ctx.stroke();
          ctx.fillStyle = '#FFFDF8';
          ctx.font = 'bold 2.6px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(c.def.letra, 0, 0.15);
          ctx.restore();
        }
      }

      function pintarPala() {
        var cx = pala.x + pala.w / 2, cy = PALA_Y + PALA_H / 2;

        /* resplandor alrededor */
        var gl = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, pala.w * 0.8);
        gl.addColorStop(0, 'rgba(160,220,255,.45)');
        gl.addColorStop(1, 'rgba(160,220,255,0)');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.ellipse(cx, cy, pala.w * 0.8, PALA_H * 2.6, 0, 0, Math.PI * 2);
        ctx.fill();

        pintarJeringa(pala.x, PALA_Y, pala.w, PALA_H);
      }

      /* La paleta es una jeringa tumbada, dibujada a mano para que se vea
         nitida a cualquier ancho (la capsula 'A' la alarga): a la izquierda
         el embolo, en medio el cilindro de cristal con el relleno dorado y
         las rayitas de medida, y a la derecha la aguja. Todo cabe en el
         ancho de choque, asi la bola rebota justo donde se ve. */
      function pintarJeringa(x, y, w, h) {
        var cy = y + h / 2;
        var embolo = h * 0.55;                 // vastago que asoma
        var tope = h * 0.42;                   // la pieza donde se apoya el pulgar
        var aleta = h * 0.32;                  // las alas del cilindro
        var aguja = Math.max(h * 1.6, w * 0.16);
        var cono = h * 0.55;
        var x0 = x + tope + embolo;            // empieza el cilindro
        var x1 = x + w - aguja - cono;         // acaba el cilindro
        var lleno = x0 + (x1 - x0) * 0.62;     // hasta donde llega el liquido
        var i;

        /* aguja: metal fino con brillo */
        var ga = ctx.createLinearGradient(0, cy - 0.35, 0, cy + 0.35);
        ga.addColorStop(0, '#FFFFFF'); ga.addColorStop(1, '#8E9BA6');
        ctx.fillStyle = ga;
        ctx.beginPath();
        ctx.moveTo(x1 + cono - 0.2, cy - 0.32);
        ctx.lineTo(x + w - 0.6, cy - 0.12);
        ctx.lineTo(x + w, cy + 0.32);
        ctx.lineTo(x1 + cono - 0.2, cy + 0.32);
        ctx.closePath();
        ctx.fill();

        /* cono de la punta */
        ctx.fillStyle = '#E9D3A6';
        ctx.beginPath();
        ctx.moveTo(x1 - 0.1, cy - h * 0.34);
        ctx.lineTo(x1 + cono, cy - h * 0.14);
        ctx.lineTo(x1 + cono, cy + h * 0.14);
        ctx.lineTo(x1 - 0.1, cy + h * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#B08A48'; ctx.lineWidth = 0.18; ctx.stroke();

        /* embolo: tope del pulgar y vastago */
        ctx.fillStyle = '#F4ECDD';
        caja(ctx, x, y - h * 0.08, tope, h * 1.16, tope * 0.45);
        ctx.fill();
        ctx.strokeStyle = '#B08A48'; ctx.lineWidth = 0.2; ctx.stroke();
        ctx.fillStyle = '#E6D7BC';
        ctx.fillRect(x + tope - 0.1, cy - h * 0.13, embolo + 0.4, h * 0.26);

        /* alas del cilindro */
        ctx.fillStyle = '#D9C39A';
        caja(ctx, x0 - aleta * 0.5, y - h * 0.22, aleta, h * 1.44, aleta * 0.4);
        ctx.fill();

        /* cilindro de cristal */
        var gc = ctx.createLinearGradient(0, y, 0, y + h);
        gc.addColorStop(0, 'rgba(255,255,255,.95)');
        gc.addColorStop(0.45, 'rgba(232,244,252,.85)');
        gc.addColorStop(1, 'rgba(176,206,228,.9)');
        caja(ctx, x0, y, x1 - x0, h, h * 0.22);
        ctx.fillStyle = gc;
        ctx.fill();

        /* liquido dorado, desde la punta hacia el embolo */
        var gl = ctx.createLinearGradient(0, y, 0, y + h);
        gl.addColorStop(0, 'rgba(246,214,140,.95)');
        gl.addColorStop(1, 'rgba(201,150,62,.95)');
        ctx.fillStyle = gl;
        caja(ctx, lleno, y + h * 0.16, x1 - lleno - h * 0.12, h * 0.68, h * 0.14);
        ctx.fill();

        /* el vastago sigue por dentro del cristal hasta la goma */
        ctx.fillStyle = 'rgba(214,196,160,.75)';
        ctx.fillRect(x0, cy - h * 0.13, lleno - x0, h * 0.26);

        /* goma del embolo, dentro del cilindro */
        ctx.fillStyle = '#4A3A2C';
        ctx.fillRect(lleno - h * 0.28, y + h * 0.12, h * 0.28, h * 0.76);

        /* rayitas de medida */
        ctx.strokeStyle = 'rgba(120,96,60,.75)';
        ctx.lineWidth = 0.14;
        var paso = (x1 - x0) / 10;
        for (i = 1; i < 10; i++) {
          var rx = x0 + paso * i;
          ctx.beginPath();
          ctx.moveTo(rx, y + 0.1);
          ctx.lineTo(rx, y + h * (i % 5 === 0 ? 0.42 : 0.26));
          ctx.stroke();
        }

        /* brillo y borde */
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        caja(ctx, x0 + h * 0.3, y + h * 0.1, (x1 - x0) - h * 0.6, h * 0.14, h * 0.07);
        ctx.fill();
        caja(ctx, x0, y, x1 - x0, h, h * 0.22);
        ctx.strokeStyle = '#B08A48';
        ctx.lineWidth = 0.24;
        ctx.stroke();
      }

      function pintarEstela() {
        for (var i = 0; i < estela.length; i++) {
          var p = estela[i];
          var f = (i + 1) / estela.length;
          ctx.globalAlpha = f * 0.35;
          ctx.fillStyle = dura ? '#FFC24A' : '#BFE6FF';
          ctx.beginPath();
          ctx.arc(p.x, p.y, RADIO * f * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintarBola() {
        /* halo: azulado de normal, dorado y latiendo cuando es perforante */
        var rh = dura ? RADIO * (2.8 + 0.4 * Math.sin(tiempo * 12)) : RADIO * 2.2;
        var halo = ctx.createRadialGradient(bola.x, bola.y, RADIO * 0.6, bola.x, bola.y, rh);
        if (dura) {
          halo.addColorStop(0, 'rgba(255,200,90,.85)');
          halo.addColorStop(0.5, 'rgba(255,150,60,.35)');
          halo.addColorStop(1, 'rgba(255,150,60,0)');
        } else {
          halo.addColorStop(0, 'rgba(170,225,255,.6)');
          halo.addColorStop(1, 'rgba(170,225,255,0)');
        }
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, rh, 0, Math.PI * 2);
        ctx.fill();

        if (lista('bola')) {
          var d = RADIO * 2.1;
          ctx.save();
          ctx.translate(bola.x, bola.y);
          ctx.rotate(bola.giro * 0.3);
          ctx.drawImage(IMG.bola, -d / 2, -d / 2, d, d);
          ctx.restore();
          return;
        }

        var deg = ctx.createRadialGradient(bola.x - RADIO * 0.4, bola.y - RADIO * 0.4, 0.3, bola.x, bola.y, RADIO);
        deg.addColorStop(0, '#FFFFFF');
        deg.addColorStop(1, '#9CCBEA');
        ctx.fillStyle = deg;
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, RADIO, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      /** Puntitos hacia arriba mientras la bola espera en la paleta. */
      function pintarPista() {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tiempo * 4);
        ctx.fillStyle = '#FFFFFF';
        for (var i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(bola.x, bola.y - RADIO - 2 - i * 2.6, 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /* ------------------------- Controles ------------------------- */
      function aCampo(clienteX) {
        var r = lienzo.getBoundingClientRect();
        if (!r.width) return pala.destino;
        var x = (clienteX - r.left) / r.width * FW;
        return Math.max(LADO, Math.min(FW - LADO - pala.w, x - pala.w / 2));
      }

      function apuntar(e) {
        if (terminado) return;
        pala.destino = aCampo(e.clientX);
      }

      /* Se apunta el dedo que esta tocando en vez de fiarse de e.buttons o
         e.pressure: hay pantallas tactiles que los devuelven a cero. */
      var tocando = false;

      vista.addEventListener('pointerdown', function (e) {
        tocando = true;
        apuntar(e);
        if (!lanzada) lanzar();
      });

      vista.addEventListener('pointermove', function (e) {
        if (tocando || e.pointerType === 'mouse') apuntar(e);
      });

      function soltarDedo() { tocando = false; }
      window.addEventListener('pointerup', soltarDedo);
      window.addEventListener('pointercancel', soltarDedo);

      function tecla(e) {
        if (e.key === 'ArrowLeft')  { teclaIzq = true; e.preventDefault(); }
        if (e.key === 'ArrowRight') { teclaDer = true; e.preventDefault(); }
        if (e.key === ' ' || e.key === 'Enter') { lanzar(); e.preventDefault(); }
      }

      function soltar(e) {
        if (e.key === 'ArrowLeft')  teclaIzq = false;
        if (e.key === 'ArrowRight') teclaDer = false;
      }

      window.addEventListener('keydown', tecla);
      window.addEventListener('keyup', soltar);
      window.addEventListener('resize', medir);

      var vigilante = null;
      if (window.ResizeObserver) {
        vigilante = new ResizeObserver(medir);
        vigilante.observe(zona);
      }

      /* ------------------------- Bucle ------------------------- */
      var cuadro = 0, ultimo = 0;

      function bucle(t) {
        cuadro = requestAnimationFrame(bucle);
        var dt = ultimo ? Math.max(0, Math.min(0.05, (t - ultimo) / 1000)) : 0;
        ultimo = t;
        tiempo += dt;
        if (sacudida > 0) sacudida = Math.max(0, sacudida - dt * 3.2);
        for (var e = destellos.length - 1; e >= 0; e--) {
          destellos[e].t += dt;
          if (destellos[e].t > 0.35) destellos.splice(e, 1);
        }
        for (var o = ecos.length - 1; o >= 0; o--) {
          ecos[o].t += dt;
          if (ecos[o].t > 0.4) ecos.splice(o, 1);
        }
        if (jugando && !terminado) paso(dt);
        dibujar();
      }

      /* Minuto y medio de partida. */
      cuenta = api.cuenta(LIMITE, function () { acabar(true); });

      cargar(function () { if (!terminado) medir(); });   // al llegar las fotos, se repinta
      medir();
      api.luego(medir, 450);                 // otra vez tras la animacion de entrada
      pintarVidas();
      pintarPuntos();
      armar();
      colocar();
      jugando = true;
      cuadro = requestAnimationFrame(bucle);

      /* Limpieza al salir del juego */
      return function () {
        cancelAnimationFrame(cuadro);
        if (vigilante) vigilante.disconnect();
        window.removeEventListener('keydown', tecla);
        window.removeEventListener('keyup', soltar);
        window.removeEventListener('resize', medir);
        window.removeEventListener('pointerup', soltarDedo);
        window.removeEventListener('pointercancel', soltarDedo);
        jugando = false;
        terminado = true;
      };
    }
  });

})();
