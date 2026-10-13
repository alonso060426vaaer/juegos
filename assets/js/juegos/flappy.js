/* ==========================================================================
   JUEGO 10 - FLAPPY BIRD (el avion de la doctora)
   Toca la pantalla para que el avion suba; si no tocas, cae. Hay que pasar
   entre los tubos sin chocar. Cada tubo que dejas atras es un punto.

   Si en assets/img/flappy hay fotos (fondo.png, suelo.png, tubo-cuerpo.png,
   tubo-tapa.png) se usan; si no, la escena se dibuja aqui mismo: cielo con
   nubes, montanas con un castillo, lago con destellos, matas, tubos verdes y
   suelo de cesped y tierra. La cara de la doctora va en la ventanilla.
   ========================================================================== */

(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FUENTE = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  /* ---------------------------------------------------------------
     Escena en unidades propias. El ALTO es fijo y el ANCHO se adapta a la
     pantalla (al reves que en los otros juegos). Asi los tubos miden
     siempre lo mismo de alto en vez de aplastarse en una pantalla
     apaisada. El ancho tiene tope: pasado ahi el campo deja de crecer y se
     queda centrado, porque un campo larguisimo y bajo no se juega bien.
     --------------------------------------------------------------- */
  var ALTO      = 160;      // alto del mundo, siempre
  var FH = ALTO;
  var FW = 90;              // se recalcula al medir
  var FW_MIN = 72, FW_MAX = 112;   // pasado de ahi todo se ve diminuto

  var GRAVEDAD  = 235;      // unidades por segundo al cuadrado
  var IMPULSO   = -84;      // salto al tocar (hacia arriba)
  var VEL_BASE  = 31;       // lo que corre el mundo hacia la izquierda
  var VEL_MAX   = 44;
  var TUBO_AN   = 19;       // ancho del tubo
  var TAPA_AL   = 7.5;      // alto de la boca del tubo
  var TAPA_SALE = 1.8;      // cuanto sobresale la boca por cada lado
  var HUECO     = 58;       // separacion entre el tubo de arriba y el de abajo
  var SEP       = 70;       // distancia entre un par de tubos y el siguiente
  var RADIO     = 4.6;      // radio de choque, sobre el fuselaje
  var AVION_AN  = 34;       // ancho del avion en unidades del mundo
  var OBJETIVO  = 6;        // tubos para llevarse el premio

  /* ------------------------- Imagenes ------------------------- */
  var RUTA = 'assets/img/flappy/';
  /* Todo el decorado viene cocido de herramientas/preparar-assets-flappy.py,
     asi el juego solo estampa dibujos y no gasta tiempo por fotograma:
     el avion ya trae a los dos doctores sentados dentro, el paisaje y el
     suelo salen de la lamina del escritorio (el suelo con el circulo
     cerrado, para que repita sin costura) y los tubos llevan su degradado,
     su brillo y su borde. Si falta alguno, el juego lo dibuja a mano. */
  var ARCHIVOS = {
    avion: 'avion-doctores.png',
    fondo: 'fondo.jpg',
    suelo: 'suelo.jpg',
    tuboCuerpo: 'tubo-cuerpo.png',
    tuboTapa: 'tubo-tapa.png'
  };
  var IMG = {};

  function cargar(alTerminar) {
    var faltan = 0;
    function una() { if (--faltan === 0) alTerminar(); }
    Object.keys(ARCHIVOS).forEach(function (n) {
      var im = IMG[n];
      if (!im) { im = new Image(); im.src = RUTA + ARCHIVOS[n]; IMG[n] = im; }
      if (im.complete) return;
      faltan++;
      im.addEventListener('load', una);
      im.addEventListener('error', una);
    });
    if (faltan === 0) alTerminar();
  }
  function lista(n) { var im = IMG[n]; return !!(im && im.complete && im.naturalWidth > 0); }

  /** Pinta una imagen por su nombre; si falta el alto se saca de la proporcion. */
  function imagen(g, n, x, y, w, hh) {
    if (!lista(n)) return;
    var im = IMG[n];
    if (hh === undefined || hh === null) hh = w * im.naturalHeight / im.naturalWidth;
    g.drawImage(im, x, y, w, hh);
  }

  /** Alto que le toca a una imagen si se pinta con este ancho. */
  function alto(n, ancho) {
    var im = IMG[n];
    return lista(n) ? ancho * im.naturalHeight / im.naturalWidth : ancho * 0.43;
  }

  /* Ruido suave y periodico (suma de senos): sirve para montanas y matas, y
     como el periodo es fijo el paisaje se repite sin cortes. */
  function relieve(x, semilla) {
    return Math.sin(x * 0.035 + semilla) * 0.55 + Math.sin(x * 0.09 + semilla * 2.1) * 0.3 +
           Math.sin(x * 0.21 + semilla * 3.7) * 0.15;
  }

  App.registrar({
    id: 'flappy',
    nombre: 'Flappy Bird',
    emoji: '✈️',
    desc: 'Toca para que el avión no se caiga',
    sub: 'Reflejos',

    iniciar: function (vista, api) {

      /* ------------------------- Estado ------------------------- */
      var avion = { x: 28, y: FH * 0.45, vy: 0, ang: 0 };
      var tubos = [], estela = [], humo = [], letreros = [];
      var puntos = 0, fase = 'espera';        // espera | vuelo | choque | fin
      var tiempo = 0, mundo = 0, siguienteTubo = 0;
      var terminado = false, cuenta = null;
      var mensaje = { texto: '', t: 0 };

      var mejor = 0;
      try { mejor = parseInt(localStorage.getItem('jb_flappy') || '0', 10) || 0; } catch (e) {}

      /* ------------------------- Pantalla ------------------------- */
      vista.classList.add('flappy-vista');
      var lienzo = h('canvas', { class: 'flappy' });
      var zona = h('div', { class: 'flappy-zona' }, lienzo);
      vista.appendChild(zona);
      api.sub(mejor ? 'Récord ' + mejor : 'Toca para volar');

      var ctx = lienzo.getContext ? lienzo.getContext('2d') : null;
      var escala = 1;
      var SUELO = FH * 0.86;                  // linea del cesped
      var HORIZONTE = FH * 0.52;              // donde empiezan las montanas
      var nubes = [];

      function medir() {
        if (!ctx) return;
        var libreAn = zona.clientWidth, libreAl = zona.clientHeight;
        if (libreAn < 40 || libreAl < 40) return;
        /* El mundo mide ALTO de alto y el ancho sale de la proporcion de la
           pantalla, con tope. El lienzo se ajusta a ese campo: en el totem
           (vertical) lo llena entero y en apaisado queda centrado. */
        FH = ALTO;
        FW = Math.max(FW_MIN, Math.min(FW_MAX, ALTO * libreAn / libreAl));
        var an = Math.min(libreAn, libreAl * FW / FH);
        var al = an * FH / FW;
        lienzo.style.width  = Math.round(an) + 'px';
        lienzo.style.height = Math.round(al) + 'px';
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // mas no se nota y pesa el doble
        lienzo.width  = Math.round(an * dpr);
        lienzo.height = Math.round(al * dpr);
        escala = lienzo.height / FH;
        SUELO = FH * 0.86;
        HORIZONTE = FH * 0.52;
        avion.x = Math.max(22, Math.min(40, FW * 0.3));      // cerca del borde izquierdo
        if (fase === 'espera') avion.y = FH * 0.45;
        nubes = [];
        for (var i = 0; i < Math.round(FW / 15); i++) {
          nubes.push({ x: Math.random() * FW * 1.6, y: 8 + Math.random() * (HORIZONTE * 0.55),
                       r: 5 + Math.random() * 6, v: 0.12 + Math.random() * 0.12 });
        }
      }

      /* ------------------------- Control ------------------------- */
      function volar() {
        if (terminado || fase === 'choque' || fase === 'fin') return;
        if (fase === 'espera') { fase = 'vuelo'; mensaje.t = 0; }
        avion.vy = IMPULSO;
        App.tono(620, 0.06, 0.07, 'triangle');
        if (App.ruido) App.ruido(0.08, 0.10, 900, 2600);
      }

      lienzo.addEventListener('pointerdown', function (e) { e.preventDefault(); volar(); });
      function tecla(e) {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') { volar(); e.preventDefault(); }
      }
      window.addEventListener('keydown', tecla);

      /* ------------------------- Tubos ------------------------- */
      function velocidad() { return Math.min(VEL_MAX, VEL_BASE + puntos * 0.4); }

      function nuevoTubo() {
        var margen = 12;
        var hueco = Math.min(HUECO, (SUELO - 2 * margen) * 0.75);      // en pantallas bajas, mas estrecho
        var rango = Math.max(0, SUELO - 2 * margen - hueco);
        var centro = margen + hueco / 2 + Math.random() * rango;
        tubos.push({ x: FW + 6, centro: centro, hueco: hueco, pasado: false });
      }

      function avisar(t, seg) { mensaje.texto = t; mensaje.t = seg || 2; }

      /* ------------------------- Movimiento ------------------------- */
      function paso(dt) {
        tiempo += dt;
        if (mensaje.t > 0) mensaje.t -= dt;

        for (var i = 0; i < nubes.length; i++) {
          nubes[i].x -= nubes[i].v * velocidad() * dt;
          if (nubes[i].x < -20) nubes[i].x += FW * 1.6 + 20;
        }

        if (fase === 'espera') {
          avion.y = FH * 0.45 + Math.sin(tiempo * 3) * 2.2;
          avion.ang = Math.sin(tiempo * 3) * 0.08;
          return;
        }

        if (fase === 'vuelo') {
          mundo += velocidad() * dt;
          for (i = 0; i < tubos.length; i++) tubos[i].x -= velocidad() * dt;
          if (tubos.length && tubos[0].x < -TUBO_AN - 4) tubos.shift();
          if (mundo >= siguienteTubo) { nuevoTubo(); siguienteTubo = mundo + SEP; }

          /* puntos: cada tubo que queda atras */
          for (i = 0; i < tubos.length; i++) {
            var t = tubos[i];
            if (!t.pasado && t.x + TUBO_AN < avion.x) {
              t.pasado = true;
              puntos++;
              letreros.push({ x: avion.x + 7, y: avion.y - 9, t: 0 });
              App.tono(880, 0.08, 0.08, 'triangle');
              api.luego(function () { App.tono(1175, 0.10, 0.07, 'triangle'); }, 70);
            }
          }
        }

        /* gravedad: en vuelo y tambien cayendo tras el choque */
        avion.vy += GRAVEDAD * dt;
        avion.y += avion.vy * dt;
        if (avion.y < RADIO) { avion.y = RADIO; avion.vy = Math.max(0, avion.vy); }

        if (fase === 'vuelo') {
          avion.ang += ((avion.vy < 0 ? -0.42 : Math.min(1.1, avion.vy / 130)) - avion.ang) * Math.min(1, dt * 9);
          estela.push({ x: avion.x - AVION_AN * 0.42, y: avion.y + 1.2, vida: 0.7 });
          if (estela.length > 14) estela.shift();
          if (choca()) chocar();
        } else if (fase === 'choque') {
          avion.ang += dt * 4;
        }

        if (avion.y + RADIO >= SUELO) {
          avion.y = SUELO - RADIO;
          if (fase === 'vuelo') chocar();
          if (fase === 'choque') { fase = 'fin'; acabar(false); }
        }

        for (i = estela.length - 1; i >= 0; i--) {
          estela[i].vida -= dt;
          estela[i].x -= velocidad() * 0.5 * dt;
          if (estela[i].vida <= 0) estela.splice(i, 1);
        }
        for (i = humo.length - 1; i >= 0; i--) {
          var hu = humo[i];
          hu.t += dt; hu.x += hu.vx * dt; hu.y += hu.vy * dt; hu.r += dt * 4;
          if (hu.t > hu.vida) humo.splice(i, 1);
        }
        for (i = letreros.length - 1; i >= 0; i--) {
          letreros[i].t += dt;
          if (letreros[i].t > 0.8) letreros.splice(i, 1);
        }
      }

      /** El avion es un circulo; los tubos, rectangulos. */
      function choca() {
        for (var i = 0; i < tubos.length; i++) {
          var t = tubos[i];
          if (avion.x + RADIO < t.x || avion.x - RADIO > t.x + TUBO_AN) continue;
          var arriba = t.centro - t.hueco / 2, abajo = t.centro + t.hueco / 2;
          if (avion.y - RADIO < arriba || avion.y + RADIO > abajo) return true;
        }
        return false;
      }

      function chocar() {
        fase = 'choque';
        avion.vy = Math.min(avion.vy, -40);
        if (App.ruido) App.ruido(0.35, 0.5, 1800, 120);
        App.tono(90, 0.3, 0.3, 'sawtooth');
        for (var i = 0; i < 10; i++) {
          humo.push({ x: avion.x, y: avion.y, vx: (Math.random() - 0.5) * 20, vy: -6 - Math.random() * 14,
                      r: 1.5 + Math.random() * 2, vida: 0.8 + Math.random() * 0.5, t: 0 });
        }
        avisar('¡Chocaste!', 2);
      }

      function acabar(porTiempo) {
        if (terminado) return;
        terminado = true;
        if (cuenta && !porTiempo) cuenta.parar();
        if (puntos > mejor) {
          mejor = puntos;
          try { localStorage.setItem('jb_flappy', String(mejor)); } catch (e) {}
        }
        api.sonar(puntos >= OBJETIVO ? 'gana' : 'fin');
        api.luego(function () {
          api.fin({
            sello: '✦',
            titulo: porTiempo ? '¡Se acabó el tiempo!' : (puntos >= OBJETIVO ? '¡Gran vuelo!' : 'Aterrizaje forzoso'),
            premio: puntos >= OBJETIVO ? premio() : null,
            mensaje: puntos >= OBJETIVO
              ? 'Pulso de piloto. ¿Vas a por el récord?'
              : 'Toca seguido y con calma: el avión sube un poco con cada toque.',
            datos: [
              { val: puntos, etq: 'Tubos' },
              { val: mejor, etq: 'Récord' }
            ]
          });
        }, 1100);
      }

      /* ------------------------- Dibujo ------------------------- */
      function dibujar() {
        if (!ctx) return;
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        ctx.clearRect(0, 0, FW, FH);
        pintarFondo();
        pintarTubos();
        pintarSuelo();
        pintarEstela();
        pintarAvion();
        pintarHumo();
        pintarHud();
      }

      /* --- el paisaje: foto si la hay, y si no, dibujado --- */
      function pintarFondo() {
        if (lista('fondo')) {
          var im = IMG.fondo, s = (SUELO + 2) / im.naturalHeight, w = im.naturalWidth * s;
          var d = (mundo * 0.25) % (w * 2);
          for (var x = -d; x < FW; x += w * 2) {
            ctx.drawImage(im, x, 0, w, SUELO + 2);
            ctx.save(); ctx.translate(x + w * 2, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, SUELO + 2); ctx.restore();
          }
          return;
        }
        var cielo = ctx.createLinearGradient(0, 0, 0, SUELO);
        cielo.addColorStop(0, '#3FA8EE');
        cielo.addColorStop(0.55, '#8FD0F7');
        cielo.addColorStop(1, '#D8F1FF');
        ctx.fillStyle = cielo;
        ctx.fillRect(0, 0, FW, SUELO);

        /* nubes */
        var i;
        for (i = 0; i < nubes.length; i++) {
          var n = nubes[i];
          ctx.fillStyle = 'rgba(255,255,255,.92)';
          ctx.beginPath();
          ctx.ellipse(n.x, n.y, n.r * 1.6, n.r * 0.6, 0, 0, TAU);
          ctx.ellipse(n.x - n.r * 0.7, n.y + n.r * 0.1, n.r * 0.9, n.r * 0.5, 0, 0, TAU);
          ctx.ellipse(n.x + n.r * 0.6, n.y - n.r * 0.25, n.r * 0.95, n.r * 0.6, 0, 0, TAU);
          ctx.fill();
        }

        /* montanas lejanas, con el castillo en lo alto */
        var d1 = mundo * 0.18;
        ctx.fillStyle = '#7FA6C8';
        ctx.beginPath();
        ctx.moveTo(0, SUELO);
        for (var x = 0; x <= FW; x += 2) ctx.lineTo(x, HORIZONTE - 4 + relieve(x + d1, 1) * 12);
        ctx.lineTo(FW, SUELO); ctx.closePath(); ctx.fill();
        castillo(((-d1 * 1.0) % 260 + 260) % 260 - 60, d1);

        /* colinas verdes */
        var d2 = mundo * 0.32;
        ctx.fillStyle = '#5CAF4C';
        ctx.beginPath();
        ctx.moveTo(0, SUELO);
        for (x = 0; x <= FW; x += 2) ctx.lineTo(x, HORIZONTE + 12 + relieve(x + d2, 5) * 7);
        ctx.lineTo(FW, SUELO); ctx.closePath(); ctx.fill();

        /* lago con destellos */
        var lagoY = HORIZONTE + 22;
        var lago = ctx.createLinearGradient(0, lagoY, 0, SUELO);
        lago.addColorStop(0, '#5FB6EC');
        lago.addColorStop(1, '#2F86CC');
        ctx.fillStyle = lago;
        ctx.fillRect(0, lagoY, FW, SUELO - lagoY);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (i = 0; i < 18; i++) {
          var bx = ((i * 37 + 11) - mundo * 0.5) % (FW + 10); if (bx < -10) bx += FW + 10;
          var by = lagoY + 3 + ((i * 53) % 100) / 100 * (SUELO - lagoY - 8);
          var f = Math.sin(tiempo * 2 + i);
          if (f > 0) ctx.fillRect(bx, by, 2.5 * f, 0.5);
        }

        /* matas delante del lago */
        var d3 = mundo * 0.6;
        ctx.fillStyle = '#3F9A3A';
        ctx.beginPath();
        ctx.moveTo(0, SUELO + 1);
        for (x = 0; x <= FW; x += 2) ctx.lineTo(x, SUELO - 4 - Math.abs(relieve(x * 1.4 + d3, 9)) * 7);
        ctx.lineTo(FW, SUELO + 1); ctx.closePath(); ctx.fill();
      }

      /** Castillo pequeno sobre las montanas, a la derecha del paisaje. */
      function castillo(x, d) {
        var base = HORIZONTE - 4 + relieve(x + 8 + d, 1) * 12;
        ctx.fillStyle = '#E9E2D8';
        ctx.fillRect(x, base - 9, 16, 9);
        ctx.fillRect(x + 2, base - 15, 4, 6);
        ctx.fillRect(x + 10, base - 17, 4, 8);
        ctx.fillStyle = '#D9534F';
        ctx.beginPath(); ctx.moveTo(x + 1, base - 15); ctx.lineTo(x + 4, base - 19); ctx.lineTo(x + 7, base - 15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 9, base - 17); ctx.lineTo(x + 12, base - 22); ctx.lineTo(x + 15, base - 17); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        ctx.fillRect(x + 11, base - 9, 5, 9);
      }

      /* ---------------------------------------------------------------
         Tubos verdes: cuerpo largo con el brillo a la izquierda y una boca
         mas ancha y alta en la punta, como en el arcade de siempre.
         --------------------------------------------------------------- */
      var BORDE_TUBO = '#2A5F24';

      /** El verde del tubo: oscuro en los cantos y claro en la franja de luz. */
      function verdeTubo(x, w) {
        var g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0.00, '#3C8A34');
        g.addColorStop(0.10, '#6FC85B');
        g.addColorStop(0.26, '#A6E88C');
        g.addColorStop(0.46, '#77CE61');
        g.addColorStop(0.74, '#4CA33F');
        g.addColorStop(0.92, '#357C2D');
        g.addColorStop(1.00, '#2A5F24');
        return g;
      }

      function tubo(x, y0, y1, tapaArriba) {
        var w = TUBO_AN, tapaAl = TAPA_AL;
        if (lista('tuboCuerpo') && lista('tuboTapa')) {
          var cy0 = tapaArriba ? y0 + tapaAl : y0, cy1 = tapaArriba ? y1 : y1 - tapaAl;
          ctx.drawImage(IMG.tuboCuerpo, x, cy0, w, Math.max(0, cy1 - cy0));
          if (tapaArriba) ctx.drawImage(IMG.tuboTapa, x - TAPA_SALE, y0, w + TAPA_SALE * 2, tapaAl);
          else {
            ctx.save(); ctx.translate(x - TAPA_SALE, y1); ctx.scale(1, -1);
            ctx.drawImage(IMG.tuboTapa, 0, 0, w + TAPA_SALE * 2, tapaAl); ctx.restore();
          }
          return;
        }

        /* --- cuerpo --- */
        var by0 = tapaArriba ? y0 + tapaAl : y0;
        var by1 = tapaArriba ? y1 : y1 - tapaAl;
        if (by1 > by0) {
          ctx.fillStyle = verdeTubo(x, w);
          ctx.fillRect(x, by0, w, by1 - by0);
          /* solo los cantos llevan linea: asi no se ve una raya donde
             empieza la boca */
          ctx.strokeStyle = BORDE_TUBO;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(x + 0.35, by0); ctx.lineTo(x + 0.35, by1);
          ctx.moveTo(x + w - 0.35, by0); ctx.lineTo(x + w - 0.35, by1);
          ctx.stroke();
        }

        /* --- boca del tubo --- */
        var ty = tapaArriba ? y0 : y1 - tapaAl;
        var tx = x - TAPA_SALE, tw = w + TAPA_SALE * 2;
        redondo(tx, ty, tw, tapaAl, 1.7);
        ctx.fillStyle = verdeTubo(tx, tw);
        ctx.fill();
        ctx.strokeStyle = BORDE_TUBO;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        /* filo claro arriba de la boca, para que se despegue del cuerpo */
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(tx + 2, ty + (tapaArriba ? 0.8 : tapaAl - 0.8));
        ctx.lineTo(tx + tw - 2, ty + (tapaArriba ? 0.8 : tapaAl - 0.8));
        ctx.stroke();
      }

      function pintarTubos() {
        for (var i = 0; i < tubos.length; i++) {
          var t = tubos[i];
          tubo(t.x, -2, t.centro - t.hueco / 2, false);
          tubo(t.x, t.centro + t.hueco / 2, SUELO + 2, true);
        }
      }

      /* --- suelo: cesped y tierra que corren --- */
      function pintarSuelo() {
        if (lista('suelo')) {
          var im = IMG.suelo, s = (FH - SUELO) / im.naturalHeight, w = im.naturalWidth * s;
          var d = mundo % w;
          for (var x = -d; x < FW; x += w) ctx.drawImage(im, x, SUELO, w + 0.3, FH - SUELO);
          return;
        }
        var tierra = ctx.createLinearGradient(0, SUELO, 0, FH);
        tierra.addColorStop(0, '#8C5A2B'); tierra.addColorStop(1, '#5E3A18');
        ctx.fillStyle = tierra;
        ctx.fillRect(0, SUELO, FW, FH - SUELO);
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        for (var i = 0; i < 12; i++) {
          var px = ((i * 23 + 7) - mundo) % (FW + 12); if (px < -12) px += FW + 12;
          ctx.beginPath(); ctx.ellipse(px, SUELO + 8 + (i % 3) * 5, 2.2, 1.3, 0, 0, TAU); ctx.fill();
        }
        /* cesped con el borde ondulado */
        ctx.fillStyle = '#6FCB3E';
        ctx.beginPath();
        ctx.moveTo(0, SUELO + 5);
        var d2 = mundo % 6;
        for (var x = -6 - d2; x <= FW + 6; x += 6) {
          ctx.lineTo(x, SUELO); ctx.quadraticCurveTo(x + 3, SUELO - 2.2, x + 6, SUELO);
        }
        ctx.lineTo(FW, SUELO + 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4FA62C';
        ctx.fillRect(0, SUELO + 4, FW, 1.2);
        /* florecillas */
        for (i = 0; i < 6; i++) {
          var fx = ((i * 41 + 13) - mundo) % (FW + 8); if (fx < -8) fx += FW + 8;
          ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FFE066';
          ctx.beginPath(); ctx.arc(fx, SUELO - 1.2, 0.8, 0, TAU); ctx.fill();
        }
      }

      /* ---------------------------------------------------------------
         EL AVION CON LOS DOS DOCTORES

         Un solo dibujo: el avion ya trae la carlinga ampliada con los dos
         sentados dentro. A tamano de juego, dos caras reconocibles no caben
         en la carlinga original, por eso el asiento viene agrandado.
         --------------------------------------------------------------- */
      function pintarAvion() {
        var a = avion;
        var w = AVION_AN, h = alto('avion', w);

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.ang);

        if (lista('avion')) {
          imagen(ctx, 'avion', -w / 2, -h / 2, w, h);
        } else {
          ctx.fillStyle = '#D93A3A';
          ctx.beginPath(); ctx.ellipse(0, 0, w * 0.42, h * 0.26, 0, 0, TAU); ctx.fill();
        }

        ctx.restore();
      }

      function pintarEstela() {
        for (var i = 0; i < estela.length; i++) {
          var e = estela[i];
          ctx.globalAlpha = Math.max(0, e.vida / 0.7) * 0.8;
          ctx.fillStyle = '#BFE9FF';
          ctx.beginPath(); ctx.arc(e.x, e.y, 0.4 + (e.vida / 0.7) * 0.9, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintarHumo() {
        for (var i = 0; i < humo.length; i++) {
          var hu = humo[i];
          ctx.globalAlpha = (1 - hu.t / hu.vida) * 0.6;
          ctx.fillStyle = '#8A8F98';
          ctx.beginPath(); ctx.arc(hu.x, hu.y, hu.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function redondo(x, y, w, hh, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + hh, r);
        ctx.arcTo(x + w, y + hh, x, y + hh, r);
        ctx.arcTo(x, y + hh, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }

      function texto(t, x, y, tam, peso, color, borde) {
        ctx.font = (peso || 800) + ' ' + tam + 'px ' + FUENTE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (borde) { ctx.lineWidth = tam * 0.14; ctx.strokeStyle = borde; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); }
        ctx.fillStyle = color || '#FFFFFF';
        ctx.fillText(t, x, y);
      }

      function pintarHud() {
        /* la puntuacion, grande y arriba */
        texto(String(puntos), FW / 2, 13, 14, 800, '#FFFFFF', '#2B5C9E');
        texto('♛  MEJOR ' + Math.max(mejor, puntos), FW / 2, 23, 3.4, 700, '#DDEEFF', '#2B5C9E');

        for (var i = 0; i < letreros.length; i++) {
          var l = letreros[i];
          ctx.globalAlpha = 1 - l.t / 0.8;
          texto('+1', l.x, l.y - l.t * 10, 5, 800, '#FFE45C', '#8A5A00');
        }
        ctx.globalAlpha = 1;

        var t = mensaje.t > 0 ? mensaje.texto : (fase === 'espera' ? 'Toca la pantalla para volar' : '');
        if (!t) return;
        ctx.globalAlpha = mensaje.t > 0 ? Math.min(1, mensaje.t / 0.4) : 0.75 + 0.25 * Math.sin(tiempo * 4);
        ctx.font = '700 3.4px ' + FUENTE;
        var w = ctx.measureText(t).width + 8, hh = 6.6, x = (FW - w) / 2, y = FH * 0.62;
        redondo(x, y, w, hh, 3.3);
        ctx.fillStyle = 'rgba(20,50,90,.55)';
        ctx.fill();
        texto(t, FW / 2, y + hh / 2, 3.4, 700, '#FFFFFF');
        ctx.globalAlpha = 1;
      }

      /* ------------------------- Bucle ------------------------- */
      var cuadro = 0, ultimo = 0;
      function bucle(ts) {
        cuadro = requestAnimationFrame(bucle);
        var dt = ultimo ? Math.max(0, Math.min(0.05, (ts - ultimo) / 1000)) : 0;
        ultimo = ts;
        if (!terminado) paso(dt);
        dibujar();
      }

      window.addEventListener('resize', medir);
      var vigilante = null;
      if (window.ResizeObserver) { vigilante = new ResizeObserver(medir); vigilante.observe(zona); }

      cuenta = api.cuenta(LIMITE, function () { acabar(true); });
      cargar(function () {});
      medir();
      api.luego(medir, 450);
      cuadro = requestAnimationFrame(bucle);

      return function () {
        cancelAnimationFrame(cuadro);
        if (vigilante) vigilante.disconnect();
        window.removeEventListener('resize', medir);
        window.removeEventListener('keydown', tecla);
        terminado = true;
      };
    }
  });

})();
