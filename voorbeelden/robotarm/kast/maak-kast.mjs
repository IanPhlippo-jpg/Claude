// 3D-model van de schakelkast van de robotcel (Rittal VX25 8206.000, 1200 x 2000 x 600 op een sokkel van 100), met de
// montageplaat, goten, DIN-rails, alle toestellen uit indeling.mjs (elk met een typeplaatje/frontje als decal) en de
// twee deuren met HMI, bediening, hoofdschakelaar en ventilatie. Assen: x links naar rechts (0..1200), y omhoog vanaf de
// vloer, z naar voren (achterwand z = 0, deuren z = 600).
// Gebruik: node voorbeelden/robotarm/kast/maak-kast.mjs  -> Schakelkast.kcad (deuren dicht) en Schakelkast-open.kcad
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, component, vlak } from '../../lib/schets.mjs';
import { Plaat } from '../../lib/printplaat.mjs';
import { KAST, GOTEN, RAILS, TOESTELLEN, DEUR } from './indeling.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let tel = 0;
const zv = (z) => vlak(`z${++tel}`, `Plane ${tel}`, [0, 0, z], [0, 0, 1], 'reference');
const met = (doc, ...decals) => ({ ...doc, decals });
/** blok van (x0,y0,z0) tot (x1,y1,z1), in een schets op een vlak loodrecht op Z */
function blok(naam, mat, [x0, y0, z0, x1, y1, z1], r = 0) {
  const o = new Onderdeel(naam, mat);
  o.schets(zv(z0), (s) => s.rrect(x0, y0, x1, y1, r));
  o.extrude('boss', z1 - z0, { naam });
  return o;
}
const GRIJS = { name: 'staalplaat, gepoedercoat RAL 7035', density: 7850, color: '#d4d6d0' };
const PLAAT = { name: 'montageplaat, verzinkt', density: 7850, color: '#c9ccc8' };
const GOOT = { name: 'PVC, grijs RAL 7030', density: 1400, color: '#8f918c' };
const RAIL = { name: 'staal, verzinkt (DIN-rail 35)', density: 7850, color: '#b8bcbf' };

