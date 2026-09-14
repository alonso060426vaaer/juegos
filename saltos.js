/* ==========================================================================
   JUEGO 9 - SALTO INFINITO (al estilo del clasico de saltar entre bloques)
   El que salta es el emblema del logo. El viaje va por etapas: amanece sobre
   las colinas, cruzas el mar de nubes con globos, llega la aurora y acabas
   entre planetas. Los bloques cambian de material segun la altura.
   ========================================================================== */

(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* El mundo se mide en unidades propias: 100 de ancho y la "y" crece
     hacia arriba (0 es el suelo de salida). El alto de la pantalla se
     adapta al hueco libre, igual que en los otros juegos. */
  var FW = 100;
  var FH = 150;
  var FH_MIN = 90, FH_MAX = 190;

  var RADIO    = 5.2;        // el saltador
  var GRAVEDAD = 210;
  var SALTO    = 96;         // impulso al pisar un bloque
  var MUELLE   = 168;        // impulso del trampolin
  var VEL_LADO = 62;         // con teclado

  var BLOQUE_AN = 17, BLOQUE_AL = 3.6;
  var OBJETIVO = 120;        // metros para llevarse el premio

  /* Etapas del viaje: color del cielo arriba y abajo. */
  var CIELOS = [
    { h: 0,    arriba: '#3E9BE4', abajo: '#CDEBFA' },   // dia claro sobre la ciudad
    { h: 1100, arriba: '#2E8AD6', abajo: '#DCF1FB' },   // mas arriba
    { h: 2600, arriba: '#2E5FA8', abajo: '#FFB067' },   // atardecer
    { h: 4200, arriba: '#17224E', abajo: '#8B4F86' },   // anochecer
    { h: 6200, arriba: '#070C24', abajo: '#1B2455' },   // noche
    { h: 9000, arriba: '#020308', abajo: '#080D24' }    // espacio
  ];

  /* Material de los bloques segun lo alto que esten. */
  function piel(y) {
    if (y < 1500) return 'hierba';
    if (y < 3300) return 'nube';
    if (y < 5400) return 'cristal';
    return 'neon';
  }

  /* El saltador lleva el emblema del logo (el circulo de arriba del png). */
  var logo = new Image();
  var logoListo = false;
  var recorte = null;
  logo.addEventListener('load', function () {
    var an = logo.naturalWidth, al = logo.naturalHeight;
    if (an / al > 1.15) recorte = { x: an * 0.30, y: al * 0.145, w: an * 0.40, h: al * 0.48 };
    else recorte = { x: 0, y: 0, w: an, h: al };
    logoListo = true;
  });
  logo.src = 'assets/img/logo.png';

  function mezclaColor(a, b, t) {
    var ax = parseInt(a.slice(1), 16), bx = parseInt(b.slice(1), 16);
    var r = Math.round((ax >> 16) + ((bx >> 16) - (ax >> 16)) * t);
    var g = Math.round(((ax >> 8) & 255) + (((bx >> 8) & 255) - ((ax >> 8) & 255)) * t);
    var z = Math.round((ax & 255) + ((bx & 255) - (ax & 255)) * t);
    return 'rgb(' + r + ',' + g + ',' + z + ')';
  }

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

  /** Nube de varios bultos en un solo trazo (sin bordes entre ellos). */
  function bultos(g, x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    var p = [[0, 0, 1.65, 0.55], [0.95, -0.3, 0.95, 0.52], [-0.9, -0.12, 0.8, 0.44], [1.85, 0.1, 0.62, 0.3]];
    for (var i = 0; i < p.length; i++) {
      var cx = x + p[i][0] * r, cy = y + p[i][1] * r;
      g.moveTo(cx + p[i][2] * r, cy);
      g.ellipse(cx, cy, p[i][2] * r, p[i][3] * r, 0, 0, TAU);
    }
    g.fill();
  }

  App.registrar({
    id: 'saltos',
    nombre: 'Salto Infinito',
    emoji: '🚀',
    desc: 'Salta de bloque en bloque sin caerte',
    sub: 'Equilibrio',

    iniciar: function (vista, api) {

      /* ------------------------- Estado ------------------------- */
      var jugador = { x: FW / 2, y: 12, vx: 0, vy: 0, destino: FW / 2, giro: 0, aplaste: 0 };
      var bloques = [], trozos = [], chispas = [], carteles = [], estela = [];
      var camara = 0, altura = 0, cima = 0, tope = 0;
      var terminado = false, cayendo = false;
      var teclaIzq = false, teclaDer = false;
      var tiempo = 0, hito = 0;
      var cuenta = null;

      var mejor = 0;
      try { mejor = parseInt(localStorage.getItem('jb_saltos') || '0', 10) || 0; } catch (e) {}

      /* ------------------------- Pantalla ------------------------- */
      var valAltura = h('span', { class: 'val' }, '0');
      var valMejor  = h('span', { class: 'val' }, mejor || '–');
      var aviso = h('p', { class: 'aviso' }, 'Arrastra el dedo para moverte de lado');

      var lienzo = h('canvas', { class: 'saltos' });
      var zona = h('div', {
        class: 'saltos-zona',
        estilo: 'flex:1; min-height:0; display:flex; align-items:center;' +
                ' justify-content:center; overflow:hidden;'
      }, lienzo);

      vista.appendChild(h('div', { class: 'marcador' },
        h('div', { class: 'dato' }, valAltura, h('span', { class: 'etq' }, 'Metros')),
        h('div', { class: 'dato' }, valMejor,  h('span', { class: 'etq' }, 'Récord'))
      ));
      vista.appendChild(h('div', { class: 'centro' }, zona, aviso));

      api.sub('¡Arriba!');

      var ctx = lienzo.getContext ? lienzo.getContext('2d') : null;
      var escala = 1;

      function medir() {
        if (!ctx) return;
        var libreAn = zona.clientWidth, libreAl = zona.clientHeight;
        if (libreAn < 40 || libreAl < 40) return;

        FH = Math.max(FH_MIN, Math.min(FH_MAX, FW * libreAl / libreAn));

        var an = Math.min(libreAn, libreAl * FW / FH);
        var al = an * FH / FW;
        lienzo.style.width  = Math.round(an) + 'px';
        lienzo.style.height = Math.round(al) + 'px';

        var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        lienzo.width  = Math.round(an * dpr);
        lienzo.height = Math.round(al * dpr);
        escala = (an * dpr) / FW;
      }

      /* ---------------------------------------------------------------
         Decorado: tres capas a distinta velocidad (lejos, medio y cerca).
         Cada capa va creando adornos por arriba segun sube la camara, y
         el tipo depende de la altura: colinas, nubes, globos, aurora,
         planetas... Asi el viaje cambia de paisaje sin cortes.
         --------------------------------------------------------------- */
      var capas = [
        { p: 0.14, tope: -FH, lista: [], sep: 95 },
        { p: 0.34, tope: -FH, lista: [], sep: 62 },
        { p: 0.62, tope: -FH, lista: [], sep: 88 }
      ];
      var estrellas = [], fugaces = [];

      function sorteoAdorno(capa, y, alt) {
        var r = Math.random();
        if (capa === 0) {
          if (alt < 2600) return 'marNubes';   // la ciudad se siembra aparte
          if (alt < 4600) return r < 0.6 ? 'marNubes' : 'nube';
          if (alt < 6400) return r < 0.22 ? 'luna' : 'nebulosa';
          return r < 0.55 ? 'planeta' : 'nebulosa';
        }
        if (capa === 1) {
          if (alt < 400)  return r < 0.6 ? 'nube' : 'pajaro';
          if (alt < 2400) return r < 0.55 ? 'nube' : (r < 0.85 ? 'globo' : 'pajaro');
          if (alt < 4200) return r < 0.6 ? 'nube' : (r < 0.8 ? 'globo' : 'avion');
          if (alt < 6200) return r < 0.55 ? 'aurora' : 'nube';
          return r < 0.5 ? 'planeta' : 'satelite';
        }
        if (alt < 3000) return r < 0.75 ? 'nubeCerca' : 'pajaro';
        if (alt < 5600) return r < 0.7 ? 'nubeCerca' : 'aurora';
        return r < 0.6 ? 'asteroide' : 'nubeCerca';
      }

      function reponerAdornos() {
        for (var c = 0; c < capas.length; c++) {
          var capa = capas[c];
          var limite = camara * capa.p + FH * 1.3;
          while (capa.tope < limite) {
            capa.tope += capa.sep * (0.6 + Math.random() * 0.8);
            var alt = capa.tope / capa.p;                 // altura real que le toca
            capa.lista.push({
              x: Math.random() * FW,
              y: capa.tope,
              t: sorteoAdorno(c, capa.tope, alt),
              e: 0.7 + Math.random() * 0.7,               // escala
              f: Math.random() * TAU,                     // fase, para el vaiven
              tono: Math.random()
            });
          }
          for (var i = capa.lista.length - 1; i >= 0; i--) {
            if (capa.lista[i].y < camara * capa.p - FH * 0.5) capa.lista.splice(i, 1);
          }
        }
      }

      /* La ciudad del arranque: la clinica en el centro y a los lados los
         bloques y los arboles, todos apoyados en la misma linea. */
      function sembrarCiudad() {
        var suelo = 9;
        var piezas = [
          { x: 50, t: 'clinica',  e: 1.0 },
          { x: 17, t: 'edificio', e: 1.05 },
          { x: 30, t: 'edificio', e: 0.85 },
          { x: 71, t: 'edificio', e: 0.95 },
          { x: 86, t: 'edificio', e: 1.1 },
          { x: 7,  t: 'arbol',    e: 1.3 },
          { x: 62, t: 'arbol',    e: 1.1 },
          { x: 96, t: 'arbol',    e: 1.2 }
        ];
        for (var i = 0; i < piezas.length; i++) {
          capas[0].lista.push({
            x: piezas[i].x, y: suelo, t: piezas[i].t,
            e: piezas[i].e, f: Math.random() * TAU, tono: Math.random()
          });
        }
        /* arbustos por delante, en la capa intermedia */
        for (var j = 0; j < 5; j++) {
          capas[1].lista.push({
            x: 8 + j * 21 + Math.random() * 6, y: 5, t: 'arbusto',
            e: 0.8 + Math.random() * 0.5, f: 0, tono: Math.random()
          });
        }
      }

      function sembrarEstrellas() {
        estrellas = [];
        for (var i = 0; i < 70; i++) {
          estrellas.push({
            x: Math.random() * FW,
            y: Math.random() * 240,
            r: 0.22 + Math.random() * 0.6,
            f: Math.random() * TAU
          });
        }
      }

      /* ------------------------- Bloques ------------------------- */
      var ultimoTipo = 'firme';

      function nuevoBloque(y) {
        var d = Math.min(1, y / 4200);                   // dificultad, de 0 a 1
        var tipo = 'firme';
        var r = Math.random();
        if (y > 200 && r < 0.20 + d * 0.22) tipo = 'movil';
        else if (y > 400 && r < 0.34 + d * 0.3) tipo = 'fragil';
        else if (y > 900 && r < 0.50 + d * 0.16) tipo = 'fantasma';
        /* nunca dos raros seguidos: siempre queda un apoyo de fiar */
        if (tipo !== 'firme' && ultimoTipo !== 'firme') tipo = 'firme';
        ultimoTipo = tipo;

        var an = BLOQUE_AN - d * 4;
        var b = {
          x: 3 + Math.random() * (FW - 6 - an),
          y: y,
          w: an,
          tipo: tipo,
          vx: tipo === 'movil' ? (Math.random() < 0.5 ? -1 : 1) * (14 + d * 14) : 0,
          muelle: false,
          roto: false,
          semilla: Math.random(),
          fase: Math.random() * TAU          // desfase del parpadeo (fantasma)
        };
        if (tipo === 'firme' && Math.random() < 0.06) b.muelle = true;
        return b;
      }

      function sembrar() {
        bloques = [];
        /* Suelo de salida: mientras no has subido, no te puedes caer.
           Cuando la camara sube se queda abajo y desaparece solo. */
        bloques.push({ x: -3, y: 4, w: FW + 6, tipo: 'firme', vx: 0, muelle: false, roto: false, semilla: 0.5 });
        bloques.push({ x: FW / 2 - 14, y: 16, w: 28, tipo: 'firme', vx: 0, muelle: false, roto: false, semilla: 0.2 });
        tope = 16;
        while (tope < FH * 1.6) {
          tope += separacion();
          bloques.push(nuevoBloque(tope));
        }
      }

      function separacion() {
        /* El salto llega a 21,9 unidades: el hueco NUNCA puede pasar de 20,
           o habria bloques imposibles de alcanzar. */
        var d = Math.min(1, tope / 2600);
        return Math.min(20, 13 + d * 4.5 + Math.random() * (3 + d * 1.5));
      }

      /** Va creando bloques por arriba y tirando los que quedan abajo. */
      function reponer() {
        while (tope < camara + FH * 1.4) {
          tope += separacion();
          bloques.push(nuevoBloque(tope));
        }
        for (var i = bloques.length - 1; i >= 0; i--) {
          if (bloques[i].y < camara - 20) bloques.splice(i, 1);
        }
      }

      /* Los bloques fantasma van y vienen: solo se pisan cuando estan
         bien visibles, asi que hay que calcular el momento del salto.
         Devuelve 0..1 (nunca desaparecen del todo, para poder anticiparse). */
      function verse(b) {
        if (b.tipo !== 'fantasma') return 1;
        return 0.5 + 0.5 * Math.sin(tiempo * 2.4 + b.fase);
      }
      function pisable(b) { return b.tipo !== 'fantasma' || verse(b) > 0.5; }

      /* ------------------------- Movimiento ------------------------- */
      function paso(dt) {
        tiempo += dt;

        /* lado: el dedo manda, el teclado tambien */
        if (teclaIzq) jugador.destino -= VEL_LADO * dt;
        if (teclaDer) jugador.destino += VEL_LADO * dt;
        jugador.x += (jugador.destino - jugador.x) * Math.min(1, dt * 30);

        /* se sale por un lado y aparece por el otro */
        if (jugador.x < -RADIO) { jugador.x += FW + RADIO * 2; jugador.destino += FW + RADIO * 2; }
        if (jugador.x > FW + RADIO) { jugador.x -= FW + RADIO * 2; jugador.destino -= FW + RADIO * 2; }

        var antes = jugador.y;
        jugador.vy -= GRAVEDAD * dt;
        jugador.y += jugador.vy * dt;

        jugador.giro += ((jugador.destino - jugador.x) * 0.02 - jugador.giro) * Math.min(1, dt * 6);
        jugador.aplaste += (0 - jugador.aplaste) * Math.min(1, dt * 7);

        /* estela al subir rapido */
        if (jugador.vy > 110) {
          estela.push({ x: jugador.x, y: jugador.y, vida: 0.4 });
          if (estela.length > 16) estela.shift();
        }
        for (var e = estela.length - 1; e >= 0; e--) {
          estela[e].vida -= dt;
          if (estela[e].vida <= 0) estela.splice(e, 1);
        }

        var i, b;
        for (i = 0; i < bloques.length; i++) {
          b = bloques[i];
          if (b.vx) {                                   // bloques que van y vienen
            b.x += b.vx * dt;
            if (b.x < 2) { b.x = 2; b.vx = -b.vx; }
            if (b.x + b.w > FW - 2) { b.x = FW - 2 - b.w; b.vx = -b.vx; }
          }
          if (b.roto || !pisable(b)) continue;
          if (jugador.vy > 0) continue;                 // solo se pisa al bajar
          if (antes - RADIO < b.y - 0.5 || jugador.y - RADIO > b.y) continue;
          if (jugador.x + RADIO * 0.55 < b.x || jugador.x - RADIO * 0.55 > b.x + b.w) continue;
          pisar(b);
          break;
        }

        if (!terminado && jugador.y > camara + FH * 0.52) {
          camara = jugador.y - FH * 0.52;
        }
        if (jugador.y > cima) {
          cima = jugador.y;
          altura = Math.floor(cima / 10);
          valAltura.textContent = altura;
          if (altura >= hito + 50) {
            hito = Math.floor(altura / 50) * 50;
            carteles.push({ y: jugador.y + 27, t: 0, texto: hito + ' m' });
            api.sonar('bien');
          }
        }

        reponer();
        reponerAdornos();

        /* estrellas fugaces cuando ya es de noche */
        if (cima > 3200 && Math.random() < dt * 0.55 && fugaces.length < 2) {
          fugaces.push({ x: Math.random() * FW, y: camara + FH * (0.6 + Math.random() * 0.35),
                         vx: -26 - Math.random() * 20, vy: -16 - Math.random() * 10, vida: 1.1 });
        }
        for (i = fugaces.length - 1; i >= 0; i--) {
          var fu = fugaces[i];
          fu.x += fu.vx * dt; fu.y += fu.vy * dt; fu.vida -= dt;
          if (fu.vida <= 0) fugaces.splice(i, 1);
        }

        for (i = trozos.length - 1; i >= 0; i--) {
          var t = trozos[i];
          t.vy -= 150 * dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          t.giro += t.gv * dt;
          if (t.y < camara - 15) trozos.splice(i, 1);
        }
        for (i = chispas.length - 1; i >= 0; i--) {
          var c = chispas[i];
          c.vy -= 60 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.vida -= dt;
          if (c.vida <= 0) chispas.splice(i, 1);
        }
        for (i = carteles.length - 1; i >= 0; i--) {
          carteles[i].t += dt;
          carteles[i].y += 6 * dt;
          if (carteles[i].t > 1.8) carteles.splice(i, 1);
        }

        /* se cae por debajo de la pantalla */
        if (!terminado && jugador.y < camara - RADIO * 2) acabar();
        if (!terminado && jugador.vy < 0 && jugador.y < camara + FH * 0.12) cayendo = true;
        else if (jugador.vy > 0) cayendo = false;
      }

      function pisar(b) {
        jugador.y = b.y + RADIO;
        jugador.aplaste = 1;

        if (b.tipo === 'fragil') {                      // te impulsa y se deshace
          jugador.vy = SALTO * 0.92;
          b.roto = true;
          romper(b);
          App.tono(240, 0.10, 0.10, 'square');
          return;
        }
        if (b.muelle) {
          jugador.vy = MUELLE;
          api.sonar('gana');
          for (var i = 0; i < 16; i++) {
            chispas.push({
              x: jugador.x, y: b.y + 1,
              vx: (Math.random() - 0.5) * 42, vy: 10 + Math.random() * 44,
              vida: 0.65, color: '#FFE6A8'
            });
          }
          return;
        }
        jugador.vy = SALTO;
        App.tono(520 + Math.random() * 60, 0.07, 0.09, 'triangle');
        for (var j = 0; j < 6; j++) {
          chispas.push({
            x: jugador.x + (Math.random() - 0.5) * 6, y: b.y,
            vx: (Math.random() - 0.5) * 16, vy: 2 + Math.random() * 8,
            vida: 0.35, color: '#FFFFFF'
          });
        }
      }

      function romper(b) {
        for (var i = 0; i < 2; i++) {
          trozos.push({
            x: b.x + (i ? b.w * 0.75 : b.w * 0.25),
            y: b.y,
            w: b.w / 2,
            vx: (i ? 1 : -1) * (6 + Math.random() * 8),
            vy: 6,
            giro: 0,
            gv: (i ? 1 : -1) * 3,
            tipo: b.tipo,
            semilla: b.semilla
          });
        }
      }

      function acabar(porTiempo) {
        if (terminado) return;
        terminado = true;
        if (cuenta && !porTiempo) cuenta.parar();
        api.sonar('fin');
        aviso.textContent = porTiempo
          ? 'Tiempo cumplido: ' + altura + ' m'
          : 'Te caíste desde ' + altura + ' m';
        if (altura > mejor) {
          mejor = altura;
          valMejor.textContent = mejor;
          try { localStorage.setItem('jb_saltos', String(mejor)); } catch (e) {}
        }
        api.luego(function () {
          api.fin({
            sello: '✦',
            titulo: porTiempo ? '¡Se acabó el tiempo!'
                  : (altura >= 300 ? '¡A las nubes y más allá!' : 'Hasta aquí llegaste'),
            premio: altura >= OBJETIVO ? premio() : null,
            mensaje: altura >= 300
              ? 'Buen pulso. ¿Llegas al espacio en el próximo intento?'
              : 'Muévete antes de tocar el bloque y llegarás más lejos.',
            datos: [
              { val: altura, etq: 'Metros' },
              { val: mejor, etq: 'Récord' }
            ]
          });
        }, 900);
      }

      /* ------------------------- Dibujo ------------------------- */
      function pantalla(y) { return FH - (y - camara); }

      function dibujar() {
        if (!ctx) return;
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        cielo();
        pintarEstrellas();
        pintarFugaces();
        pintarCapa(0);
        pintarCapa(1);
        pintarBloques();
        pintarTrozos();
        pintarChispas();
        pintarEstela();
        pintarJugador();
        pintarCapa(2);                 // lo mas cercano pasa por delante
        pintarCarteles();
        borde();
      }

      function cielo() {
        var a = CIELOS[0], b = CIELOS[CIELOS.length - 1], f = 1;
        for (var i = 0; i < CIELOS.length - 1; i++) {
          if (cima >= CIELOS[i].h && cima <= CIELOS[i + 1].h) {
            a = CIELOS[i]; b = CIELOS[i + 1];
            f = (cima - a.h) / (b.h - a.h);
            break;
          }
        }
        if (cima >= b.h) { a = b; f = 0; }
        var deg = ctx.createLinearGradient(0, 0, 0, FH);
        deg.addColorStop(0, mezclaColor(a.arriba, b.arriba, f));
        deg.addColorStop(1, mezclaColor(a.abajo, b.abajo, f));
        ctx.fillStyle = deg;
        ctx.fillRect(0, 0, FW, FH);

        /* sol bajo con rayos, solo mientras se ve el cielo de dia */
        var luz = Math.max(0, Math.min(1, 1 - (cima - 1600) / 2200));
        if (luz > 0.02) {
          var sy = FH - (300 - camara * 0.1);
          if (sy > -40 && sy < FH + 60) {
            var halo = ctx.createRadialGradient(72, sy, 2, 72, sy, 42);
            halo.addColorStop(0, 'rgba(255,244,206,' + (0.95 * luz) + ')');
            halo.addColorStop(0.3, 'rgba(255,214,140,' + (0.3 * luz) + ')');
            halo.addColorStop(1, 'rgba(255,214,140,0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(72, sy, 42, 0, TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,250,232,' + luz + ')';
            ctx.beginPath();
            ctx.arc(72, sy, 7, 0, TAU);
            ctx.fill();
          }
        }
      }

      function pintarEstrellas() {
        var alfa = Math.max(0, Math.min(1, (cima - 2600) / 2000));
        if (alfa <= 0.01) return;
        var desp = camara * 0.05;
        var base = Math.floor(desp / 240) - 1;
        for (var k = 0; k < 3; k++) {
          for (var i = 0; i < estrellas.length; i++) {
            var e = estrellas[i];
            var y = FH - ((e.y + (base + k) * 240) - desp);
            if (y < -4 || y > FH + 4) continue;
            var brillo = 0.4 + 0.6 * Math.sin(tiempo * 2.2 + e.f);
            ctx.globalAlpha = alfa * brillo;
            ctx.fillStyle = e.r > 0.6 ? '#FFF3D0' : '#FFFDF0';
            ctx.beginPath();
            ctx.arc(e.x, y, e.r, 0, TAU);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      function pintarFugaces() {
        for (var i = 0; i < fugaces.length; i++) {
          var f = fugaces[i];
          var y = pantalla(f.y);
          var lg = ctx.createLinearGradient(f.x, y, f.x - f.vx * 0.28, y - f.vy * 0.28);
          lg.addColorStop(0, 'rgba(255,255,255,' + Math.max(0, f.vida) + ')');
          lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = lg;
          ctx.lineWidth = 0.55;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(f.x, y);
          ctx.lineTo(f.x - f.vx * 0.28, y - f.vy * 0.28);
          ctx.stroke();
        }
      }

      /* --------------------- Adornos del fondo --------------------- */
      function pintarCapa(n) {
        var capa = capas[n];
        var desp = camara * capa.p;
        for (var i = 0; i < capa.lista.length; i++) {
          var a = capa.lista[i];
          var y = FH - (a.y - desp);
          if (y < -60 || y > FH + 60) continue;
          adorno(a, y, n);
        }
      }

      function adorno(a, y, capa) {
        var e = a.e;
        switch (a.t) {

          case 'clinica':
            clinica(a, y, e);
            break;

          case 'edificio':
            edificio(a, y, e);
            break;

          case 'arbusto':
            ctx.fillStyle = a.tono < 0.5 ? '#6FBF54' : '#57A843';
            ctx.beginPath();
            ctx.arc(a.x, y, 3.4 * e, 0, TAU);
            ctx.arc(a.x - 2.6 * e, y + 1.2 * e, 2.5 * e, 0, TAU);
            ctx.arc(a.x + 2.7 * e, y + 1.1 * e, 2.7 * e, 0, TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.22)';
            ctx.beginPath();
            ctx.arc(a.x - 0.8 * e, y - 1.2 * e, 1.5 * e, 0, TAU);
            ctx.fill();
            break;

          case 'arbol':
            ctx.strokeStyle = '#9A7550';
            ctx.lineWidth = 1.1 * e;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(a.x, y + 8 * e);
            ctx.lineTo(a.x, y - 2 * e);
            ctx.stroke();
            ctx.fillStyle = '#6E9E7C';
            ctx.beginPath();
            ctx.arc(a.x, y - 5 * e, 4.2 * e, 0, TAU);
            ctx.arc(a.x - 3 * e, y - 2 * e, 3 * e, 0, TAU);
            ctx.arc(a.x + 3 * e, y - 2.4 * e, 2.8 * e, 0, TAU);
            ctx.fill();
            break;

          case 'marNubes':                               // mar de nubes del fondo
            bultos(ctx, a.x, y, 13 * e, 'rgba(255,255,255,.5)');
            bultos(ctx, a.x - 22 * e, y + 4 * e, 10 * e, 'rgba(255,255,255,.38)');
            break;

          case 'nube':
            var tenue = (cima > 1400 && cima < 3500) ? 0.45 : 1;   // sin tapar los bloques-nube
            bultos(ctx, a.x, y + Math.sin(tiempo * 0.4 + a.f) * 0.8, 7 * e,
                   'rgba(255,255,255,' + ((0.5 + a.tono * 0.35) * tenue).toFixed(2) + ')');
            bultos(ctx, a.x + 1.4 * e, y + 2.2 * e, 5.6 * e, 'rgba(255,226,180,.22)');
            break;

          case 'nubeCerca':
            bultos(ctx, a.x, y, 17 * e, 'rgba(255,255,255,.28)');
            break;

          case 'pajaro':
            ctx.strokeStyle = 'rgba(60,70,85,.5)';
            ctx.lineWidth = 0.32 * e;
            var bat = Math.sin(tiempo * 4 + a.f) * 1.1;
            ctx.beginPath();
            ctx.moveTo(a.x - 2.2 * e, y + bat);
            ctx.quadraticCurveTo(a.x - 1 * e, y - 1.2 * e, a.x, y);
            ctx.quadraticCurveTo(a.x + 1 * e, y - 1.2 * e, a.x + 2.2 * e, y + bat);
            ctx.stroke();
            break;

          case 'globo':
            globo(a, y, e);
            break;

          case 'avion':
            ctx.strokeStyle = 'rgba(255,255,255,.45)';   // estela
            ctx.lineWidth = 0.5 * e;
            ctx.beginPath();
            ctx.moveTo(a.x - 3 * e, y);
            ctx.lineTo(a.x - 26 * e, y + 1.6 * e);
            ctx.stroke();
            ctx.fillStyle = '#E9EEF2';
            ctx.beginPath();
            ctx.moveTo(a.x + 4 * e, y);
            ctx.lineTo(a.x - 3 * e, y + 1 * e);
            ctx.lineTo(a.x - 3 * e, y - 1 * e);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(a.x, y);
            ctx.lineTo(a.x - 2.4 * e, y - 2.6 * e);
            ctx.lineTo(a.x - 1 * e, y);
            ctx.closePath();
            ctx.fill();
            break;

          case 'aurora':
            aurora(a, y, e);
            break;

          case 'luna':
            ctx.fillStyle = 'rgba(255,253,240,.18)';
            ctx.beginPath();
            ctx.arc(a.x, y, 20 * e, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#F6F2E0';
            ctx.beginPath();
            ctx.arc(a.x, y, 8.5 * e, 0, TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(185,175,150,.45)';
            ctx.beginPath();
            ctx.arc(a.x - 2.6 * e, y - 2 * e, 1.7 * e, 0, TAU);
            ctx.arc(a.x + 2.8 * e, y + 2.4 * e, 2.3 * e, 0, TAU);
            ctx.arc(a.x + 3.4 * e, y - 3.4 * e, 1.2 * e, 0, TAU);
            ctx.fill();
            break;

          case 'planeta':
            planeta(a, y, e);
            break;

          case 'satelite':
            ctx.fillStyle = '#8FA6B8';
            ctx.fillRect(a.x - 1.6 * e, y - 1.2 * e, 3.2 * e, 2.4 * e);
            ctx.fillStyle = '#3E6E9E';
            ctx.fillRect(a.x - 6 * e, y - 0.9 * e, 3.6 * e, 1.8 * e);
            ctx.fillRect(a.x + 2.4 * e, y - 0.9 * e, 3.6 * e, 1.8 * e);
            ctx.strokeStyle = 'rgba(255,255,255,.5)';
            ctx.lineWidth = 0.22 * e;
            ctx.beginPath();
            ctx.moveTo(a.x - 2.4 * e, y); ctx.lineTo(a.x + 2.4 * e, y);
            ctx.stroke();
            break;

          case 'asteroide':
            ctx.fillStyle = a.tono < 0.5 ? 'rgba(120,118,130,.8)' : 'rgba(96,94,108,.8)';
            ctx.beginPath();
            var lados = 7, rr = 2.6 * e;
            for (var k = 0; k < lados; k++) {
              var ang = (k / lados) * TAU + a.f;
              var rad = rr * (0.7 + ((k * 37 + a.tono * 90) % 30) / 60);
              var px = a.x + Math.cos(ang + tiempo * 0.2) * rad;
              var py = y + Math.sin(ang + tiempo * 0.2) * rad;
              if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;

          case 'nebulosa':
            var neb = ctx.createRadialGradient(a.x, y, 1, a.x, y, 30 * e);
            var col = a.tono < 0.5 ? '160,110,190' : '90,140,200';
            neb.addColorStop(0, 'rgba(' + col + ',.30)');
            neb.addColorStop(0.5, 'rgba(' + col + ',.12)');
            neb.addColorStop(1, 'rgba(' + col + ',0)');
            ctx.fillStyle = neb;
            ctx.beginPath();
            ctx.arc(a.x, y, 30 * e, 0, TAU);
            ctx.fill();
            break;
        }
      }

      /** La clinica: fachada blanca, cristaleras y su lema. */
      function clinica(a, y, e) {
        var an = 30 * e, al = 21 * e;
        var cx = Math.max(an / 2 + 1, Math.min(FW - an / 2 - 1, a.x));
        var x = cx - an / 2;

        ctx.fillStyle = 'rgba(30,60,90,.12)';
        ctx.fillRect(x + 1.2, y - al + 1.2, an, al);

        var f = ctx.createLinearGradient(0, y - al, 0, y);
        f.addColorStop(0, '#FFFFFF');
        f.addColorStop(1, '#E3EEF6');
        ctx.fillStyle = f;
        caja(ctx, x, y - al, an, al, 1.4 * e);
        ctx.fill();

        /* cristaleras */
        ctx.fillStyle = 'rgba(126,186,226,.75)';
        for (var fi = 0; fi < 3; fi++) {
          for (var co = 0; co < 4; co++) {
            caja(ctx, x + an * (0.12 + co * 0.22), y - al * (0.58 - fi * 0.17),
                 an * 0.15, al * 0.1, 0.4 * e);
            ctx.fill();
          }
        }

        /* banda del lema */
        ctx.fillStyle = 'rgba(62,155,228,.16)';
        caja(ctx, x + an * 0.08, y - al * 0.92, an * 0.84, al * 0.2, 0.6 * e);
        ctx.fill();
        ctx.fillStyle = 'rgba(40,80,120,.7)';
        ctx.font = '600 ' + (2.1 * e).toFixed(2) + 'px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TU BIENESTAR', cx, y - al * 0.82);

        /* marquesina y puerta */
        ctx.fillStyle = '#CFE3F2';
        caja(ctx, x + an * 0.32, y - al * 0.22, an * 0.36, al * 0.06, 0.4 * e);
        ctx.fill();
        ctx.fillStyle = '#9CC8E6';
        caja(ctx, x + an * 0.38, y - al * 0.17, an * 0.24, al * 0.17, 0.5 * e);
        ctx.fill();

        /* arbustos a los pies */
        ctx.fillStyle = '#5FB246';
        ctx.beginPath();
        ctx.arc(x + an * 0.12, y - 1 * e, 2.6 * e, 0, TAU);
        ctx.arc(x + an * 0.88, y - 1 * e, 2.3 * e, 0, TAU);
        ctx.fill();
      }

      /** Bloques de la ciudad, al fondo. */
      function edificio(a, y, e) {
        var an = (9 + a.tono * 7) * e, al = (14 + a.tono * 16) * e;
        var x = a.x - an / 2;
        var g = ctx.createLinearGradient(0, y - al, 0, y);
        g.addColorStop(0, '#DCE9F4');
        g.addColorStop(1, '#B6CEE2');
        ctx.fillStyle = g;
        caja(ctx, x, y - al, an, al, 0.8 * e);
        ctx.fill();
        ctx.fillStyle = 'rgba(110,160,200,.55)';
        for (var fi = 0; fi < 4; fi++) {
          for (var co = 0; co < 3; co++) {
            if ((fi + co + Math.floor(a.tono * 9)) % 3 === 0) continue;
            ctx.fillRect(x + an * (0.16 + co * 0.28), y - al * (0.82 - fi * 0.19),
                         an * 0.17, al * 0.1);
          }
        }
      }

      function globo(a, y, e) {
        var bal = Math.sin(tiempo * 0.5 + a.f) * 1.2;
        var x = a.x + bal;
        var col = a.tono < 0.33 ? ['#C0614F', '#E8A492']
                : a.tono < 0.66 ? ['#B9924F', '#E8CE9B']
                                : ['#4E8C6A', '#9FC9AE'];
        var deg = ctx.createLinearGradient(x - 4 * e, y, x + 4 * e, y);
        deg.addColorStop(0, col[0]);
        deg.addColorStop(0.5, col[1]);
        deg.addColorStop(1, col[0]);
        ctx.fillStyle = deg;
        ctx.beginPath();
        ctx.moveTo(x, y + 6.4 * e);
        ctx.bezierCurveTo(x - 6 * e, y + 1.6 * e, x - 4.6 * e, y - 5.6 * e, x, y - 5.6 * e);
        ctx.bezierCurveTo(x + 4.6 * e, y - 5.6 * e, x + 6 * e, y + 1.6 * e, x, y + 6.4 * e);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.ellipse(x - 1.6 * e, y - 2 * e, 1 * e, 2.4 * e, 0.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,70,45,.6)';
        ctx.lineWidth = 0.22 * e;
        ctx.beginPath();
        ctx.moveTo(x - 1.2 * e, y + 6.2 * e); ctx.lineTo(x - 1 * e, y + 8 * e);
        ctx.moveTo(x + 1.2 * e, y + 6.2 * e); ctx.lineTo(x + 1 * e, y + 8 * e);
        ctx.stroke();
        ctx.fillStyle = '#A9825A';
        caja(ctx, x - 1.5 * e, y + 8 * e, 3 * e, 2.2 * e, 0.5 * e);
        ctx.fill();
      }

      function aurora(a, y, e) {
        var alfa = Math.max(0, Math.min(1, (cima - 3000) / 1600)) * 0.5;
        if (alfa <= 0.02) return;
        for (var k = 0; k < 3; k++) {
          var x = a.x + k * 9 * e - 9 * e;
          var alto = 34 * e;
          var deg = ctx.createLinearGradient(0, y - alto, 0, y + alto * 0.3);
          var c1 = k % 2 ? '120,220,190' : '150,190,240';
          deg.addColorStop(0, 'rgba(' + c1 + ',0)');
          deg.addColorStop(0.45, 'rgba(' + c1 + ',' + alfa.toFixed(2) + ')');
          deg.addColorStop(1, 'rgba(' + c1 + ',0)');
          ctx.fillStyle = deg;
          ctx.beginPath();
          ctx.moveTo(x, y - alto);
          for (var s = 0; s <= 8; s++) {
            var t = s / 8;
            ctx.lineTo(x + Math.sin(tiempo * 0.6 + t * 3 + a.f + k) * 3.2 * e,
                       y - alto + t * alto * 1.3);
          }
          for (var s2 = 8; s2 >= 0; s2--) {
            var t2 = s2 / 8;
            ctx.lineTo(x + 4.5 * e + Math.sin(tiempo * 0.6 + t2 * 3 + a.f + k) * 3.2 * e,
                       y - alto + t2 * alto * 1.3);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      function planeta(a, y, e) {
        var r = 11 * e;
        var col = a.tono < 0.4 ? ['#D8A05C', '#8A5A2E']
                : a.tono < 0.7 ? ['#7FA8C9', '#33526E']
                               : ['#C98A9B', '#7A4557'];
        var deg = ctx.createRadialGradient(a.x - r * 0.35, y - r * 0.35, r * 0.1, a.x, y, r);
        deg.addColorStop(0, col[0]);
        deg.addColorStop(1, col[1]);
        ctx.fillStyle = deg;
        ctx.beginPath();
        ctx.arc(a.x, y, r, 0, TAU);
        ctx.fill();
        /* bandas */
        ctx.save();
        ctx.beginPath();
        ctx.arc(a.x, y, r, 0, TAU);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,.10)';
        ctx.fillRect(a.x - r, y - r * 0.45, r * 2, r * 0.3);
        ctx.fillRect(a.x - r, y + r * 0.15, r * 2, r * 0.2);
        ctx.restore();
        if (a.tono < 0.55) {                             // anillo
          ctx.strokeStyle = 'rgba(240,220,180,.7)';
          ctx.lineWidth = 1.1 * e;
          ctx.beginPath();
          ctx.ellipse(a.x, y, r * 1.75, r * 0.42, -0.35, 0, TAU);
          ctx.stroke();
        }
      }

      /* --------------------- Bloques --------------------- */
      /* ---------------------------------------------------------------
         Plataformas al estilo de la referencia: base de roca oscura con
         el canto irregular y encima la capa viva (cesped, nieve, cristal
         o neon segun la altura), con matas y hojas asomando.
         --------------------------------------------------------------- */
      var MATERIAL = {
        hierba:  { r1: '#63707F', r2: '#2E3643', c1: '#8FD95C', c2: '#4E9E2C', mata: '#6FC244', hoja: '#93E36C' },
        nube:    { r1: '#9FB2C4', r2: '#5D7288', c1: '#FFFFFF', c2: '#CFE2F0', mata: '#EAF4FB', hoja: '#FFFFFF' },
        cristal: { r1: '#6E5C46', r2: '#3A3026', c1: '#FFE9B8', c2: '#D9A441', mata: '#F5D089', hoja: '#FFF3D2' },
        neon:    { r1: '#3D4557', r2: '#1C2230', c1: '#59E4D6', c2: '#1B8E92', mata: '#8CF5EC', hoja: '#BFFFF8' }
      };

      /** Una hoja redondeada, como las de las matas. */
      function hoja(cx, cy, r, ang, color) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.95, -r * 0.55, 0, -r * 1.7);
        ctx.quadraticCurveTo(-r * 0.95, -r * 0.55, 0, 0);
        ctx.fill();
        ctx.restore();
      }

      function pintarBloque(x, y, an, b) {
        var m = MATERIAL[piel(b.y !== undefined ? b.y : camara)];
        var tipo = b.tipo, muelle = b.muelle, semilla = b.semilla || 0.5;

        /* el fantasma se desvanece y vuelve; cuando esta palido no se pisa */
        var vis = verse(b);
        var fantasma = tipo === 'fantasma';
        if (fantasma) ctx.globalAlpha = 0.18 + 0.82 * vis;

        /* sombra en el suelo */
        ctx.fillStyle = 'rgba(20,30,45,.18)';
        ctx.beginPath();
        ctx.ellipse(x + an / 2, y + BLOQUE_AL + 2.4, an * 0.44, 0.9, 0, 0, TAU);
        ctx.fill();

        if (muelle) resorte(x + an / 2, y);

        /* --- base de roca, con el canto de abajo irregular --- */
        var alto = BLOQUE_AL + 1.6;
        var gr = ctx.createLinearGradient(0, y, 0, y + alto);
        gr.addColorStop(0, m.r1);
        gr.addColorStop(1, m.r2);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x + 1.4, y + 0.6);
        ctx.lineTo(x + an - 1.4, y + 0.6);
        ctx.quadraticCurveTo(x + an + 0.2, y + 0.6, x + an - 0.9, y + alto * 0.5);
        ctx.quadraticCurveTo(x + an * 0.76, y + alto * 1.25, x + an * 0.58, y + alto * 0.82);
        ctx.quadraticCurveTo(x + an * 0.44, y + alto * 1.3, x + an * 0.28, y + alto * 0.85);
        ctx.quadraticCurveTo(x + an * 0.14, y + alto * 1.15, x + 0.9, y + alto * 0.5);
        ctx.quadraticCurveTo(x - 0.2, y + 0.6, x + 1.4, y + 0.6);
        ctx.closePath();
        ctx.fill();

        /* vetas claras de la roca */
        ctx.strokeStyle = 'rgba(255,255,255,.12)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(x + an * 0.2, y + alto * 0.72);
        ctx.lineTo(x + an * 0.34, y + alto * 0.62);
        ctx.moveTo(x + an * 0.62, y + alto * 0.78);
        ctx.lineTo(x + an * 0.78, y + alto * 0.66);
        ctx.stroke();

        /* --- capa viva encima, que cae un poco por los lados --- */
        var cg = ctx.createLinearGradient(0, y - 0.4, 0, y + 2.4);
        cg.addColorStop(0, m.c1);
        cg.addColorStop(1, m.c2);
        ctx.fillStyle = cg;
        caja(ctx, x - 0.3, y - 0.3, an + 0.6, 2.5, 1.2);
        ctx.fill();
        ctx.beginPath();                                  /* gotas que cuelgan */
        for (var d = 0; d < 3; d++) {
          var dx = x + an * (0.24 + d * 0.26);
          ctx.moveTo(dx + 1.1, y + 1.9);
          ctx.arc(dx, y + 1.9, 1.1, 0, TAU);
        }
        ctx.fill();

        /* brillo del canto superior */
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(x + 1.4, y + 0.25);
        ctx.lineTo(x + an - 1.4, y + 0.25);
        ctx.stroke();

        /* --- matas y hojas asomando --- */
        var matas = 2 + Math.floor(semilla * 2);
        for (var k = 0; k < matas; k++) {
          var mx = x + an * (0.2 + k * (0.6 / Math.max(1, matas - 1))) + (semilla - 0.5) * 1.5;
          hoja(mx, y - 0.1, 0.9 + ((k + semilla) % 2) * 0.3, -0.5 + k * 0.5, m.hoja);
          hoja(mx + 0.7, y + 0.1, 0.75, 0.6 - k * 0.3, m.mata);
        }
        ctx.strokeStyle = m.mata;
        ctx.lineWidth = 0.34;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (var g = 0; g < 4; g++) {
          var gx = x + an * (0.12 + g * 0.24 + (semilla - 0.5) * 0.06);
          ctx.moveTo(gx, y + 0.5);
          ctx.quadraticCurveTo(gx + 0.25, y - 0.4, gx + 0.7, y - 0.9);
        }
        ctx.stroke();

        /* --- avisos de cada tipo --- */
        if (tipo === 'movil') {
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          for (var s2 = 0; s2 < 2; s2++) {
            var fx = s2 ? x + an - 2.2 : x + 2.2;
            var dir = s2 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(fx + dir * 0.9, y + 1.1);
            ctx.lineTo(fx - dir * 0.5, y + 0.4);
            ctx.lineTo(fx - dir * 0.5, y + 1.8);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (tipo === 'fragil') {
          ctx.strokeStyle = 'rgba(40,25,20,.5)';
          ctx.lineWidth = 0.26;
          ctx.beginPath();
          ctx.moveTo(x + an * 0.34, y + 2.4);
          ctx.lineTo(x + an * 0.4, y + alto * 0.9);
          ctx.moveTo(x + an * 0.6, y + 2.5);
          ctx.lineTo(x + an * 0.54, y + alto * 0.95);
          ctx.stroke();
        }
        if (fantasma) {
          ctx.strokeStyle = vis > 0.5 ? 'rgba(255,255,255,.95)' : 'rgba(150,130,220,.8)';
          ctx.lineWidth = 0.35;
          ctx.setLineDash([1.4, 1.2]);
          caja(ctx, x - 0.3, y - 0.3, an + 0.6, 2.5, 1.2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }

      function resorte(cx, y) {
        ctx.strokeStyle = '#A8813E';
        ctx.lineWidth = 0.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 1.7, y - 0.2);
        for (var s = 0; s < 4; s++) ctx.lineTo(cx + (s % 2 ? -1.7 : 1.7), y - 0.9 - s * 0.9);
        ctx.stroke();
        var pl = ctx.createLinearGradient(0, y - 5.2, 0, y - 3.9);
        pl.addColorStop(0, '#FFF6E2');
        pl.addColorStop(1, '#C09B57');
        ctx.fillStyle = pl;
        caja(ctx, cx - 2.6, y - 5.2, 5.2, 1.4, 0.7);
        ctx.fill();
      }

      function pintarBloques() {
        for (var i = 0; i < bloques.length; i++) {
          var b = bloques[i];
          if (b.roto) continue;
          var y = pantalla(b.y);
          if (y < -10 || y > FH + 10) continue;
          pintarBloque(b.x, y, b.w, b);
        }
      }

      function pintarTrozos() {
        for (var i = 0; i < trozos.length; i++) {
          var t = trozos[i];
          var y = pantalla(t.y);
          if (y < -10 || y > FH + 10) continue;
          ctx.save();
          ctx.translate(t.x, y);
          ctx.rotate(t.giro);
          pintarBloque(-t.w / 2, 0, t.w, { tipo: t.tipo, muelle: false, semilla: t.semilla, y: t.y });
          ctx.restore();
        }
      }

      function pintarChispas() {
        for (var i = 0; i < chispas.length; i++) {
          var c = chispas[i];
          var y = pantalla(c.y);
          ctx.globalAlpha = Math.max(0, c.vida * 1.6);
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc(c.x, y, 0.75, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintarEstela() {
        for (var i = 0; i < estela.length; i++) {
          var t = estela[i];
          ctx.globalAlpha = Math.max(0, t.vida) * 0.5 * (i / estela.length);
          ctx.fillStyle = '#FFE9BC';
          ctx.beginPath();
          ctx.arc(t.x, pantalla(t.y), RADIO * 0.55 * (i / estela.length), 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintarCarteles() {
        for (var i = 0; i < carteles.length; i++) {
          var c = carteles[i];
          var y = pantalla(c.y);
          var f = Math.max(0, 1 - c.t / 1.8);
          ctx.globalAlpha = f;
          var an = 22, al = 7.5, x0 = (FW - an) / 2;
          var cinta = ctx.createLinearGradient(0, y - al / 2, 0, y + al / 2);
          cinta.addColorStop(0, '#E9CD97');
          cinta.addColorStop(1, '#B9924F');
          ctx.fillStyle = cinta;
          caja(ctx, x0, y - al / 2, an, al, 1.2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.7)';
          ctx.lineWidth = 0.3;
          ctx.stroke();
          ctx.fillStyle = '#FFFDF6';
          ctx.font = '600 4.4px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(c.texto, FW / 2, y + 0.2);
        }
        ctx.globalAlpha = 1;
      }

      /** El emblema del logo, con su halo. */
      function pintarJugador() {
        var y = pantalla(jugador.y);
        figura(jugador.x, y);
        if (jugador.x < RADIO * 2) figura(jugador.x + FW + RADIO * 2, y);
        if (jugador.x > FW - RADIO * 2) figura(jugador.x - FW - RADIO * 2, y);
      }

      function figura(x, y) {
        var estira = 1 + jugador.aplaste * 0.22;
        var ancho = 1 - jugador.aplaste * 0.22;

        var halo = ctx.createRadialGradient(x, y, RADIO * 0.7, x, y, RADIO * 2.2);
        halo.addColorStop(0, 'rgba(255,224,160,.45)');
        halo.addColorStop(1, 'rgba(255,224,160,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, RADIO * 2.2, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(jugador.giro);
        ctx.scale(ancho, estira);

        ctx.fillStyle = 'rgba(40,30,15,.18)';
        ctx.beginPath();
        ctx.ellipse(0, RADIO * 0.9, RADIO * 0.8, RADIO * 0.28, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#FFFDF8';
        ctx.beginPath();
        ctx.arc(0, 0, RADIO, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, RADIO - 0.2, 0, TAU);
        ctx.clip();
        if (logoListo && recorte) {
          var d = (RADIO - 0.2) * 2;
          ctx.drawImage(logo, recorte.x, recorte.y, recorte.w, recorte.h, -d / 2, -d / 2, d, d);
        } else {
          var oro = ctx.createLinearGradient(-RADIO, -RADIO, RADIO, RADIO);
          oro.addColorStop(0, '#E3C593');
          oro.addColorStop(1, '#8B6A38');
          ctx.fillStyle = oro;
          ctx.fillRect(-RADIO, -RADIO, RADIO * 2, RADIO * 2);
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(139,106,56,.55)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, RADIO - 0.2, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      /** Aviso rojo cuando te estas quedando sin pantalla. */
      function borde() {
        if (!cayendo || terminado) return;
        var pulso = 0.25 + 0.25 * Math.sin(tiempo * 9);
        var deg = ctx.createLinearGradient(0, FH, 0, FH - 18);
        deg.addColorStop(0, 'rgba(192,97,79,' + pulso.toFixed(2) + ')');
        deg.addColorStop(1, 'rgba(192,97,79,0)');
        ctx.fillStyle = deg;
        ctx.fillRect(0, FH - 18, FW, 18);
      }

      /* ------------------------- Controles ------------------------- */
      function aCampo(clienteX) {
        var r = lienzo.getBoundingClientRect();
        if (!r.width) return jugador.destino;
        return (clienteX - r.left) / r.width * FW;
      }

      /* Se apunta el dedo que esta tocando en vez de fiarse de e.buttons o
         e.pressure: hay pantallas tactiles que los devuelven a cero. */
      var tocando = false;

      vista.addEventListener('pointerdown', function (e) {
        tocando = true;
        jugador.destino = aCampo(e.clientX);
      });
      vista.addEventListener('pointermove', function (e) {
        if (tocando || e.pointerType === 'mouse') jugador.destino = aCampo(e.clientX);
      });

      function soltarDedo() { tocando = false; }
      window.addEventListener('pointerup', soltarDedo);
      window.addEventListener('pointercancel', soltarDedo);

      function tecla(e) {
        if (e.key === 'ArrowLeft')  { teclaIzq = true; e.preventDefault(); }
        if (e.key === 'ArrowRight') { teclaDer = true; e.preventDefault(); }
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
        if (!terminado) paso(dt);
        dibujar();
      }

      /* Minuto y medio de partida. */
      cuenta = api.cuenta(LIMITE, function () { acabar(true); });

      medir();
      api.luego(medir, 450);
      sembrarEstrellas();
      sembrar();
      reponerAdornos();
      sembrarCiudad();
      jugador.vy = SALTO;
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
        terminado = true;
      };
    }
  });

})();
