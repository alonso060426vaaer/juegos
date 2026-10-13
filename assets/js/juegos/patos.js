/* ==========================================================================
   JUEGO 8 - PATOS AL VUELO (edicion playa: ¡atrapa a la doctora!)
   Toca a la doctora antes de que se escape: sale una pelota de billetes
   hacia donde tocaste y, si le da, llueven billetes con sonido de caja.
   Tres billetes por doctora, tres vidas y tres niveles cortos.

   Toda la escena sale de imagenes de assets/img/patos: la playa, la pelota,
   el billete, el perro, las palmeras, la sombrilla, el cielo y el marcador.
   Lo que no cambia (playa, sombrilla, palmeras) se pinta una sola vez en
   lienzos aparte y cada cuadro solo se copia: asi el totem no va lento.
   ========================================================================== */

(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FUENTE = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  /* Escena en unidades propias: 100 de ancho, el alto se adapta a la pantalla. */
  var FW = 100;
  var FH = 178;
  var FH_MIN = 60, FH_MAX = 220;

  var HORIZONTE = 113;       // donde acaba el cielo y empieza el mar
  var ORILLA    = 127;       // donde rompe el agua en la arena
  var DUNA      = 141;       // arena de delante: por ahi asoma el perro

  var POR_NIVEL  = 3;        // doctoras por nivel (la partida dura 35 s)
  var NIVELES    = 3;        // niveles en total (los puntos del marcador)
  var TIROS      = 3;        // billetes por doctora
  var VIDAS      = 3;        // doctoras que se pueden escapar
  var RADIO_TIRO = 8;        // margen de acierto al tocar, a lo ancho
  var ALARGA     = 1.7;      // el cuerpo es alto y estrecho: el margen se estira a lo alto
  var ALTO_DRA   = 23;       // alto de la doctora, en unidades del mundo
  var OBJETIVO   = 2;        // llegar a este nivel da premio

  /* ---------------------------------------------------------------
     COMPENSACION DEL RETRASO TACTIL

     Entre que el dedo toca el cristal y que este codigo se entera pasa un
     rato, y en ese rato la doctora ya se ha movido. Perdonar a ciegas (dar
     por bueno cualquier sitio donde estuviera en el ultimo medio segundo)
     arregla el retraso, pero tambien regala aciertos: hay que bajar la
     velocidad para que no cante, y entonces el juego aburre.

     Aqui se hace al reves: se calcula CUANDO toco el dedo de verdad y se
     mira donde estaba la doctora EN ESE INSTANTE. Es lo que hacen los
     juegos de disparos en red para compensar el lag. Perdona el retraso,
     no la punteria, asi que puede volar rapido sin ser injusto.

     El navegador marca cada toque con la hora en que ocurrio (e.timeStamp)
     y va en la misma escala que el reloj de los fotogramas, asi que esa
     parte se mide sola, sin suponer nada. Lo unico a calibrar a mano es
     LAG_PANTALLA: lo que tarda el panel en pintar y el cristal en
     reaccionar, que no queda registrado en ninguna parte.

     PARA CALIBRARLO EN EL TOTEM: abre la consola del navegador y escribe
         PATOS_LAG_DEBUG = true
     juega media docena de doctoras y mira
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

  /* ---------------------------------------------------------------
     Imagenes. Se cargan una vez por sesion y se comparten entre partidas.
     --------------------------------------------------------------- */
  var RUTA = 'assets/img/patos/';
  var ARCHIVOS = {
    playa: 'playa.jpg',
    doctora: 'doctora-cuerpo.png',
    perro: 'perro.png',
    pelota: 'pelota.png',
    billete: 'billete.png',
    palmera: 'palmera.png',
    sombrilla: 'sombrilla.png',
    copa: 'copa.png',
    vida: 'vida.png',
    sol: 'sol.png',
    nube1: 'nube-1.png',
    nube2: 'nube-2.png',
    gaviota1: 'gaviota-1.png',
    gaviota2: 'gaviota-2.png',
    loro: 'loro.png',
    nivelLleno: 'nivel-lleno.png',
    nivelVacio: 'nivel-vacio.png',
    barraMarco: 'barra-marco.png',
    barraRelleno: 'barra-relleno.png'
  };
  var IMG = {};

  /** Pide todas las imagenes y avisa cuando estan (o cuando fallan). */
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
    return lista(n) ? ancho * im.naturalHeight / im.naturalWidth : ancho;
  }

  /** Lo contrario: que ancho le toca a una imagen si se pinta con este alto. */
  function ancho(n, alto) {
    var im = IMG[n];
    return lista(n) ? alto * im.naturalWidth / im.naturalHeight : alto * 0.26;
  }

  App.registrar({
    id: 'patos',
    nombre: 'Patos al Vuelo',
    emoji: '🦆',
    desc: 'Atrapa a la doctora antes de que escape',
    sub: 'Puntería',

    iniciar: function (vista, api) {

      /* ------------------------- Estado ------------------------- */
      var puntos = 0, nivel = 1, indice = 0, tiros = TIROS, vidas = VIDAS;   // indice: atrapadas en este nivel
      var fase = 'intro';        // intro | volando | atrapada | escapa | nivel | fin
      var objetivo = null;
      var disparos = [], chispas = [], letreros = [];
      var pelotas = [], billetes = [];
      var monton = [], montonEsc = 1, sacude = 0;   // el dinero amontonado abajo, de donde sale la pelota
      var montonHecho = null;                      // ya pintado, listo para estampar
      var perro = { estado: 'oculto', alto: 0, t: 0 };
      var mensaje = { texto: '', t: 0 };
      var tiempo = 0;
      var terminado = false;
      var cuenta = null;
      var quedaVisto = -1, quedaFrac = 0, barra = 1;   // barra de tiempo, suave

      var mejor = 0;
      try { mejor = parseInt(localStorage.getItem('jb_patos') || '0', 10) || 0; } catch (e) {}

      /* ------------------------- Pantalla ------------------------- */
      vista.classList.add('patos-vista');
      var lienzo = h('canvas', { class: 'patos' });
      var zona = h('div', { class: 'patos-zona' }, lienzo);
      vista.appendChild(zona);

      /* ---------------------------------------------------------------
         MODO DIAGNOSTICO

         Se enciende anadiendo  ?diag=1  al final de la direccion. Saca un
         recuadro con lo que pasa de verdad en ESTA pantalla, para poder ver
         por que no registra los toques en vez de adivinarlo. Si no se pide,
         no existe y no cuesta nada.
         --------------------------------------------------------------- */
      var DIAG = /[?&]diag=1/.test(location.search);
      var panelDiag = null, toques = 0;
      var SALTO = String.fromCharCode(10);
      if (DIAG) {
        panelDiag = h('pre', {
          estilo: 'position:fixed; left:.5em; top:.5em; z-index:99; margin:0;' +
                  ' padding:.5em .7em; border-radius:.4em; pointer-events:none;' +
                  ' background:rgba(0,0,0,.82); color:#8F8;' +
                  ' font:12px/1.45 ui-monospace,Consolas,monospace; white-space:pre;'
        }, 'toca la pantalla...');
        vista.appendChild(panelDiag);
      }

      function diagnosticar(x, y, tToque, acerto) {
        if (!panelDiag) return;
        toques++;
        var d = objetivo ? Math.round(Math.sqrt((x - objetivo.x) * (x - objetivo.x) +
                                                (y - objetivo.y) * (y - objetivo.y))) : -1;
        panelDiag.textContent = [
          'toques recibidos : ' + toques,
          'dibujos/segundo  : ' + Math.round(1000 / Math.max(1, fotograma)),
          'retraso del toque: ' + (tToque === null ? 'SIN HORA'
                                   : Math.round(ultimo - tToque) + ' ms'),
          'retraso aprendido: ' + Math.round(LAG_PANTALLA * 1000) + ' ms',
          'fase del juego   : ' + fase,
          'tiros que quedan : ' + tiros + ' de ' + TIROS,
          'toque en         : ' + Math.round(x) + ',' + Math.round(y),
          'doctora en       : ' + (objetivo ? Math.round(objetivo.x) + ',' + Math.round(objetivo.y) : '-'),
          'distancia        : ' + d + '   (perdona hasta ' + RADIO_TIRO + ')',
          'resultado        : ' + (acerto ? 'ACIERTO' : 'fallo')
        ].join(SALTO);
      }

      function pintarSub() {
        api.sub('Nivel ' + nivel + (mejor ? '  ·  Récord ' + mejor : ''));
      }
      pintarSub();

      var ctx = lienzo.getContext ? lienzo.getContext('2d') : null;
      var fondo = document.createElement('canvas');            // playa y sombrilla
      var fctx = fondo.getContext ? fondo.getContext('2d') : null;
      var frente = document.createElement('canvas');           // palmeras y matorral
      var rctx = frente.getContext ? frente.getContext('2d') : null;
      var escala = 1;
      var caja = { x: 0, y: 0, w: FW, h: FH };                 // donde cae la foto
      var nubes = [], gaviotas = [], loro = null;

      /* ---------------------------------------------------------------
         Medida: el lienzo ocupa toda la vista y la foto de la playa la
         cubre entera (como background-size: cover). Lo que sobra de foto
         se recorta por igual arriba y abajo, o a los lados.
         --------------------------------------------------------------- */
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

        var fw = 941, fh = 1672;
        if (lista('playa')) { fw = IMG.playa.naturalWidth; fh = IMG.playa.naturalHeight; }
        var s = Math.max(FW / fw, FH / fh);
        caja = { w: fw * s, h: fh * s };
        caja.x = (FW - caja.w) / 2;
        caja.y = (FH - caja.h) / 2;
        /* Las lineas de la escena salen de la propia foto. */
        HORIZONTE = caja.y + caja.h * 0.637;
        ORILLA    = caja.y + caja.h * 0.712;
        DUNA      = caja.y + caja.h * 0.790;

        decorado();
        amontonar();
        cocerMonton();
        pintarFondo();
        pintarFrente();
      }

      /* ---------------------------------------------------------------
         EL MONTON DE DINERO

         Abajo en el centro hay un monton de billetes con un par de pelotas
         encima: es de donde salen los lanzamientos. Se arma una sola vez al
         medir (posiciones y giros fijos) para que no baile en cada cuadro, y
         a proposito queda desordenado, como dinero apilado de cualquier
         manera.
         --------------------------------------------------------------- */
      function amontonar() {
        monton = [];
        /* en una pantalla baja el monton se encoge: si no, se comeria media
           escena y taparia los objetivos que vuelan bajo */
        montonEsc = Math.max(0.45, Math.min(1, FH / 170));
        var cx = FW / 2, base = FH + 1;
        var i;

        /* los billetes de abajo, en abanico y desparejos */
        var sueltos = [
          [-17,  1.4, 12.5, -0.52], [ -9.5, 3.2, 14,   0.22], [  1,   4.0, 13,  -0.14],
          [ 10,  3.0, 13.5,  0.46], [ 17.5, 1.2, 11.5,  0.68], [ -13, -1.0, 12,  0.34],
          [ -3,  0.2, 14.5, -0.30], [  7,  -0.6, 13,   0.12], [ 14,  -1.6, 11,  -0.44],
          [ -7, -3.2, 12.5,  0.58], [  4,  -3.8, 13,  -0.62]
        ];
        for (i = 0; i < sueltos.length; i++) {
          monton.push({ tipo: 'billete', x: cx + sueltos[i][0], y: base - sueltos[i][1],
                        w: sueltos[i][2], giro: sueltos[i][3] });
        }

        /* y las pelotas encima, medio hundidas en el monton */
        var bolas = [[-11.5, 5.6, 15, -0.3], [11, 5.0, 14, 0.36], [-0.5, 8.6, 20, 0.1]];
        for (i = 0; i < bolas.length; i++) {
          monton.push({ tipo: 'pelota', x: cx + bolas[i][0], y: base - bolas[i][1],
                        w: bolas[i][2], giro: bolas[i][3] });
        }
      }

      /* El monton no se mueve nunca: se pinta UNA vez en su propio lienzo y
         despues solo se estampa. Antes eran catorce dibujos con sombra
         desenfocada en cada cuadro, y la sombra de lienzo es de lo mas caro
         que hay: en el totem se notaba. */
      var MONTON_AL = 34;                  // lo que ocupa a lo alto, en mundo

      function cocerMonton() {
        montonHecho = null;
        if (!monton.length || !escala) return;
        var c = document.createElement('canvas');
        c.width  = Math.max(1, Math.round(FW * escala));
        c.height = Math.max(1, Math.round(MONTON_AL * escala));
        var g = c.getContext('2d');
        g.setTransform(escala, 0, 0, escala, 0, 0);
        g.translate(0, MONTON_AL - FH);    // el monton se apoya en FH
        for (var i = 0; i < monton.length; i++) {
          var m = monton[i];
          var al = alto(m.tipo, m.w);
          g.save();
          g.translate(m.x, m.y);
          g.rotate(m.giro);
          g.shadowColor = 'rgba(0,0,0,.22)';
          g.shadowBlur = escala * 0.5;
          g.shadowOffsetY = escala * 0.2;
          imagen(g, m.tipo, -m.w / 2, -al / 2, m.w, al);
          g.restore();
        }
        montonHecho = c;
      }

      function pintarMonton() {
        if (!montonHecho) return;
        /* al lanzar, el monton se hunde un poco: se nota de donde salio */
        var k = montonEsc * (1 - sacude * 0.06);
        ctx.save();
        ctx.translate(FW / 2, FH);
        ctx.scale(k, k);
        ctx.drawImage(montonHecho, -FW / 2, -MONTON_AL, FW, MONTON_AL);
        ctx.restore();
      }

      /** Nubes, gaviotas y loro: cruzan el cielo despacio, por detras de todo. */
      function decorado() {
        nubes = [];
        for (var i = 0; i < 2; i++) {
          nubes.push({
            img: i ? 'nube2' : 'nube1',
            x: Math.random() * FW,
            y: 6 + Math.random() * (HORIZONTE * 0.35),
            w: 24 + Math.random() * 8,
            v: 0.5 + Math.random() * 0.5
          });
        }
        gaviotas = [];
        for (var k = 0; k < 2; k++) {
          gaviotas.push({
            img: k ? 'gaviota2' : 'gaviota1',
            x: Math.random() * FW,
            y: HORIZONTE * (0.2 + Math.random() * 0.3),
            w: 8 + Math.random() * 3,
            v: 2.5 + Math.random() * 2,
            fase: Math.random() * TAU
          });
        }
        loro = { x: -30 - Math.random() * 60, y: HORIZONTE * 0.25, w: 11, v: 7.5 };
      }

      /** Pinta una imagen por su nombre; si falta el alto se saca de la proporcion. */
      function imagen(g, n, x, y, w, hh, volteoX, volteoY) {
        if (!lista(n)) return;
        var im = IMG[n];
        if (hh === undefined || hh === null) hh = w * im.naturalHeight / im.naturalWidth;
        if (!volteoX && !volteoY) { g.drawImage(im, x, y, w, hh); return; }
        g.save();
        g.translate(x + (volteoX ? w : 0), y + (volteoY ? hh : 0));
        g.scale(volteoX ? -1 : 1, volteoY ? -1 : 1);
        g.drawImage(im, 0, 0, w, hh);
        g.restore();
      }

      /* ------------------------- Fondo fijo ------------------------- */
      function pintarFondo() {
        if (!fctx) return;
        fondo.width = lienzo.width;
        fondo.height = lienzo.height;
        var g = fctx;
        g.setTransform(escala, 0, 0, escala, 0, 0);
        g.clearRect(0, 0, FW, FH);
        if (lista('playa')) {
          g.drawImage(IMG.playa, caja.x, caja.y, caja.w, caja.h);
        } else {                                       // mientras llega la foto
          g.fillStyle = '#3FA9E4'; g.fillRect(0, 0, FW, HORIZONTE);
          g.fillStyle = '#2FB5D8'; g.fillRect(0, HORIZONTE, FW, ORILLA - HORIZONTE);
          g.fillStyle = '#F1D28C'; g.fillRect(0, ORILLA, FW, FH - ORILLA);
        }
        /* sombrilla clavada en la arena, a la derecha */
        imagen(g, 'sombrilla', FW * 0.80, ORILLA - 3, 21);
      }

      /* ------------------------- Primer plano ------------------------- */
      function pintarFrente() {
        if (!rctx) return;
        frente.width = lienzo.width;
        frente.height = lienzo.height;
        var g = rctx;
        g.setTransform(escala, 0, 0, escala, 0, 0);
        g.clearRect(0, 0, FW, FH);

        /* Hojas de palmera colgando por las dos esquinas de arriba... */
        var w = 36;
        imagen(g, 'palmera', -3, -3, w);
        imagen(g, 'palmera', FW + 3 - w, -3, w, undefined, true);

        /* ...y las mismas hojas del reves hacen de matorral abajo. Una sola
           queda rala (la hoja se abre hacia el centro y deja huecos), asi que
           van tres capas por lado, a distinto tamano, que se tapan los huecos
           entre si. Medido: una capa cubre el 27% de la esquina, tres el 43%. */
        var capas = [[-2, 2, 40], [10, 9, 30], [-6, 14, 36]];   // [x, cuanto asoma por abajo, ancho]
        for (var i = 0; i < capas.length; i++) {
          var cx = capas[i][0], cy = capas[i][1], cw = capas[i][2], ch = alto('palmera', cw);
          imagen(g, 'palmera', cx, FH + cy - ch, cw, undefined, false, true);
          imagen(g, 'palmera', FW - cx - cw, FH + cy - ch, cw, undefined, true, true);
        }
      }

      /* ------------------------- Texto ------------------------- */
      function texto(t, x, y, tam, alinea, peso, color) {
        ctx.font = (peso || 700) + ' ' + tam + 'px ' + FUENTE;
        ctx.textAlign = alinea || 'left';
        ctx.textBaseline = 'middle';
        /* la sombra va en pixeles de pantalla, no de escena */
        ctx.shadowColor = 'rgba(0,0,0,.45)';
        ctx.shadowBlur = 0;                       // sin desenfoque: se pinta cada cuadro
        ctx.shadowOffsetY = escala * 0.15;
        ctx.fillStyle = color || '#FFFFFF';
        ctx.fillText(t, x, y);
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      function redondo(g, x, y, w, hh, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + hh, r);
        g.arcTo(x + w, y + hh, x, y + hh, r);
        g.arcTo(x, y + hh, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      }

      function avisar(t, seg) { mensaje.texto = t; mensaje.t = seg || 1.6; }

      function cuatroCifras(n) {
        return n < 10000 ? ('0000' + n).slice(-4) : String(n);
      }

      /* ------------------------- Marcador ------------------------- */
      function pintarHud() {
        var m = 3.5, y0 = 3.5, i;

        /* puntaje, con la copa */
        imagen(ctx, 'copa', m, y0 + 0.4, 8);
        texto('PUNTAJE', m + 9.6, y0 + 2.6, 2.4, 'left', 700, 'rgba(255,255,255,.92)');
        texto(cuatroCifras(puntos), m + 9.6, y0 + 7.3, 5.6, 'left', 800);

        /* nivel: un punto por nivel, llenos los ya alcanzados */
        texto('NIVEL ' + nivel, FW / 2, y0 + 2.6, 2.8, 'center', 700);
        var d = 3.8, sep = 1.3;
        var tot = NIVELES * d + (NIVELES - 1) * sep;
        var x = (FW - tot) / 2;
        for (i = 0; i < NIVELES; i++) {
          imagen(ctx, i < nivel ? 'nivelLleno' : 'nivelVacio', x + i * (d + sep), y0 + 5.4, d);
        }

        /* vidas: conchas, apagadas las perdidas */
        texto('VIDAS', FW - m, y0 + 2.6, 2.4, 'right', 700, 'rgba(255,255,255,.92)');
        var cw = 5.6, cs = 1.2;
        for (i = 0; i < VIDAS; i++) {
          var cx = FW - m - cw - (VIDAS - 1 - i) * (cw + cs);
          if (i >= vidas) ctx.globalAlpha = 0.3;
          imagen(ctx, 'vida', cx, y0 + 5.4, cw);
          ctx.globalAlpha = 1;
        }

        /* billetes: uno por tiro, en abanico, apagados los ya lanzados */
        var kw = 7.2, kh = alto('billete', kw), ky = FH - m - kh;
        for (i = 0; i < TIROS; i++) {
          if (i >= tiros) ctx.globalAlpha = 0.28;
          imagen(ctx, 'billete', m + i * (kw - 1.6), ky, kw);
          ctx.globalAlpha = 1;
        }
        texto('BILLETES', m + TIROS * (kw - 1.6) + 2.4, ky + kh / 2, 2.4, 'left', 700);

        /* tiempo: la barra va con el cronometro de arriba */
        var bw = 27, bh = alto('barraMarco', bw);
        var bx = FW - m - bw, by = FH - m - bh;
        var poco = !!cuenta && cuenta.queda() <= 15;
        texto('TIEMPO', FW - m, by - 2.6, 2.4, 'right', 700, poco ? '#FFC7BA' : '#FFFFFF');
        imagen(ctx, 'barraMarco', bx, by, bw);
        pintarRelleno(bx + bw * 0.035, by + bh * 0.238, bw * 0.928, bh * 0.548, barra, poco);
      }

      /** El relleno amarillo, cortado a la fraccion que queda y con las puntas redondas. */
      function pintarRelleno(x, y, wTot, hTot, f, parpadea) {
        if (!lista('barraRelleno') || f <= 0) return;
        var im = IMG.barraRelleno, iw = im.naturalWidth, ih = im.naturalHeight;
        var w = wTot * Math.max(0, Math.min(1, f));
        if (parpadea) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(tiempo * 6));
        var tapa = ih / 2;                 // pixeles de imagen que forman cada punta
        var tapaU = hTot / 2;              // y lo que miden en la escena
        if (w <= tapaU * 2) {
          ctx.drawImage(im, 0, 0, iw, ih, x, y, w, hTot);
        } else {
          ctx.drawImage(im, 0, 0, tapa, ih, x, y, tapaU, hTot);
          ctx.drawImage(im, tapa, 0, iw - 2 * tapa, ih, x + tapaU, y, w - 2 * tapaU, hTot);
          ctx.drawImage(im, iw - tapa, 0, tapa, ih, x + w - tapaU, y, tapaU, hTot);
        }
        ctx.globalAlpha = 1;
      }

      function pintarMensaje() {
        if (mensaje.t <= 0 || !mensaje.texto) return;
        ctx.globalAlpha = Math.min(1, mensaje.t / 0.35);
        ctx.font = '700 3.2px ' + FUENTE;
        var w = ctx.measureText(mensaje.texto).width + 8, hh = 6.4;
        var x = (FW - w) / 2, y = 24;
        ctx.fillStyle = 'rgba(20,40,70,.55)';
        redondo(ctx, x, y, w, hh, 3.2);
        ctx.fill();
        texto(mensaje.texto, FW / 2, y + hh / 2, 3.2, 'center', 700);
        ctx.globalAlpha = 1;
      }

      /* ------------------------- Nivel y doctoras ------------------------- */
      function empezarNivel() {
        fase = 'intro';
        indice = 0; tiros = TIROS;
        objetivo = null;
        pintarSub();
        avisar('Nivel ' + nivel + ': ¡atrapa a la doctora!', 1.7);
        perro.estado = 'busca'; perro.t = 0;
        api.luego(function () {
          perro.estado = 'oculto';
          soltar();
        }, 1700);
      }

      /* El nivel solo se pasa ATRAPANDO a sus doctoras: la que se escapa
         cuesta una vida y vuelve a salir otra en su lugar, no cuenta. */
      function soltar() {
        if (terminado) return;
        if (indice >= POR_NIVEL) { finNivel(); return; }
        tiros = TIROS;
        objetivo = nuevoObjetivo();
        fase = 'volando';
        aparece();
        avisar('Doctora ' + (indice + 1) + ' de ' + POR_NIVEL, 1.1);
      }

      function nuevoObjetivo() {
        /* Cada una tiene su propio genio: unas van mas rapidas que otras. */
        var vel = Math.min(70, 40 + nivel * 5) * (0.9 + Math.random() * 0.35);
        /* Sale siempre hacia arriba (esta al ras del agua) pero con mucho abanico. */
        var ang = -Math.PI / 2 + (Math.random() * 1.7 - 0.85);
        return {
          x: entero(22, 78),
          y: ORILLA - 10,
          vx: Math.cos(ang) * vel,
          vy: Math.sin(ang) * vel,
          base: vel,
          fase: Math.random() * TAU,
          t: 0,
          estado: 'vuela',
          rastro: [],                              // por donde ha pasado hace poco
          vida: Math.max(2.6, 5.2 - nivel * 0.45),  // segundos antes de largarse
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

        /* Sin billetes, o entre una doctora y la siguiente: al menos se oye
           un clic, para que no parezca que la pantalla no responde. */
        if (fase !== 'volando' || !objetivo || tiros <= 0) {
          App.tono(110, 0.05, 0.07, 'square');
          diagnosticar(x, y, tToque, false);
          return;
        }

        tiros--;

        var margen = RADIO_TIRO;

        /* 1. Donde esta ahora mismo. */
        var dio = cerca(x, y, objetivo.x, objetivo.y, margen);

        if (!dio) {
          if (tToque !== null && tToque !== undefined) {
            /* 2. Por donde paso alrededor del instante del toque. Se mira el
               TRAZO entre un dibujo y el siguiente, no los puntos sueltos:
               en una pantalla lenta la doctora salta y entre dos puntos
               queda un hueco por el que se cuelan los aciertos buenos. La
               ventana crece con el tiempo de fotograma, que es la
               incertidumbre minima. */
            dio = enElTrazo(x, y, margen, tToque, VENTANA_TOQUE * 1000 + fotograma);
            if (!dio) calibrar(x, y, tToque, margen);
          } else {
            /* 3. Red de seguridad si no hay hora fiable del toque. */
            dio = enElTrazo(x, y, margen, ultimo, INDULGENCIA * 1000);
          }
        }

        diagnosticar(x, y, tToque, dio);
        lanzar(x, y, dio);
      }

      /* ---------------------------------------------------------------
         La pelota de billetes sale desde abajo hacia donde se toco. El
         acierto ya esta decidido (arriba, con la hora real del toque): la
         pelota solo lo cuenta. Si dio, la doctora queda fijada y la pelota
         la persigue, para que el golpe caiga encima aunque siga planeando.
         --------------------------------------------------------------- */
      function lanzar(x, y, dio) {
        var ox = FW / 2 + (x - FW / 2) * 0.15;
        pelotas.push({
          x0: ox, y0: FH - 7 * montonEsc, x: ox, y: FH - 7 * montonEsc,
          dx: x, dy: y, t: 0, dur: 0.3, f: 0,
          giro: Math.random() * TAU, sentido: x < FW / 2 ? -1 : 1,
          sigue: dio ? objetivo : null, acierto: dio, ultimo: tiros === 0
        });
        if (dio) { objetivo.estado = 'fijada'; fase = 'atrapada'; }
        sacude = 1;
        if (App.ruido) App.ruido(0.22, 0.22, 300, 3600);      // silbido al salir
        App.tono(240, 0.08, 0.10, 'triangle');
      }

      /** La pelota llega: o da en la doctora o cae donde se toco. */
      function llegar(b) {
        if (terminado) return;
        disparos.push({ x: b.dx, y: b.dy, t: 0 });
        if (b.acierto && objetivo && objetivo.estado === 'fijada') { acertar(); return; }
        App.tono(150, 0.06, 0.10, 'square');
        if (b.ultimo && objetivo && objetivo.estado === 'vuela') escapar('Sin billetes: se escapó');
      }

      /** Caja registradora: el clic del cajon y el timbre, con monedas. */
      function dinero() {
        if (App.ruido) App.ruido(0.06, 0.3, 5000, 1500);
        App.tono(2093, 0.28, 0.16, 'sine');
        api.luego(function () { App.tono(2637, 0.45, 0.14, 'sine'); }, 70);
        api.luego(function () { App.tono(3136, 0.12, 0.08, 'triangle'); }, 180);
        api.luego(function () { App.tono(3520, 0.10, 0.07, 'triangle'); }, 260);
        api.luego(function () { App.tono(2794, 0.14, 0.06, 'triangle'); }, 340);
      }

      /* Recorre el rastro al reves y mira si el toque cae sobre el CAMINO que
         siguio la doctora dentro de la franja de tiempo pedida. Con
         devolverHora devuelve el instante del tramo acertado (lo usa el
         autocalibrado). */
      function enElTrazo(x, y, margen, centro, ventana, devolverHora) {
        var puntosRastro = objetivo.rastro;
        var b = { x: objetivo.x, y: objetivo.y, tr: ultimo };      // posicion de ahora
        for (var i = puntosRastro.length - 1; i >= 0; i--) {
          var a = puntosRastro[i];
          if (a.tr > centro + ventana) { b = a; continue; }
          if (b.tr < centro - ventana) break;
          if (cercaTramo(x, y, a, b, margen)) {
            return devolverHora ? (a.tr + b.tr) / 2 : true;
          }
          b = a;
        }
        return devolverHora ? null : false;
      }

      /* Distancia del toque al segmento a-b, para que el margen cubra todo el
         recorrido y no solo los puntos donde toco dibujar. */
      function cercaTramo(x, y, a, b, margen) {
        var dx = b.x - a.x, dy = b.y - a.y;
        var largo = dx * dx + dy * dy;
        var u = largo ? ((x - a.x) * dx + (y - a.y) * dy) / largo : 0;
        if (u < 0) u = 0; else if (u > 1) u = 1;
        return cerca(x, y, a.x + dx * u, a.y + dy * u, margen);
      }

      /* ---------------------------------------------------------------
         AUTOCALIBRADO DEL RETRASO

         Cuanto va por detras el panel no se puede medir por software: depende
         del cristal y del monitor. Pero se puede DEDUCIR de como falla la
         gente, sin que nadie tenga que medir nada a mano.

         Cuando un tiro falla pero cae justo encima de la doctora en OTRO
         instante del rastro, es que el cliente apunto bien y lo que esta mal
         es nuestra idea del retraso. La diferencia entre los dos instantes es
         el error, y se corrige un poco cada vez.

         Seguros para que esto no ablande el juego:
           - Solo aprende de tiros que caen ENCIMA. Tocar al tuntun no ensena.
           - Nunca convierte el fallo en acierto: solo afina el reloj.
           - Corrige despacio (LAG_PASO) y con tope (LAG_MAXIMO).
           - Solo aprende si los fallos SE PARECEN entre si. El retraso de una
             pantalla es siempre el mismo; tocar al tuntun da fallos dispersos.
         --------------------------------------------------------------- */
      var fallos = [];              // errores de los ultimos tiros, para decidir

      function calibrar(x, y, tToque, margen) {
        var hora = enElTrazo(x, y, margen, ultimo, INDULGENCIA * 1000, true);
        if (hora === null) return;                 // no apunto a la doctora

        var error = tToque - hora;                 // ms; + : ibamos tarde
        if (error < -LAG_MAXIMO * 1000 || error > LAG_MAXIMO * 1000) return;

        fallos.push(error);
        if (fallos.length > LAG_MUESTRAS) fallos.shift();
        if (fallos.length < LAG_MINIMO) return;    // pocos datos para decidir

        var orden = fallos.slice().sort(function (a, b) { return a - b; });
        if (orden[orden.length - 1] - orden[0] > LAG_DISPERSION * 1000) return;

        LAG_PANTALLA += (orden[Math.floor(orden.length / 2)] / 1000) * LAG_PASO;
        if (LAG_PANTALLA < 0) LAG_PANTALLA = 0;
        if (LAG_PANTALLA > LAG_MAXIMO) LAG_PANTALLA = LAG_MAXIMO;
        apunte('calibrado', Math.round(LAG_PANTALLA * 1000));
      }

      /* Como la doctora va de cuerpo entero, el margen no es un circulo sino
         una elipse: igual de ancha que antes y ALARGA veces mas alta, para que
         tocarle la cabeza o los pies cuente como tocarla. */
      function cerca(x, y, px, py, margen) {
        var dx = x - px, dy = (y - py) / ALARGA;
        return dx * dx + dy * dy <= margen * margen;
      }

      function acertar() {
        var gana = 100 + tiros * 25 + (nivel - 1) * 20;   // premio por acertar pronto
        puntos += gana;
        indice++;
        dinero();
        soltarChispas(objetivo);
        soltarBilletes(objetivo);
        letreros.push({ x: objetivo.x, y: objetivo.y - ALTO_DRA * 0.58, texto: '+' + gana, t: 0 });
        objetivo.estado = 'tocado';
        objetivo.t = 0;
        objetivo.vx = 0; objetivo.vy = 0;
        fase = 'atrapada';
        avisar('¡Atrapada! +' + gana, 1.2);
      }

      function escapar(texto) {
        if (!objetivo || objetivo.estado !== 'vuela') return;
        vidas--;
        objetivo.estado = 'escapa';
        objetivo.vx *= 0.4;
        objetivo.vy = -58;
        fase = 'escapa';
        api.sonar('mal');
        avisar((texto || '¡Se escapó!') + (vidas > 0 ? '' : '  ·  sin vidas'), 1.6);
      }

      function siguiente(conPerro) {
        objetivo = null;
        if (conPerro) {
          perro.estado = 'rie'; perro.t = 0;
          api.luego(function () { perro.estado = 'oculto'; soltar(); }, 1500);
        } else {
          api.luego(soltar, 750);
        }
      }

      function finNivel() {
        fase = 'nivel';
        objetivo = null;
        puntos += 150 * nivel;
        api.sonar('gana');
        avisar('¡Nivel ' + nivel + ' superado!  +' + (150 * nivel), 2.2);
        perro.estado = 'trofeo'; perro.t = 0;
        api.luego(function () {
          perro.estado = 'oculto';
          if (nivel >= NIVELES) { acabar('victoria'); return; }
          nivel++;
          empezarNivel();
        }, 1600);
      }

      /** motivo: 'tiempo' | 'vidas' | 'victoria' */
      function acabar(motivo) {
        if (terminado) return;
        terminado = true;
        fase = 'fin';
        if (cuenta && motivo !== 'tiempo') cuenta.parar();
        perro.estado = motivo === 'victoria' ? 'trofeo' : (motivo === 'tiempo' ? 'busca' : 'rie');
        perro.t = 0;
        avisar(motivo === 'tiempo' ? 'Tiempo cumplido'
             : (motivo === 'victoria' ? '¡Los ' + NIVELES + ' niveles!' : 'Sin vidas'), 3);
        if (puntos > mejor) {
          mejor = puntos;
          try { localStorage.setItem('jb_patos', String(mejor)); } catch (e) {}
        }
        api.sonar('fin');
        api.luego(function () {
          api.fin({
            sello: '✦',
            titulo: motivo === 'tiempo' ? '¡Se acabó el tiempo!'
                  : (motivo === 'victoria' ? '¡Puntería perfecta!'
                  : (nivel >= OBJETIVO ? '¡Buena puntería!' : 'Fin de la partida')),
            premio: nivel >= OBJETIVO ? premio() : null,
            mensaje: nivel >= OBJETIVO
              ? 'Vista y pulso de sobra. ¿Vas a por el récord?'
              : 'La doctora vuela rápido. ¿Lo intentas otra vez?',
            datos: [
              { val: puntos, etq: 'Puntos' },
              { val: nivel, etq: 'Nivel' },
              { val: mejor, etq: 'Récord' }
            ]
          });
        }, 1400);
      }

      function aparece() {
        App.tono(620, 0.07, 0.07, 'triangle');
        api.luego(function () { App.tono(830, 0.08, 0.06, 'triangle'); }, 80);
      }

      /* ------------------------- Movimiento ------------------------- */
      function paso(dt) {
        tiempo += dt;
        var i;

        for (i = 0; i < nubes.length; i++) {
          nubes[i].x += nubes[i].v * dt;
          if (nubes[i].x > FW + 4) nubes[i].x = -nubes[i].w - 4;
        }
        for (i = 0; i < gaviotas.length; i++) {
          var g = gaviotas[i];
          g.x += g.v * dt;
          if (g.x > FW + 12) {
            g.x = -12 - Math.random() * 40;
            g.y = HORIZONTE * (0.2 + Math.random() * 0.3);
          }
        }
        if (loro) {
          loro.x += loro.v * dt;
          if (loro.x > FW + 16) loro.x = -16 - Math.random() * 120;
        }

        if (perro.estado !== 'oculto') perro.t += dt;
        perro.alto += ((perro.estado === 'oculto' ? 0 : 1) - perro.alto) * Math.min(1, dt * 7);

        if (objetivo) moverObjetivo(dt);

        if (mensaje.t > 0) mensaje.t -= dt;
        sacude = Math.max(0, sacude - dt / 0.22);

        for (i = pelotas.length - 1; i >= 0; i--) {
          var b = pelotas[i];
          b.t += dt;
          if (b.sigue) { b.dx = b.sigue.x; b.dy = b.sigue.y; }
          var fb = Math.min(1, b.t / b.dur);
          var eb = 1 - (1 - fb) * (1 - fb);                 // sale rapido y llega suave
          b.x = b.x0 + (b.dx - b.x0) * eb;
          b.y = b.y0 + (b.dy - b.y0) * eb - Math.sin(fb * Math.PI) * 6;   // con comba
          b.giro += dt * 9 * b.sentido;
          b.f = fb;
          if (fb >= 1) { pelotas.splice(i, 1); llegar(b); }
        }
        for (i = billetes.length - 1; i >= 0; i--) {
          var bi = billetes[i];
          bi.t += dt;
          bi.vy += 22 * dt;
          bi.vy *= 0.985;                                    // el aire los frena
          bi.x += (bi.vx + Math.sin(bi.t * 6 + bi.giro) * 4) * dt;
          bi.y += bi.vy * dt;
          bi.giro += bi.vgiro * dt;
          if (bi.t > bi.vida) billetes.splice(i, 1);
        }

        for (i = disparos.length - 1; i >= 0; i--) {
          disparos[i].t += dt;
          if (disparos[i].t > 0.45) disparos.splice(i, 1);
        }
        for (i = chispas.length - 1; i >= 0; i--) {
          var c = chispas[i];
          c.vy += 30 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.giro += dt * 4;
          c.vida -= dt;
          if (c.vida <= 0) chispas.splice(i, 1);
        }
        for (i = letreros.length - 1; i >= 0; i--) {
          letreros[i].t += dt;
          if (letreros[i].t > 0.9) letreros.splice(i, 1);
        }

        /* La barra sigue al cronometro de arriba segundo a segundo, y entre
           un segundo y el siguiente se desliza para no ir a saltos. */
        if (cuenta) {
          var q = cuenta.queda();
          if (q !== quedaVisto) { quedaVisto = q; quedaFrac = 0; }
          else quedaFrac = Math.min(1, quedaFrac + dt);
          var meta = Math.max(0, quedaVisto - quedaFrac) / LIMITE;
          barra += (meta - barra) * Math.min(1, dt * 6);
        }
      }

      function moverObjetivo(dt) {
        var p = objetivo;

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
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          /* Se guarda la hora REAL (tr, en ms), no la del juego: con una
             pantalla lenta el reloj del juego se queda corto (ver el tope de
             dt en bucle) y compararlo con la hora del dedo daria un instante
             equivocado. Es la misma escala que e.timeStamp. */
          p.rastro.push({ x: p.x, y: p.y, tr: ultimo });
          while (p.rastro.length && ultimo - p.rastro[0].tr > INDULGENCIA * 1000) {
            p.rastro.shift();
          }

          if (p.x < 9)          { p.x = 9;          p.vx =  Math.abs(p.vx); }
          if (p.x > FW - 9)     { p.x = FW - 9;     p.vx = -Math.abs(p.vx); }
          if (p.y < 18)          { p.y = 18;          p.vy =  Math.abs(p.vy) * 0.8; }
          if (p.y > ORILLA - 12) { p.y = ORILLA - 12; p.vy = -Math.abs(p.vy); }

          if (p.vida <= 0) escapar('Se te fue volando');

        } else if (p.estado === 'fijada') {
          p.x += p.vx * 0.3 * dt;
          p.y += p.vy * 0.3 * dt;
          if (p.x < 9) p.x = 9; else if (p.x > FW - 9) p.x = FW - 9;
          if (p.y < 18) p.y = 18; else if (p.y > ORILLA - 12) p.y = ORILLA - 12;

        } else if (p.estado === 'tocado') {
          p.t += dt;
          if (p.t >= 0.5) siguiente(false);

        } else if (p.estado === 'escapa') {
          p.y += p.vy * dt;
          p.x += p.vx * dt;
          if (p.y < -ALTO_DRA) {
            if (vidas <= 0) acabar('vidas');
            else siguiente(true);
          }
        }
      }

      /** Billetes que saltan de la doctora al atraparla y caen revoloteando. */
      function soltarBilletes(p) {
        for (var i = 0; i < 7; i++) {
          var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 16 + Math.random() * 18;
          billetes.push({
            x: p.x, y: p.y,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v - 8,
            giro: Math.random() * TAU, vgiro: (Math.random() - 0.5) * 10,
            w: 6 + Math.random() * 3,
            vida: 1.3 + Math.random() * 0.5, t: 0
          });
        }
      }

      function soltarChispas(p) {
        for (var i = 0; i < 16; i++) {
          var a = Math.random() * TAU, v = 10 + Math.random() * 22;
          chispas.push({
            x: p.x, y: p.y,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
            giro: Math.random() * TAU,
            vida: 0.8 + Math.random() * 0.4,
            tam: 0.9 + Math.random() * 0.9,
            color: i % 3 === 0 ? '#FFFFFF' : (i % 3 === 1 ? '#FFD84A' : '#FF8FB1')
          });
        }
      }

      /* ------------------------- Dibujo ------------------------- */
      function dibujar() {
        if (!ctx) return;
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        ctx.clearRect(0, 0, FW, FH);
        ctx.drawImage(fondo, 0, 0, FW, FH);

        pintarCielo();
        dibujarPerro();
        ctx.drawImage(frente, 0, 0, FW, FH);
        if (objetivo) dibujarObjetivo(objetivo);
        pintarChispas();
        pintarBilletes();
        pintarLetreros();
        dibujarPelotas();
        pintarMonton();
        pintarDisparos();
        pintarHud();
        pintarMensaje();
      }

      /** Sol que late, nubes y pajaros cruzando. */
      function pintarCielo() {
        var sw = 19 * (1 + Math.sin(tiempo * 1.3) * 0.03);
        var sx = caja.x + caja.w * 0.749, sy = caja.y + caja.h * 0.532;
        imagen(ctx, 'sol', sx - sw / 2, sy - sw / 2, sw);

        var i;
        ctx.globalAlpha = 0.95;
        for (i = 0; i < nubes.length; i++) {
          imagen(ctx, nubes[i].img, nubes[i].x, nubes[i].y, nubes[i].w);
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < gaviotas.length; i++) {
          var g = gaviotas[i];
          imagen(ctx, g.img, g.x, g.y + Math.sin(tiempo * 3 + g.fase) * 0.8, g.w);
        }
        if (loro) imagen(ctx, 'loro', loro.x, loro.y + Math.sin(tiempo * 4) * 0.7, loro.w);
      }

      /* ---------------------------------------------------------------
         La doctora: vuela ladeandose hacia donde va, con su sombra sobre
         el agua cuando pasa bajo. Al atraparla se hincha y se desvanece.
         --------------------------------------------------------------- */
      function dibujarObjetivo(p) {
        var hh = ALTO_DRA, w = ancho('doctora', hh);

        if (p.estado === 'vuela' && p.y > HORIZONTE) {
          var d = (p.y - HORIZONTE) / (ORILLA - HORIZONTE);
          ctx.globalAlpha = 0.16 * d;
          ctx.fillStyle = '#123044';
          ctx.beginPath();
          ctx.ellipse(p.x + 2, ORILLA - 1.5, 3.6 * d, 1.3 * d, 0, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        var esc = 1, alfa = 1;
        if (p.estado === 'tocado') {
          var f = Math.min(1, p.t / 0.5);
          esc = 1 + 0.35 * Math.sin(f * Math.PI);
          alfa = 1 - f;
        }
        var ladeo = p.estado === 'vuela' ? Math.max(-0.22, Math.min(0.22, p.vx / 250))
                  : (p.estado === 'escapa' ? -0.1 : 0);

        ctx.save();
        ctx.globalAlpha = alfa;
        ctx.translate(p.x, p.y + Math.sin(tiempo * 5 + p.fase) * 0.6);
        ctx.rotate(ladeo);
        ctx.scale(esc, esc);
        imagen(ctx, 'doctora', -w / 2, -hh / 2, w);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      /** Estrellitas al atraparla. */
      function pintarChispas() {
        for (var i = 0; i < chispas.length; i++) {
          var c = chispas[i];
          ctx.save();
          ctx.globalAlpha = Math.min(1, c.vida / 0.4);
          ctx.translate(c.x, c.y);
          ctx.rotate(c.giro);
          ctx.fillStyle = c.color;
          estrella(ctx, c.tam);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      function estrella(g, r) {
        g.beginPath();
        for (var i = 0; i < 8; i++) {
          var rr = i % 2 ? r * 0.45 : r;
          var a = i * Math.PI / 4;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
      }

      /** Los puntos ganados, subiendo desde donde estaba. */
      function pintarLetreros() {
        for (var i = 0; i < letreros.length; i++) {
          var l = letreros[i];
          ctx.globalAlpha = 1 - l.t / 0.9;
          texto(l.texto, l.x, l.y - l.t * 9, 4.4, 'center', 800, '#FFE45C');
        }
        ctx.globalAlpha = 1;
      }

      function pintarBilletes() {
        for (var i = 0; i < billetes.length; i++) {
          var bi = billetes[i];
          var w = bi.w, hh = alto('billete', w);
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, (bi.vida - bi.t) / 0.4));
          ctx.translate(bi.x, bi.y);
          ctx.rotate(bi.giro);
          imagen(ctx, 'billete', -w / 2, -hh / 2, w);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      /** La pelota de billetes: grande al salir, pequena al llegar, porque se aleja. */
      function dibujarPelotas() {
        for (var i = 0; i < pelotas.length; i++) {
          var b = pelotas[i];
          var w = 20 - 12 * b.f;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.giro);
          imagen(ctx, 'pelota', -w / 2, -w / 2, w, w);
          ctx.restore();
        }
      }

      /** Anillo y mira donde cayo la pelota. */
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
          ctx.strokeStyle = '#FFD84A';
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

      /** El perro asoma de la arena: buscando, riendose o con la copa. */
      function dibujarPerro() {
        if (perro.alto < 0.01) return;
        var w = 28, hh = alto('perro', w);
        var salto = perro.estado === 'rie' ? Math.abs(Math.sin(perro.t * 7)) * 2.5 : 0;
        var base = DUNA + 10;                            // donde apoya el monticulo
        var y = base - hh * perro.alto - salto;
        var x = FW / 2 - w / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, FW, base);                        // lo de debajo queda enterrado
        ctx.clip();
        if (perro.estado === 'trofeo') {
          var sube = Math.sin(perro.t * 5) * 1.2;
          imagen(ctx, 'copa', FW / 2 - 4.5, y - 8 + sube, 9);
        }
        imagen(ctx, 'perro', x, y, w);
        ctx.restore();
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

        /* Hora REAL en que el dedo toco, menos lo que la pantalla va por
           detras. Todo en ms de performance.now: la misma escala que usa
           e.timeStamp y la que se guarda en el rastro (tr). */
        var tToque = null;
        if (ultimo && e.timeStamp > 0) {
          var atraso = ultimo - e.timeStamp;               // ms
          /* Si sale disparatado, el navegador usa otro reloj: no fiarse. */
          if (atraso > -1000 && atraso < 1000) {
            tToque = e.timeStamp - LAG_PANTALLA * 1000;
            apunte('medido', atraso);
          }
        }
        apunte('fps', Math.round(1000 / Math.max(1, fotograma)));

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
      var cuadro = 0, ultimo = 0, fotograma = 16.7;   // ms por dibujo (se mide solo)

      function bucle(t) {
        cuadro = requestAnimationFrame(bucle);
        var dt = ultimo ? Math.max(0, Math.min(0.05, (t - ultimo) / 1000)) : 0;
        /* Cuanto tarda un dibujo. En una pantalla lenta la doctora da saltos
           grandes entre uno y otro, y el margen tiene que crecer con ellos. */
        if (ultimo) fotograma = fotograma * 0.9 + (t - ultimo) * 0.1;
        ultimo = t;
        paso(dt);
        dibujar();
      }

      /* Minuto de partida: el mismo cronometro de arriba mueve la barra. */
      cuenta = api.cuenta(LIMITE, function () { acabar('tiempo'); });

      cargar(function () { if (!terminado) medir(); });   // al llegar las fotos, se repinta
      medir();
      api.luego(medir, 450);
      empezarNivel();
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
