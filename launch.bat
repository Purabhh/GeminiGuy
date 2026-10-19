@echo off
REM Mochee desktop launcher
REM
REM One double-click = one app:
REM   - starts the server hidden (npm start on port 4176)
REM   - opens the app window (Chrome app-mode: no tabs, no URL bar)
REM   - supervises: when you CLOSE the app window, the server shuts down too
REM
REM   launch.bat         -> normal start (rebuilds first if source changed)
REM   launch.bat build   -> force a rebuild first
REM
REM If the server is already running, this just reopens the app window and
REM exits; the launcher that started the server keeps owning its lifecycle.
REM close.bat is the force-stop fallback. launcher.log is the truth for what
REM this script did on its last run.
REM
REM Keep every PowerShell call on ONE line: cmd mangles ^-continued lines.
REM The window watch is a poll loop, not `start /wait`, because Chrome
REM re-execs itself and the process start /wait sees exits immediately.

setlocal
cd /d "%~dp0"
set "LOG=%~dp0launcher.log"
set "PORT=4176"
set "APP_URL=http://localhost:4176/C:/Program Files/Git/"
set "PROFILE=%LOCALAPPDATA%\mochee-chrome-profile"
REM Optional build step. Leave BUILD_CMD empty for apps that need no build.
set "BUILD_CMD=npm run build"
set "BUILD_MARKER=dist\index.html"
set "SRC_PATHS=src,server,shared,public,index.html,package.json,vite.config.ts"
echo [%date% %time%] launcher start > "%LOG%"

set "CHROME_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

REM ---- Reattach: if a server is already up, just open a window and exit ----
call :portup
if %errorlevel%==0 (
  echo [%date% %time%] server already running - reattach >> "%LOG%"
  goto :openwindow_reattach
)

REM ---- Fresh start ----
if not defined BUILD_CMD goto :serve
if /i "%~1"=="build" goto :build
if not exist "%BUILD_MARKER%" goto :build
REM Auto-rebuild if any source file is newer than the last build.
powershell -NoProfile -Command "$b = (Get-Item '%BUILD_MARKER%').LastWriteTime; $src = Get-ChildItem -Path %SRC_PATHS% -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\(node_modules|\.next|dist|build|\.git)\\' }; if ($src | Where-Object { $_.LastWriteTime -gt $b }) { exit 1 } else { exit 0 }" >nul 2>&1
if errorlevel 1 (
  echo [%date% %time%] source newer than build - auto-rebuilding >> "%LOG%"
  goto :build
)
goto :serve

:build
echo [%date% %time%] building >> "%LOG%"
call %BUILD_CMD% >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] build FAILED >> "%LOG%"
  exit /b 1
)

:serve
REM Close any stale app window from a previous run so the supervisor starts clean.
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'chrome.exe','msedge.exe' -and $_.CommandLine -match 'mochee-chrome-profile' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [%date% %time%] starting server (hidden) >> "%LOG%"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','\"npm start\"' -WorkingDirectory '%~dp0' -WindowStyle Hidden -RedirectStandardOutput '%~dp0server.log' -RedirectStandardError '%~dp0server.err.log'"

REM Wait up to ~40s for the port to accept connections.
set /a tries=0
:waitloop
set /a tries+=1
call :portup
if %errorlevel%==0 goto :ready
if %tries% geq 40 (
  echo [%date% %time%] server never came up >> "%LOG%"
  goto :openwindow_reattach
)
timeout /t 1 /nobreak >nul
goto :waitloop

:ready
echo [%date% %time%] server ready >> "%LOG%"
if not exist "%CHROME_EXE%" (
  REM No Chrome/Edge: default browser. Can't watch that window, so the
  REM server keeps running until close.bat.
  echo [%date% %time%] no chrome - default browser fallback >> "%LOG%"
  start "" "%APP_URL%"
  goto :end
)

start "" "%CHROME_EXE%" --app="%APP_URL%" --user-data-dir="%PROFILE%"
echo [%date% %time%] app window launched - supervising >> "%LOG%"

REM ---- Supervisor: poll for the app-window process every 3s. ----
REM SEEN flips to 1 once the window is observed; after that, zero processes
REM means the user closed it. Before first sighting allow ~15s (5 misses).
set /a SEEN=0
set /a MISSES=0
:supervise
timeout /t 3 /nobreak >nul
set "CHROME_COUNT="
for /f %%c in ('powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'chrome.exe','msedge.exe' -and $_.CommandLine -match 'mochee-chrome-profile' } | Measure-Object).Count"') do set "CHROME_COUNT=%%c"
if not "%CHROME_COUNT%"=="0" set /a SEEN=1
if not "%CHROME_COUNT%"=="0" goto :supervise
if "%SEEN%"=="1" goto :winclosed
set /a MISSES+=1
if %MISSES% geq 5 goto :winclosed
goto :supervise

:winclosed
echo [%date% %time%] app window closed - stopping server >> "%LOG%"
REM Inlined instead of `call close.bat`: CALLing a child .bat from here has
REM silently no-op'd before.
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
echo [%date% %time%] shutdown complete >> "%LOG%"
goto :end

:openwindow_reattach
if exist "%CHROME_EXE%" (
  start "" "%CHROME_EXE%" --app="%APP_URL%" --user-data-dir="%PROFILE%"
) else (
  start "" "%APP_URL%"
)
goto :end

:portup
REM errorlevel 0 if something accepts TCP on localhost:%PORT% (IPv4 or IPv6).
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('localhost', %PORT%); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%

:end
endlocal
exit /b 0
