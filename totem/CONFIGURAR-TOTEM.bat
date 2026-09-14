@echo off
REM ============================================================
REM   Deja el totem listo para la Zona de Juegos
REM   Doble clic y listo. Se puede volver a ejecutar sin problema.
REM ============================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0totem.ps1"
echo.
pause
