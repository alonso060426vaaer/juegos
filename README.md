# Zona de Juegos — Joana Bernedo Body Aesthetics

Menú de juegos didácticos para la pantalla vertical de la sala de espera.
HTML, CSS y JavaScript puros: no necesita PHP, base de datos ni conexión a internet.

## Cómo abrirlo

- Con XAMPP: `http://localhost/juegos/`
- Sin XAMPP: doble clic en `index.html` (también funciona)
- En la pantalla del tótem: abre el navegador en modo quiosco, por ejemplo

  ```
  chrome.exe --kiosk --start-fullscreen "http://localhost/juegos/"
  ```

Al primer toque la página pide pantalla completa automáticamente.

## Los siete juegos

| Juego | Qué ejercita | Acceso directo |
|---|---|---|
| Memoria | Atención y memoria visual (12 parejas) | `index.html#memoria` |
| Trivia | Preguntas de salud y belleza, con explicación | `index.html#trivia` |
| Mitos y Verdades | Desmontar creencias comunes | `index.html#mitos` |
| Adivina la Palabra | Cuatro pistas y una palabra de estética | `index.html#palabra` |
| Rompe Ladrillos | Reflejos y coordinación (arcade clásico) | `index.html#ladrillos` |
| Patos al Vuelo | Puntería y atención (arcade clásico, en la playa) | `index.html#patos` |
| Salto Infinito | Coordinación: sube saltando entre bloques (hay bloques fantasma) | `index.html#saltos` |

## Entrada con número de boleta

Antes de jugar, la pantalla pide el **número de la boleta o factura**. No hay
usuarios ni contraseñas: se comprueba que el número **esté bien escrito** y ya
se entra. Como el tótem no tiene teclado, sale un **teclado en pantalla** con
las letras B y F, el guion y los dígitos.

Formatos que acepta (`assets/js/acceso.js`):

| Tipo | Ejemplo | Regla |
|---|---|---|
| Boleta electrónica | `B001-00001234` | `B` + 3 caracteres de serie + hasta 8 dígitos |
| Factura electrónica | `F001-00001234` | `F` + 3 caracteres de serie + hasta 8 dígitos |
| Comprobante impreso | `001-0001234` | serie de 3 o 4 dígitos, guion y el correlativo |

Se puede escribir en minúsculas y sin guion. Rechaza lo que no tenga forma de
comprobante, lo que le falten o sobren dígitos y los correlativos a cero.

**Ojo**: esto valida el **formato**, no comprueba que la boleta exista de verdad.
Para eso haría falta un servidor que consulte SUNAT o la caja.

Cuando salta el protector de pantalla (un minuto sin tocar), se vuelve a pedir el
número: quien llega después es otra persona.

## Pantallas táctiles lentas (Patos al Vuelo)

Entre que el dedo toca el cristal y que el juego se entera pasa un rato, y en ese
rato el pato ya se ha movido. La tentación es bajar la velocidad, pero eso vuelve
el juego aburrido sin arreglar la causa.

En vez de eso, `patos.js` **calcula cuándo tocó el dedo de verdad** (el navegador
marca cada toque con su hora en `e.timeStamp`) y comprueba dónde estaba el pato
**en ese instante**. Es lo mismo que hacen los juegos de disparos en red con el
lag: perdona el retraso, no la puntería. Así el pato puede volar rápido sin ser
injusto.

**No hay que calibrar nada.** Queda un solo número, `LAG_PANTALLA` (lo que tarda el
panel en pintar, que no consta en ninguna parte), y viene con 60 ms de fábrica. Se
comprobó que con ese valor un cliente que apunta bien acierta igual en paneles de
60, 150 y hasta 220 ms, así que cubre de sobra cualquier pantalla normal.

Por si acaso, el juego **se calibra solo** en pantallas excepcionalmente lentas:
cuando un tiro falla pero cae encima del pato en otro instante del rastro, deduce
de ahí cuánto va por detrás la pantalla. Para que esto no pueda ablandar el juego,
solo aprende si los fallos **se parecen entre sí** — un retraso real es siempre el
mismo, mientras que tocar al tuntún da fallos dispersos. Probado con 300 toques al
azar: no aprende nada y acierta 12 veces de 300.

Si alguna vez hace falta dar soporte, `PATOS_LAG` en la consola enseña lo que ha
medido y lo que ha aprendido (en milisegundos).

## Instalarlo como aplicación en el tótem

La forma más cómoda de que no se vea nada del navegador, sin instalar ni
compilar nada. El sitio lleva un `manifest.webmanifest` con
`display: fullscreen`, así que al abrirlo desde su icono arranca **ya a
pantalla completa**, sin pestañas ni barra de direcciones.

En el tótem, con la página abierta en Chrome:

