// Balustradeconfigurator voor klanten (toonzaal): soort en stijl, plaats en vorm, maten, bevestiging, glas en RAL-kleur;
// de balustrade meteen in 3D en in een vooraanzicht met maten, met de prijs per strekkende meter naast de markt. Geen
// werkplaatsschema's. Gebundeld tot één HTML-bestand (maak-presentatie.mjs) dat ook zonder internet werkt.
import { ontwerp, STD, VORMEN } from '../model.mjs';
import { SOORTEN, STIJL, RAL, AFWERKINGEN, GLASTINT } from '../onderdelen.mjs';
import { NORM } from '../normen.mjs';
import { berekening } from '../bereken.mjs';
import { kostprijs, MARKTBAND, CAT, STANDAARD } from '../prijzen.mjs';
import { vooraanzicht } from '../tekeningen.mjs';
import { scene3d } from '../scene3d.mjs';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const lees = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return d; } };
const schrijf = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const alsBeeld = (svg, w, h, alt = '') => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" width="${w}" height="${h}" alt="${esc(alt)}" draggable="false">`;
let k = lees('balustrade-presentatie', { ...STD });
let inst = lees('balustrade-presentatie-inst', { bedrijf: '', contact: '', prijs: 'verkoop', uurloon: STANDAARD.uurloon, marge: { ...STANDAARD.marge } });
const kies = (naam, lijst) => lijst.map(([v, t]) => `<label class="kies"><input type="radio" name="${naam}" value="${esc(v)}"><span>${esc(t)}</span></label>`).join('');
const duim = (soort) => { const o = ontwerp({ soort, vorm: 'recht', L1: 2000 }), s = 0.05; return alsBeeld(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 66" width="110" height="66">${vooraanzicht(o, s, 5, 62, { maten: false })}</svg>`, 110, 66); };
$('soorten').innerHTML = Object.entries(SOORTEN).map(([v, S]) => `<button type="button" class="soort" data-soort="${v}" aria-pressed="false">${duim(v)}<span>${esc(S.kort)}</span></button>`).join('');
$('k-plaats').innerHTML = kies('plaats', [['binnen', 'Binnen'], ['buiten', 'Buiten']]);
$('k-vorm').innerHTML = kies('vorm', Object.entries(VORMEN));
$('k-bevestiging').innerHTML = kies('bevestiging', [['boven', 'Bovenop de vloer'], ['zij', 'Tegen de zijkant']]);
$('cat').innerHTML = ['A', 'B', 'C', 'D', 'E'].map((c) => `<option value="${c}">${esc(NORM.lijnlast[c].naam)}</option>`).join('');
$('k-ral').innerHTML = RAL.map((c) => `<label class="staal" title="RAL ${esc(c.code)} ${esc(c.naam)}"><input type="radio" name="ral" value="${c.code}"><span class="proef${c.metallic ? ' metallic' : ''}" style="--kleur:${c.hex}"></span><span class="snaam">${c.code === 'brons' ? 'Brons' : c.code}</span></label>`).join('');
$('k-lak').innerHTML = Object.entries(AFWERKINGEN).map(([v, a]) => `<label class="staal" title="${esc(a.uitleg)}"><input type="radio" name="lak" value="${v}"><span class="proef lak-${v}" style="--kleur:#3a3f44"></span><span class="snaam">${esc(a.naam)}</span></label>`).join('');
$('k-glasTint').innerHTML = Object.entries(GLASTINT).map(([v, x]) => `<label class="staal"><input type="radio" name="glasTint" value="${v}"><span class="proef glasproef" style="--tint:${x.tint};--dek:${x.dekking}"></span><span class="snaam">${esc(x.naam)}</span></label>`).join('');

$('soorten').addEventListener('click', (e) => { const b = e.target.closest('[data-soort]'); if (!b) return; k.soort = b.dataset.soort; k.stijl = SOORTEN[k.soort].stijlen[0].id; k.handregel = 'stijl'; teken(); });
$('stijl').addEventListener('change', () => { k.stijl = $('stijl').value; k.handregel = 'stijl'; teken(); });
for (const id of ['L1', 'L2', 'L3', 'H']) $(id).addEventListener('change', () => { k[id] = +$(id).value; teken(); });
$('cat').addEventListener('change', () => { k.cat = $('cat').value; teken(); });
for (const n of ['plaats', 'vorm', 'bevestiging', 'ral', 'lak', 'glasTint']) document.querySelectorAll(`input[name="${n}"]`).forEach((r) => r.addEventListener('change', () => { k[n] = r.value; if (n === 'vorm') k.H = r.value === 'trap' && !k.L2 ? 1000 : Math.max(k.H, 1100); teken(); }));
$('k-handregel').addEventListener('change', (e) => { k.handregel = e.target.value; teken(); });
$('plaatsen').addEventListener('change', () => { k.plaatsen = $('plaatsen').checked; teken(); });
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); document.querySelectorAll('[data-paneel]').forEach((p) => { p.hidden = p.dataset.paneel !== b.dataset.tab; }); }));
$('print').addEventListener('click', () => print());
$('instKnop').addEventListener('click', () => { $('i-bedrijf').value = inst.bedrijf; $('i-contact').value = inst.contact; $('i-prijs').value = inst.prijs; $('i-uurloon').value = inst.uurloon; $('i-marge').value = inst.marge[k.soort]; $('inst').showModal(); });
$('i-sluit').addEventListener('click', () => { inst = { ...inst, bedrijf: $('i-bedrijf').value, contact: $('i-contact').value, prijs: $('i-prijs').value, uurloon: +$('i-uurloon').value || STANDAARD.uurloon, marge: { ...inst.marge, [k.soort]: +$('i-marge').value || STANDAARD.marge[k.soort] } }; schrijf('balustrade-presentatie-inst', inst); $('inst').close(); teken(); });

