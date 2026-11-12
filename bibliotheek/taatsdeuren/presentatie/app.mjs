// Deurenconfigurator voor klanten: kies een model, geef het deurgat in, kies hoe de deur opengaat, het glas en de
// RAL-kleur, en zie de deur meteen in 2D en in een 3D-kamer. Staat los van de CAD: gebundeld tot één HTML-bestand
// (maak-presentatie.mjs) dat ook zonder internet werkt.
import { STIJLEN, GRENZEN, minMaat, ontwerp, SYSTEMEN, systeemPast, kiesSysteem } from '../deuren.mjs';
import { vooraanzicht } from '../teken.mjs';
import { kostprijs } from '../prijzen.mjs';
import { RAL, AFWERKINGEN, GLAS, OPBOUW, SCHARNIEREN, SCHARNIER_UITLEG } from '../opties.mjs';
import { kamer, MUREN, VLOEREN } from '../kamer.mjs';

// het beginscherm zoomt niet: geen knijp- of dubbeltikzoom van de pagina (iOS negeert user-scalable soms: ook de gebaren tegenhouden)
for (const m of document.querySelectorAll('meta[name="viewport"]')) m.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
/** een tekening als afbeelding met een vaste maat (een ingebedde SVG liet Safari op de iPhone groeien bij scrollen) */
const alsBeeld = (svg, w, h, alt = '') => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" width="${w}" height="${h}" alt="${alt}" decoding="async" draggable="false">`;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const lees = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return d; } };
const schrijf = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const STD = { gebruik: 'binnen', stijl: 'boog', B: 1000, H: 2400, muurdikte: 200, scharnier: 'budget', draai: 'links', opbouw: 'enkel', glas: 'helder', ral: '9005', lak: 'fijnstructuur', systeem: 'auto', Z: 400 };
let k = lees('deuren-keuze', STD);
let kamerStand = lees('deuren-kamer', { open: 0, muur: 'wit', vloer: 'eik' });
const hoek = (a) => (a === 0 ? 'dicht' : `${Math.abs(a)}° naar ${a > 0 ? 'voor' : 'achter'}`);
let inst = lees('deuren-instellingen', { bedrijf: '', contact: '', prijs: 'kostprijs', uurloon: 45, marge: 35 });
if (!STIJLEN.some((s) => s.id === k.stijl)) k = { ...STD };

// ---------------------------------------------------------------- opbouw van de keuzes
const nr = (s) => `D${String(STIJLEN.indexOf(s) + 1).padStart(3, '0')}`;
const GRP = ['Alle', ...new Set(STIJLEN.map((s) => s.groep))];
$('filter').innerHTML = GRP.map((g) => `<button type="button" data-filter="${esc(g)}" aria-pressed="${g === 'Alle'}">${esc(g)}</button>`).join('');
$('modellen').innerHTML = STIJLEN.map((s) => `<button type="button" class="model" data-stijl="${s.id}" data-groep="${esc(s.groep)}" aria-pressed="false" title="${esc(s.uitleg)}"><span class="duim" id="duim-${s.id}"></span><span class="mnaam">${esc(s.naam)}</span></button>`).join('');
const radio = (naam, lijst, sub = () => '') => lijst.map(([v, t]) => `<label class="kies"><input type="radio" name="${naam}" value="${esc(v)}"><span>${esc(t)}${sub(v)}</span></label>`).join('');
$('k-scharnier').innerHTML = radio('scharnier', [['budget', 'Pivot'], ['premium', 'Pivot premium'], ['verdekt', 'Verdekte scharnieren']]);
$('k-gebruik').innerHTML = radio('gebruik', [['binnen', 'Binnen'], ['buiten', 'Buiten (geïsoleerd)']]);
$('k-draai').innerHTML = radio('draai', [['links', 'Scharnierkant links'], ['rechts', 'Scharnierkant rechts']]);
$('k-opbouw').innerHTML = radio('opbouw', Object.entries(OPBOUW).map(([v, o]) => [v, o.naam]));
$('k-glas').innerHTML = Object.entries(GLAS).map(([v, g]) => `<label class="staal glasstaal" title="${esc(g.soort)}"><input type="radio" name="glas" value="${v}"><span class="proef glas-${g.patroon ?? 'glad'}" style="--tint:${g.tint};--dek:${g.dekking}"></span><span class="snaam">${esc(g.naam)}</span></label>`).join('');
$('k-ral').innerHTML = RAL.map((c) => `<label class="staal" title="RAL ${esc(c.code)} ${esc(c.naam)}"><input type="radio" name="ral" value="${c.code}"><span class="proef${c.metallic ? ' metallic' : ''}" style="--kleur:${c.hex}"></span><span class="snaam">${c.code === 'brons' ? 'Brons' : `RAL ${c.code}`}<small>${esc(c.code === 'brons' ? 'metallic' : c.naam)}</small></span></label>`).join('');
$('k-lak').innerHTML = radio('lak', Object.entries(AFWERKINGEN).map(([v, a]) => [v, a.naam]));
$('k-muur').innerHTML = radio('muur', Object.entries(MUREN).map(([v, [t]]) => [v, t]));
$('k-vloer').innerHTML = radio('vloer', Object.entries(VLOEREN).map(([v, [t]]) => [v, t]));

