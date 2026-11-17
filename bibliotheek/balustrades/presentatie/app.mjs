// Balustradeconfigurator voor klanten (toonzaal): soort en stijl, plaats en vorm, maten, bevestiging en ondergrond, glas
// en RAL-kleur; de balustrade meteen in 3D en in een vooraanzicht met maten, met de prijs per strekkende meter naast de
// markt en een offerte om af te drukken. Geen werkplaatsschema's; uurloon en marge staan achter een code (P2-16).
// Gebundeld tot één HTML-bestand (maak-presentatie.mjs) dat ook zonder internet werkt.
import { ontwerp, STD, VORMEN, ONDERGRONDEN } from '../model.mjs';
import { SOORTEN, STIJL, RAL, AFWERKINGEN, GLASTINT } from '../onderdelen.mjs';
import { NORM } from '../normen.mjs';
import { berekening, conformiteit } from '../bereken.mjs';
import { kostprijs, MARKTBAND, CAT, STANDAARD } from '../prijzen.mjs';
import { vooraanzicht } from '../tekeningen.mjs';
import { scene3d } from '../scene3d.mjs';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const lees = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return d; } };
const schrijf = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const alsBeeld = (svg, w, h, alt = '') => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" width="${w}" height="${h}" alt="${esc(alt)}" draggable="false">`;
// een simpele hash zodat de code niet leesbaar in de opslag staat (geen beveiliging, wel een slot voor de toonzaal)
const hash = (t) => { let h = 5381; for (const c of String(t)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(16); };
let k = lees('balustrade-presentatie', { ...STD });
let inst = lees('balustrade-presentatie-inst', { bedrijf: '', contact: '', prijs: 'verkoop', btw: 21, uurloon: STANDAARD.uurloon, marge: { ...STANDAARD.marge } });
let codeHash = (() => { try { return localStorage.getItem('balustrade-presentatie-code') || ''; } catch { return ''; } })(), open = false;
const kies = (naam, lijst) => lijst.map(([v, t]) => `<label class="kies"><input type="radio" name="${naam}" value="${esc(v)}"><span>${esc(t)}</span></label>`).join('');
const opties = (lijst) => lijst.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
const duim = (soort) => { const o = ontwerp({ soort, vorm: 'recht', L1: 2000 }), s = 0.05; return alsBeeld(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 66" width="110" height="66">${vooraanzicht(o, s, 5, 62, { maten: false })}</svg>`, 110, 66); };
$('soorten').innerHTML = Object.entries(SOORTEN).map(([v, S]) => `<button type="button" class="soort" data-soort="${v}" aria-pressed="false">${duim(v)}<span>${esc(S.kort)}</span></button>`).join('');
$('k-plaats').innerHTML = kies('plaats', [['binnen', 'Binnen'], ['buiten', 'Buiten']]);
$('k-vorm').innerHTML = kies('vorm', Object.entries(VORMEN));
$('k-bevestiging').innerHTML = kies('bevestiging', [['boven', 'Bovenop de vloer'], ['zij', 'Tegen de zijkant']]);
$('cat').innerHTML = opties(['A', 'B', 'C', 'D', 'E'].map((c) => [c, NORM.lijnlast[c].naam]));
$('ondergrond').innerHTML = opties(Object.entries(ONDERGRONDEN));
$('windVb').innerHTML = opties(NORM.windSnelheid.map((v) => [v, `${v}`]));
$('terrein').innerHTML = opties(Object.entries(NORM.terrein).map(([t, x]) => [t, x.naam]));
$('k-ral').innerHTML = RAL.map((c) => `<label class="staal" title="RAL ${esc(c.code)} ${esc(c.naam)}"><input type="radio" name="ral" value="${c.code}"><span class="proef${c.metallic ? ' metallic' : ''}" style="--kleur:${c.hex}"></span><span class="snaam">${c.code === 'brons' ? 'Brons' : c.code}</span></label>`).join('');
$('k-lak').innerHTML = Object.entries(AFWERKINGEN).map(([v, a]) => `<label class="staal" title="${esc(a.uitleg)}"><input type="radio" name="lak" value="${v}"><span class="proef lak-${v}" style="--kleur:#3a3f44"></span><span class="snaam">${esc(a.naam)}</span></label>`).join('');
$('k-glasTint').innerHTML = Object.entries(GLASTINT).map(([v, x]) => `<label class="staal"><input type="radio" name="glasTint" value="${v}"><span class="proef glasproef" style="--tint:${x.tint};--dek:${x.dekking}"></span><span class="snaam">${esc(x.naam)}</span></label>`).join('');

$('soorten').addEventListener('click', (e) => { const b = e.target.closest('[data-soort]'); if (!b) return; k.soort = b.dataset.soort; k.stijl = SOORTEN[k.soort].stijlen[0].id; k.handregel = 'stijl'; teken(); });
$('stijl').addEventListener('change', () => { k.stijl = $('stijl').value; k.handregel = 'stijl'; teken(); });
const DAKV = ['dakBegin', 'dakEind'].flatMap((e) => ['Helling', 'Muur', 'Spleet'].map((n) => e + n));
for (const id of ['L1', 'L2', 'L3', 'H', 'opbouw', 'windHoogte', ...DAKV]) $(id).addEventListener('change', () => { k[id] = +$(id).value; teken(); });
for (const id of ['dakBegin', 'dakEind', 'trapboom']) $(id).addEventListener('change', () => { k[id] = $(id).checked; teken(); });
for (const id of ['cat', 'ondergrond', 'terrein']) $(id).addEventListener('change', () => { k[id] = $(id).value; teken(); });
$('windVb').addEventListener('change', () => { k.windVb = +$('windVb').value; teken(); });
$('hoog').addEventListener('change', () => { k.valhoogte = $('hoog').checked ? 12 : 3; if ($('hoog').checked && k.H < 1200) k.H = 1200; teken(); });
for (const n of ['plaats', 'vorm', 'bevestiging', 'ral', 'lak', 'glasTint']) document.querySelectorAll(`input[name="${n}"]`).forEach((r) => r.addEventListener('change', () => { k[n] = r.value; if (n === 'vorm') k.H = r.value === 'trap' && !k.L2 ? 1000 : Math.max(k.H, 1100); teken(); }));
$('k-handregel').addEventListener('change', (e) => { k.handregel = e.target.value; teken(); });
$('plaatsen').addEventListener('change', () => { k.plaatsen = $('plaatsen').checked; teken(); });
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); document.querySelectorAll('[data-paneel]').forEach((p) => { p.hidden = p.dataset.paneel !== b.dataset.tab; }); }));
$('print').addEventListener('click', () => print());
// instellingen: naam, contact, prijs, btw voor iedereen; uurloon en marge pas na de code (de eerste keer kies je de code)
const toonSlot = () => { $('ianDeel').hidden = !open; $('slotDeel').hidden = open; $('l-code').textContent = codeHash ? 'Code werkplaats' : 'Kies een code voor de werkplaats'; $('i-slot').textContent = open ? 'Werkplaats open: sluit het venster om weer te vergrendelen.' : 'Uurloon en marge staan achter een code: de klant ziet ze niet.'; };
$('instKnop').addEventListener('click', () => { open = false; $('i-bedrijf').value = inst.bedrijf; $('i-contact').value = inst.contact; $('i-prijs').value = inst.prijs; $('i-btw').value = String(inst.btw ?? 21); $('i-uurloon').value = inst.uurloon; $('i-marge').value = inst.marge[k.soort]; $('i-code').value = ''; toonSlot(); $('inst').showModal(); });
$('i-open').addEventListener('click', () => { const c = $('i-code').value.trim(); if (!c) return; if (!codeHash) { codeHash = hash(c); try { localStorage.setItem('balustrade-presentatie-code', codeHash); } catch {} } open = hash(c) === codeHash; if (!open) $('i-slot').textContent = 'Verkeerde code.'; else toonSlot(); });
$('i-sluit').addEventListener('click', () => { inst = { ...inst, bedrijf: $('i-bedrijf').value, contact: $('i-contact').value, prijs: $('i-prijs').value, btw: +$('i-btw').value, ...(open ? { uurloon: +$('i-uurloon').value || STANDAARD.uurloon, marge: { ...inst.marge, [k.soort]: +$('i-marge').value || STANDAARD.marge[k.soort] } } : {}) }; open = false; schrijf('balustrade-presentatie-inst', inst); $('inst').close(); teken(); });
// offerte (P3-11): klant, werf, geldigheid, de prijs met de toeslagen en de voorwaarden
$('offerteKnop').addEventListener('click', () => $('offerteVenster').showModal());
$('o-sluit').addEventListener('click', () => $('offerteVenster').close());
$('o-druk').addEventListener('click', () => { $('offerteVenster').close(); maakOfferte(); document.body.classList.add('offerte-druk'); print(); document.body.classList.remove('offerte-druk'); });

