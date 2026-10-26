@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
set "PYTHONIOENCODING=utf-8"
if not defined SERVICE_BUILDER_PORT set "SERVICE_BUILDER_PORT=4176"
set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 (
    py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)" >nul 2>nul
    if not errorlevel 1 set "PYTHON_CMD=py -3"
)
if not defined PYTHON_CMD (
    where python >nul 2>nul
    if not errorlevel 1 (
        python -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)" >nul 2>nul
        if not errorlevel 1 set "PYTHON_CMD=python"
    )
)
if not defined PYTHON_CMD (
    echo.
    echo ERRO: Python 3.9 ou mais recente nao foi encontrado.
    echo Instale pelo site oficial: https://www.python.org/downloads/windows/
    echo Depois feche e abra uma nova janela e tente novamente.
    echo.
    pause
    exit /b 1
)
echo.
echo Blue Ocean 3D P7.1 - Windows
%PYTHON_CMD% --version
echo Abrindo http://localhost:%SERVICE_BUILDER_PORT%/app/
echo Para encerrar o servidor pressione Ctrl+C nesta janela.
echo.
%PYTHON_CMD% scripts\server.py
if errorlevel 1 (
    echo.
    echo Nao foi possivel iniciar. Verifique se a porta %SERVICE_BUILDER_PORT% esta ocupada.
    echo Opcao: abra PowerShell, entre nesta pasta e execute:
    echo $env:SERVICE_BUILDER_PORT="4176"; .\INICIAR-WINDOWS.bat
)
pause
