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