const duim = (o) => { const W = 100, Hh = 125, s = Math.min((W - 12) / o.kozijn.B, (Hh - 12) / o.kozijn.H), ox = (W - o.kozijn.B * s) / 2; return alsBeeld(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}">${vooraanzicht(o, s, ox, Hh - 6, { maten: false, assen: false })}</svg>`, W, Hh); };
(function vulDuimen(i = 0) { const t0 = performance.now(); while (i < STIJLEN.length && performance.now() - t0 < 30) { const s = STIJLEN[i++]; try { $(`duim-${s.id}`).innerHTML = duim(ontwerp(s.id, s.std.B, s.std.H)); } catch {} } if (i < STIJLEN.length) setTimeout(() => vulDuimen(i), 0); })();

// ---------------------------------------------------------------- gebeurtenissen
$('filter').addEventListener('click', (e) => { const b = e.target.closest('[data-filter]'); if (!b) return; document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', x === b)); document.querySelectorAll('[data-stijl]').forEach((x) => { x.hidden = b.dataset.filter !== 'Alle' && x.dataset.groep !== b.dataset.filter; }); });
$('modellen').addEventListener('click', (e) => { const b = e.target.closest('[data-stijl]'); if (!b) return; k.stijl = b.dataset.stijl; const s = STIJLEN.find((x) => x.id === k.stijl), m = minMaat(s); if (k.B < m.B) k.B = s.std.B; if (k.H < m.H) k.H = s.std.H; teken(); });
for (const id of ['B', 'H', 'muurdikte', 'Z']) $(id).addEventListener('change', () => { k[id] = Math.round(+$(id).value) || STD[id]; teken(); });
for (const n of ['gebruik', 'scharnier', 'draai', 'opbouw', 'glas', 'ral', 'lak']) document.querySelectorAll(`input[name="${n}"]`).forEach((r) => r.addEventListener('change', () => { k[n] = r.value; if (n === 'gebruik') k.systeem = 'auto'; teken(); }));
$('systeem').addEventListener('change', () => { k.systeem = $('systeem').value; teken(); });
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));
function tab(t) { document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t)); document.querySelectorAll('[data-paneel]').forEach((p) => { p.hidden = p.dataset.paneel !== t; }); $('kamerbalk').hidden = t !== 'kamer'; }
$('open').addEventListener('input', () => { kamerStand.open = +$('open').value; $('openW').textContent = hoek(kamerStand.open); api?.zet({ open: kamerStand.open }); });
$('open').addEventListener('change', () => schrijf('deuren-kamer', kamerStand));
for (const n of ['muur', 'vloer']) document.querySelectorAll(`input[name="${n}"]`).forEach((r) => r.addEventListener('change', () => { kamerStand[n] = r.value; api?.zet({ [n]: r.value }); schrijf('deuren-kamer', kamerStand); }));
$('herstel').addEventListener('click', () => api?.herstel());

