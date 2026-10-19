@echo off
REM Mochee force-stop
REM
REM Normally you don't need this: closing the app window stops the server.
REM Use it when something is left behind (default-browser fallback, the
REM launcher got killed, things look stuck).
REM Single-line PowerShell only: cmd mangles multi-line ^-continued commands.

setlocal
echo [%date% %time%] close.bat invoked >> "%~dp0launcher.log"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in 'chrome.exe','msedge.exe' -and $_.CommandLine -match 'mochee-chrome-profile') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'launch\.bat' -and $_.CommandLine -match [regex]::Escape('%~dp0')) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 4176 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { $p | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host 'Server stopped.' } else { Write-Host 'Nothing was listening on port 4176.' }"
endlocal
exit /b 0
