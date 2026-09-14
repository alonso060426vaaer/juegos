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
| Patos al Vuelo | la velocidad y la `vida` en `nuevoPato()`, el `giro` del quiebro en `moverPato()` y `RADIO_TIRO` (6,5) |
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
