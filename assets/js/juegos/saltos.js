/* ==========================================================================
   JUEGO 9 - SALTO INFINITO (al estilo del clasico de saltar entre bloques)
   La que salta es la doctora. Se arranca desde la ciudad de la foto, con sus
   arboles y matas, y el viaje sigue por etapas: el mar de nubes con globos,
   la aurora y al final los planetas. Las plataformas son de hierba (fotos)
   y cambian de color segun la altura. Por el camino hay billetes que cobrar.
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

  var RADIO    = 6;          // el choque con las plataformas: los pies van en y-RADIO
  var ALTO_DRA = 22;         // alto de la doctora, de la cabeza a los tacones
  var GRAVEDAD = 210;
  var SALTO    = 96;         // impulso al pisar un bloque
  var MUELLE   = 168;        // impulso del trampolin
  var VEL_LADO = 62;         // con teclado

  var BLOQUE_AN = 17, BLOQUE_AL = 3.6;
  var OBJETIVO = 70;         // metros para llevarse el premio

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

  /* ---------------------------------------------------------------
     Imagenes. Se cargan una vez por sesion y se comparten entre partidas.
     --------------------------------------------------------------- */
  var RUTA = 'assets/img/saltos/';
  var ARCHIVOS = {
    cuerpo: 'doctora-cuerpo.png',
    nube1: 'nube-1.png',
    nube2: 'nube-2.png',
    nube3: 'nube-3.png',
    nube4: 'nube-4.png',
    ciudad: 'ciudad.png',
    billete: 'billete.png',
    plataforma1: 'plataforma-1.png',
    plataforma2: 'plataforma-2.png',
    plataforma3: 'plataforma-3.png',
    plataforma4: 'plataforma-4.png',
    arbol1: 'arbol-1.png',
    arbol2: 'arbol-2.png',
    arbusto1: 'arbusto-1.png',
    arbusto2: 'arbusto-2.png',
    arbusto3: 'arbusto-3.png',
    arbusto4: 'arbusto-4.png',
    arbusto5: 'arbusto-5.png',
    arbusto6: 'arbusto-6.png'
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

  /** Alto que le toca a una imagen si se pinta con este ancho. */
  function alto(n, ancho) {
    var im = IMG[n];
    return lista(n) ? ancho * im.naturalHeight / im.naturalWidth : ancho * 0.4;
  }

  /** Que ancho le toca a una imagen si se pinta con este alto. */
  function ancho(n, alto) {
    var im = IMG[n];
    return lista(n) ? alto * im.naturalWidth / im.naturalHeight : alto * 0.26;
  }

  /** Pinta una imagen por su nombre; si falta el alto se saca de la proporcion. */
  function imagen(g, n, x, y, w, hh, volteoX) {
    if (!lista(n)) return;
    var im = IMG[n];
    if (hh === undefined || hh === null) hh = w * im.naturalHeight / im.naturalWidth;
    if (!volteoX) { g.drawImage(im, x, y, w, hh); return; }
    g.save();
    g.translate(x + w, y);
    g.scale(-1, 1);
    g.drawImage(im, 0, 0, w, hh);
    g.restore();
  }

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
      var valBilletes = h('span', { class: 'val' }, '0');
      var cobrados = 0;
      var aviso = h('p', { class: 'aviso' }, 'Arrastra el dedo para moverte de lado');

      var lienzo = h('canvas', { class: 'saltos' });
      var zona = h('div', {
        class: 'saltos-zona',
        estilo: 'flex:1; min-height:0; display:flex; align-items:center;' +
                ' justify-content:center; overflow:hidden;'
      }, lienzo);

      vista.appendChild(h('div', { class: 'marcador' },
        h('div', { class: 'dato' }, valAltura, h('span', { class: 'etq' }, 'Metros')),
        h('div', { class: 'dato' }, valBilletes, h('span', { class: 'etq' }, 'Billetes')),
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

        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // mas no se nota y pesa el doble
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

      /* La ciudad del arranque: la foto al fondo (capa lejana), apoyada en
         el suelo, y delante los arboles y las matas, todos en la misma linea. */
      function sembrarCiudad() {
        capas[0].lista.push({ x: FW / 2, y: 9, t: 'ciudad', e: 1, f: 0, tono: 0 });
        capas[1].lista.push({ x: 11, y: 6, t: 'arbol', e: 1.15, f: 0, tono: 0.2 });
        capas[1].lista.push({ x: 90, y: 6, t: 'arbol', e: 1.0, f: 0, tono: 0.8 });
        for (var j = 0; j < 6; j++) {
          capas[1].lista.push({
            x: 5 + j * 18 + Math.random() * 8, y: 4.5, t: 'arbusto',
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
        else if (tipo === 'firme' && Math.random() < 0.22) b.billete = { fase: Math.random() * TAU, cobrado: false };
        return b;
      }

      function sembrar() {
        bloques = [];
        /* Suelo de salida: mientras no has subido, no te puedes caer.
           Cuando la camara sube se queda abajo y desaparece solo. */
        bloques.push({ x: -3, y: 4, w: FW + 6, tipo: 'firme', vx: 0, muelle: false, roto: false, semilla: 0.5 });
        bloques.push({ x: FW / 2 - 14, y: 16, w: 28, tipo: 'firme', vx: 0, muelle: false, roto: false, semilla: 0.2,
                       billete: { fase: 0, cobrado: false } });
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

        /* billetes: se cobran al rozarlos, subiendo o bajando */
        for (i = 0; i < bloques.length; i++) {
          b = bloques[i];
          if (!b.billete || b.billete.cobrado || b.roto) continue;
          var bx = b.x + b.w / 2, by = b.y + 7;
          var dx = jugador.x - bx, dy = jugador.y - by;
          if (dx * dx + dy * dy > (RADIO + 3) * (RADIO + 3)) continue;
          b.billete.cobrado = true;
          cobrados++;
          valBilletes.textContent = cobrados;
          dinero();
          for (var q = 0; q < 10; q++) {
            chispas.push({
              x: bx, y: by,
              vx: (Math.random() - 0.5) * 30, vy: 6 + Math.random() * 26,
              vida: 0.5, color: '#FFE45C'
            });
          }
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

      /** Caja registradora: el clic del cajon y el timbre, con monedas. */
      function dinero() {
        if (App.ruido) App.ruido(0.06, 0.3, 5000, 1500);
        App.tono(2093, 0.28, 0.16, 'sine');
        api.luego(function () { App.tono(2637, 0.45, 0.14, 'sine'); }, 70);
        api.luego(function () { App.tono(3136, 0.12, 0.08, 'triangle'); }, 180);
        api.luego(function () { App.tono(3520, 0.10, 0.07, 'triangle'); }, 260);
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
              { val: cobrados, etq: 'Billetes' },
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

      /* ---------------------------------------------------------------
         LAS NUBES SON LAS DE LA FOTO

         Antes, en cuanto se dejaba atras la ciudad, el cielo se quedaba en
         un degradado con manchas blancas dibujadas a mano y se notaba el
         bajon. Estas nubes estan recortadas de la MISMA foto de la ciudad
         (ver herramientas/preparar-assets-saltos.py), asi que al subir el
         cielo sigue con el mismo dibujo en vez de empeorar.

         Se apagan poco a poco a partir del atardecer: una nube blanca de
         mediodia sobre un cielo de noche cantaria.
         --------------------------------------------------------------- */
      var NUBES = ['nube1', 'nube3', 'nube2', 'nube4'];

      function luzNube() {
        return Math.max(0.16, Math.min(1, 1 - (cima - 2000) / 2800));
      }

      function nubeFoto(a, x, y, an, alfa, salto) {
        var n = NUBES[(Math.floor(a.tono * 4) + salto) % 4];
        var al = alto(n, an);
        ctx.globalAlpha = alfa * luzNube();
        imagen(ctx, n, x - an / 2, y - al / 2, an, al, a.f > Math.PI);
        ctx.globalAlpha = 1;
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

          case 'ciudad': {
            var cw = FW * 1.12, ch = alto('ciudad', cw);
            imagen(ctx, 'ciudad', a.x - cw / 2, y - ch, cw, ch);
            break;
          }

          case 'arbol': {
            var an = a.tono < 0.5 ? 'arbol1' : 'arbol2';
            var aw = 26 * e, ah = alto(an, aw);
            imagen(ctx, an, a.x - aw / 2, y - ah, aw, ah);
            break;
          }

          case 'arbusto': {
            var mn = 'arbusto' + (1 + Math.floor(a.tono * 6) % 6);
            var mw = 12 * e, mh = alto(mn, mw);
            imagen(ctx, mn, a.x - mw / 2, y - mh, mw, mh, a.tono > 0.5);
            break;
          }

          case 'marNubes':                               // mar de nubes del fondo
            nubeFoto(a, a.x, y, 42 * e, 0.62, 0);
            nubeFoto(a, a.x - 27 * e, y + 5 * e, 31 * e, 0.4, 1);
            break;

          case 'nube':
            var tenue = (cima > 1400 && cima < 3500) ? 0.55 : 1;   // sin tapar los bloques-nube
            nubeFoto(a, a.x, y + Math.sin(tiempo * 0.4 + a.f) * 0.8, 25 * e,
                     (0.72 + a.tono * 0.22) * tenue, 0);
            break;

          case 'nubeCerca':
            nubeFoto(a, a.x, y, 56 * e, 0.34, 2);
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
         Plataformas: una de las cuatro fotos de hierba, elegida por la
         semilla del bloque. El material de cada etapa (hierba, nube,
         cristal, neon) se consigue con un filtro de color sobre la foto.
         --------------------------------------------------------------- */
      var FILTRO = {
        hierba:  null,
        nube:    'saturate(.25) brightness(1.35)',
        cristal: 'sepia(.7) saturate(1.6) brightness(1.05)',
        neon:    'hue-rotate(115deg) saturate(1.7) brightness(1.1)'
      };
      var CON_FILTRO = !!(ctx && ctx.filter !== undefined);
      var tenidas = {};                         // lienzos ya tenidos: [filtro][nombre]

      /** Devuelve la foto ya tenida (se calcula una sola vez por material). */
      function tenida(nombre, filtro) {
        if (!filtro || !CON_FILTRO) return IMG[nombre];
        var clave = filtro + '|' + nombre;
        if (tenidas[clave]) return tenidas[clave];
        var im = IMG[nombre];
        var c = document.createElement('canvas');
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        var g = c.getContext('2d');
        g.filter = filtro;
        g.drawImage(im, 0, 0);
        tenidas[clave] = c;
        return c;
      }

      /** Pinta una plataforma con su foto; la linea de hierba queda en y. */
      function foto(nombre, x, y, an, filtro) {
        if (!lista(nombre)) {                            // mientras llega la foto
          ctx.fillStyle = '#6FC244';
          caja(ctx, x, y - 0.3, an, BLOQUE_AL + 1.2, 1.2);
          ctx.fill();
          return;
        }
        var al = alto(nombre, an);
        ctx.drawImage(tenida(nombre, filtro), x, y - al * 0.18, an, al);
      }

      function pintarBloque(x, y, an, b) {
        var tipo = b.tipo, muelle = b.muelle, semilla = b.semilla || 0.5;
        var filtro = FILTRO[piel(b.y !== undefined ? b.y : camara)];

        /* el fantasma se desvanece y vuelve; cuando esta palido no se pisa */
        var vis = verse(b);
        var fantasma = tipo === 'fantasma';
        if (fantasma) ctx.globalAlpha = 0.18 + 0.82 * vis;

        /* el suelo de salida: hierba seguida y un muro de piedra debajo */
        if (an > FW) {
          var muro = ctx.createLinearGradient(0, y + 2, 0, FH);
          muro.addColorStop(0, '#7A6A55');
          muro.addColorStop(1, '#3E3226');
          ctx.fillStyle = muro;
          ctx.fillRect(0, y + 2, FW, FH - y);
          ctx.fillStyle = 'rgba(255,255,255,.08)';
          for (var px = 0; px < FW; px += 9) {
            caja(ctx, px + ((y | 0) % 2) * 4, y + 4 + (px % 3) * 1.5, 7, 3.2, 1.2);
            ctx.fill();
          }
          for (var tx = x; tx < x + an; tx += 24) foto('plataforma2', tx, y, 30, filtro);
          return;
        }

        /* sombra en el suelo */
        ctx.fillStyle = 'rgba(20,30,45,.18)';
        ctx.beginPath();
        ctx.ellipse(x + an / 2, y + BLOQUE_AL + 2.4, an * 0.44, 0.9, 0, 0, TAU);
        ctx.fill();

        if (muelle) resorte(x + an / 2, y);

        foto('plataforma' + (1 + Math.floor(semilla * 4) % 4), x, y, an, filtro);

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
          ctx.strokeStyle = 'rgba(40,25,20,.6)';
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(x + an * 0.34, y + 1.4);
          ctx.lineTo(x + an * 0.42, y + 3.6);
          ctx.lineTo(x + an * 0.38, y + 5.2);
          ctx.moveTo(x + an * 0.62, y + 1.6);
          ctx.lineTo(x + an * 0.56, y + 3.8);
          ctx.lineTo(x + an * 0.61, y + 5.4);
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
          if (b.billete && !b.billete.cobrado) {
            var bw = 8, bh = alto('billete', bw);
            var by = y - 7 + Math.sin(tiempo * 3 + b.billete.fase) * 0.7;
            ctx.save();
            ctx.translate(b.x + b.w / 2, by);
            ctx.rotate(Math.sin(tiempo * 2 + b.billete.fase) * 0.15);
            imagen(ctx, 'billete', -bw / 2, -bh / 2, bw, bh);
            ctx.restore();
          }
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

      /* ---------------------------------------------------------------
         LA CHAPA DE LOS 50 m, 100 m...

         Era un rectangulito plano con el numero pequeno y pasaba sin que
         nadie lo viera. Ahora es una chapa dorada de las de la casa: entra
         dando un saltito con un destello, tiene relieve (sombra, degradado
         y filo claro), dos estrellas a los lados y el numero bien grande.
         --------------------------------------------------------------- */
      function estrellita(x, y, r) {
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.2, x + r, y);
        ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.2, x, y + r);
        ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.2, x - r, y);
        ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.2, x, y - r);
        ctx.fill();
      }

      function pintarCarteles() {
        for (var i = 0; i < carteles.length; i++) {
          var c = carteles[i];
          var y = pantalla(c.y);
          var f = Math.min(1, Math.max(0, (1.8 - c.t) / 0.45));   // se apaga al final
          var ent = Math.min(1, c.t / 0.26);
          var esc = 0.5 + 0.5 * (1 - Math.pow(1 - ent, 3))        // el saltito de entrada
                  + 0.1 * Math.sin(Math.min(1, c.t / 0.55) * Math.PI);
          var an = 30, al = 10.5, r = al / 2;

          ctx.save();
          ctx.globalAlpha = f;
          ctx.translate(FW / 2, y);
          ctx.scale(esc, esc);

          var chispa = Math.max(0, 1 - c.t / 0.6);
          if (chispa > 0.01) {
            var brillo = ctx.createRadialGradient(0, 0, 2, 0, 0, 27);
            brillo.addColorStop(0, 'rgba(255,236,190,' + (0.6 * chispa).toFixed(2) + ')');
            brillo.addColorStop(1, 'rgba(255,236,190,0)');
            ctx.fillStyle = brillo;
            ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill();
          }

          ctx.fillStyle = 'rgba(74,58,44,.22)';
          caja(ctx, -an / 2, -al / 2 + 1.1, an, al, r); ctx.fill();

          var oro = ctx.createLinearGradient(0, -al / 2, 0, al / 2);
          oro.addColorStop(0,    '#F8E8C0');
          oro.addColorStop(0.46, '#E0BF80');
          oro.addColorStop(0.54, '#C59D55');
          oro.addColorStop(1,    '#A07A39');
          ctx.fillStyle = oro;
          caja(ctx, -an / 2, -al / 2, an, al, r); ctx.fill();

          ctx.fillStyle = 'rgba(255,255,255,.34)';               // brillo de arriba
          caja(ctx, -an / 2 + 1, -al / 2 + 0.9, an - 2, al * 0.32, al * 0.16); ctx.fill();

          ctx.strokeStyle = 'rgba(255,253,246,.92)';             // filo claro
          ctx.lineWidth = 0.42;
          caja(ctx, -an / 2, -al / 2, an, al, r); ctx.stroke();

          ctx.fillStyle = 'rgba(255,253,246,.95)';
          estrellita(-an / 2 + 3.7, -0.1, 1.5);
          estrellita(an / 2 - 3.7, -0.1, 1.5);

          ctx.fillStyle = '#4A3520';
          ctx.font = '700 6.2px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(c.texto, 0, 0.4);

          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      /** La doctora, de cuerpo entero y con su halo. */
      function pintarJugador() {
        var y = pantalla(jugador.y);
        figura(jugador.x, y);
        if (jugador.x < RADIO * 2) figura(jugador.x + FW + RADIO * 2, y);
        if (jugador.x > FW - RADIO * 2) figura(jugador.x - FW - RADIO * 2, y);
      }

      /* Va de pie: el choque sigue siendo el circulo de siempre, pero el
         dibujo se apoya en los pies (y + RADIO en pantalla) y crece hacia
         arriba, asi al caer sobre una plataforma se planta encima de ella
         en vez de quedar hundida. */
      function figura(x, y) {
        var al = ALTO_DRA, an = ancho('cuerpo', al);
        var estira = 1 + jugador.aplaste * 0.18;
        var encoge = 1 - jugador.aplaste * 0.18;
        /* el ladeo del rebote es para una pelota: a una persona se le queda
           en un gesto, no en una voltereta */
        var ladeo = Math.max(-0.3, Math.min(0.3, jugador.giro * 0.45));

        var halo = ctx.createRadialGradient(x, y - al * 0.25, al * 0.18, x, y - al * 0.25, al * 0.62);
        halo.addColorStop(0, 'rgba(255,224,160,.42)');
        halo.addColorStop(1, 'rgba(255,224,160,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y - al * 0.25, al * 0.62, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y + RADIO);            // los pies
        ctx.rotate(ladeo);
        ctx.scale(encoge, estira);

        ctx.fillStyle = 'rgba(40,30,15,.18)';
        ctx.beginPath();
        ctx.ellipse(0, 0, an * 0.62, an * 0.17, 0, 0, TAU);
        ctx.fill();

        if (lista('cuerpo')) {
          imagen(ctx, 'cuerpo', -an / 2, -al, an, al);
        } else {
          var oro = ctx.createLinearGradient(0, -al, 0, 0);
          oro.addColorStop(0, '#E3C593');
          oro.addColorStop(1, '#8B6A38');
          ctx.fillStyle = oro;
          ctx.fillRect(-an / 2, -al, an, al);
        }
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

      cargar(function () {});                      // las fotos se pintan en cuanto llegan
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
