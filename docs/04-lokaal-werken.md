# Lokaal werken met Claude Code (Windows)

Doel: Claude op je eigen pc laten werken, zodat hij YouTube-video's kan downloaden en frames kan bekijken
(vanuit de cloudomgeving blokkeert YouTube dat).

1. Installeer Node.js LTS (https://nodejs.org) en Git (https://git-scm.com).
2. Installeer Claude Code: open PowerShell en voer uit
   `npm install -g @anthropic-ai/claude-code`
   (of gebruik de Claude Desktop-app met Claude Code).
3. Haal het project op:
   `git clone https://github.com/IanPhlippo-jpg/Claude.git`
   `cd Claude`
   `git checkout claude/fase1-schetser`
   `npm install`
4. Start de app om te testen: `npm run dev` en open http://localhost:5173.
5. Start Claude Code in de map: `claude` en log in met je account.
6. Voor de video-referentie installeer je eenmalig `pip install yt-dlp` (Python) en ffmpeg
   (`winget install Gyan.FFmpeg`). Zeg dan tegen Claude: "download https://youtu.be/jhaPTx056vI met yt-dlp,
   haal elke 5 seconden een frame met ffmpeg en vergelijk de interface met de app".

Alles wat lokaal wordt aangepast, kan met `git push` weer naar GitHub.

## Desktop-app (2026-10-20)

- `start-desktop.cmd` of `npm run desktop:start`: bouwt de app en opent haar als eigen venster (Electron, randloos, de
  titelrij van de app zelf met — ☐ ✕). `npm run desktop` doet hetzelfde tegen de dev-server met hot reload.
- `npm run desktop:build` maakt met electron-builder een NSIS-installer en een portable exe in
  `%LOCALAPPDATA%\PhlippoCAD
elease` (niet in de projectmap: OneDrive vergrendelt bestanden tijdens het hernoemen
  van `win-unpacked`, wat EPERM gaf). De installer koppelt `.kcad` aan de app.
- Open/Save/Save As/Save As STL gebruiken in de desktop-app Windows-bestandsdialogen; in de browser blijven het
  downloads en een bestandskiezer.
- Controle: `npm run build` en dan `npm run e2e:desktop` (Playwright start Electron, test de brug en de vensterknoppen).

## Geïnstalleerde app (2026-10-21)

- Phlippo CAD 0.2.0 is geïnstalleerd per gebruiker in `%LOCALAPPDATA%\Programs\Phlippo CAD`, met een snelkoppeling
  op het bureaublad en in het Startmenu (zoek "Phlippo CAD"). `.kcad`-bestanden openen met de app.
- Nieuwe versie: versienummer in `package.json` ophogen, `npm run desktop:build`, dan
  `"%LOCALAPPDATA%\PhlippoCADelease\Phlippo CAD-Setup-<versie>.exe"` uitvoeren (of met `/S` stil installeren).
