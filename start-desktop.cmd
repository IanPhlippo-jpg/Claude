@echo off
rem Phlippo CAD als echte desktop-app (Electron): bouwt de app en opent het eigen venster.
rem Eerste keer: npm install (eenmalig). Installer maken: npm run desktop:build
cd /d "%~dp0"
if not exist node_modules (
  echo Afhankelijkheden installeren...
  call npm install
)
call npm run desktop:start
