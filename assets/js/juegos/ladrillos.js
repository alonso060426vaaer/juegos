/* ==========================================================================
   JUEGO 7 - ROMPE LADRILLOS (el arcade clasico de toda la vida)
   La bola es el emblema del logo. Se juega arrastrando el dedo.
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
  var FH_MIN = 115, FH_MAX = 145;

  var COLUMNAS = 9;
  var MARGEN   = 5;                                    // borde lateral libre
  var HUECO    = 0.9;                                  // separacion entre ladrillos
  var LAD_W    = (FW - MARGEN * 2 - HUECO * (COLUMNAS - 1)) / COLUMNAS;
  var LAD_H    = 4.6;
  var LAD_Y0   = 16;                                   // altura de la primera fila

  var PALA_W = 15, PALA_H = 3.2;
  var PALA_ALTO = 11;                                  // separacion de la paleta al fondo
  var PALA_Y = FH - PALA_ALTO;
  var PALA_MIN = 11.5, PALA_ANCHA = 31;
  var RADIO  = 2.8;                                    // radio de la bola

  /* Dificultad media-alta: la bola sale mas rapida y la paleta es algo
     mas corta que en la version facil. */
  var VEL_BASE = 68, VEL_MAX = 118;                    // unidades por segundo
  var VIDAS_INICIO = 3, VIDAS_MAX = 5;
  var OBJETIVO = 900;                                  // puntos para llevarse el premio
  var CAIDA = 27;                                      // velocidad de las capsulas
  var SUERTE = 0.11;                                   // probabilidad de capsula

  /* Filas de arriba (mas dificiles de alcanzar) valen mas puntos. */
  var FILAS = [
    { color: '#F0B429', luz: '#FFE08A', osc: '#A9700D', brillo: '255,190,60',  puntos: 90, nota: 880 },
    { color: '#E8574C', luz: '#FF9A8E', osc: '#96271E', brillo: '255,110,90',  puntos: 75, nota: 784 },
    { color: '#E8679B', luz: '#FFA8C6', osc: '#A02F5C', brillo: '255,120,175', puntos: 60, nota: 698 },
    { color: '#7C6BE0', luz: '#B2A6FF', osc: '#443A94', brillo: '150,130,255', puntos: 45, nota: 659 },
    { color: '#2FB58C', luz: '#7BE3C0', osc: '#166D53', brillo: '70,225,180',  puntos: 30, nota: 587 },
    { color: '#3E9AE0', luz: '#8ACDF5', osc: '#1C5C92', brillo: '90,190,255',  puntos: 20, nota: 523 }
  ];

  var REGALOS = [
    { tipo: 'ancha', letra: 'A', color: '#B9924F', aviso: 'Paleta mas ancha' },
    { tipo: 'lenta', letra: 'L', color: '#4E8C6A', aviso: 'Bola mas lenta' },
    { tipo: 'vida',  letra: '+', color: '#C0614F', aviso: 'Una vida mas' }
  ];

  /* ---------------------------------------------------------------
     La bola lleva dentro el emblema del logo. Como logo.png trae
     ademas el texto debajo, se recorta solo el circulo de arriba.
     Si algun dia se cambia por un logo ya cuadrado, se usa entero.
     --------------------------------------------------------------- */
  var logo = new Image();
  var logoListo = false;
  var recorte = null;

  logo.addEventListener('load', function () {
    var an = logo.naturalWidth, al = logo.naturalHeight;
    if (an / al > 1.15) {
      recorte = { x: an * 0.30, y: al * 0.145, w: an * 0.40, h: al * 0.48 };
    } else {
      recorte = { x: 0, y: 0, w: an, h: al };
    }
    logoListo = true;
  });
  logo.src = 'assets/img/logo.png';

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
    nombre: 'Rompe Ladrillos',
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
      var teclaIzq = false, teclaDer = false;

      var mejor = 0;
      try { mejor = parseInt(localStorage.getItem('jb_ladrillos') || '0', 10) || 0; } catch (e) {}

      var pala = { x: (FW - PALA_W) / 2, w: PALA_W, destino: (FW - PALA_W) / 2 };
      var bola = { x: FW / 2, y: PALA_Y - RADIO - 0.6, vx: 0, vy: 0, giro: 0 };

      /* ------------------------- Pantalla ------------------------- */
      var valPuntos = h('span', { class: 'val' }, '0');
      var valNivel  = h('span', { class: 'val' }, '1');
      var valVidas  = h('span', { class: 'val vidas' }, '');
      var aviso = h('p', { class: 'aviso' }, 'Toca la pantalla para lanzar la bola');

      var lienzo = h('canvas', { class: 'ladrillos' });
      var zona = h('div', {
        class: 'ladrillos-zona',
        estilo: 'flex:1; min-height:0; display:flex; align-items:center;' +
                ' justify-content:center; overflow:hidden;'
      }, lienzo);

      vista.appendChild(h('div', { class: 'marcador' },
        h('div', { class: 'dato' }, valPuntos, h('span', { class: 'etq' }, 'Puntos')),
        h('div', { class: 'dato' }, valNivel,  h('span', { class: 'etq' }, 'Nivel')),
        h('div', { class: 'dato' }, valVidas,  h('span', { class: 'etq' }, 'Vidas'))
      ));
      vista.appendChild(h('div', { class: 'centro' }, zona, aviso));

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
            a: (0.05 + Math.random() * 0.1).toFixed(2),
            tono: Math.random() < 0.5 ? '255,200,120' : '255,130,190'
          });
        }
        pintarPista2();

        var an = Math.min(libreAn, libreAl * FW / FH);
        var al = an * FH / FW;
        lienzo.style.width  = Math.round(an) + 'px';
        lienzo.style.height = Math.round(al) + 'px';

        var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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
        var filas = Math.min(FILAS.length, 3 + nivel);
        /* filas reforzadas (dos golpes): una desde el principio, dos desde el nivel 3 */
        var dobles = nivel >= 3 ? 2 : 1;
        for (var f = 0; f < filas; f++) {
          for (var c = 0; c < COLUMNAS; c++) {
            ladrillos.push({
              x: MARGEN + c * (LAD_W + HUECO),
              y: LAD_Y0 + f * (LAD_H + HUECO),
              w: LAD_W, h: LAD_H,
              def: FILAS[f],
              vida: f < dobles ? 2 : 1,
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
        return Math.min(VEL_MAX, VEL_BASE + (nivel - 1) * 6.5 + golpes * 0.28) * lento;
      }

      function lanzar() {
        if (lanzada || terminado || !jugando) return;
        lanzada = true;
        var v = velocidad();
        var ang = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
        bola.vx = Math.cos(ang) * v;
        bola.vy = Math.sin(ang) * v;
        api.sonar('toque');
        aviso.textContent = 'Arrastra el dedo para mover la paleta';
      }

      /* ------------------------- Movimiento ------------------------- */
      function paso(dt) {

        if (finAncha && tiempo > finAncha) { finAncha = 0; pala.w = anchoBase(); }
        if (finLenta && tiempo > finLenta) { finLenta = 0; lento = 1; reajustar(); }

        if (teclaIzq) pala.destino -= 75 * dt;
        if (teclaDer) pala.destino += 75 * dt;
        pala.destino = Math.max(0, Math.min(FW - pala.w, pala.destino));
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

        if (bola.x < RADIO)      { bola.x = RADIO;      bola.vx =  Math.abs(bola.vx); muro('izq', bola.y); }
        if (bola.x > FW - RADIO) { bola.x = FW - RADIO; bola.vx = -Math.abs(bola.vx); muro('der', bola.y); }
        if (bola.y < RADIO)      { bola.y = RADIO;      bola.vy =  Math.abs(bola.vy); muro('alto', bola.x); }

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
        App.tono(520 + rel * 60, 0.06, 0.10, 'triangle');
        for (var ch = 0; ch < 7; ch++) {
          trozos.push({
            x: bola.x, y: PALA_Y - 0.4,
            vx: (Math.random() - 0.5) * 26, vy: -6 - Math.random() * 18,
            vida: 0.4, color: '#FFE7B0'
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
        } else {
          if (vidas < VIDAS_MAX) vidas++;
          pintarVidas();
        }
        aviso.textContent = def.aviso;
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
        pala.w = anchoBase();

        if (vidas <= 0) { acabar(); return; }
        colocar();
        aviso.textContent = vidas === 1
          ? 'Te queda una vida. Toca para lanzar'
          : 'Te quedan ' + vidas + ' vidas. Toca para lanzar';
      }

      function superar() {
        jugando = false;
        colocar();
        puntos += 100 * nivel;
        pintarPuntos();
        api.sonar('gana');
        aviso.textContent = '¡Nivel ' + nivel + ' superado!';

        api.luego(function () {
          nivel++;
          valNivel.textContent = nivel;
          api.sub('Nivel ' + nivel + (mejor ? '  ·  Récord ' + mejor : ''));
          pala.w = anchoBase();
          regalos = []; trozos = [];
          armar();
          colocar();
          aviso.textContent = 'Toca la pantalla para lanzar la bola';
          jugando = true;
        }, 1500);
      }

      function acabar(porTiempo) {
        if (terminado) return;
        terminado = true;
        jugando = false;
        if (cuenta && !porTiempo) cuenta.parar();
        aviso.textContent = porTiempo ? 'Tiempo cumplido' : 'Se acabaron las vidas';
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
      }

      /* La pista (degradado, rejilla y vineta) no cambia: se pinta una sola
         vez en un lienzo aparte y cada cuadro solo se copia. */
      function pintarPista2() {
        if (!pctx) return;
        pista.width = lienzo.width;
        pista.height = lienzo.height;
        var g = pctx;
        g.setTransform(escala, 0, 0, escala, 0, 0);

        var deg = g.createLinearGradient(0, 0, 0, FH);
        deg.addColorStop(0, '#1C1531');
        deg.addColorStop(0.55, '#2B1E3D');
        deg.addColorStop(1, '#3D2440');
        g.fillStyle = deg;
        g.fillRect(0, 0, FW, FH);

        g.strokeStyle = 'rgba(255,255,255,.035)';
        g.lineWidth = 0.3;
        g.beginPath();
        for (var v = 0; v <= FW; v += 10) { g.moveTo(v, 0); g.lineTo(v, FH); }
        for (var hh = 0; hh <= FH; hh += 10) { g.moveTo(0, hh); g.lineTo(FW, hh); }
        g.stroke();

        var vin = g.createRadialGradient(FW / 2, FH * 0.45, FW * 0.3, FW / 2, FH * 0.5, FW * 0.95);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,.42)');
        g.fillStyle = vin;
        g.fillRect(0, 0, FW, FH);
      }

      function fondo() {
        ctx.fillStyle = '#241B39';
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
        br.addColorStop(0.5, 'rgba(255,255,255,.05)');
        br.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = br;
        ctx.fillRect(0, 0, FW, FH);

        /* linea de peligro, latiendo */
        var pulso = (0.3 + 0.25 * Math.sin(tiempo * 3)).toFixed(2);
        ctx.strokeStyle = 'rgba(255,95,85,' + pulso + ')';
        ctx.setLineDash([2.4, 2.4]);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, FH - 2.2);
        ctx.lineTo(FW, FH - 2.2);
        ctx.stroke();
        ctx.setLineDash([]);
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
            g = ctx.createLinearGradient(0, 0, 0, 8);
            g.addColorStop(0, 'rgba(255,240,200,.95)');
            g.addColorStop(1, 'rgba(255,240,200,0)');
            ctx.fillStyle = g;
            ctx.fillRect(d.donde - 10, 0, 20, 8);
          } else if (d.lado === 'izq') {
            g = ctx.createLinearGradient(0, 0, 8, 0);
            g.addColorStop(0, 'rgba(255,240,200,.95)');
            g.addColorStop(1, 'rgba(255,240,200,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, d.donde - 10, 8, 20);
          } else {
            g = ctx.createLinearGradient(FW, 0, FW - 8, 0);
            g.addColorStop(0, 'rgba(255,240,200,.95)');
            g.addColorStop(1, 'rgba(255,240,200,0)');
            ctx.fillStyle = g;
            ctx.fillRect(FW - 8, d.donde - 10, 8, 20);
          }
        }
        ctx.globalAlpha = 1;
      }

      function pintarLadrillos() {
        for (var i = 0; i < ladrillos.length; i++) {
          var l = ladrillos[i];
          if (!l.vivo) continue;
          if (!l.deg) {
            l.deg = ctx.createLinearGradient(0, l.y, 0, l.y + l.h);
            l.deg.addColorStop(0, l.def.luz);
            l.deg.addColorStop(0.45, l.def.color);
            l.deg.addColorStop(1, l.def.osc);
          }

          /* resplandor sobre la pista oscura */
          ctx.fillStyle = 'rgba(' + l.def.brillo + ',.20)';
          caja(ctx, l.x - 0.8, l.y - 0.7, l.w + 1.6, l.h + 1.4, 1.5);
          ctx.fill();

          caja(ctx, l.x, l.y, l.w, l.h, 1);
          ctx.fillStyle = l.deg;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.4)';
          ctx.lineWidth = 0.22;
          ctx.stroke();

          /* brillo de cristal en la mitad de arriba */
          var gl = ctx.createLinearGradient(0, l.y, 0, l.y + l.h * 0.6);
          gl.addColorStop(0, 'rgba(255,255,255,.6)');
          gl.addColorStop(1, 'rgba(255,255,255,.04)');
          ctx.fillStyle = gl;
          caja(ctx, l.x + 0.5, l.y + 0.35, l.w - 1, l.h * 0.44, 0.6);
          ctx.fill();

          if (l.vida > 1) {                       // ladrillo reforzado
            ctx.strokeStyle = 'rgba(255,255,255,.85)';
            ctx.lineWidth = 0.4;
            caja(ctx, l.x + 1.1, l.y + 1.1, l.w - 2.2, l.h - 2.2, 0.5);
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
        gl.addColorStop(0, 'rgba(255,205,110,.38)');
        gl.addColorStop(1, 'rgba(255,205,110,0)');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.ellipse(cx, cy, pala.w * 0.8, PALA_H * 2.6, 0, 0, Math.PI * 2);
        ctx.fill();

        var deg = ctx.createLinearGradient(0, PALA_Y, 0, PALA_Y + PALA_H);
        deg.addColorStop(0, '#FFF1D2');
        deg.addColorStop(0.45, '#F0B429');
        deg.addColorStop(1, '#A9700D');
        caja(ctx, pala.x, PALA_Y, pala.w, PALA_H, PALA_H / 2);
        ctx.fillStyle = deg;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,244,214,.85)';
        ctx.lineWidth = 0.26;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,.55)';
        caja(ctx, pala.x + 1.4, PALA_Y + 0.42, pala.w - 2.8, PALA_H * 0.3, PALA_H * 0.15);
        ctx.fill();
      }

      function pintarEstela() {
        for (var i = 0; i < estela.length; i++) {
          var p = estela[i];
          var f = (i + 1) / estela.length;
          ctx.globalAlpha = f * 0.35;
          ctx.fillStyle = '#FFD98A';
          ctx.beginPath();
          ctx.arc(p.x, p.y, RADIO * f * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintarBola() {
        /* Halo dorado */
        var halo = ctx.createRadialGradient(bola.x, bola.y, RADIO * 0.6, bola.x, bola.y, RADIO * 2);
        halo.addColorStop(0, 'rgba(255,214,130,.55)');
        halo.addColorStop(1, 'rgba(255,214,130,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, RADIO * 2, 0, Math.PI * 2);
        ctx.fill();

        /* Fondo claro para que el emblema se lea siempre */
        ctx.fillStyle = '#FFFDF8';
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, RADIO, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, RADIO - 0.15, 0, Math.PI * 2);
        ctx.clip();
        if (logoListo && recorte) {
          var d = (RADIO - 0.15) * 2;
          ctx.translate(bola.x, bola.y);
          ctx.rotate(bola.giro);
          ctx.drawImage(logo, recorte.x, recorte.y, recorte.w, recorte.h, -d / 2, -d / 2, d, d);
        } else {
          var oro = ctx.createLinearGradient(bola.x - RADIO, bola.y - RADIO, bola.x + RADIO, bola.y + RADIO);
          oro.addColorStop(0, '#E3C593');
          oro.addColorStop(1, '#8B6A38');
          ctx.fillStyle = oro;
          ctx.fillRect(bola.x - RADIO, bola.y - RADIO, RADIO * 2, RADIO * 2);
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(139,106,56,.5)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, RADIO - 0.15, 0, Math.PI * 2);
        ctx.stroke();
      }

      /** Puntitos hacia arriba mientras la bola espera en la paleta. */
      function pintarPista() {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tiempo * 4);
        ctx.fillStyle = '#FFE9B8';
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
        return Math.max(0, Math.min(FW - pala.w, x - pala.w / 2));
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