1. Menú **⋮** (arriba a la derecha)
2. **Guardar y compartir** → **Instalar página como aplicación**
   (si no sale, usa **Crear acceso directo** y marca *Abrir como ventana*)
3. Confirmar. Queda un icono con el logo en el escritorio

Abrirlo desde ese icono en adelante. Sigue siendo la misma web: **cualquier
push a `main` llega igual**, sin volver a instalar nada.

Para que arranque sola al encender el tótem, copiar ese icono a la carpeta
que se abre al escribir `shell:startup` en el menú Inicio.

**Esto no quita la barra de tareas de Windows.** Si se quiere un tótem que no
se pueda abandonar, hay que usar además el quiosco del propio Windows:
Configuración → Cuentas → Otros usuarios → **Configurar un quiosco**
(acceso asignado). Se elige esa aplicación y Windows arranca directo en ella,
sin escritorio, sin barra de tareas y sin Alt+Tab.

## Poner el tótem a prueba de dedos

La página hace lo que puede: pide **pantalla completa** en cuanto el cliente
valida su boleta y lo reintenta en cada toque si alguien sale, corta el pellizco
para hacer zoom, el barrido lateral que dispara el «atrás», el rebote al
aporrear y el arrastre de imágenes.

**Pero una página web no puede impedir que se salga del navegador.** Si quedan a
la vista la barra de título y las pestañas, los dedos las tocan, arrastran la
ventana y Windows la acopla a un lado de la pantalla. Eso se arregla en el tótem,
no en el código:

1. **Abrir Chrome en modo tótem.** Crear un acceso directo con este destino:

        "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=https://juegos-silk.vercel.app

   Así no hay barra de título, ni pestañas, ni barra de direcciones: no queda
   nada que tocar por error. Se sale con `Alt+F4`.

2. **Dejar solo esa ventana.** Cerrar las demás ventanas de Chrome. Si hay otra
   abierta detrás, Windows ofrece la vista dividida y acaba encogiendo el juego.

3. **Apagar el acople de ventanas de Windows.** Configuración → Sistema →
   Multitarea → desactivar *Acoplar ventanas*. Es lo que saca el cartel de
   «la vista dividida facilita…» que aparece al arrastrar.

4. **Arrancarlo solo con Windows.** Poner ese acceso directo en
   `shell:startup` para que el tótem quede listo tras un reinicio.

## Premios al cumplir el objetivo

Cuando alguien cumple el objetivo de un juego salta la **celebración**: confeti,
fanfarria y una tarjeta con el premio que le ha tocado, más el recordatorio de
enseñarlo en recepción. Si no llega al objetivo, la pantalla final es la normal.

Los premios están en `assets/js/premios.js`, **son ejemplos** y se cambian ahí
mismo (icono, nombre y letra pequeña). Los objetivos, uno por juego:

| Juego | Objetivo para ganar premio |
|---|---|
| Memoria | completar las 12 parejas |
| Trivia | 6 aciertos de 8 (`OBJETIVO`) |
| Mitos y Verdades | 7 aciertos de 10 (`OBJETIVO`) |
| Adivina la Palabra | 5 palabras de 7 (`OBJETIVO`) |
| Rompe Ladrillos | 900 puntos o pasar de nivel (`OBJETIVO`) |
| Patos al Vuelo | llegar a la ronda 3 (`OBJETIVO`) |
| Salto Infinito | 120 metros (`OBJETIVO`) |

## Duración y dificultad

Todas las partidas duran **1 minuto como máximo**. El reloj se ve arriba
a la derecha y se pone rojo en los últimos 15 segundos; al llegar a cero la
partida se cierra sola y sale el resultado. La duración está en un solo sitio:
`LIMITE` al principio de `assets/js/nucleo.js` (son segundos, 60 por defecto).

La dificultad está puesta **alta** en los siete juegos. Si quieres
subirla o bajarla, cada juego tiene sus números arriba del archivo:

| Juego | Qué tocar |
|---|---|
| Memoria | `PAREJAS` (12), `TOTAL_NUMEROS` (20, la baraja de la que se sacan) y `VISTAZO` (620 ms) |
| Trivia | `TOTAL` (8 preguntas) |
| Mitos y Verdades | `TOTAL` (10 frases) |
| Adivina la Palabra | `RONDA` (7 palabras), `FICHAS` (14 letras) y `PISTAS_MAX` (2) |
| Rompe Ladrillos | `VEL_BASE` (68), `PALA_W` (15) y `dobles` en `armar()` |
| Patos al Vuelo | la velocidad y la `vida` en `nuevoPato()`, el `giro` del quiebro en `moverPato()` y `RADIO_TIRO` (7) |
| Salto Infinito | `BLOQUE_AN` (17), las probabilidades de `movil`/`fragil`/`fantasma` en `nuevoBloque()` y `separacion()` — ojo: el hueco nunca puede pasar de 20, que es lo que alcanza un salto |

