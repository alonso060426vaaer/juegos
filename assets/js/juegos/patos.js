/* ==========================================================================
   JUEGO 8 - PATOS AL VUELO (homenaje al clasico de los 80, en la playa)
   Toca los patos antes de que se escapen. Tres tiros por pato.

   El fondo (cielo, sol, mar, arena, palmeras) se pinta una sola vez en un
   lienzo aparte y cada cuadro solo se copia: asi puede tener mucho detalle
   sin que la pantalla del totem vaya lenta.
   ========================================================================== */

(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* Escena en unidades propias: 100 de ancho, el alto se adapta. */
  var FW = 100;
  var FH = 130;
  var FH_MIN = 80, FH_MAX = 190;

  var HORIZONTE = 74;        // donde acaba el cielo y empieza el mar
  var ORILLA    = 98;        // donde rompe el agua en la arena
  var DUNA      = 112;       // loma de arena de delante (el perro sale detras)

  var PATOS_RONDA = 6;                           // patos por ronda
  var TIROS = 3;                                 // tiros por pato, como en el original
  var RADIO_TIRO = 7;                            // margen de acierto al tocar
  var OBJETIVO = 3;                              // llegar a esta ronda da premio

  /* ---------------------------------------------------------------
     COMPENSACION DEL RETRASO TACTIL

     Entre que el dedo toca el cristal y que este codigo se entera pasa un
     rato, y en ese rato el pato ya se ha movido. Perdonar a ciegas (dar por
     bueno cualquier sitio donde el pato estuviera en el ultimo medio
     segundo) arregla el retraso, pero tambien regala aciertos: hay que
     bajar la velocidad para que no cante, y entonces el juego aburre.

     Aqui se hace al reves: se calcula CUANDO toco el dedo de verdad y se
     mira donde estaba el pato EN ESE INSTANTE. Es lo que hacen los juegos
     de disparos en red para compensar el lag. Perdona el retraso, no la
     punteria, asi que el pato puede volar rapido sin ser injusto.

     El navegador marca cada toque con la hora en que ocurrio (e.timeStamp)
     y va en la misma escala que el reloj de los fotogramas, asi que esa
     parte se mide sola, sin suponer nada. Lo unico a calibrar a mano es
     LAG_PANTALLA: lo que tarda el panel en pintar y el cristal en
     reaccionar, que no queda registrado en ninguna parte.

     PARA CALIBRARLO EN EL TOTEM: abre la consola del navegador y escribe
         PATOS_LAG_DEBUG = true
     juega media docena de patos y mira
         PATOS_LAG
     El campo "media" son milisegundos. Divide entre 1000 y ponlo abajo.
     --------------------------------------------------------------- */
  var LAG_PANTALLA  = 0.06;   // segundos que la pantalla va por detras (se autocalibra)
  var LAG_MAXIMO    = 0.25;   // tope: por mucho que aprenda, nunca perdona mas de esto
  var LAG_PASO      = 0.25;   // que parte del error corrige cada vez (suave)
  var LAG_MUESTRAS  = 9;      // fallos que guarda para decidir
  var LAG_MINIMO    = 5;      // menos de esto no decide nada
  var LAG_DISPERSION = 0.10;  // si los fallos no se parecen entre si, es ruido
  var VENTANA_TOQUE = 0.08;   // margen de error alrededor del instante medido
  var INDULGENCIA   = 0.40;   // cuanto rastro se guarda, y red de seguridad

  /* Tres especies: cuanto mas oscura, menos sale y mas puntos da. */
  var TIPOS = [
    { cabeza: '#27614A', cabezaLuz: '#4E9A72', collar: true,
      pecho: '#8A5A3B', cuerpo: '#B9AA92', cuerpoLuz: '#DCD1BB', cuerpoOsc: '#7C6E58',
      ala: '#CBBEA6', alaOsc: '#8D7F68', espejo: '#3E6E9E', puntos: 100, veces: 5 },
    { cabeza: '#8A4A2E', cabezaLuz: '#B87049', collar: false,
      pecho: '#A3603C', cuerpo: '#C08457', cuerpoLuz: '#E0AE80', cuerpoOsc: '#8A5A36',
      ala: '#D3A277', alaOsc: '#96633C', espejo: '#8C5A33', puntos: 150, veces: 3 },
    { cabeza: '#222A34', cabezaLuz: '#46566A', collar: false,
      pecho: '#39444F', cuerpo: '#47535F', cuerpoLuz: '#6E7B89', cuerpoOsc: '#29313A',
      ala: '#5C6875', alaOsc: '#39434E', espejo: '#6E8FA8', puntos: 200, veces: 2 }
  ];

  var BOLSA = [];
  TIPOS.forEach(function (t) {
    for (var i = 0; i < t.veces; i++) BOLSA.push(t);
  });

  App.registrar({
    id: 'patos',
    nombre: 'Patos al Vuelo',
    emoji: '🦆',
    desc: 'Tócalos antes de que escapen',
    sub: 'Puntería',

    iniciar: function (vista, api) {

      /* ------------------------- Estado ------------------------- */
      var puntos = 0, ronda = 1, indice = 0, aciertos = 0, tiros = TIROS;
      var fase = 'intro';        // intro | volando | cayendo | escapa | ronda | fin
      var pato = null, marcas = [];
      var disparos = [], plumas = [], gotas = [], ondas = [];
      var perro = { estado: 'oculto', alto: 0, t: 0, patos: 0 };
      var tiempo = 0;
      var terminado = false;
      var cuenta = null;

      var mejor = 0;
      try { mejor = parseInt(localStorage.getItem('jb_patos') || '0', 10) || 0; } catch (e) {}

      /* ------------------------- Pantalla ------------------------- */
      var valPuntos = h('span', { class: 'val' }, '0');
      var valRonda  = h('span', { class: 'val' }, '1');
      var valTiros  = h('span', { class: 'val tiros' }, '');
      var aviso = h('p', { class: 'aviso' }, 'Prepárate...');

      var lienzo = h('canvas', { class: 'patos' });
      var zona = h('div', {
        class: 'patos-zona',
        estilo: 'flex:1; min-height:0; display:flex; align-items:center;' +
                ' justify-content:center; overflow:hidden;'
      }, lienzo);

      vista.appendChild(h('div', { class: 'marcador' },
        h('div', { class: 'dato' }, valPuntos, h('span', { class: 'etq' }, 'Puntos')),
        h('div', { class: 'dato' }, valRonda,  h('span', { class: 'etq' }, 'Ronda')),
        h('div', { class: 'dato' }, valTiros,  h('span', { class: 'etq' }, 'Tiros'))
      ));
      vista.appendChild(h('div', { class: 'centro' }, zona, aviso));

      api.sub('Ronda 1' + (mejor ? '  ·  Récord ' + mejor : ''));

      var ctx = lienzo.getContext ? lienzo.getContext('2d') : null;
      var fondo = document.createElement('canvas');
      var fctx = fondo.getContext ? fondo.getContext('2d') : null;
      var frente = document.createElement('canvas');          // palmeras de delante
      var rctx = frente.getContext ? frente.getContext('2d') : null;
      var escala = 1, zoom = 1;
      var nubes = [], brillos = [], gaviotas = [], espumaDeg = null, dunaDeg = null;

      /* ---------------------------------------------------------------
         Medida: el lienzo ocupa todo el hueco libre y se reparte la
         escena (cielo / mar / arena) segun lo alto que quede.
         --------------------------------------------------------------- */
      function medir() {
        if (!ctx) return;
        var libreAn = zona.clientWidth, libreAl = zona.clientHeight;
        if (libreAn < 40 || libreAl < 40) return;

        FH = Math.max(FH_MIN, Math.min(FH_MAX, FW * libreAl / libreAn));
        HORIZONTE = FH * 0.58;
        ORILLA    = FH * 0.775;
        DUNA      = FH - (FH - ORILLA) * 0.42;
        zoom = Math.max(1, Math.min(1.5, FH / 115));

        var an = Math.min(libreAn, libreAl * FW / FH);
        var al = an * FH / FW;
        lienzo.style.width  = Math.round(an) + 'px';
        lienzo.style.height = Math.round(al) + 'px';

        var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        lienzo.width  = Math.round(an * dpr);
        lienzo.height = Math.round(al * dpr);
        escala = (an * dpr) / FW;

        espumaDeg = null; dunaDeg = null;
        decorado();
        pintarFondo();
        pintarFrente();
      }

      /** Nubes, destellos del agua y gaviotas: dependen del alto del campo. */
      function decorado() {
        nubes = [];
        for (var i = 0; i < 5; i++) {
          nubes.push({
            x: Math.random() * FW,
            y: 5 + Math.random() * (HORIZONTE * 0.55),
            r: 3 + Math.random() * 4.5,
            v: 0.25 + Math.random() * 0.5,
            a: 0.35 + Math.random() * 0.4
          });
        }
        brillos = [];
        for (var j = 0; j < 130; j++) {
          var f = Math.random();                       // 0 horizonte, 1 orilla
          var y = HORIZONTE + f * (ORILLA - HORIZONTE);
          var ancho = 4 + f * 26;                      // el reflejo se abre hacia abajo
          brillos.push({
            x: 74 + (Math.random() - 0.5) * ancho,
            y: y,
            l: 0.6 + Math.random() * (1 + f * 3),
            fase: Math.random() * TAU,
            v: 1.5 + Math.random() * 3
          });
        }
        gaviotas = [];
        for (var k = 0; k < 3; k++) {
          gaviotas.push({
            x: Math.random() * FW,
            y: 10 + Math.random() * (HORIZONTE * 0.4),
            v: 1.2 + Math.random() * 1.6,
            e: 0.9 + Math.random() * 0.6,
            fase: Math.random() * TAU
          });
        }
      }

      /* ---------------------------------------------------------------
         Fondo fijo: cielo de tarde, sol, mar, arena y palmeras.
         --------------------------------------------------------------- */
      function pintarFondo() {
        if (!fctx) return;
        fondo.width = lienzo.width;
        fondo.height = lienzo.height;
        var g = fctx;
        g.setTransform(escala, 0, 0, escala, 0, 0);
        g.clearRect(0, 0, FW, FH);

        /* --- cielo --- */
        var cielo = g.createLinearGradient(0, 0, 0, HORIZONTE);
        cielo.addColorStop(0.00, '#5E94C0');
        cielo.addColorStop(0.38, '#9EC5DC');
        cielo.addColorStop(0.72, '#DCD8C8');
        cielo.addColorStop(1.00, '#F7D6A2');
        g.fillStyle = cielo;
        g.fillRect(0, 0, FW, HORIZONTE + 0.5);

        /* --- sol y su resplandor --- */
        var solX = 74, solY = HORIZONTE * 0.46, solR = 5.6;
        var halo = g.createRadialGradient(solX, solY, solR * 0.6, solX, solY, solR * 6.5);
        halo.addColorStop(0, 'rgba(255,236,190,.85)');
        halo.addColorStop(0.35, 'rgba(250,205,130,.32)');
        halo.addColorStop(1, 'rgba(250,205,130,0)');
        g.fillStyle = halo;
        g.beginPath();
        g.arc(solX, solY, solR * 6.5, 0, TAU);
        g.fill();
        var disco = g.createRadialGradient(solX, solY, 0, solX, solY, solR);
        disco.addColorStop(0, '#FFFDF3');
        disco.addColorStop(0.7, '#FFEFC4');
        disco.addColorStop(1, '#FBD98F');
        g.fillStyle = disco;
        g.beginPath();
        g.arc(solX, solY, solR, 0, TAU);
        g.fill();

        /* --- isla lejana --- */
        g.fillStyle = 'rgba(96,120,128,.35)';
        g.beginPath();
        g.moveTo(8, HORIZONTE + 0.3);
        g.quadraticCurveTo(17, HORIZONTE - 6.5, 26, HORIZONTE + 0.3);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(20, HORIZONTE + 0.3);
        g.quadraticCurveTo(26, HORIZONTE - 3.6, 33, HORIZONTE + 0.3);
        g.closePath();
        g.fill();

        /* --- mar --- */
        var mar = g.createLinearGradient(0, HORIZONTE, 0, ORILLA);
        mar.addColorStop(0.00, '#8FB9C9');
        mar.addColorStop(0.12, '#4E8CA8');
        mar.addColorStop(0.40, '#2F7EA0');
        mar.addColorStop(0.78, '#4FA8AE');
        mar.addColorStop(1.00, '#8FD3CE');
        g.fillStyle = mar;
        g.fillRect(0, HORIZONTE, FW, ORILLA - HORIZONTE + 0.5);

        /* linea del horizonte, con la luz del sol encima */
        g.fillStyle = 'rgba(255,238,205,.55)';
        g.fillRect(0, HORIZONTE - 0.35, FW, 0.7);

        /* camino de luz del sol sobre el agua */
        var camino = g.createLinearGradient(0, HORIZONTE, 0, ORILLA);
        camino.addColorStop(0, 'rgba(255,236,190,.55)');
        camino.addColorStop(1, 'rgba(255,236,190,0)');
        g.fillStyle = camino;
        g.beginPath();
        g.moveTo(solX - 3, HORIZONTE);
        g.lineTo(solX + 3, HORIZONTE);
        g.lineTo(solX + 17, ORILLA);
        g.lineTo(solX - 17, ORILLA);
        g.closePath();
        g.fill();

        /* --- arena --- */
        var arena = g.createLinearGradient(0, ORILLA, 0, FH);
        arena.addColorStop(0.00, '#D9C6A0');
        arena.addColorStop(0.25, '#EADCBB');
        arena.addColorStop(1.00, '#D7C193');
        g.fillStyle = arena;
        g.fillRect(0, ORILLA - 0.5, FW, FH - ORILLA + 1);

        /* arena mojada justo en la orilla */
        var mojada = g.createLinearGradient(0, ORILLA - 0.5, 0, ORILLA + (FH - ORILLA) * 0.22);
        mojada.addColorStop(0, 'rgba(120,150,140,.45)');
        mojada.addColorStop(1, 'rgba(120,150,140,0)');
        g.fillStyle = mojada;
        g.fillRect(0, ORILLA - 0.5, FW, (FH - ORILLA) * 0.25);

        /* granos de arena */
        for (var i = 0; i < 420; i++) {
          var ax = Math.random() * FW;
          var ay = ORILLA + Math.random() * (FH - ORILLA);
          g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.28)' : 'rgba(140,115,80,.18)';
          g.fillRect(ax, ay, 0.35, 0.35);
        }

        /* --- viñeta, para que la escena no quede plana --- */
        var vin = g.createRadialGradient(FW / 2, FH * 0.45, FW * 0.35, FW / 2, FH * 0.5, FW * 0.85);
        vin.addColorStop(0, 'rgba(60,40,20,0)');
        vin.addColorStop(1, 'rgba(60,40,20,.20)');
        g.fillStyle = vin;
        g.fillRect(0, 0, FW, FH);
      }

      /* ---------------------------------------------------------------
         Primer plano: las palmeras nacen en la arena de delante y
         enmarcan la escena, como en una foto de playa.
         --------------------------------------------------------------- */
      function pintarFrente() {
        if (!rctx) return;
        frente.width = lienzo.width;
        frente.height = lienzo.height;
        var g = rctx;
        g.setTransform(escala, 0, 0, escala, 0, 0);
        g.clearRect(0, 0, FW, FH);

        /* Altas y ladeadas hacia fuera: la copa asoma por las esquinas y
           deja libre el centro, que es por donde vuelan los patos. */
        var alto = (DUNA - HORIZONTE) * 1.2;
        sombraArena(g, 5, DUNA + 3, 7);
        sombraArena(g, 96, DUNA + 1.5, 5);
        palmera(g, 5, DUNA + 3, alto);
        palmera(g, 96, DUNA + 1.5, alto * 0.8);
        sombrilla(g, 78, DUNA + 5.5, Math.min(2.2, (FH - ORILLA) * 0.055));
      }

      function sombraArena(g, x, y, r) {
        g.fillStyle = 'rgba(120,95,55,.18)';
        g.beginPath();
        g.ellipse(x + 2, y + 0.6, r, r * 0.28, 0, 0, TAU);
        g.fill();
      }

      /** Sombrilla de playa, para dar profundidad a la arena. */
      function sombrilla(g, x, base, k) {
        g.strokeStyle = '#B9A07C';
        g.lineWidth = 0.45 * k;
        g.beginPath();
        g.moveTo(x, base);
        g.lineTo(x - 0.6 * k, base - 6.4 * k);
        g.stroke();

        for (var i = 0; i < 6; i++) {
          g.fillStyle = i % 2 ? '#F6EBDA' : '#C0614F';
          g.beginPath();
          g.moveTo(x - 0.6 * k, base - 6.4 * k);
          var a1 = Math.PI + (i / 6) * Math.PI;
          var a2 = Math.PI + ((i + 1) / 6) * Math.PI;
          g.lineTo(x - 0.6 * k + Math.cos(a1) * 4.6 * k, base - 6.4 * k - Math.sin(a1) * 1.5 * k);
          g.quadraticCurveTo(
            x - 0.6 * k + Math.cos((a1 + a2) / 2) * 5 * k,
            base - 6.4 * k - Math.sin((a1 + a2) / 2) * 1.5 * k - 0.5 * k,
            x - 0.6 * k + Math.cos(a2) * 4.6 * k,
            base - 6.4 * k - Math.sin(a2) * 1.5 * k);
          g.closePath();
          g.fill();
        }
      }

      /** Palmera con el tronco curvado y las hojas abiertas. */
      function palmera(g, x, base, alto) {
        var k = alto / 26;
        var inclina = x > FW / 2 ? 1 : -1;      // se inclina hacia el borde mas cercano

        g.strokeStyle = '#8A6A47';
        g.lineCap = 'round';
        g.lineWidth = 1.5 * k;
        g.beginPath();
        g.moveTo(x, base);
        g.quadraticCurveTo(x + inclina * 2.5, base - alto * 0.55, x + inclina * 6, base - alto);
        g.stroke();
        g.strokeStyle = 'rgba(255,235,200,.35)';   // brillo del sol en el tronco
        g.lineWidth = 0.5 * k;
        g.beginPath();
        g.moveTo(x - 0.4, base);
        g.quadraticCurveTo(x + inclina * 2.1, base - alto * 0.55, x + inclina * 5.6, base - alto);
        g.stroke();

        var cx = x + inclina * 6, cy = base - alto;
        var hojas = 7;
        for (var i = 0; i < hojas; i++) {
          var ang = -Math.PI + (i / (hojas - 1)) * Math.PI;
          var largo = alto * (0.34 + Math.random() * 0.14);
          var px = cx + Math.cos(ang) * largo;
          var py = cy + Math.sin(ang) * largo * 0.62 + 1.2 * k;
          var deg = g.createLinearGradient(cx, cy, px, py);
          deg.addColorStop(0, '#3F6B4E');
          deg.addColorStop(1, '#6FA173');
          g.fillStyle = deg;
          g.beginPath();
          g.moveTo(cx, cy);
          g.quadraticCurveTo((cx + px) / 2, (cy + py) / 2 - largo * 0.34, px, py);
          g.quadraticCurveTo((cx + px) / 2, (cy + py) / 2 + largo * 0.16, cx, cy + 1.1 * k);
          g.closePath();
          g.fill();
        }
        g.fillStyle = '#6B4F33';
        g.beginPath();
        g.arc(cx, cy + 0.6 * k, 1.1 * k, 0, TAU);
        g.fill();
      }

      /* ------------------------- Marcador ------------------------- */
      function pintarHud() {
        valPuntos.textContent = puntos;
        valRonda.textContent = ronda;
        var t = '';
        for (var i = 0; i < TIROS; i++) t += (i < tiros ? '●' : '○');
        valTiros.textContent = t;
      }

      /* ------------------------- Ronda y patos ------------------------- */
      function necesarios() { return Math.min(6, 3 + Math.ceil(ronda / 2)); }

      function empezarRonda() {
        fase = 'intro';
        indice = 0; aciertos = 0; tiros = TIROS;
        marcas = [];
        pato = null;
        pintarHud();
        api.sub('Ronda ' + ronda + (mejor ? '  ·  Récord ' + mejor : ''));
        aviso.textContent = 'Ronda ' + ronda + ': acierta ' + necesarios() +
                            ' de ' + PATOS_RONDA + ', 3 tiros por pato';
        perro.estado = 'busca'; perro.t = 0;
        api.luego(function () {
          perro.estado = 'oculto';
          soltar();
        }, 1700);
      }

      function soltar() {
        if (terminado) return;
        if (indice >= PATOS_RONDA) { finRonda(); return; }
        indice++;
        tiros = TIROS;
        pato = nuevoPato();
        fase = 'volando';
        cuac();
        pintarHud();
        aviso.textContent = 'Pato ' + indice + ' de ' + PATOS_RONDA;
      }

      function nuevoPato() {
        var tipo = BOLSA[entero(0, BOLSA.length - 1)];
        /* Cada pato tiene su propio genio: unos van mas rapidos que otros. */
        var vel = Math.min(70, 42 + ronda * 5) * (0.9 + Math.random() * 0.35);
        /* Sale siempre hacia arriba (esta al ras del agua) pero con mucho abanico. */
        var ang = -Math.PI / 2 + (Math.random() * 1.7 - 0.85);
        return {
          tipo: tipo,
          x: entero(22, 78),
          y: ORILLA - 5,
          vx: Math.cos(ang) * vel,
          vy: Math.sin(ang) * vel,
          base: vel,
          dir: Math.cos(ang) >= 0 ? 1 : -1,
          ala: 0,
          giro: 0,
          estado: 'vuela',
          rastro: [],                            // por donde ha pasado hace poco
          vida: Math.max(2.4, 5.0 - ronda * 0.45), // segundos antes de largarse
          cambio: 0.45
        };
      }

      /* ------------------------- Disparo ------------------------- */
      /* tToque es el momento de la partida en que el dedo toco de verdad
         (ver COMPENSACION DEL RETRASO TACTIL arriba). Llega null solo si el
         navegador no dio una hora fiable; entonces se cae a la red de
         seguridad del final. */
      function tocar(x, y, tToque) {
        if (terminado) return;
        if (fase !== 'volando' || !pato || tiros <= 0) return;

        tiros--;
        disparos.push({ x: x, y: y, t: 0 });
        App.tono(150, 0.06, 0.12, 'square');
        pintarHud();

        var margen = RADIO_TIRO * zoom;
        var i, r;

        /* 1. Donde esta ahora mismo: pantalla rapida, o buena punteria. */
        if (cerca(x, y, pato.x, pato.y, margen)) { acertar(); return; }

        /* 2. Donde estaba cuando el dedo toco. Esto es la compensacion: se
           mira solo esa franja del rastro, no el rastro entero, para no
           regalar aciertos de sitios donde el pato estuvo hace mucho. */
        if (tToque !== null && tToque !== undefined) {
          for (i = pato.rastro.length - 1; i >= 0; i--) {
            r = pato.rastro[i];
            if (r.t > tToque + VENTANA_TOQUE) continue;   // aun demasiado nuevo
            if (r.t < tToque - VENTANA_TOQUE) break;      // ya demasiado viejo
            if (cerca(x, y, r.x, r.y, margen)) { acertar(); return; }
          }
          /* Fallo con hora fiable: si apunto encima del pato pero en otro
             momento, lo que esta mal es nuestra idea del retraso. Se aprende. */
          calibrar(x, y, tToque, margen);
          if (tiros === 0) escapar('Sin tiros: se escapó');
          return;
        }

        /* 3. Red de seguridad: sin hora del toque se perdona a lo bruto,
           como antes. Es peor, pero mejor que no acertar nunca. */
        for (i = pato.rastro.length - 1; i >= 0; i--) {
          r = pato.rastro[i];
          if (tiempo - r.t > INDULGENCIA) break;
          if (cerca(x, y, r.x, r.y, margen)) { acertar(); return; }
        }

        if (tiros === 0) escapar('Sin tiros: se escapó');
      }

      /* ---------------------------------------------------------------
         AUTOCALIBRADO DEL RETRASO

         Cuanto va por detras el panel no se puede medir por software: depende
         del cristal y del monitor. Pero se puede DEDUCIR de como falla la
         gente, sin que nadie tenga que medir nada a mano.

         Cuando un tiro falla pero cae justo encima del pato en OTRO instante
         del rastro, es que el cliente apunto bien y lo que esta mal es
         nuestra idea del retraso. La diferencia entre los dos instantes es el
         error, y se corrige un poco cada vez.

         Tres seguros para que esto no ablande el juego:
           - Solo aprende de tiros que caen ENCIMA del pato. Tocar al tuntun
             no ensena nada.
           - Nunca convierte el fallo en acierto: el tiro fallado, fallado se
             queda. Solo afina el reloj para los siguientes.
           - Corrige despacio (LAG_PASO) y con tope (LAG_MAXIMO), asi que
             aunque alguien se empene no puede estirarlo sin limite.
           - Y sobre todo: solo aprende si los fallos SE PARECEN entre si. El
             retraso de una pantalla es siempre el mismo; tocar al tuntun da
             fallos dispersos. Probado con 300 toques al azar: no aprende nada.

         En la practica casi nunca hace falta: con el valor de fabrica (60 ms)
         un cliente que apunta bien acierta igual en paneles de 60, 150 y hasta
         220 ms. Esto es solo la red para una pantalla excepcionalmente lenta.
         --------------------------------------------------------------- */
      var fallos = [];              // errores de los ultimos tiros, para decidir

      function calibrar(x, y, tToque, margen) {
        var acerto = null, i;
        for (i = pato.rastro.length - 1; i >= 0; i--) {
          if (cerca(x, y, pato.rastro[i].x, pato.rastro[i].y, margen)) {
            acerto = pato.rastro[i]; break;
          }
        }
        if (!acerto) return;                       // no apunto al pato: nada que aprender

        var error = tToque - acerto.t;
        if (error < -LAG_MAXIMO || error > LAG_MAXIMO) return;   // disparate, fuera

        fallos.push(error);
        if (fallos.length > LAG_MUESTRAS) fallos.shift();
        if (fallos.length < LAG_MINIMO) return;    // pocos datos para decidir

        var orden = fallos.slice().sort(function (a, b) { return a - b; });

        /* Aqui esta el filtro que impide ablandar el juego: un retraso de
           pantalla es SIEMPRE el mismo, asi que los fallos se parecen entre
           si. Tocar al tuntun da fallos dispersos. Si no se parecen, no se
           aprende nada. */
        if (orden[orden.length - 1] - orden[0] > LAG_DISPERSION) return;

        LAG_PANTALLA += orden[Math.floor(orden.length / 2)] * LAG_PASO;   // mediana
        if (LAG_PANTALLA < 0) LAG_PANTALLA = 0;
        if (LAG_PANTALLA > LAG_MAXIMO) LAG_PANTALLA = LAG_MAXIMO;
        apunte('calibrado', Math.round(LAG_PANTALLA * 1000));
      }

      function cerca(x, y, px, py, margen) {
        var dx = x - px, dy = y - py;
        return dx * dx + dy * dy <= margen * margen;
      }

      function acertar() {
        aciertos++;
        marcas.push(true);
        puntos += pato.tipo.puntos + tiros * 25;     // premio por acertar pronto
        pintarHud();
        api.sonar('bien');
        soltarPlumas(pato);

        pato.estado = 'tocado';
        pato.vx = 0;
        pato.vy = 30;
        pato.giro = 0;
        fase = 'cayendo';
        aviso.textContent = '¡Tocado! +' + (pato.tipo.puntos + tiros * 25);
      }

      function escapar(texto) {
        marcas.push(false);
        pato.estado = 'escapa';
        pato.vx *= 0.4;
        pato.vy = -58;
        fase = 'escapa';
        api.sonar('mal');
        aviso.textContent = texto || '¡Se escapó!';
      }

      function siguiente(conPerro) {
        pato = null;
        if (conPerro) {
          perro.estado = 'rie'; perro.t = 0;
          api.luego(function () { perro.estado = 'oculto'; soltar(); }, 1500);
        } else {
          api.luego(soltar, 750);
        }
      }

      function finRonda() {
        fase = 'ronda';
        pato = null;
        if (aciertos >= necesarios()) {
          puntos += 150 * ronda;
          pintarHud();
          api.sonar('gana');
          aviso.textContent = '¡Ronda ' + ronda + ' superada!';
          perro.estado = 'trofeo'; perro.t = 0; perro.patos = Math.min(2, aciertos);
          api.luego(function () {
            perro.estado = 'oculto';
            ronda++;
            empezarRonda();
          }, 2300);
        } else {
          acabar();
        }
      }

      function acabar(porTiempo) {
        if (terminado) return;
        terminado = true;
        fase = 'fin';
        if (cuenta && !porTiempo) cuenta.parar();
        perro.estado = porTiempo ? 'busca' : 'rie'; perro.t = 0;
        aviso.textContent = porTiempo
          ? 'Tiempo cumplido'
          : 'Necesitabas ' + necesarios() + ' patos y cazaste ' + aciertos;
        if (puntos > mejor) {
          mejor = puntos;
          try { localStorage.setItem('jb_patos', String(mejor)); } catch (e) {}
        }
        api.sonar('fin');
        api.luego(function () {
          api.fin({
            sello: '✦',
            titulo: porTiempo ? '¡Se acabó el tiempo!'
                  : (ronda >= 3 ? '¡Buena puntería!' : 'Fin de la partida'),
            premio: ronda >= OBJETIVO ? premio() : null,
            mensaje: ronda >= 3
              ? 'Vista y pulso de sobra. ¿Vas a por el récord?'
              : 'Los patos vuelan rápido. ¿Lo intentas otra vez?',
            datos: [
              { val: puntos, etq: 'Puntos' },
              { val: ronda, etq: 'Ronda' },
              { val: mejor, etq: 'Récord' }
            ]
          });
        }, 1400);
      }

      function cuac() {
        App.tono(430, 0.09, 0.10, 'sawtooth');
        api.luego(function () { App.tono(330, 0.10, 0.09, 'sawtooth'); }, 95);
      }

      /* ------------------------- Movimiento ------------------------- */
      function paso(dt) {
        tiempo += dt;

        var i;
        for (i = 0; i < nubes.length; i++) {
          nubes[i].x += nubes[i].v * dt;
          if (nubes[i].x - nubes[i].r * 2.6 > FW) nubes[i].x = -nubes[i].r * 2.6;
        }
        for (i = 0; i < gaviotas.length; i++) {
          gaviotas[i].x += gaviotas[i].v * dt;
          if (gaviotas[i].x > FW + 4) gaviotas[i].x = -4;
        }

        if (perro.estado !== 'oculto') perro.t += dt;
        perro.alto += ((perro.estado === 'oculto' ? 0 : 1) - perro.alto) * Math.min(1, dt * 7);

        if (pato) moverPato(dt);

        for (i = disparos.length - 1; i >= 0; i--) {
          disparos[i].t += dt;
          if (disparos[i].t > 0.45) disparos.splice(i, 1);
        }
        for (i = plumas.length - 1; i >= 0; i--) {
          var pl = plumas[i];
          pl.vy += 16 * dt;
          pl.vx *= 0.985;
          pl.x += (pl.vx + Math.sin(tiempo * 4 + pl.giro) * 3) * dt;
          pl.y += pl.vy * dt;
          pl.giro += dt * 2.4;
          pl.vida -= dt;
          if (pl.vida <= 0) plumas.splice(i, 1);
        }
        for (i = gotas.length - 1; i >= 0; i--) {
          var go = gotas[i];
          go.vy += 95 * dt;
          go.x += go.vx * dt;
          go.y += go.vy * dt;
          go.vida -= dt;
          if (go.vida <= 0) gotas.splice(i, 1);
        }
        for (i = ondas.length - 1; i >= 0; i--) {
          ondas[i].t += dt;
          if (ondas[i].t > 1.1) ondas.splice(i, 1);
        }
      }

      function moverPato(dt) {
        var p = pato;
        p.ala += dt * (p.estado === 'vuela' ? 15 : 24);

        if (p.estado === 'vuela') {
          p.vida -= dt;
          p.cambio -= dt;
          if (p.cambio <= 0) {
            /* Quiebro brusco: gira entre 40 y 130 grados a un lado o al otro,
               asi puede salir en cualquier direccion (tambien picando hacia
               abajo) y no hay forma de adivinarle el rumbo. */
            p.cambio = 0.3 + Math.random() * 0.55;
            var rumbo = Math.atan2(p.vy, p.vx);
            var giro = (0.7 + Math.random() * 1.6) * (Math.random() < 0.5 ? -1 : 1);
            var ang = rumbo + giro;
            var vel = p.base * (Math.random() < 0.22 ? 1.4 : 1);   // acelerones
            p.vx = Math.cos(ang) * vel;
            p.vy = Math.sin(ang) * vel;
            p.dir = p.vx >= 0 ? 1 : -1;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          p.rastro.push({ x: p.x, y: p.y, t: tiempo });
          while (p.rastro.length && tiempo - p.rastro[0].t > INDULGENCIA) p.rastro.shift();

          if (p.x < 7)      { p.x = 7;      p.dir =  1; p.vx =  Math.abs(p.vx); }
          if (p.x > FW - 7) { p.x = FW - 7; p.dir = -1; p.vx = -Math.abs(p.vx); }
          if (p.y < 7)      { p.y = 7;      p.vy =  Math.abs(p.vy) * 0.8; }
          if (p.y > ORILLA - 6) { p.y = ORILLA - 6; p.vy = -Math.abs(p.vy); }

          if (p.vida <= 0) escapar('Se te fue volando');

        } else if (p.estado === 'tocado') {
          p.vy += 42 * dt;
          p.y += p.vy * dt;
          p.x += Math.sin(tiempo * 9) * 4 * dt;      // cae dando tumbos
          p.giro += dt * 2.4;
          if (p.y >= ORILLA - 1) {
            chapuzon(p.x);
            siguiente(false);
          }

        } else if (p.estado === 'escapa') {
          p.y += p.vy * dt;
          p.x += p.vx * dt;
          if (p.y < -10) siguiente(true);
        }
      }

      function soltarPlumas(p) {
        for (var i = 0; i < 11; i++) {
          plumas.push({
            x: p.x, y: p.y,
            vx: (Math.random() - 0.5) * 24,
            vy: (Math.random() - 0.7) * 16,
            giro: Math.random() * TAU,
            vida: 1.4,
            color: i % 3 === 0 ? p.tipo.ala : '#FFFBF2'
          });
        }
      }

      /** Salpicadura al caer el pato al agua. */
      function chapuzon(x) {
        App.tono(180, 0.16, 0.11, 'sine');
        ondas.push({ x: x, t: 0 });
        for (var i = 0; i < 16; i++) {
          gotas.push({
            x: x + (Math.random() - 0.5) * 3,
            y: ORILLA - 0.5,
            vx: (Math.random() - 0.5) * 32,
            vy: -14 - Math.random() * 22,
            vida: 0.7
          });
        }
      }

      /* ------------------------- Dibujo ------------------------- */
      function dibujar() {
        if (!ctx) return;
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        ctx.clearRect(0, 0, FW, FH);
        ctx.drawImage(fondo, 0, 0, FW, FH);

        pintarNubes();
        pintarGaviotas();
        pintarAgua();
        pintarEspuma();
        if (pato) dibujarPato(ctx, pato);
        pintarGotas();
        pintarPlumas();
        dibujarPerro();
        pintarDuna();
        ctx.drawImage(frente, 0, 0, FW, FH);
        pintarDisparos();
        dibujarMarcas();
      }

      function pintarNubes() {
        for (var i = 0; i < nubes.length; i++) {
          var n = nubes[i];
          var bultos = [
            [n.x, n.y, n.r * 1.7, n.r * 0.5],
            [n.x + n.r * 0.85, n.y - n.r * 0.3, n.r * 0.9, n.r * 0.48],
            [n.x - n.r * 0.8, n.y - n.r * 0.1, n.r * 0.72, n.r * 0.4],
            [n.x + n.r * 1.8, n.y + n.r * 0.08, n.r * 0.62, n.r * 0.3]
          ];
          nube(bultos, n.r * 0.24, 'rgba(248,221,180,' + (n.a * 0.5).toFixed(2) + ')');
          nube(bultos, 0, 'rgba(255,253,246,' + n.a.toFixed(2) + ')');
        }
        ctx.globalAlpha = 1;
      }

      /** Todos los bultos en un solo trazo: sin bordes ni recortes entre ellos. */
      function nube(bultos, desvio, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (var i = 0; i < bultos.length; i++) {
          var b = bultos[i];
          ctx.moveTo(b[0] + b[2], b[1] + desvio);
          ctx.ellipse(b[0], b[1] + desvio, b[2], b[3], 0, 0, TAU);
        }
        ctx.fill();
      }

      function pintarGaviotas() {
        ctx.strokeStyle = 'rgba(70,80,90,.45)';
        ctx.lineWidth = 0.32;
        for (var i = 0; i < gaviotas.length; i++) {
          var g = gaviotas[i];
          var bat = Math.sin(tiempo * 3 + g.fase) * 0.8;
          ctx.beginPath();
          ctx.moveTo(g.x - 1.6 * g.e, g.y + bat);
          ctx.quadraticCurveTo(g.x - 0.7 * g.e, g.y - 0.8, g.x, g.y);
          ctx.quadraticCurveTo(g.x + 0.7 * g.e, g.y - 0.8, g.x + 1.6 * g.e, g.y + bat);
          ctx.stroke();
        }
      }

      /** Destellos del sol y lineas de ola sobre el mar. */
      function pintarAgua() {
        var i;
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.lineWidth = 0.28;
        for (i = 0; i < 5; i++) {
          var y = HORIZONTE + (ORILLA - HORIZONTE) * (0.14 + i * 0.17);
          var amp = 0.25 + i * 0.14;
          ctx.globalAlpha = 0.20 + i * 0.06;
          ctx.beginPath();
          for (var x = 0; x <= FW; x += 4) {
            var yy = y + Math.sin(x * 0.16 + tiempo * (0.8 + i * 0.25) + i) * amp;
            if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        for (i = 0; i < brillos.length; i++) {
          var b = brillos[i];
          var v = Math.sin(tiempo * b.v + b.fase);
          if (v <= 0.1) continue;
          ctx.globalAlpha = Math.min(0.85, v * 0.85);
          ctx.fillStyle = '#FFF3D2';
          ctx.fillRect(b.x - b.l / 2, b.y, b.l, 0.34);
        }
        ctx.globalAlpha = 1;

        /* ondas del chapuzon */
        for (i = 0; i < ondas.length; i++) {
          var o = ondas[i];
          var f = o.t / 1.1;
          ctx.globalAlpha = (1 - f) * 0.8;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.35;
          ctx.beginPath();
          ctx.ellipse(o.x, ORILLA - 1, 2 + f * 14, (2 + f * 14) * 0.28, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      /** Espuma de la orilla, subiendo y bajando como una ola de verdad. */
      function pintarEspuma() {
        var sube = Math.sin(tiempo * 0.75) * (FH - ORILLA) * 0.16;
        var base = ORILLA + (FH - ORILLA) * 0.12 + sube;

        if (!espumaDeg) {
          espumaDeg = ctx.createLinearGradient(0, ORILLA - 2, 0, ORILLA + (FH - ORILLA) * 0.4);
          espumaDeg.addColorStop(0, 'rgba(255,255,255,.85)');
          espumaDeg.addColorStop(0.55, 'rgba(255,255,255,.55)');
          espumaDeg.addColorStop(1, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = espumaDeg;
        ctx.beginPath();
        ctx.moveTo(0, ORILLA - 2.5);
        ctx.lineTo(FW, ORILLA - 2.5);
        var x;
        for (x = FW; x >= 0; x -= 3) {
          ctx.lineTo(x, base + Math.sin(x * 0.11 + tiempo * 1.1) * 0.9
                            + Math.sin(x * 0.27 - tiempo * 1.7) * 0.45);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        for (x = 0; x <= FW; x += 3) {
          var y = base + Math.sin(x * 0.11 + tiempo * 1.1) * 0.9
                       + Math.sin(x * 0.27 - tiempo * 1.7) * 0.45;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      /** Loma de arena de delante: el perro sale por detras. */
      function pintarDuna() {
        if (!dunaDeg) {
          dunaDeg = ctx.createLinearGradient(0, DUNA - 2, 0, FH);
          dunaDeg.addColorStop(0, '#EFE2C4');
          dunaDeg.addColorStop(1, '#CBB388');
        }
        ctx.fillStyle = dunaDeg;
        ctx.beginPath();
        ctx.moveTo(0, FH);
        ctx.lineTo(0, DUNA + 1.5);
        ctx.quadraticCurveTo(FW * 0.3, DUNA - 2.2, FW * 0.55, DUNA + 0.6);
        ctx.quadraticCurveTo(FW * 0.8, DUNA + 2.6, FW, DUNA - 0.8);
        ctx.lineTo(FW, FH);
        ctx.closePath();
        ctx.fill();
      }

      /* ---------------------------------------------------------------
         El pato: cabeza, pecho, cuerpo, cola y dos alas que baten,
         con la luz calida del sol por el lomo.
         --------------------------------------------------------------- */
      function dibujarPato(g, p) {
        var t = p.tipo;
        var caido = p.estado === 'tocado';
        var f = Math.sin(p.ala);

        /* sombra sobre el agua cuando vuela bajo */
        if (p.estado === 'vuela' && p.y > HORIZONTE) {
          var d = (p.y - HORIZONTE) / (ORILLA - HORIZONTE);
          g.globalAlpha = 0.18 * d;
          g.fillStyle = '#123044';
          g.beginPath();
          g.ellipse(p.x + 2, ORILLA - 1.5, 6 * zoom * d, 1.5 * zoom * d, 0, 0, TAU);
          g.fill();
          g.globalAlpha = 1;
        }

        g.save();
        g.translate(p.x, p.y);
        if (caido) g.rotate(p.giro);
        g.scale(p.dir * zoom, zoom);

        /* ala de detras */
        g.save();
        g.translate(-1, -0.5);
        g.rotate(caido ? -1.15 : 0.42 + f * 0.85);
        ala(g, t.alaOsc, t.espejo, 0.86);
        g.restore();

        /* cola */
        g.fillStyle = t.cuerpoOsc;
        g.beginPath();
        g.moveTo(-4, -0.9);
        g.lineTo(-7.8, -2.9);
        g.quadraticCurveTo(-6.6, -1.2, -7.2, 0.3);
        g.closePath();
        g.fill();

        /* cuerpo */
        var cuerpo = g.createLinearGradient(0, -3.4, 0, 3.4);
        cuerpo.addColorStop(0, t.cuerpoLuz);
        cuerpo.addColorStop(0.55, t.cuerpo);
        cuerpo.addColorStop(1, t.cuerpoOsc);
        g.fillStyle = cuerpo;
        g.beginPath();
        g.ellipse(0, 0, 5.4, 3.2, -0.1, 0, TAU);
        g.fill();

        /* pecho */
        g.fillStyle = t.pecho;
        g.beginPath();
        g.ellipse(2.9, 0.1, 2.9, 2.5, -0.2, 0, TAU);
        g.fill();

        /* panza clara */
        g.fillStyle = 'rgba(255,252,244,.35)';
        g.beginPath();
        g.ellipse(-0.2, 1.9, 3.4, 1.3, -0.05, 0, TAU);
        g.fill();

        /* cuello */
        g.fillStyle = t.cabeza;
        g.beginPath();
        g.moveTo(2.6, -1.6);
        g.quadraticCurveTo(4.4, -1.4, 5.1, -2.4);
        g.lineTo(4, -3.6);
        g.quadraticCurveTo(3.2, -2.6, 2.4, -2);
        g.closePath();
        g.fill();

        /* collar blanco (solo el ánade real) */
        if (t.collar) {
          g.strokeStyle = '#F7F1E4';
          g.lineWidth = 0.62;
          g.beginPath();
          g.moveTo(2.9, -1.5);
          g.quadraticCurveTo(4.2, -1.9, 4.9, -2.9);
          g.stroke();
        }

        /* cabeza */
        var cab = g.createRadialGradient(4.6, -4, 0.4, 4.7, -2.9, 3);
        cab.addColorStop(0, t.cabezaLuz);
        cab.addColorStop(1, t.cabeza);
        g.fillStyle = cab;
        g.beginPath();
        g.ellipse(4.8, -3, 2.5, 2.3, -0.15, 0, TAU);
        g.fill();

        /* pico */
        var pico = g.createLinearGradient(6, -3, 9.6, -2);
        pico.addColorStop(0, '#E8B84B');
        pico.addColorStop(1, '#C98F2E');
        g.fillStyle = pico;
        g.beginPath();
        g.moveTo(6.3, -3.5);
        g.quadraticCurveTo(9.6, -3.2, 9.9, -2.2);
        g.quadraticCurveTo(8.6, -1.4, 6.4, -1.9);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(90,60,20,.5)';
        g.beginPath();
        g.ellipse(7.6, -2.9, 0.32, 0.2, 0, 0, TAU);
        g.fill();

        /* ojo */
        g.fillStyle = '#20242A';
        g.beginPath();
        g.arc(5.6, -3.7, 0.52, 0, TAU);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)';
        g.beginPath();
        g.arc(5.75, -3.9, 0.18, 0, TAU);
        g.fill();

        /* luz del sol por el lomo */
        g.strokeStyle = 'rgba(255,238,200,.55)';
        g.lineWidth = 0.42;
        g.beginPath();
        g.ellipse(0, 0, 5.4, 3.2, -0.1, Math.PI * 1.08, Math.PI * 1.85);
        g.stroke();

        /* ala de delante */
        g.save();
        g.translate(-0.3, -1);
        g.rotate(caido ? -2 : -0.5 - f * 1.05);
        ala(g, t.ala, t.espejo, 1);
        g.restore();

        g.restore();
      }

      /** Un ala: pluma grande, espejuelo de color y borde claro. */
      function ala(g, color, espejo, k) {
        var deg = g.createLinearGradient(0, -6.6 * k, 0, 0.6 * k);
        deg.addColorStop(0, '#FFFFFF');
        deg.addColorStop(0.22, color);
        deg.addColorStop(1, color);
        g.fillStyle = deg;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-2.2 * k, -4.4 * k, -0.4 * k, -6.8 * k);
        g.quadraticCurveTo(2.6 * k, -4.6 * k, 2.1 * k, 0.4 * k);
        g.closePath();
        g.fill();

        g.fillStyle = espejo;
        g.beginPath();
        g.moveTo(0.2 * k, -0.4 * k);
        g.quadraticCurveTo(1.5 * k, -1.6 * k, 1.9 * k, -0.2 * k);
        g.quadraticCurveTo(1.2 * k, 0.4 * k, 0.2 * k, -0.4 * k);
        g.fill();

        g.strokeStyle = 'rgba(255,255,255,.55)';
        g.lineWidth = 0.3 * k;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-2.2 * k, -4.4 * k, -0.4 * k, -6.8 * k);
        g.stroke();
      }

      function pintarPlumas() {
        for (var i = 0; i < plumas.length; i++) {
          var p = plumas[i];
          ctx.save();
          ctx.globalAlpha = Math.min(1, p.vida / 1.4) * 0.95;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.giro);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-1.3, 0);
          ctx.quadraticCurveTo(0, -0.75, 1.3, 0);
          ctx.quadraticCurveTo(0, 0.5, -1.3, 0);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      function pintarGotas() {
        ctx.fillStyle = '#FFFFFF';
        for (var i = 0; i < gotas.length; i++) {
          var g = gotas[i];
          ctx.globalAlpha = Math.max(0, g.vida / 0.7) * 0.9;
          ctx.beginPath();
          ctx.ellipse(g.x, g.y, 0.45, 0.75, 0, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintarDisparos() {
        for (var i = 0; i < disparos.length; i++) {
          var d = disparos[i];
          var f = d.t / 0.45;
          ctx.globalAlpha = 1 - f;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 2 + f * 8, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = '#B9924F';
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(d.x - 3.2, d.y); ctx.lineTo(d.x - 1, d.y);
          ctx.moveTo(d.x + 1, d.y);   ctx.lineTo(d.x + 3.2, d.y);
          ctx.moveTo(d.x, d.y - 3.2); ctx.lineTo(d.x, d.y - 1);
          ctx.moveTo(d.x, d.y + 1);   ctx.lineTo(d.x, d.y + 3.2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      /** El perro asoma por detras de la duna: buscando, riendose o con los patos. */
      function dibujarPerro() {
        if (perro.alto < 0.01) return;
        var salto = perro.estado === 'rie' ? Math.abs(Math.sin(perro.t * 7)) * 2 : 0;
        var y = DUNA + (9 - perro.alto * 14 - salto) * zoom;
        var x = 50;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(zoom, zoom);

        if (perro.estado === 'trofeo') {                 // levanta los patos cazados
          for (var i = 0; i < perro.patos; i++) {
            ctx.save();
            ctx.translate(-6 + i * 12, -8.5);
            ctx.scale(0.6, 0.6);
            dibujarPato(ctx, { tipo: TIPOS[0], x: 0, y: -9999, dir: i ? -1 : 1,
                               ala: 1.6, giro: 0, estado: 'quieto' });
            ctx.restore();
          }
        }

        var pelo = ctx.createLinearGradient(0, -8, 0, 7);
        pelo.addColorStop(0, '#D89B5C');
        pelo.addColorStop(1, '#A96E3A');

        ctx.fillStyle = pelo;
        ctx.beginPath();
        ctx.ellipse(0, 3, 6.4, 4.6, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#FBF3E6';
        ctx.beginPath();
        ctx.ellipse(-3.4, 0.6, 1.5, 2.4, 0.3, 0, TAU);
        ctx.ellipse(3.4, 0.6, 1.5, 2.4, -0.3, 0, TAU);
        ctx.fill();

        ctx.fillStyle = pelo;
        ctx.beginPath();
        ctx.arc(0, -3.4, 4.2, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#8B5E33';
        ctx.beginPath();
        ctx.ellipse(-4.4, -2.6, 1.7, 3.6, 0.25, 0, TAU);
        ctx.ellipse(4.4, -2.6, 1.7, 3.6, -0.25, 0, TAU);
        ctx.fill();

        ctx.fillStyle = '#FBF3E6';
        ctx.beginPath();
        ctx.ellipse(0, -1.9, 2.9, 2.1, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3B322A';
        ctx.beginPath();
        ctx.ellipse(0, -3.1, 0.85, 0.65, 0, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = '#3B322A';
        ctx.lineWidth = 0.45;
        if (perro.estado === 'rie') {
          ctx.beginPath();
          ctx.arc(-1.8, -5, 1, 0.15, Math.PI - 0.15);
          ctx.arc(1.8, -5, 1, 0.15, Math.PI - 0.15);
          ctx.stroke();
          ctx.fillStyle = '#8F4234';
          ctx.beginPath();
          ctx.ellipse(0, -0.9, 1.5, 1.1, 0, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillStyle = '#3B322A';
          ctx.beginPath();
          ctx.arc(-1.7, -5, 0.6, 0, TAU);
          ctx.arc(1.7, -5, 0.6, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, -1.2, 1.1, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }

        ctx.restore();
      }

      /** Fila de patos de la ronda: llenos los cazados, huecos los perdidos. */
      function dibujarMarcas() {
        var an = 4.4, sep = 1.4;
        var total = PATOS_RONDA * an + (PATOS_RONDA - 1) * sep;
        var x0 = (FW - total) / 2;
        var y = FH - 3;
        for (var i = 0; i < PATOS_RONDA; i++) {
          var cx = x0 + i * (an + sep) + an / 2;
          var hecho = i < marcas.length;
          ctx.beginPath();
          ctx.moveTo(cx - 2.1, y + 0.6);
          ctx.quadraticCurveTo(cx - 0.6, y - 1.9, cx + 0.4, y + 0.1);
          ctx.quadraticCurveTo(cx + 1.4, y - 1.9, cx + 2.4, y + 0.5);
          ctx.quadraticCurveTo(cx, y + 2.1, cx - 2.1, y + 0.6);
          if (hecho && marcas[i]) {
            ctx.fillStyle = '#FFFDF8';
            ctx.fill();
            ctx.strokeStyle = 'rgba(120,90,50,.5)';
            ctx.lineWidth = 0.3;
            ctx.stroke();
          } else if (hecho) {
            ctx.fillStyle = 'rgba(90,70,45,.32)';
            ctx.fill();
          } else {
            ctx.strokeStyle = 'rgba(120,95,55,.55)';
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      /* ------------------------- Controles ------------------------- */
      /* Deja a la vista lo que va aprendiendo, para poder mirarlo desde la
         consola con  PATOS_LAG  si alguna vez hace falta dar soporte. */
      function apunte(campo, valor) {
        var L = window.PATOS_LAG ||
                (window.PATOS_LAG = { n: 0, suma: 0, medido: 0, media: 0,
                                      calibrado: Math.round(LAG_PANTALLA * 1000) });
        if (campo === 'medido') { L.medido = Math.round(valor); L.n++; L.suma += valor;
                                  L.media = Math.round(L.suma / L.n); }
        else L[campo] = valor;
      }

      lienzo.addEventListener('pointerdown', function (e) {
        var r = lienzo.getBoundingClientRect();
        if (!r.width) return;

        /* e.timeStamp y el reloj de los fotogramas (ultimo) van en la misma
           escala, asi que restarlos da el retraso real de esta pantalla. */
        var tToque = null;
        if (ultimo && e.timeStamp > 0) {
          var atraso = (ultimo - e.timeStamp) / 1000 + LAG_PANTALLA;
          /* Si sale disparatado, el navegador usa otro reloj: no fiarse. */
          if (atraso > -1 && atraso < 1) {
            if (atraso < 0) atraso = 0;                    // toque mas nuevo que el ultimo cuadro
            if (atraso > INDULGENCIA) atraso = INDULGENCIA; // no rebobinar mas de lo que hay
            tToque = tiempo - atraso;
          }
          apunte('medido', ultimo - e.timeStamp);
        }

        tocar((e.clientX - r.left) / r.width * FW,
              (e.clientY - r.top) / r.height * FH,
              tToque);
      });

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
        paso(dt);
        dibujar();
      }

      /* Minuto y medio de partida. */
      cuenta = api.cuenta(LIMITE, function () { acabar(true); });

      medir();
      api.luego(medir, 450);
      pintarHud();
      empezarRonda();
      cuadro = requestAnimationFrame(bucle);

      /* Limpieza al salir del juego */
      return function () {
        cancelAnimationFrame(cuadro);
        if (vigilante) vigilante.disconnect();
        window.removeEventListener('resize', medir);
        terminado = true;
      };
    }
  });

})();