// ---------------------------------------------------------------- tekenen
let huidig = null, api = null;
function teken() {
  const s = STIJLEN.find((x) => x.id === k.stijl), m = minMaat(s), melding = [];
  const B = Math.min(GRENZEN.B[1], Math.max(m.B, k.B)), H = Math.min(GRENZEN.H[1], Math.max(m.H, k.H));
  if (B !== k.B || H !== k.H) melding.push(`Voor dit model kan het deurgat ${m.B} tot ${GRENZEN.B[1]} mm breed en ${m.H} tot ${GRENZEN.H[1]} mm hoog zijn; de maat is aangepast tot ${B} x ${H}.`);
  k.B = B; k.H = H; k.muurdikte = Math.min(600, Math.max(70, k.muurdikte));
  const enkelVleugel = s.vleugels === 1 && !s.zijlicht;
  const opts = { gebruik: k.gebruik, stijl: s, systeem: k.systeem, opbouw: k.opbouw, scharnier: k.scharnier, draai: enkelVleugel ? k.draai : undefined, zijlicht: k.Z };
  // een geïsoleerd profiel (en buiten) vraagt isolerend glas
  const met = (key) => ({ ...opts, opbouw: k.gebruik === 'buiten' || (SYSTEMEN[key]?.glasMin ?? 0) > 9 ? 'dubbel' : opts.opbouw });
  if (k.systeem !== 'auto' && !systeemPast(k.systeem, met(k.systeem))) melding.push(`Het profiel ${SYSTEMEN[k.systeem].kort} past niet bij deze keuze; ik neem ${SYSTEMEN[kiesSysteem({ ...met('auto'), systeem: 'auto' })].kort}.`);
  const o = ontwerp(s.id, B, H, opts);
  const c = kostprijs(o, { ...k, afwerking: 'poedercoat', uurloon: inst.uurloon, marge: inst.marge });
  // een pivot draait naar beide kanten, verdekte scharnieren naar één kant
  $('open').min = o.scharnier === 'verdekt' ? 0 : -90; if (o.scharnier === 'verdekt' && kamerStand.open < 0) { kamerStand.open = 0; $('open').value = 0; } $('openW').textContent = hoek(kamerStand.open);
  const zw = Math.max(...c.gewicht.vleugels);
  if (k.gebruik === 'buiten' && !o.sys.iso) melding.push('Buiten vraagt geïsoleerde deurprofielen; die bestaan niet met een boog. Kies een model zonder boog voor buiten.');
  if (o.opbouw !== k.opbouw) melding.push('Buiten en bij geïsoleerde deurprofielen altijd isolerend glas: dubbel glas genomen.');
  if (zw > c.maxKg) melding.push(`De vleugel weegt ${Math.round(zw)} kg: meer dan ${SCHARNIEREN[c.scharnier].kort.toLowerCase()} draagt (${c.maxKg} kg). Kies ${o.sys.kader.diepte >= 50 ? 'pivot premium' : 'een dieper profiel of pivot premium'}, of een kleinere deur.`);
  if (c.scharnier === 'verdektZwaar') melding.push('Zware deur: de verdekte scharnieren worden Simonswerk Tectus TE 640.');
  // keuzes in de knoppen zetten
  $('B').value = B; $('H').value = H; $('muurdikte').value = k.muurdikte; $('Z').value = k.Z; $('zijlichtVeld').hidden = !s.zijlicht;
  $('draaiVeld').hidden = !enkelVleugel;
  for (const n of ['gebruik', 'scharnier', 'draai', 'opbouw', 'glas', 'ral', 'lak']) { const r = document.querySelector(`input[name="${n}"][value="${CSS.escape(String(n === 'opbouw' ? o.opbouw : k[n] ?? 'binnen'))}"]`); if (r) r.checked = true; }
  document.querySelectorAll('[data-stijl]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.stijl === s.id));
  $('systeem').innerHTML = [['auto', `Automatisch (${SYSTEMEN[kiesSysteem({ ...met('auto'), systeem: 'auto' })].kort})`], ...Object.entries(SYSTEMEN).filter(([key]) => systeemPast(key, met(key))).map(([key, x]) => [key, x.naam])].map(([v, t]) => `<option value="${v}"${v === k.systeem ? ' selected' : ''}>${esc(t)}</option>`).join('');
  $('melding').hidden = !melding.length; $('melding').textContent = melding.join(' ');
  $('scharnierUitleg').textContent = SCHARNIER_UITLEG[o.scharnier];
  $('glasUitleg').textContent = `${OPBOUW[o.opbouw].uitleg[0].toUpperCase()}${OPBOUW[o.opbouw].uitleg.slice(1)}. ${GLAS[k.glas].soort[0].toUpperCase()}${GLAS[k.glas].soort.slice(1)} is veiligheidsglas (verplicht in deuren).`;
  $('lakUitleg').textContent = AFWERKINGEN[k.lak].uitleg;
  // 2D: vooraanzicht met de hoofdmaten in de gekozen kleur
  const kleur = RAL.find((x) => x.code === k.ral) ?? RAL[0], g = GLAS[k.glas];
  const W = 220, Hh = 300, sc = Math.min((W - 70) / o.kozijn.B, (Hh - 45) / o.kozijn.H), ox = 34 + (W - 70 - o.kozijn.B * sc) / 2;
  const licht = parseInt(kleur.hex.slice(1, 3), 16) > 150;
  $('tekening').innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" width="${W * 2}" height="${Hh * 2}" role="img" aria-label="Vooraanzicht met maten">${vooraanzicht(o, sc, ox, Hh - 22, { staal: kleur.hex, paneel: kleur.hex, lijn: licht ? '#555' : '#111', glas: mengGlas(g), maten: true, assen: true, tekst: 4 })}</svg>`;
  // samenvatting
  const sch = SCHARNIEREN[c.scharnier];
  const rijen = [
    ['Model', `${s.naam} (${nr(s)})`],
    ['Deurgat', `${B} x ${H} mm, muur ${k.muurdikte} mm`],
    [o.vleugels.length > 1 ? 'Vleugels' : 'Vleugel', o.vleugels.map((v) => `${Math.round(v.B)} x ${Math.round(v.H)} mm`).join(' + ')],
    ['Openen', o.scharnier === 'verdekt' ? `verdekte scharnieren (${sch.naam.replace(/^Verdekt: /, '')})${enkelVleugel ? `, scharnierkant ${k.draai}` : ''}` : `${sch.naam.replace(/^Pivot: /, 'pivot, ')}${enkelVleugel ? `, as ${k.draai}` : ''}`],
    ['Glas', `${OPBOUW[o.opbouw].naam.toLowerCase()}, ${g.naam.toLowerCase()} (${o.opbouw === 'dubbel' ? `${g.soort} | 14 | 6 gehard` : g.soort})`],
    ['Kleur', `${kleur.code === 'brons' ? kleur.naam : `RAL ${kleur.code} ${kleur.naam}`}, ${AFWERKINGEN[k.lak].naam.toLowerCase()}`],
    ['Profiel', o.sys.naam],
    ['Gewicht', `${c.gewicht.vleugels.map((x) => `${Math.round(x)} kg`).join(' + ')} per vleugel`],
  ];
  $('overzicht').innerHTML = rijen.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
  const prijs = { kostprijs: ['Kostprijs om te maken', c.kostprijs, 'excl. btw, geplaatst'], excl: ['Prijs', c.verkoop, 'excl. btw, geplaatst'], incl: ['Prijs', c.verkoop * 1.21, 'incl. 21 % btw, geplaatst'] }[inst.prijs];
  $('prijs').hidden = !prijs; if (prijs) { $('p-label').textContent = prijs[0]; $('p-bedrag').textContent = eur(prijs[1]); $('p-sub').textContent = prijs[2]; }
  $('titel').textContent = s.naam; $('uitleg').textContent = s.uitleg;
  huidig = { o, s, c };
  schrijf('deuren-keuze', k);
  api?.toon(o, { ...k });
}
/** de kleur van het glas in 2D: tint gemengd met wit volgens de dekking */
function mengGlas(g) {
  const h = (i) => parseInt(g.tint.slice(i, i + 2), 16), d = Math.min(0.85, g.dekking + 0.15);
  return `rgb(${[1, 3, 5].map((i) => Math.round(255 * (1 - d) * 0.25 + h(i) * (0.75 + 0.25 * d))).map((x) => Math.min(255, x)).join(',')})`;
}

// ---------------------------------------------------------------- instellingen (eigen naam, prijs tonen)
const vulInst = () => { $('i-bedrijf').value = inst.bedrijf; $('i-contact').value = inst.contact; $('i-uurloon').value = inst.uurloon; $('i-marge').value = inst.marge; const r = document.querySelector(`input[name="prijs"][value="${inst.prijs}"]`); if (r) r.checked = true; $('bedrijf').textContent = inst.bedrijf || 'Stalen deuren op maat'; $('contact').textContent = inst.contact; };
$('k-prijs').innerHTML = radio('prijs', [['geen', 'Geen prijs'], ['kostprijs', 'Kostprijs om te maken'], ['excl', 'Prijs excl. btw'], ['incl', 'Prijs incl. btw']]);
for (const id of ['i-bedrijf', 'i-contact', 'i-uurloon', 'i-marge']) $(id).addEventListener('change', () => { inst[id.slice(2)] = id === 'i-uurloon' || id === 'i-marge' ? +$(id).value : $(id).value; schrijf('deuren-instellingen', inst); vulInst(); teken(); });
document.querySelectorAll('input[name="prijs"]').forEach((r) => r.addEventListener('change', () => { inst.prijs = r.value; schrijf('deuren-instellingen', inst); teken(); }));
$('instKnop').addEventListener('click', () => $('inst').showModal());
$('instDicht').addEventListener('click', () => $('inst').close());

// ---------------------------------------------------------------- afdrukken en beeld
$('afdruk').addEventListener('click', () => {
  if (api) $('afdrukBeeld').src = api.beeld();
  $('afdrukTitel').textContent = `${inst.bedrijf ? `${inst.bedrijf} · ` : ''}${huidig.s.naam}`;
  $('afdrukTek').innerHTML = $('tekening').innerHTML;
  $('afdrukOverzicht').innerHTML = $('overzicht').innerHTML + ($('prijs').hidden ? '' : `<dt>${esc($('p-label').textContent)}</dt><dd>${esc($('p-bedrag').textContent)} (${esc($('p-sub').textContent)})</dd>`) + (inst.contact ? `<dt>Contact</dt><dd>${esc(inst.contact)}</dd>` : '');
  setTimeout(() => print(), 100);
});
// beeld opslaan: in een Claude-pagina via de downloads-functie, anders gewoon als download
let dl = null; (async () => { try { dl = (await window.claude?.use?.('downloads')) ?? null; } catch { dl = null; } })();
$('beeld').addEventListener('click', async () => {
  if (!api || !huidig) return;
  const url = api.beeld(), naam = `deur-${huidig.s.id}-${huidig.o.B}x${huidig.o.H}.jpg`;
  if (dl) { const bin = atob(url.split(',')[1]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); try { await dl.save({ filename: naam, data: new Blob([u], { type: 'image/jpeg' }) }); } catch {} return; }
  const a = document.createElement('a'); a.href = url; a.download = naam; document.body.appendChild(a); a.click(); a.remove();
});

// ---------------------------------------------------------------- start
vulInst(); tab('kamer');
$('open').value = kamerStand.open; $('openW').textContent = hoek(kamerStand.open);
for (const n of ['muur', 'vloer']) { const r = document.querySelector(`input[name="${n}"][value="${kamerStand[n]}"]`); if (r) r.checked = true; }
teken();
kamer($('kamer')).then((x) => { api = x; $('laden').remove(); api.zet(kamerStand); teken(); }).catch((e) => { $('laden').textContent = '3D lukt niet op dit toestel; de tekening staat klaar.'; tab('tekening'); console.warn(e); });