let api = null, laatst = null;
function teken() {
  const o = ontwerp(k), kk = o.k, S = SOORTEN[kk.soort], st = STIJL(kk.soort, kk.stijl), B = berekening(o), C = conformiteit(o, B), kp = kostprijs(o, { uurloon: inst.uurloon, marge: inst.marge }), mb = MARKTBAND[kk.soort];
  laatst = { o, B, C, kp };
  Object.assign(k, { L1: kk.L1, L2: kk.L2, L3: kk.L3, H: kk.H, stijl: kk.stijl, dakBegin: kk.dakBegin, dakEind: kk.dakEind, opbouw: kk.opbouw, windHoogte: kk.windHoogte }, Object.fromEntries(DAKV.map((x) => [x, kk[x]])));
  document.querySelectorAll('[data-soort]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.soort === kk.soort));
  $('stijl').innerHTML = S.stijlen.map((x) => `<option value="${x.id}"${x.id === kk.stijl ? ' selected' : ''}>${esc(x.naam)}</option>`).join(''); $('i-stijl').textContent = st.uitleg;
  for (const n of ['plaats', 'vorm', 'bevestiging', 'ral', 'lak', 'glasTint']) { const r = document.querySelector(`input[name="${n}"][value="${kk[n]}"]`); if (r) r.checked = true; }
  for (const id of ['L1', 'L2', 'L3', 'H', 'opbouw', 'windHoogte', ...DAKV]) $(id).value = kk[id];
  for (const id of ['cat', 'ondergrond', 'terrein']) $(id).value = kk[id];
  $('windVb').value = String(kk.windVb); $('hoog').checked = (kk.valhoogte ?? 3) >= 12; $('trapboom').checked = !!kk.trapboom;
  $('v-wind').hidden = kk.plaats !== 'buiten'; $('v-trapboom').hidden = kk.vorm !== 'trap';
  $('i-ondergrond').textContent = kk.ondergrond !== 'beton' || kk.opbouw > 0 ? B.controles.filter((c) => c.groep === 'Ondergrond').map((c) => `${c.wat}: ${c.uitleg || c.formule}`).join(' ') : 'Volle betonplaat, de ankers rechtstreeks in de draagvloer.';
  for (const [id, kant] of [['dakBegin', 'begin'], ['dakEind', 'eind']]) {
    const kan = kk.vorm !== 'trap' || (kant === 'eind' && kk.L2 > 0), e = o.dak.find((x) => x.kant === kant), i = $(`i-${id}`);
    $(id).checked = !!kk[id]; $(id).disabled = !kan; $(`v-${id}`).hidden = !kk[id]; i.className = 'uitleg';
    if (!kan) i.textContent = 'Langs een trap alleen aan het einde (vide na de trap).';
    else if (!e) i.textContent = '';
    else if (!e.nodig) i.textContent = 'Het dak is hier hoog genoeg: geen afschuining nodig.';
    else { if (!e.past || e.top0 < NORM.dakWand.v) i.classList.add('rood'); i.textContent = `Schuin stuk ${Math.round(e.xs)} mm horizontaal, ${Math.round(e.top0)} mm hoog aan de muur.${!e.past ? ' Past niet in de lijn.' : ''}${e.top0 < NORM.dakWand.v ? ' Te laag aan de muur.' : ''}`; }
  }
  $('v-L2').hidden = kk.vorm === 'recht'; $('v-L3').hidden = kk.vorm !== 'u'; $('l-L1').textContent = kk.vorm === 'trap' ? 'Trap, horizontaal (mm)' : 'Lengte (mm)'; $('l-L2').textContent = kk.vorm === 'trap' ? 'Vide erna (mm)' : 'Lengte 2 (mm)';
  $('cat').value = kk.cat; $('plaatsen').checked = !!kk.plaatsen;
  $('k-handregel').innerHTML = kies('handregel', S.handregels.map((h) => [h, { plat: 'Handregel plat', rond: 'Handregel rond', koker: 'Handregel koker', geen: 'Zonder handregel' }[h]])); const hr = document.querySelector(`input[name="handregel"][value="${kk.hr}"]`); if (hr) hr.checked = true;
  $('s-glas').hidden = !o.glas; $('s-kleur').hidden = kk.soort === 'glasU' || st.staander === 'inox';
  $('titel').textContent = `${S.naam}: ${st.naam}`;
  $('sub').textContent = `${o.segs.map((s) => Math.round(s.Lh)).join(' + ')} mm, hoogte ${kk.H} mm, ${kk.plaats}${kk.vorm === 'trap' ? ', langs de trap' : ''}${o.dakKnikken ? `, onder een schuin dak (${o.dak.filter((e) => e.nodig).map((e) => `${e.kant === 'begin' ? 'begin' : 'einde'} ${e.hoek}°`).join(', ')})` : ''}, ${kk.bevestiging === 'zij' ? 'tegen de zijkant' : 'bovenop de vloer'}${o.glas ? `, glas ${o.glas.naam}` : ''}.`;
  $('bedrijf').textContent = inst.bedrijf ? `${inst.bedrijf}${inst.contact ? ` · ${inst.contact}` : ''}` : 'op maat, gelast in eigen werkplaats';
  $('printkop').innerHTML = `<b>${esc(inst.bedrijf || 'Balustrade op maat')}</b> ${esc(inst.contact)} · ${new Date().toLocaleDateString('nl-BE')}`;
  // P1-8: alleen beloven wat gecontroleerd is; wat niet gecontroleerd is, staat erbij
  $('veilig').className = `veilig ${B.oordeel}`;
  $('veilig').innerHTML = B.oordeel === 'rood' ? `<b>Zo kan het niet:</b> ${esc(B.controles.filter((c) => c.oordeel === 'rood').map((c) => c.wat).join('; '))}.` : `<b>${esc(C.kort)}</b><details><summary><small>Niet inbegrepen: ${C.niet.length} punten na te kijken vóór de uitvoering</small></summary><ul>${C.niet.map((x) => `<li><small>${esc(x.wat)}</small></li>`).join('')}</ul></details>`;
  const btw = inst.prijs === 'verkoopBtw' ? 1 + (Number(inst.btw) === 6 ? 0.06 : 0.21) : 1;
  $('prijsvak').hidden = inst.prijs === 'geen';
  $('p-label').textContent = `Prijs per strekkende meter ${btw > 1 ? `incl. ${Math.round((btw - 1) * 100)} % btw` : 'excl. btw'}`; $('p-bedrag').textContent = `${eur(kp.perMeter * btw)}/m`;
  $('p-sub').textContent = `${String(kp.meter).replace('.', ',')} m: ${eur(kp.verkoop * btw)} ${kp.plaatsen.inbegrepen ? 'geplaatst' : 'zonder plaatsen'}`;
  const top = Math.max(mb.hoog * 1.5, kp.perMeterZonder * 1.08), pct = (v) => `${Math.min(100, (v / top) * 100)}%`;
  $('m-band').style.left = pct(mb.laag); $('m-band').style.width = `calc(${pct(mb.hoog)} - ${pct(mb.laag)})`; $('m-pin').style.left = pct(kp.perMeterZonder);
  $('m-tekst').textContent = `Markt: ${eur(mb.laag)}-${eur(mb.hoog)}/m zonder plaatsen`;
  $('p-opbouw').innerHTML = Object.entries(kp.perCat).filter(([c, x]) => x.verkoop > 0.5 && (c !== 'plaatsen' || kp.plaatsen.inbegrepen)).map(([c, x]) => `<div><span>${esc(CAT[c])}${c === 'dak' ? ` (${o.dakKnikken} x)` : ''}</span><span>${eur((x.verkoop * btw) / kp.meter)}/m</span></div>`).join('');
  const tot = o.segs.reduce((t, s) => t + s.Lh, 0), zMax = Math.max(o.dakKnikken ? kk.H + 200 : 0, ...o.delen.map((d) => Math.max(d.a[2], d.b[2]))), zMin = Math.min(0, ...o.delen.map((d) => Math.min(d.a[2], d.b[2]))), s = Math.min(360 / tot, 200 / (zMax - zMin + 200)), H = (zMax - zMin) * s + 60;
  $('tekening').innerHTML = alsBeeld(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${H}" width="400" height="${H}" font-family="Arial, Helvetica, sans-serif"><rect width="400" height="${H}" fill="#fff"/>${vooraanzicht(o, s, 22, 16 + zMax * s, { h: 3 })}</svg>`, 800, H * 2, 'Vooraanzicht');
  api?.toon(o, { ral: kk.ral, lak: kk.lak, glasTint: kk.glasTint });
  schrijf('balustrade-presentatie', k);
}
/** de offerte als afdrukblad: klant, werf, datum, geldigheid, omschrijving, prijs per deel, btw en de voorwaarden */
function maakOfferte() {
  const { o, C, kp } = laatst, kk = o.k, S = SOORTEN[kk.soort], st = STIJL(kk.soort, kk.stijl), btwP = Number(inst.btw) === 6 ? 6 : 21, dag = new Date(), geldig = new Date(dag.getTime() + (+$('o-geldig').value || 30) * 864e5);
  const rij = Object.entries(kp.perCat).filter(([c, x]) => x.verkoop > 0.5 && (c !== 'plaatsen' || kp.plaatsen.inbegrepen)).map(([c, x]) => `<tr><td>${esc(CAT[c])}</td><td class="n">${eur(x.verkoop)}</td></tr>`).join('');
  $('offerte').innerHTML = `<h1>Offerte balustrade</h1><p>${esc(inst.bedrijf || 'Balustrade op maat')} · ${esc(inst.contact)}<br>Datum ${dag.toLocaleDateString('nl-BE')} · geldig tot ${geldig.toLocaleDateString('nl-BE')}</p>
<p><b>Klant:</b> ${esc($('o-klant').value)}<br><b>Werf:</b> ${esc($('o-adres').value)}</p>
<p><b>${esc(S.naam)}: ${esc(st.naam)}</b><br>${esc($('sub').textContent)}</p>
<table><thead><tr><th>Deel</th><th class="n">excl. btw</th></tr></thead><tbody>${rij}<tr><td><b>Totaal ${String(kp.meter).replace('.', ',')} m</b></td><td class="n"><b>${eur(kp.verkoop)}</b></td></tr><tr><td>Btw ${btwP} %${btwP === 6 ? ' (woning ouder dan 10 jaar, attest van de klant)' : ''}</td><td class="n">${eur(kp.verkoop * btwP / 100)}</td></tr><tr><td><b>Totaal incl. btw</b></td><td class="n"><b>${eur(kp.verkoop * (1 + btwP / 100))}</b></td></tr></tbody></table>
<p><b>Norm:</b> ${esc(C.kort)}</p><p><b>Niet inbegrepen, na te kijken vóór de uitvoering:</b> ${esc(C.niet.map((x) => x.wat).join('; '))}.</p>
<p><b>Voorwaarden:</b> prijzen na opmeting ter plaatse; de maten op deze offerte zijn richtmaten. Levering en plaatsing ${kp.plaatsen.inbegrepen ? 'inbegrepen' : 'niet inbegrepen'}. Betaling volgens afspraak. Werken aan de ondergrond (chape, randbalk, afwerking) niet inbegrepen.</p>`;
}
teken();
(async () => {
  try { api = await scene3d($('drie')); $('laden').remove(); teken(); }
  catch (e) { $('laden').textContent = '3D lukt niet in deze browser; het vooraanzicht staat klaar.'; console.warn(e); }
})();
