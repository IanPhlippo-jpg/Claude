// De catalogus: alle toestellen van de vier soorten, en toestel(id, versie) dat het model bouwt (met cache).
// Node en browser.
import { VERSIE } from './onderdelen.mjs';
import { bouwer, afwerken } from './model.mjs';
import { REKKEN } from './rekken.mjs';
import { snoeiWestside, knelAfstanden, klemLengte, boutLengte } from './controle.mjs';
import { KOOP } from './onderdelen.mjs';
import { details } from './detail.mjs';
import { BANKEN } from './banken.mjs';
import { KABEL } from './kabel.mjs';
import { PLATE } from './plate.mjs';
import { SELECTORIZED } from './selectorized.mjs';
import { RIGS } from './rigs.mjs';
import { OPSLAG } from './opslag.mjs';
import { BUITEN } from './buiten.mjs';
import { proUiterlijk, stijlVersie } from './pro.mjs';
import { optiesBouwen } from './opties.mjs';

export const TOESTELLEN = [...REKKEN, ...BANKEN, ...KABEL, ...PLATE, ...SELECTORIZED, ...RIGS, ...OPSLAG, ...BUITEN];
export const PER_ID = Object.fromEntries(TOESTELLEN.map((t) => [t.id, t]));
/** de uitvoeringen: thuis (klasse H), semi-pro en pro (klasse S) */
export const UITVOERINGEN = ['thuis', 'semi', 'pro'];
// semi-pro: maximale last ± 80 % van pro (niet minder dan thuis), marktband afgeleid uit het midden van thuis en pro
const r10 = (v) => Math.round(v / 10) * 10;
// kabelmachines met een gewichtstapel: maat = stapelgrootte (compact 4 platen minder, XL 4 platen meer)
for (const t of KABEL) if (/stapel|crossover|functional|kabeltoren|pec deck/i.test(`${t.naam} ${t.kort}`) && !t.maten) t.maten = ['compact', 'standaard', 'XL'];
for (const t of TOESTELLEN) {
  if (t.maxLast && t.maxLast.semi == null) t.maxLast.semi = Math.max(t.maxLast.thuis ?? 0, r10(0.8 * (t.maxLast.pro ?? 0)));
  if (t.markt && !t.markt.semi) { const [a, b] = [t.markt.thuis, t.markt.pro]; t.markt.semi = [r10((a[0] + b[0]) / 2), r10((a[1] + b[1]) / 2)]; t.markt.bronS = 'AFGELEID: midden tussen de thuis- en de promarkt (licht commercieel), geen eigen bron'; }
}
const cache = new Map();
/** het model van een toestel in een versie ('thuis' of 'pro') */
export function toestel(id, versie = 'thuis', opt = {}) {
  const stand = opt.stand ?? 0, key = `${id}|${versie}|${stand}|${opt.wagen ?? ''}|${opt.maat ?? ''}|${JSON.stringify(opt.afwerking ?? {})}|${[...(opt.opties ?? [])].sort().join(',')}`;
  if (cache.has(key)) return cache.get(key);
  const def = PER_ID[id];
  if (!def) throw new Error(`onbekend toestel ${id}`);
  const V = stijlVersie(VERSIE[versie], def.soort), b = bouwer(V, stand);
  b.o.opties = opt;
  def.bouw.call(def, b, V);
  proUiterlijk(b, def);
  optiesBouwen(b, def);
  const o = afwerken(b.o);
  snoeiWestside(o);
  o.def = def; o.id = id; o.versie = versie; o.naam = def.naam; o.maxLast = def.maxLast?.[versie] ?? 0; o.stand = stand; o.maat = (def.maten ?? []).includes(opt.maat) ? opt.maat : 'standaard';
  for (const p of o.pennen) if (!p.F && p.factor === 'vanghaak' && o.maxLast) p.F = o.maxLast / 2; // J-cup, spotter, safety: de halve last per kant
  // P2-06: boutlengte per verbinding en een kooplijn per lengte; afstandsbussen in doorgeboute kokers
  let bussen = 0;
  for (const bt of o.bouten) {
    if (bt.key === 'anker' || !KOOP[bt.key]?.M) continue;
    const pts = bt.punten ?? [bt.p], kl = pts.map((p) => klemLengte(o, bt, p)), klem = Math.max(...kl.map((x) => x.klem)), bl = boutLengte(bt.M, klem);
    bussen += kl.reduce((s, x) => s + x.kokers.length, 0) * (bt.n / pts.length);
    const key = `${bt.key}x${bl.L}`, basis = KOOP[bt.key], baseL = bt.M >= 16 ? 130 : 100;
    if (!KOOP[key]) KOOP[key] = { ...basis, naam: `Bout M${bt.M} x ${bl.L} 8.8 verzinkt + borgmoer + 2 ringen`, artikel: `DIN 931 M${bt.M}x${bl.L} + DIN 985 + DIN 125`, prijs: Math.round(basis.prijs * (0.6 + 0.4 * bl.L / baseL) * 100) / 100 };
    Object.assign(bt, { klem, lengteNodig: bl.nodig, L: bl.L });
    if (bt.koop) { bt.koop.key = key; bt.koop.naam = `${KOOP[key].naam}: ${bt.naam} (klem ${klem} mm)`; }
  }
  if (bussen) o.koop.push({ id: 'k-bus', soort: 'koop', key: 'afstandsbus', n: Math.round(bussen), naam: 'Afstandsbus in doorgeboute koker (de wanden niet intrekken)', groep: 'afwerking', geo: [] });
  // P2-16: wat nodig is om het toestel af te bouwen en te leveren
  const extra = (key, n, naam) => { if (n > 0) o.koop.push({ id: `k-${key}`, soort: 'koop', key, n, naam, groep: 'afwerking', geo: [] }); };
  extra('griptape', o.delen.filter((d) => /^(Greep|Handgreep)/.test(d.naam)).length, 'Rubber handvat of griptape op de grepen');
  const anti = o.delen.filter((d) => d.soort === 'plaat' && /Voetplaat|Platform|Voetblok|Opstap|Voetsteun/.test(d.naam)).reduce((s, d) => s + (d.l * d.bmaat) / 1e6, 0);
  if (anti > 0) o.koop.push({ id: 'k-antislip', soort: 'koop', key: 'antislip', n: 1, meter: null, oppervlak: Math.round(anti * 100) / 100, naam: 'Antislip op voetplaten en platform', groep: 'afwerking', geo: [] });
  extra('borgveer', o.koop.filter((k) => /pullpin/.test(k.key ?? '')).reduce((s, k) => s + k.n, 0), 'Borgveer (veiligheidsclip) bij elke veerpen');
  extra('typeplaat', 1, 'Typeplaatje (prototype: proeflast nodig) met 4 blindklinknagels');
  if (!o.instructieOpKap) extra('instructiesticker', 1, 'Instructieplaat op het frame (oefeningen, spieren, pen-instructie)');
  extra('waarschuwing', 1, 'Waarschuwingsstickers: klempunten, pen-instructie, maximale last');
  extra('maskeer', o.delen.reduce((s, d) => s + d.gaten.length, 0) + 10, 'Maskeerdoppen en -pluggen (boringen, lagerzittingen, schroefdraad) voor het poedercoaten');
  extra('vet', 1, 'Smeermiddel voor pennen, geleidestangen en lagers');
  // verpakking en handleiding staan in de overhead van de prijs (P2-25 v6: niet dubbel tellen)
  extra('gereedschap', 1, 'Montageset: steeksleutels/doppen 19 en 24, inbus 5 en 6, in een zakje bij de levering');
  extra('kabelgeleider', o.katrollen.length, 'Kabelgeleider (nylon bus in de beugel) bij elke katrol');
  const traan = o.delen.filter((d) => d.soort === 'plaat' && /traanplaat/i.test(d.opm ?? ''));
  for (const d of traan) d.materiaal = 'traanplaat S235 5/7 mm (EN 10025-2)';
  if (traan.length) o.koop.push({ id: 'k-traan', soort: 'koop', key: 'traanplaat', n: 1, oppervlak: Math.round(traan.reduce((s2, d) => s2 + (d.l * d.bmaat) / 1e6, 0) * 100) / 100, naam: `Traanplaat 5/7 mm (${traan.length} stuk${traan.length > 1 ? 'ken' : ''}, laseren op maat)`, groep: 'afwerking', geo: [] });
  o.detail = [...details(o), ...o.pronk];
  // knelpunten over de slag: kleinste afstand bewegend - vast in stand 0, 0,5 en 1 (lui berekend, voor de berekening)
  o.knelMeting = () => [0, 0.5, 1].flatMap((st) => knelAfstanden(st === stand ? o : toestel(id, versie, { ...opt, stand: st })).map((k) => ({ ...k, stand: st })));
  cache.set(key, o);
  return o;
}
export const leegCache = () => cache.clear();