## Se adapta a la pantalla

Las dos teles de la sala (143 × 81 cm y 121 × 68 cm) son las dos **16:9**, así que
lo único que cambia entre ellas es el tamaño, no la forma. La página se adapta sola:

- **En vertical** (tótem girado) el menú va a dos columnas y los juegos se apilan.
- **En apaisado** la letra se calcula sobre el alto de la pantalla, para que se lea
  desde lejos en una tele grande; el menú pasa a cuatro columnas, las tarjetas de
  pregunta se centran con un ancho máximo y "Adivina la Palabra" reparte las pistas
  a un lado y las letras al otro.
- Los juegos de lienzo (ladrillos, patos, salto) **miden el hueco libre** y se
  redibujan solos: si giras la pantalla o cambias de tele, se recolocan sin tocar nada.

## Pensado para la sala de espera

- **Vuelve solo al menú** tras 2 minutos sin tocar la pantalla, para que el
  siguiente paciente la encuentre lista.
- **Protector de pantalla** con el logo tras 1 minuto de inactividad en el menú.
- Botón de **sonido** en la esquina superior derecha (queda guardado).
- Todo se toca con el dedo: no hace falta teclado. Con teclado, `Esc` vuelve al menú.

## Cambiar contenidos

Todo el texto está en archivos separados, en español y fácil de editar:

- **Preguntas de la trivia** → `assets/js/juegos/trivia.js`, lista `BANCO`.
  `p` es la pregunta, `o` las cuatro opciones, `r` la posición de la correcta
  (empezando en 0) y `d` el dato que se muestra al responder.
- **Palabras a adivinar** → `assets/js/juegos/palabra.js`, lista `PALABRAS`:
  `p` es la palabra (mayúsculas, sin tildes ni Ñ), `fotos` son los cuatro
  emojis de pista y `dato` la frase que sale al acertar.
- **Frases de mitos** → `assets/js/juegos/mitos.js`, lista `FRASES`
  (`v: true` si es verdad, `v: false` si es mito).
- **Cartas de la memoria** → `assets/js/juegos/memoria.js`. Arriba del todo,
  la línea `var MODO = 'numeros';` decide qué se ve al voltear: `'numeros'`
  (números grandes de colores) o `'productos'` (los dibujos de sérum, crema,
  labial...). Los dibujos están en la lista `PRODUCTOS` y se pueden añadir más
  copiando la estructura `{ id, nombre, d: ficha(...) }`.
- **Dificultad del rompe ladrillos** → `assets/js/juegos/ladrillos.js`, arriba del todo:
  `VEL_BASE` (velocidad de salida de la bola), `VIDAS_INICIO`, `PALA_W` (ancho de
  la paleta) y `SUERTE` (cada cuánto cae una cápsula de premio).
- **Dificultad de los patos** → `assets/js/juegos/patos.js`, arriba del todo:
  `PATOS_RONDA` (patos por ronda), `TIROS` (tiros por pato) y `RADIO_TIRO`
  (cuánta puntería hace falta: súbelo y se acierta más fácil). La escena de playa
  (cielo, sol, mar, arena y palmeras) se pinta sola en `pintarFondo()`; los
  colores de cada especie de pato están en la lista `TIPOS`.
- **Dificultad del salto infinito** → `assets/js/juegos/saltos.js`, arriba del todo:
  `SALTO` (fuerza del salto), `GRAVEDAD`, `BLOQUE_AN` (ancho de los bloques) y
  `CIELOS` (los colores del cielo según la altura).

## Cambiar el logo o los colores

- El logo es `assets/img/logo.png`. Sustitúyelo por otro archivo con el mismo
  nombre y aparecerá en el menú y en el protector de pantalla.
  La bola del rompe ladrillos y el saltador del salto infinito recortan solos
  el emblema redondo de ese archivo; si el logo nuevo ya es cuadrado, lo usan entero.
- Los colores están al principio de `assets/css/estilos.css`, en `:root`
  (`--oro`, `--crema`, `--tinta`...). Cambiando esas líneas cambia toda la app.

## Si cambias un archivo y no se ve el cambio

El navegador guarda copias de los archivos. Por eso en `index.html` los enlaces
llevan `?v=2` al final (`estilos.css?v=2`, `ladrillos.js?v=2`). Cada vez que
edites CSS o JavaScript, sube ese número en todos los enlaces (`?v=3`, `?v=4`...)
y la pantalla cogerá la versión nueva sola. Para verlo al momento en el
navegador: `Ctrl` + `F5`.

## Añadir un juego nuevo

1. Crea `assets/js/juegos/mijuego.js` copiando la estructura de cualquiera.
2. Añádelo en `index.html` con una línea `<script src="...">` antes de `inicio.js`.

El menú se arma solo con los juegos registrados.
