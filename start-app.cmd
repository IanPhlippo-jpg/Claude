@echo off
rem Phlippo CAD als eigen venster starten (zonder browserbalk, schermvullend).
rem Start de dev-server als die nog niet draait en opent Microsoft Edge in app-modus.
cd /d "%~dp0"
powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Process -WindowStyle Minimized cmd -ArgumentList '/c npm run dev -- --host 127.0.0.1 --port 5173 --strictPort'; Start-Sleep -Seconds 4 }"
start "" msedge --app=http://127.0.0.1:5173/ --start-fullscreen --user-data-dir="%LOCALAPPDATA%\PhlippoCAD\edge-profile"
