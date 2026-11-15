// Fitnesscatalogus voor klanten (toonzaal): links alle toestellen, in het midden het gekozen toestel in 3D of in drie
// aanzichten, rechts de versie (thuis of pro), de kleuren, de maten, het oordeel over de veiligheid en de prijs naast de
// markt. Geen werkplaatsschema's. Gebundeld tot één HTML-bestand (maak-presentatie.mjs) dat ook zonder internet werkt.
import { TOESTELLEN, PER_ID, toestel } from '../catalogus.mjs';
import { SOORTEN, VERSIE, RAL_FITNESS, BEKLEDING } from '../onderdelen.mjs';
import { OPTIES } from '../opties.mjs';
import { berekening } from '../bereken.mjs';
import { kostprijs, STANDAARD } from '../prijzen.mjs';
import { miniatuur, tekenBalken, alleGeo, PROJ, omhullende } from '../aanzicht.mjs';
import { scene3d } from '../scene3d.mjs';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const lees = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return d; } };
const schrijf = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const alsBeeld = (svg, w, h, alt = '') => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" width="${w}" height="${h}" alt="${esc(alt)}" draggable="false">`;
const SKL = { rek: 'var(--s-rek)', bank: 'var(--s-bank)', kabel: 'var(--s-kabel)', plate: 'var(--s-plate)' };
let k = lees('fitness-presentatie', { id: 'FR-01', versie: 'thuis', ral: '9005', leer: 'zwart', soort: 'alle', zoek: '' });
let inst = lees('fitness-presentatie-inst', { bedrijf: '', contact: '', prijs: 'incl', uurloon: STANDAARD.uurloon, marge: { ...STANDAARD.marge } });
const bewaar = () => { schrijf('fitness-presentatie', k); schrijf('fitness-presentatie-inst', inst); };
const instKost = () => ({ uurloon: inst.uurloon, marge: { ...STANDAARD.marge, ...inst.marge } });