/** frontje van een toestel: code groot, type klein, en een paar herkenbare details (leds, schermpje, stekkers) */
function frontje(t) {
  const p = new Plaat(t.b, t.h, { masker: 'geen', ppm: 8 });
  const donker = /^#[0-4]/.test(t.kleur), ink = donker ? '#f2f2ee' : '#16181a';
  const h = Math.min(t.b / 4.2, 9);
  // wit etiket bovenaan met de aanduiding (zoals in een echte kast)
  p.eigen(`<rect x="${t.b * 0.08}" y="2" width="${t.b * 0.84}" height="${h + 3}" rx="1" fill="#ffffff" stroke="#16181a" stroke-width="0.3"/>`);
  p.tekst(t.b / 2, 2 + (h + 3) / 2, t.code, { h: h * 0.75, vet: true, kleur: '#16181a' });
  const regels = String(t.type).split(/(?<=\)) | \+ /).slice(0, 3);
  regels.forEach((r, i) => p.tekst(t.b / 2, h + 10 + i * Math.min(4, t.b / 14), r.length > 40 ? r.slice(0, 40) + '…' : r, { h: Math.min(2.6, t.b / 22), kleur: ink }));
  if (/^-T1\d/.test(t.code)) { // servoversterker: display, leds, EtherCAT-poorten, STO-stekker
    p.eigen(`<rect x="${t.b * 0.2}" y="${t.h * 0.3}" width="${t.b * 0.6}" height="16" fill="#0c3b16"/><text x="${t.b / 2}" y="${t.h * 0.3 + 11}" font-family="Consolas,monospace" font-size="9" fill="#38f06a" text-anchor="middle">rdy</text>`);
    for (let k = 0; k < 2; k++) p.eigen(`<rect x="${t.b * 0.18 + k * t.b * 0.34}" y="${t.h * 0.62}" width="${t.b * 0.28}" height="14" fill="#1b1c1e" stroke="#7d8288" stroke-width="0.6"/>`);
    p.eigen(`<rect x="${t.b * 0.25}" y="${t.h * 0.82}" width="${t.b * 0.5}" height="18" fill="#2a8a3e"/>`);
  }
  if (/^-F1\d|^-F[2-4]$/.test(t.code)) p.eigen(`<rect x="${t.b * 0.3}" y="${t.h * 0.42}" width="${t.b * 0.4}" height="${t.h * 0.22}" rx="2" fill="#2a2c2f"/>`); // hendel
  if (t.code === '-K2') { for (let k = 0; k < 8; k++) p.eigen(`<circle cx="${12 + (k % 4) * 20}" cy="${50 + Math.floor(k / 4) * 10}" r="2.2" fill="${k < 5 ? '#2fd15a' : '#3a3c3f'}"/>`); }
  if (t.code === '-K1') { for (let k = 0; k < 4; k++) p.eigen(`<rect x="${20 + k * 40}" y="${t.h - 40}" width="28" height="22" fill="#111" stroke="#888" stroke-width="0.6"/>`); }
  if (/^-X/.test(t.code)) { const n = Math.floor(t.b / 5.2); for (let k = 0; k < n; k++) p.eigen(`<rect x="${k * 5.2 + 0.4}" y="${t.h * 0.45}" width="4.4" height="${t.h * 0.3}" fill="${k % 2 ? '#d7d9d4' : '#c2c5c0'}"/>`); }
  return p;
}
// modulaire DIN-railtoestellen (DIN 43880): smalle voet, een trap en de kap van 45 mm hoog die door de afdekplaat steekt
const MODULAIR = /^-(F\d+|Q2|K1[1-4]|X9)$/;
function toestel(t, x0, y0, z0) {
  const mat = { name: t.type, density: 1500, color: t.kleur };
  let o, front = z0 + t.d;
  if (MODULAIR.test(t.code) && t.h >= 80) {
    // voet tot 70 % van de diepte over de volle hoogte, de kap (45 hoog) tot de volle diepte
    o = blok(`${t.code} ${t.naam}`, mat, [x0, y0, z0, x0 + t.b, y0 + t.h, z0 + t.d * 0.7], 1.5);
    const ym = y0 + t.h / 2;
    o.schets(zv(z0 + t.d * 0.7 - 0.5), (s) => s.rrect(x0 + 0.5, ym - 22.5, x0 + t.b - 0.5, ym + 22.5, 1.5));
    o.extrude('boss', t.d * 0.3 + 0.5, { naam: 'Kap 45 mm' });
  } else {
    o = blok(`${t.code} ${t.naam}`, mat, [x0, y0, z0, x0 + t.b, y0 + t.h, z0 + t.d], Math.min(2, t.b / 10));
    if (/^-T1\d$/.test(t.code)) {
      // steekbare klemmen: voeding boven (L1 L2 L3), motor onder (U V W PE), groen
      o.schets(zv(z0 + t.d - 0.5), (s) => { s.rrect(x0 + t.b * 0.15, y0 + t.h - 30, x0 + t.b * 0.85, y0 + t.h - 8, 1); s.rrect(x0 + t.b * 0.15, y0 + 8, x0 + t.b * 0.85, y0 + 30, 1); });
      o.extrude('boss', 14.5, { naam: 'Klemmen' });
    }
  }
  const p = frontje(t);
  // het frontje op de kap (modulair) of op de voorkant
  return met(o.doc(), p.decal('dc1', `Front ${t.code}`, [x0 + t.b / 2, y0 + t.h / 2, front], { normaal: [0, 0, 1] }));
}
/** deksel van een kabelgoot met de uiteinden van de kamvingers langs beide randen */
function gootDecal(g, x0, y0, z) {
  const lang = g.b > g.h, L = lang ? g.b : g.h, Bq = lang ? g.h : g.b, p = new Plaat(g.b, g.h, { masker: 'geen', ppm: 2 });
  p.eigen(`<rect width="${g.b}" height="${g.h}" fill="#9a9c97"/>`);
  for (let k = 6; k < L - 6; k += 12.5) {
    const r = lang ? [[k, 0, 6.2, 7], [k, g.h - 7, 6.2, 7]] : [[0, k, 7, 6.2], [g.b - 7, k, 7, 6.2]];
    for (const [x, y, w, h] of r) p.eigen(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5f615c"/>`);
  }
  p.eigen(lang ? `<rect x="0" y="${Bq / 2 - 0.6}" width="${L}" height="1.2" fill="#8a8c87"/>` : '');
  return p.decal('dc1', 'Deksel goot', [x0 + g.b / 2, y0 + g.h / 2, z], { normaal: [0, 0, 1] });
}
function railDecal(r, x0, y0, z) {
  const p = new Plaat(r.b, 35, { masker: 'geen', ppm: 3 });
  for (let k = 10; k < r.b - 15; k += 25) p.eigen(`<rect x="${k}" y="13" width="15" height="5.2" rx="2.6" fill="#55595d"/>`);
  return p.decal('dc1', 'Sleufgaten', [x0 + r.b / 2, y0 + 17.5, z], { normaal: [0, 0, 1] });
}
/** knop, lamp of scherm op de deur (voorkant van de deur op z = 0 van het deurdeel); het scherm toont de HMI */
const HMI_BEELD = join(HERE, '..', 'hmi', 'beelden', 'hmi-overzicht.png');
function deurToestel(e) {
  const o = new Onderdeel(`${e.code} ${e.naam}`, { name: e.type, density: 1500, color: e.kleur });
  o.schets(zv(0), (s) => (e.rond ? s.cirkel(0, 0, e.b / 2) : s.rrect(-e.b / 2, -e.h / 2, e.b / 2, e.h / 2, 4)));
  o.extrude('boss', e.uitbouw, { naam: e.code });
  const d = o.doc();
  if (e.code === '-P10' && existsSync(HMI_BEELD)) {
    // 15,6" 16:9: beeld 344 x 194 in de rand van het paneel
    const beeld = 'data:image/png;base64,' + readFileSync(HMI_BEELD).toString('base64');
    return met(d, { id: 'dc1', name: 'HMI-beeld', face: { normal: [0, 0, 1], point: [0, 0, e.uitbouw] }, image: beeld, width: 344, height: 194, rotation: 0, lighting: 'custom', brightness: 0.9, shininess: 0.6 });
  }
  if (/^-E[12]$/.test(e.code)) {
    const p = new Plaat(e.b, e.h, { masker: 'geen', ppm: 3 });
    for (let k = 0; k < 14; k++) p.eigen(`<rect x="${e.b * 0.08}" y="${e.h * 0.1 + k * e.h * 0.057}" width="${e.b * 0.84}" height="${e.h * 0.03}" rx="2" fill="#9fa39d"/>`);
    p.tekst(e.b / 2, e.h * 0.94, e.code === '-E1' ? 'RITTAL TopTherm  ↑ IN' : 'RITTAL TopTherm  ↑ UIT', { h: 9, kleur: '#4a4d48' });
    return met(d, p.decal('dc1', 'Rooster', [0, 0, e.uitbouw], { normaal: [0, 0, 1] }));
  }
  return d;
}
/** opschriften op de voorkant van een deur: legendaplaatjes onder de knoppen, gele schijf achter de noodstop, de
 *  hoofdschakelaarplaat, kastaanduiding en waarschuwing elektrische spanning (ISO 7010 W012) */
function deurOpschriften(kant, dd, H) {
  const decals = [], links = kant === 'links';
  // links: voorkant op lokaal z = dd (normaal +Z); rechts: voorkant op lokaal z = 0 (normaal -Z, x gespiegeld)
  const plaats = (x, y) => (links ? [x, H - y, dd] : [600 - 2 - x, H - y, 0]);
  const normaal = links ? [0, 0, 1] : [0, 0, -1];
  const draai = links ? 0 : 180; // rechts: de voorkant is het achtervlak van het deurdeel, het beeld staat anders op zijn kop
  let n = 0;
  const zet = (p, x, y) => decals.push(p.decal(`dc${++n}`, `Opschrift ${n}`, plaats(x, y), { normaal, draai }));
  for (const e of DEUR.filter((d) => d.deur === kant)) {
    if (e.code === '-S2') { const p = new Plaat(90, 90, { masker: 'geen', ppm: 6 }); p.eigen('<circle cx="45" cy="45" r="44" fill="#f2c400"/>'); p.tekst(45, 80, 'NOODSTOP', { h: 7, vet: true, kleur: '#16181a' }); zet(p, e.x, e.y); }
    else if (/^-S[3-6]$/.test(e.code)) {
      const t = { '-S3': 'RESET', '-S4': 'AUTO  0  HAND', '-S5': 'START', '-S6': 'STOP' }[e.code];
      const p = new Plaat(80, 18, { masker: 'geen', ppm: 6 }); p.eigen('<rect width="80" height="18" rx="2" fill="#16181a"/>'); p.tekst(40, 9, t, { h: 6.5, vet: true, kleur: '#f2f2ee' }); zet(p, e.x, e.y + 45);
    } else if (e.code === '-Q1') {
      const p = new Plaat(150, 150, { masker: 'geen', ppm: 5 }); p.eigen('<rect width="150" height="150" rx="6" fill="#f2c400"/>'); p.tekst(75, 14, 'HOOFDSCHAKELAAR', { h: 8, vet: true, kleur: '#16181a' }); p.tekst(22, 75, '0', { h: 16, vet: true, kleur: '#16181a' }); p.tekst(128, 75, 'I', { h: 16, vet: true, kleur: '#16181a' }); zet(p, e.x, e.y);
    } else if (e.code === '-P10') {
      const p = new Plaat(300, 20, { masker: 'geen', ppm: 5 }); p.eigen('<rect width="300" height="20" rx="2" fill="#16181a"/>'); p.tekst(150, 10, 'ROBOTCEL PR 120  ·  =ROB +KAST  ·  -P10', { h: 7, vet: true, kleur: '#f2f2ee' }); zet(p, e.x, e.y - e.h / 2 - 30);
    }
  }
  if (!links) {
    const p = new Plaat(100, 88, { masker: 'geen', ppm: 6 }); p.eigen('<path d="M50 2 L98 86 L2 86 Z" fill="#16181a"/><path d="M50 12 L90 80 L10 80 Z" fill="#f9c80e"/><path d="M55 30 L42 56 L52 56 L45 74 L62 46 L52 46 L58 30 Z" fill="#16181a"/>'); zet(p, 300, 515);
    const q = new Plaat(220, 60, { masker: 'geen', ppm: 5 }); q.eigen('<rect width="220" height="60" rx="3" fill="#ffffff" stroke="#16181a"/>'); q.tekst(110, 20, '=ROB +KAST', { h: 14, vet: true, kleur: '#16181a' }); q.tekst(110, 45, '3 x 400 V / N / PE, 50 Hz, 32 A · Icc 10 kA', { h: 7, kleur: '#16181a' }); zet(q, 300, 1250);
  }
  return decals;
}

export function kast({ open = false } = {}) {
  const { b: B, h: H, d: D, sokkel: S, plaat: P } = KAST, comps = [];
  const at = (id, naam, doc, p = [0, 0, 0], rot) => comps.push(component(id, naam, doc, p, rot ? { rotation: rot } : {}));
  // behuizing: sokkel, bodem met kabelinvoerplaat, zijwanden, achterwand, dak (wanden 2 mm, voorzijde open voor de deuren)
  const w = 15; // frameprofiel/wand samen
  at('k1', 'Sokkel 100<1>', blok('Sokkel 100 (Rittal VX)', { name: 'staal, RAL 9005', density: 7850, color: '#1d1e20' }, [0, 0, 0, B, S, D], 0).doc());
  at('k2', 'Behuizing<1>', (() => {
    const o = new Onderdeel(`Behuizing ${KAST.type}`, GRIJS);
    o.schets(zv(0), (s) => { s.rrect(0, S, B, S + H, 0); s.rrect(w, S + w, B - w, S + H - w, 0); });
    o.extrude('boss', D - 2, { naam: 'Mantel' });
    o.schets(zv(0), (s) => s.rrect(w - 0.5, S + w - 0.5, B - w + 0.5, S + H - w + 0.5, 0));
    o.extrude('boss', 2, { naam: 'Achterwand' });
    return met(o.doc(), (() => { const p = new Plaat(140, 40, { masker: 'geen', ppm: 6 }); p.eigen('<rect width="140" height="40" fill="#e8e9e5"/>'); p.tekst(70, 14, 'RITTAL VX25', { h: 8, vet: true, kleur: '#16181a' }); p.tekst(70, 30, '8206.000  1200 x 2000 x 600', { h: 4.5, kleur: '#16181a' }); return p; })()
      .decal('dc1', 'Typeplaatje kast', [B - 150, S + H - 60, D - 2], { normaal: [0, 0, 1] }));
  })());
  // montageplaat (3 mm) op 30 mm voor de achterwand
  const px = (B - P.b) / 2, pyTop = S + (H + P.h) / 2, pz = 32;
  const plaatY = (y, h) => pyTop - y - h; // van tekening (y omlaag) naar 3D (y omhoog)
  at('k3', 'Montageplaat<1>', blok('Montageplaat 1099 x 1896 x 3', PLAAT, [px, plaatY(0, P.h), pz - 3, px + P.b, pyTop, pz]).doc());
  GOTEN.forEach((g, i) => {
    const o = new Onderdeel(`Kabelgoot ${g.b > g.h ? `${g.b} x 60` : `60 x ${g.h}`}, hoogte 80`, GOOT);
    o.schets(zv(pz), (s) => { s.rrect(px + g.x, plaatY(g.y, g.h), px + g.x + g.b, plaatY(g.y, g.h) + g.h, 0); });
    o.extrude('boss', 80, { naam: 'Goot' });
    at(`g${i + 1}`, `Kabelgoot<${i + 1}>`, met(o.doc(), gootDecal(g, px + g.x, plaatY(g.y, g.h), pz + 80)));
  });
  RAILS.forEach((r, i) => at(`d${i + 1}`, `DIN-rail<${i + 1}>`, met(blok('DIN-rail 35 x 7,5', RAIL, [px + r.x, plaatY(r.y, 35), pz, px + r.x + r.b, plaatY(r.y, 35) + 35, pz + 7.5]).doc(), railDecal(r, px + r.x, plaatY(r.y, 35), pz + 7.5))));
  // bodem met invoerplaat en kabelwartels (M25/M32), kastlamp boven en een documentenvak in de linkerdeur
  at('k4', 'Bodemplaat met wartels<1>', (() => {
    const o = blok('Bodem- en invoerplaat', GRIJS, [w, S, w + 40, B - w, S + 3, D - 60]);
    o.schets(vlak('bw', 'Plane wartels', [0, S + 3, 0], [0, 1, 0], 'reference'), (s) => [...Array(10)].forEach((_, k) => s.cirkelW([180 + k * 90, S + 3, 320], k < 6 ? 20 : 25)));
    o.extrude('boss', 22, { naam: 'Wartels' });
    return o.doc();
  })());
  at('k5', 'Kastlamp LED<1>', blok('Kastlamp LED 600 mm met deurschakelaar (Rittal SZ)', { name: 'aluminium, wit', density: 2700, color: '#f4f4ef' }, [300, S + H - w - 40, 380, 900, S + H - w, 420]).doc());
  // toestellen: op de DIN-rail (z vanaf 7,5) of rechtstreeks op de plaat (servoversterkers, PC, filter, remweerstand)
  const opPlaat = /^-(T1\d|R1|R11|K1|Q1)$/;
  TOESTELLEN.forEach((t, i) => at(`t${i + 1}`, `${t.code}<1>`, toestel(t, px + t.x, plaatY(t.y, t.h), pz + (opPlaat.test(t.code) || t.code === '-PE' ? 0 : 7.5))));
  // deuren: links scharniert op x = 0, rechts op x = B; dicht of 100° open
  const dz = D, dd = 22;
  const deur = (kant) => {
    const o = new Onderdeel(`Deur ${kant} 600 x 2000 (met dichting)`, GRIJS);
    o.schets(zv(0), (s) => s.rrect(0, 0, B / 2 - 2, H, 3));
    o.extrude('boss', dd, { naam: 'Deur' });
    o.schets(zv(dd), (s) => s.rrect(B / 2 - 60, H / 2 - 120, B / 2 - 30, H / 2 + 120, 8));
    o.extrude('boss', 25, { naam: 'Greep' });
    if (kant === 'links') {
      // documentenvak A4 aan de binnenkant (schema's, klemmenplan, stuklijst)
      o.schets(zv(-15), (s) => s.rrect(150, 900, 400, 1230, 4));
      o.extrude('boss', 15.5, { naam: 'Documentenvak' });
    }
    return met(o.doc(), ...deurOpschriften(kant, dd, H));
  };
  const hoek = open ? 100 : 0, rad = (hoek * Math.PI) / 180;
  const q = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
  // linkerdeur: deurdeel x 0..598 vanaf het scharnier; rechterdeur gespiegeld via 180° om Y
  at('w1', 'Deur links<1>', deur('links'), [0, S, dz], q(-rad));
  at('w2', 'Deur rechts<1>', deur('rechts'), [B, S, dz + dd], q(Math.PI + rad));
  // de toestellen in de deuren (in de assen van elke deur: x vanaf het scharnier, y vanaf de onderkant van de deur)
  DEUR.forEach((e, i) => {
    const links = e.deur === 'links';
    const lx = links ? e.x : B / 2 - e.x, ly = H - e.y; // indeling: x vanaf de linkerrand van die deur, y vanaf boven
    // punt op de voorkant van de deur, in wereldassen
    const a = links ? -rad : Math.PI + rad, c = Math.cos(a), s = Math.sin(a);
    const lokaal = links ? [lx, ly, dd] : [lx, ly, 0];
    const hinge = links ? [0, S, dz] : [B, S, dz + dd];
    const wx = hinge[0] + lokaal[0] * c + lokaal[2] * s, wz = hinge[2] - lokaal[0] * s + lokaal[2] * c;
    at(`e${i + 1}`, `${e.code}<1>`, deurToestel(e), [wx, S + ly, wz], q(links ? -rad : rad)); // de voorkant van de deur draait mee
  });
  return { format: 'phlippo-cad', version: 1, name: `Schakelkast robotcel${open ? ' (deuren open)' : ''}`, units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(HERE, 'Schakelkast.kcad'), JSON.stringify(kast(), null, 1) + '\n');
  writeFileSync(join(HERE, 'Schakelkast-open.kcad'), JSON.stringify(kast({ open: true }), null, 1) + '\n');
  console.log('geschreven: Schakelkast.kcad en Schakelkast-open.kcad');
}
