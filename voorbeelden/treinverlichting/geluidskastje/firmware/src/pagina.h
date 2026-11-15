// Een kleine eigen pagina van het kastje (GET /): naam, volume, de geluiden (spelen, wissen, uploaden) en de wifi.
// Vooral voor als het kastje zijn eigen hotspot heeft ("Geluidskastje-xxxx", http://192.168.5.1/): dan kan Ian hier het
// netwerk van de doos instellen. Normaal gebeurt alles in het dashboard van de doos.
#pragma once

static const char PAGINA[] = R"rawliteral(<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Geluidskastje</title>
<style>body{font:15px system-ui,sans-serif;margin:0 auto;max-width:560px;padding:14px;color:#222;background:#f6f6f4}
h1{font-size:20px;margin:4px 0 2px}h2{font-size:15px;margin:18px 0 6px}.k{color:#666;font-size:13px}
section{background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin:10px 0}
input,button{font:inherit;padding:5px 8px}button{cursor:pointer}table{width:100%;border-collapse:collapse}
td{padding:4px 2px;border-bottom:1px solid #eee}#m{min-height:1.2em;color:#a33}</style></head><body>
<h1 id="t">Geluidskastje</h1><div class="k" id="s"></div><div id="m"></div>
<section><h2>Naam en volume</h2><input id="naam" maxlength="32"> <button onclick="zet('/naam',{naam:v('naam')})">Bewaar naam</button>
<p>Volume <input id="vol" type="range" min="0" max="100" onchange="zet('/volume',{volume:+v('vol')})"> <span id="vw"></span></p></section>
<section><h2>Geluiden</h2><table id="g"></table>
<p><input type="file" id="f" accept=".wav,audio/wav"> <button onclick="up()">Uploaden</button></p>
<p class="k">WAV, 16-bit PCM, mono, 8000 tot 22050 Hz (Audacity: 16000 Hz, mono, "WAV (Microsoft) signed 16-bit PCM").</p>
<button onclick="zet('/stop',{})">Stop</button></section>
<section><h2>Wifi van de doos</h2><input id="ssid" placeholder="Treinbaan"> <input id="ww" type="password" placeholder="wachtwoord">
<button onclick="zet('/wifi',{ssid:v('ssid'),wachtwoord:v('ww')})">Verbinden</button></section>
<script>
const v=i=>document.getElementById(i).value,$=i=>document.getElementById(i);
async function zet(p,b){const r=await fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();$('m').textContent=j.ok?'':j.fout;laad();}
async function wis(n){const r=await fetch('/geluid?naam='+encodeURIComponent(n),{method:'DELETE'});const j=await r.json();$('m').textContent=j.ok?'':j.fout;laad();}
async function up(){const f=$('f').files[0];if(!f)return;$('m').textContent='Bezig met uploaden...';
const r=await fetch('/geluid?naam='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'audio/wav'},body:f});const j=await r.json();$('m').textContent=j.ok?'':j.fout;laad();}
async function laad(){const i=await (await fetch('/info')).json();$('t').textContent=i.naam;$('naam').value=i.naam;$('vol').value=i.volume;$('vw').textContent=i.volume;
$('s').textContent=`id ${i.id} · ${i.ip} · versie ${i.versie} · ${Math.round(i.vrij/1024)} kB vrij · ${i.wifi.verbonden?'verbonden met '+i.wifi.ssid:'niet verbonden'}${i.wifi.hotspot?' · eigen hotspot':''}${i.wifi.doosOk?' · aangemeld bij de doos':''}`;
$('ssid').value=i.wifi.ssid;$('g').innerHTML=i.geluiden.map(g=>`<tr><td>${g.naam}</td><td>${g.s} s</td><td><button onclick="zet('/speel',{geluid:'${g.naam}'})">Speel</button> <button onclick="wis('${g.naam}')">Wis</button></td></tr>`).join('')||'<tr><td>Nog geen geluiden.</td></tr>';}
laad();
</script></body></html>)rawliteral";
