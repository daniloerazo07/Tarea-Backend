@echo off
setlocal
set "TASK_NODE_DIR="
for /d %%D in ("%~dp0..\.tools\node-v22*-win-x64") do if exist "%%~fD\node.exe" set "TASK_NODE_DIR=%%~fD"
if defined TASK_NODE_DIR goto portable
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo No se encuentra Node.js. Instala Node.js 22 o conserva el runtime de .tools.
  exit /b 1
)
call npm.cmd %*
exit /b %errorlevel%

:portable
set "PATH=%TASK_NODE_DIR%;%PATH%"
call "%TASK_NODE_DIR%\npm.cmd" %*
exit /b %errorlevel%
