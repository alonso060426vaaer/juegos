# =====================================================================
#  Deja el totem listo para la Zona de Juegos
#
#  Se ejecuta con doble clic sobre CONFIGURAR-TOTEM.bat, en la PC de la
#  pantalla. Es seguro repetirlo: no pisa nada que ya este bien.
#
#  Que hace:
#    - Crea en el Escritorio un acceso "Zona de Juegos" que abre Chrome
#      SIN pestanas, SIN barra de direcciones y SIN barra de titulo.
#    - Usa un perfil de Chrome aparte, para que no se mezcle con las
#      ventanas que el personal tenga abiertas.
#    - Si se quiere, lo deja arrancando solo al encender.
#    - Si se quiere, apaga el acople de ventanas de Windows (lo que saca
#      el cartel de "vista dividida" al arrastrar).
# =====================================================================

$ErrorActionPreference = "Continue"
chcp 65001 > $null
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8

$BASE = Split-Path -Parent $MyInvocation.MyCommand.Path
$URL  = "https://juegos-silk.vercel.app"

function Titulo($t) { Write-Host "`n  $t" -ForegroundColor Cyan; Write-Host ("  " + ("-" * 58)) -ForegroundColor DarkGray }
function Bien($t)   { Write-Host "  [OK]   $t" -ForegroundColor Green }
function Aviso($t)  { Write-Host "  [!]    $t" -ForegroundColor Yellow }
function Malo($t)   { Write-Host "  [ERROR] $t" -ForegroundColor Red }

Write-Host ""
Write-Host "  ZONA DE JUEGOS - PUESTA A PUNTO DEL TOTEM" -ForegroundColor White
Write-Host "  $URL" -ForegroundColor DarkGray

# ---------------------------------------------------------------------
Titulo "1 de 4 - Buscar Chrome"

$posibles = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chrome = $posibles | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Malo "No se encontro Chrome en esta PC."
    Write-Host "         Instalalo desde https://www.google.com/chrome y vuelve a"
    Write-Host "         ejecutar este archivo."
    Write-Host ""
    exit 1
}
Bien "Chrome encontrado"
Write-Host "         $chrome" -ForegroundColor DarkGray

# ---------------------------------------------------------------------
Titulo "2 de 4 - Crear el acceso del Escritorio"

# Perfil propio: asi el totem no comparte pestanas ni sesion con el Chrome
# que use el personal, y no aparece la barra de "restaurar paginas".
$perfil = Join-Path $env:LOCALAPPDATA "TotemJuegos"
if (-not (Test-Path $perfil)) { New-Item -ItemType Directory -Path $perfil -Force | Out-Null }

$argumentos = @(
  "--kiosk"                              # sin pestanas, sin barra de direcciones
  "--app=$URL"                           # ventana de aplicacion
  "--user-data-dir=`"$perfil`""          # perfil aparte del habitual
  "--no-first-run"                       # sin asistente de bienvenida
  "--noerrdialogs"                       # sin ventanas de error encima
  "--disable-session-crashed-bubble"     # sin "Chrome no se cerro correctamente"
  "--disable-features=TranslateUI"       # sin el cartel de traducir
  "--disable-pinch"                      # sin zoom por pellizco
  "--overscroll-history-navigation=0"    # sin "atras" al barrer de lado
) -join " "

$escritorio = [Environment]::GetFolderPath("Desktop")
$acceso     = Join-Path $escritorio "Zona de Juegos.lnk"
$icono      = Join-Path $BASE "zona-de-juegos.ico"

$sh  = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut($acceso)
$lnk.TargetPath       = $chrome
$lnk.Arguments        = $argumentos
$lnk.WorkingDirectory = Split-Path $chrome -Parent
$lnk.Description      = "Zona de Juegos - Joana Bernedo Body Aesthetics"
if (Test-Path $icono) { $lnk.IconLocation = "$icono,0" }
$lnk.Save()

Bien "Acceso creado: 'Zona de Juegos' en el Escritorio"

# ---------------------------------------------------------------------
Titulo "3 de 4 - Arrancar solo al encender"

Write-Host "  Si dices que si, al encender el totem se abrira la Zona de Juegos"
Write-Host "  sin que nadie tenga que tocar nada."
$r = Read-Host "  Ponerlo en el arranque de Windows? (s/n)"

if ($r -match '^[sSyY]') {
    $inicio = [Environment]::GetFolderPath("Startup")
    Copy-Item $acceso (Join-Path $inicio "Zona de Juegos.lnk") -Force
    Bien "Quedara abierto al encender"
    Write-Host "         Para quitarlo: borra el acceso de la carpeta que se abre" -ForegroundColor DarkGray
    Write-Host "         escribiendo  shell:startup  en el menu Inicio." -ForegroundColor DarkGray
} else {
    Aviso "No se toco el arranque"
}

# ---------------------------------------------------------------------
Titulo "4 de 4 - Acople de ventanas de Windows"

Write-Host "  Es lo que saca el cartel de 'la vista dividida facilita...' y"
Write-Host "  encoge el juego a media pantalla cuando alguien arrastra sin"
Write-Host "  querer. Apagarlo solo afecta a esta cuenta de Windows y se"
Write-Host "  vuelve a activar cuando quieras."
$r2 = Read-Host "  Apagarlo? (s/n)"

if ($r2 -match '^[sSyY]') {
    Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "WindowArrangementActive" -Value "0" -ErrorAction SilentlyContinue
    Bien "Acople de ventanas apagado"
    Write-Host "         Para volver a activarlo: Configuracion - Sistema -" -ForegroundColor DarkGray
    Write-Host "         Multitarea - Acoplar ventanas." -ForegroundColor DarkGray
    Aviso "Hay que reiniciar (o cerrar sesion) para que surta efecto"
} else {
    Aviso "No se toco el acople de ventanas"
}

# ---------------------------------------------------------------------
Write-Host ""
Write-Host ("  " + ("=" * 58)) -ForegroundColor Cyan
Write-Host "  TOTEM LISTO" -ForegroundColor Green
Write-Host ("  " + ("=" * 58)) -ForegroundColor Cyan
Write-Host ""
Write-Host "  Abre el acceso 'Zona de Juegos' del Escritorio." -ForegroundColor White
Write-Host "  Se vera SOLO el juego: sin pestanas, sin barra de direcciones"
Write-Host "  y sin barra de titulo. Para salir:  Alt + F4"
Write-Host ""
Write-Host "  FALTA UN PASO, y hay que darlo a mano:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Esto no quita la barra de tareas de Windows. Si alguien toca"
Write-Host "  abajo del todo, sigue saliendo. Para que el totem no se pueda"
Write-Host "  abandonar, usa el quiosco del propio Windows:"
Write-Host ""
Write-Host "    Configuracion - Cuentas - Otros usuarios" -ForegroundColor Cyan
Write-Host "    - Configurar un quiosco  (acceso asignado)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Eliges Chrome como la unica aplicacion y Windows arranca"
Write-Host "  directo en ella: sin escritorio, sin barra de tareas y sin"
Write-Host "  Alt+Tab. Es lo que usan los totems de los centros comerciales."
Write-Host ""