let api = null;
function teken() {
  const o = ontwerp(k), kk = o.k, S = SOORTEN[kk.soort], st = STIJL(kk.soort, kk.stijl), B = berekening(o), kp = kostprijs(o, { uurloon: inst.uurloon, marge: inst.marge }), mb = MARKTBAND[kk.soort];
  Object.assign(k, { L1: kk.L1, L2: kk.L2, L3: kk.L3, H: kk.H, stijl: kk.stijl });
  document.querySelectorAll('[data-soort]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.soort === kk.soort));
  $('stijl').innerHTML = S.stijlen.map((x) => `<option value="${x.id}"${x.id === kk.stijl ? ' selected' : ''}>${esc(x.naam)}</option>`).join(''); $('i-stijl').textContent = st.uitleg;
  for (const n of ['plaats', 'vorm', 'bevestiging', 'ral', 'lak', 'glasTint']) { const r = document.querySelector(`input[name="${n}"][value="${kk[n]}"]`); if (r) r.checked = true; }
  for (const id of ['L1', 'L2', 'L3', 'H']) $(id).value = kk[id];
  $('v-L2').hidden = kk.vorm === 'recht'; $('v-L3').hidden = kk.vorm !== 'u'; $('l-L1').textContent = kk.vorm === 'trap' ? 'Trap, horizontaal (mm)' : 'Lengte (mm)'; $('l-L2').textContent = kk.vorm === 'trap' ? 'Vide erna (mm)' : 'Lengte 2 (mm)';
  $('cat').value = kk.cat; $('plaatsen').checked = !!kk.plaatsen;
  $('k-handregel').innerHTML = kies('handregel', S.handregels.map((h) => [h, { plat: 'Handregel plat', rond: 'Handregel rond', geen: 'Zonder handregel' }[h]])); const hr = document.querySelector(`input[name="handregel"][value="${kk.hr}"]`); if (hr) hr.checked = true;
  $('s-glas').hidden = !o.glas; $('s-kleur').hidden = kk.soort === 'glasU' || st.staander === 'inox';
  $('titel').textContent = `${S.naam}: ${st.naam}`;
  $('sub').textContent = `${o.segs.map((s) => Math.round(s.Lh)).join(' + ')} mm, hoogte ${kk.H} mm, ${kk.plaats}${kk.vorm === 'trap' ? ', langs de trap' : ''}, ${kk.bevestiging === 'zij' ? 'tegen de zijkant' : 'bovenop de vloer'}${o.glas ? `, glas ${o.glas.naam}` : ''}.`;
  $('bedrijf').textContent = inst.bedrijf ? `${inst.bedrijf}${inst.contact ? ` · ${inst.contact}` : ''}` : 'op maat, gelast in eigen werkplaats';
  $('printkop').innerHTML = `<b>${esc(inst.bedrijf || 'Balustrade op maat')}</b> ${esc(inst.contact)} · ${new Date().toLocaleDateString('nl-BE')}`;
  $('veilig').className = `veilig ${B.oordeel}`;
  $('veilig').textContent = B.oordeel === 'rood' ? `Zo voldoet het niet aan de norm: ${B.controles.filter((c) => c.oordeel === 'rood').map((c) => c.wat).join('; ')}.` : `Voldoet aan NBN B 03-004: hoogte ${kk.H} mm (≥ ${o.vereist}), openingen ≤ 110 mm${o.klim ? ', niet beklimbaar' : ''}; berekend op ${String(NORM.lijnlast[kk.cat].q).replace('.', ',')} kN/m.`;
  const btw = inst.prijs === 'verkoopBtw' ? 1.21 : 1;
  $('prijsvak').hidden = inst.prijs === 'geen';
  $('p-label').textContent = `Prijs per strekkende meter ${btw > 1 ? 'incl.' : 'excl.'} btw`; $('p-bedrag').textContent = `${eur(kp.perMeter * btw)}/m`;
  $('p-sub').textContent = `${String(kp.meter).replace('.', ',')} m: ${eur(kp.verkoop * btw)} ${kp.plaatsen.inbegrepen ? 'geplaatst' : 'zonder plaatsen'}`;
  const top = Math.max(mb.hoog * 1.5, kp.perMeterZonder * 1.08), pct = (v) => `${Math.min(100, (v / top) * 100)}%`;
  $('m-band').style.left = pct(mb.laag); $('m-band').style.width = `calc(${pct(mb.hoog)} - ${pct(mb.laag)})`; $('m-pin').style.left = pct(kp.perMeterZonder);
  $('m-tekst').textContent = `Markt: ${eur(mb.laag)}-${eur(mb.hoog)}/m zonder plaatsen`;
  $('p-opbouw').innerHTML = Object.entries(kp.perCat).filter(([c, x]) => x.verkoop > 0.5 && (c !== 'plaatsen' || kp.plaatsen.inbegrepen)).map(([c, x]) => `<div><span>${esc(CAT[c])}</span><span>${eur((x.verkoop * btw) / kp.meter)}/m</span></div>`).join('');
  const tot = o.segs.reduce((t, s) => t + s.Lh, 0), zMax = Math.max(...o.delen.map((d) => Math.max(d.a[2], d.b[2]))), zMin = Math.min(0, ...o.delen.map((d) => Math.min(d.a[2], d.b[2]))), s = Math.min(360 / tot, 200 / (zMax - zMin + 200)), H = (zMax - zMin) * s + 60;
  $('tekening').innerHTML = alsBeeld(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${H}" width="400" height="${H}" font-family="Arial, Helvetica, sans-serif"><rect width="400" height="${H}" fill="#fff"/>${vooraanzicht(o, s, 22, 16 + zMax * s, { h: 3 })}</svg>`, 800, H * 2, 'Vooraanzicht');
  api?.toon(o, { ral: kk.ral, lak: kk.lak, glasTint: kk.glasTint });
  schrijf('balustrade-presentatie', k);
}
teken();
(async () => {
  try { api = await scene3d($('drie')); $('laden').remove(); teken(); }
  catch (e) { $('laden').textContent = '3D lukt niet in deze browser; het vooraanzicht staat klaar.'; console.warn(e); }
})();