const duim = new Map();
const miniBeeld = (id) => { if (!duim.has(id)) duim.set(id, alsBeeld(miniatuur(toestel(id, 'thuis'), { w: 152, h: 114, kleur: { frame: '#3a3f45', leer: '#1d1e20' } }), 152, 114, id)); return duim.get(id); };
$('chips').innerHTML = [['alle', 'Alle'], ...Object.values(SOORTEN).map((s) => [s.id, s.kort])].map(([v, t]) => `<button type="button" data-soort="${v}" aria-pressed="false">${esc(t)}</button>`).join('');
$('chips').addEventListener('click', (e) => { const b = e.target.closest('[data-soort]'); if (!b) return; k.soort = b.dataset.soort; tekenLijst(); bewaar(); });
$('zoek').value = k.zoek; $('zoek').addEventListener('input', () => { k.zoek = $('zoek').value; tekenLijst(); bewaar(); });
function tekenLijst() {
  document.querySelectorAll('#chips [data-soort]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.soort === k.soort));
  const z = k.zoek.trim().toLowerCase();
  const lijst = TOESTELLEN.filter((t) => (k.soort === 'alle' || t.soort === k.soort) && (!z || `${t.id} ${t.naam} ${t.kort} ${t.spieren} ${t.oefeningen.join(' ')}`.toLowerCase().includes(z)));
  $('lijst').innerHTML = lijst.map((t) => `<button type="button" class="toestel" data-id="${t.id}" style="--k:${SKL[t.soort]}" aria-pressed="${t.id === k.id}">${miniBeeld(t.id)}<span><b>${esc(t.naam)}</b><small>${t.id} · ${esc(SOORTEN[t.soort].kort)}</small></span></button>`).join('') || '<p class="uitleg">Niets gevonden.</p>';
}
$('lijst').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; k.id = b.dataset.id; tekenLijst(); teken(); bewaar(); });
$('k-versie').innerHTML = Object.values(VERSIE).map((v) => `<label class="kies"><input type="radio" name="versie" value="${v.id}"><span>${esc(v.naam)} · klasse ${v.klasse}</span></label>`).join('');
$('k-ral').innerHTML = RAL_FITNESS.map((c) => `<label class="staal" title="RAL ${esc(c.code)} ${esc(c.naam)}"><input type="radio" name="ral" value="${c.code}"><span class="proef" style="--kleur:${c.hex}"></span>${c.code}</label>`).join('');
$('k-leer').innerHTML = BEKLEDING.map((c) => `<label class="staal" title="${esc(c.naam)}"><input type="radio" name="leer" value="${c.code}"><span class="proef" style="--kleur:${c.hex}"></span></label>`).join('');
for (const n of ['versie', 'ral', 'leer']) document.querySelectorAll(`input[name="${n}"]`).forEach((r) => r.addEventListener('change', () => { k[n] = r.value; teken(); bewaar(); }));
// maat en opties per toestel (fase B): k.var[id] = { maat, opties, chroom }
const vr = (id = k.id) => { k.var = k.var ?? {}; return (k.var[id] = k.var[id] ?? {}); };
const optVan = () => { const x = vr(); return { ...(x.maat ? { maat: x.maat } : {}), ...(x.opties?.length ? { opties: [...x.opties].sort() } : {}), afwerking: { ral: k.ral, leer: k.leer, ...(x.chroom === false ? { chroom: false } : {}) } }; };
document.addEventListener('change', (e) => { const r = e.target; if (!(r instanceof HTMLInputElement)) return; const x = vr(); if (r.name === 'maat') x.maat = r.value === 'standaard' ? undefined : r.value; else if (r.name === 'optie') { const st = new Set(x.opties ?? []); if (r.checked) st.add(r.value); else st.delete(r.value); x.opties = [...st]; } else if (r.name === 'zwart') x.chroom = !r.checked; else return; teken(); bewaar(); });
let tab = 'drie';
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b)); document.querySelectorAll('[data-paneel]').forEach((p) => { p.hidden = p.dataset.paneel !== tab; }); teken(); }));
let s3d = null, bezig = null;
function teken() {
  const t = PER_ID[k.id] ?? TOESTELLEN[0], o = toestel(t.id, k.versie, optVan()), kp = kostprijs(o, instKost()), B = berekening(o), x = vr(t.id);
  $('s-maat').hidden = !t.maten; if (t.maten) $('k-maat').innerHTML = t.maten.map((m) => `<label class="kies"><input type="radio" name="maat" value="${m}"${(x.maat ?? 'standaard') === m ? ' checked' : ''}><span>${m}</span></label>`).join('');
  const zw = o.delen.some((d) => /^(Schijfhouder|Laadpen)/.test(d.naam)) || x.chroom === false;
  $('k-opties').innerHTML = (zw ? `<label class="kies"><input type="checkbox" name="zwart"${x.chroom === false ? ' checked' : ''}><span>Schijfhouders zwart i.p.v. chroom</span></label>` : '') + (OPTIES[t.soort] ?? []).map((p) => `<label class="kies" title="${esc(p.uitleg)}"><input type="checkbox" name="optie" value="${p.id}"${(x.opties ?? []).includes(p.id) ? ' checked' : ''}><span>${esc(p.naam)}</span></label>`).join('');
  const niet = o.gekozenOpties.filter((g) => !g.gelukt).map((g) => g.naam.toLowerCase());
  if (niet.length) $('k-opties').insertAdjacentHTML('beforeend', `<p class="uitleg" style="margin:6px 0 0">Past niet op dit toestel: ${esc(niet.join(', '))}.</p>`);
  document.body.dataset.soort = t.soort;
  for (const [n, v] of [['versie', k.versie], ['ral', k.ral], ['leer', k.leer]]) { const r = document.querySelector(`input[name="${n}"][value="${v}"]`); if (r) r.checked = true; }
  $('nr').textContent = `${t.id} · ${SOORTEN[t.soort].naam}`; $('titel').textContent = t.naam; $('sub').textContent = t.kort; $('uitleg').textContent = t.uitleg;
  $('oef').innerHTML = `<span><b>Spieren:</b> ${esc(t.spieren)}</span>${t.oefeningen.map((x) => `<span>${esc(x)}</span>`).join('')}`;
  $('i-versie').textContent = `${VERSIE[k.versie].uitleg}; tot ${o.V.gebruiker} kg gebruiker.`;
  $('s-leer').hidden = !o.kussens.length;
  const last = o.maxLast ? `${o.maxLast} kg` : o.stapels.length ? `stapel ${o.stapels.map((x) => x.n * x.kg).join(' + ')} kg` : '-';
  $('feiten').innerHTML = [['Buitenmaten', `${o.maten.B} x ${o.maten.D} x ${o.maten.H} mm`], ['Vloer', `${o.vloer.toFixed(2).replace('.', ',')} m²`], ['Gewicht', `± ${Math.round(o.massa)} kg`], ['Gebruiker', `max. ${o.V.gebruiker} kg`], ['Last', last]].map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
  $('veilig').className = `veilig ${B.oordeel === 'rood' ? 'oranje' : B.oordeel}`; $('veilig').textContent = B.oordeel === 'groen' ? 'Berekend volgens EN ISO 20957 (prototype: proeflast nog te doen)' : 'Berekend volgens EN ISO 20957, met punten die we nakijken (prototype: proeflast nog te doen)';
  const toon = inst.prijs, bedrag = toon === 'excl' ? kp.verkoop : kp.incl, [lo, hi] = kp.markt.band, max = Math.max(hi * 1.15, kp.incl * 1.1);
  $('prijsvak').hidden = toon === 'geen';
  $('p-label').textContent = toon === 'excl' ? 'Prijs excl. btw' : 'Prijs incl. 21 % btw'; $('p-bedrag').textContent = eur(bedrag); $('p-sub').textContent = `${VERSIE[k.versie].naam.toLowerCase()}${o.maat !== 'standaard' ? ` · ${o.maat}` : ''}, gepoedercoat in RAL ${k.ral}${o.gekozenOpties.some((g) => g.gelukt) ? `, met ${o.gekozenOpties.filter((g) => g.gelukt).map((g) => g.naam.toLowerCase()).join(', ')}` : ''}, zonder levering`;
  $('m-band').style.left = `${(lo / max) * 100}%`; $('m-band').style.width = `${((hi - lo) / max) * 100}%`; $('m-pin').style.left = `${Math.min(100, (kp.incl / max) * 100)}%`;
  $('m-tekst').textContent = `Vergelijkbare toestellen in de winkel: ${eur(lo)} - ${eur(hi)} incl. btw. Eigen werk in staal, met tekeningen en berekening.`;
  $('printkop').innerHTML = `<b>${esc(inst.bedrijf || 'Fitnesstoestellen')}</b> ${esc(inst.contact)}`; $('bedrijf').textContent = inst.bedrijf ? `${inst.bedrijf}${inst.contact ? ` · ${inst.contact}` : ''}` : 'gelast in eigen werkplaats, thuis en pro';
  if (tab === 'tek') {
    const geo = alleGeo(o, false);
    $('tekening').innerHTML = ['voor', 'links', 'boven'].map((n) => { const bb = omhullende(geo, PROJ[n]), s = Math.min(280 / (bb[2] - bb[0]), 280 / (bb[3] - bb[1])); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${tekenBalken(geo, { proj: PROJ[n], schaal: s, ox: 10 - bb[0] * s, oy: 10 - bb[1] * s, lw: 0.7 }).svg}</svg>`; }).join('');
  } else if (s3d) s3d.toon(o, { ral: k.ral, leer: k.leer });
  else if (!bezig) bezig = scene3d($('drie')).then((api) => { s3d = api; $('laden').remove(); teken(); }).catch(() => { $('laden').textContent = '3D lukt niet in deze browser: kijk bij Aanzichten.'; });
}
$('instKnop').addEventListener('click', () => { $('i-bedrijf').value = inst.bedrijf; $('i-contact').value = inst.contact; $('i-prijs').value = inst.prijs; $('i-uurloon').value = inst.uurloon; $('i-marge').value = inst.marge[PER_ID[k.id].soort]; $('inst').showModal(); });
$('i-sluit').addEventListener('click', () => { inst.bedrijf = $('i-bedrijf').value; inst.contact = $('i-contact').value; inst.prijs = $('i-prijs').value; inst.uurloon = Math.max(0, +$('i-uurloon').value || STANDAARD.uurloon); inst.marge[PER_ID[k.id].soort] = Math.max(0, +$('i-marge').value || 0); bewaar(); $('inst').close(); teken(); });
$('print').addEventListener('click', () => print());
tekenLijst(); teken();
