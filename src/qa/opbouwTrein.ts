/**
 * Bouwdocumenten van de kabeldoos (advies Fable 5.2, 2026-11-12), uit voorbeelden/treinverlichting/opbouw.mjs:
 *  - TRN-10 tot TRN-13: opbouwtekening van elke gaatjesprint (A3, 2:1): de componentenzijde met de onderdelen en de
 *    koperzijde (gespiegeld, zoals je de print omdraait) met de SMD-onderdelen, soldeerbruggen, blanke en geïsoleerde
 *    draadbruggen en de draden naar de andere prints (W-nummers);
 *  - TRN-14: de interne draadlijst (van, naar, doorsnede, kleur, lengte uit het 3D-model);
 *  - TRN-20: ingebruikname- en meetblad (A4); TRN-21: invulblad voor de namen van groepen en ingangen (A4).
 * Opgemaakt volgens ISO 5457 (kader), ISO 7200 (titelblok) en ISO 128 (lijnen); gebruikt door tekeningenTrein.test.ts.
 */
import { Blad, kader, getal, esc, type P, type Project } from './werktekening';
// @ts-expect-error: plain JavaScript
import { PRINTS, DRADEN, pinnen, vormen, vrijeGaten, gatXY, brugGaten, PCA_ZIJ } from '../../voorbeelden/treinverlichting/opbouw.mjs';
// @ts-expect-error: plain JavaScript
import { indeling, M } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

type Print = { naam: string; code: string; w: number; h: number; nx: number; ny: number; x0: number; y0: number; schroeven: P[]; boringen: P[]; onderdelen: any[]; bruggen: { soort: string; net: string; pad: P[]; mm2?: number }[]; pca?: { cx: number; cy: number } };
type Eind = [string, ...(string | number)[]];
type Draad = { nr: string; van: Eind; naar: Eind; net: string; mm2: number; kleur: string; wat: string };
const PR = PRINTS as Record<string, Print>;
const DR = DRADEN as Draad[];
export const OPBOUW: { sleutel: string; nr: string }[] = [
  { sleutel: 'uitgang', nr: 'TRN-10' }, { sleutel: 'ingang', nr: 'TRN-11' }, { sleutel: 'voeding', nr: 'TRN-12' }, { sleutel: 'drager', nr: 'TRN-13' },
];
const PRINTNAAM: Record<string, string> = { uitgang: 'uitgangsprint', ingang: 'ingangsprint', voeding: 'voedingsprint', drager: 'draagprint ESP', pca: 'PCA9685', dc: 'DC-bus -X5' };
const RIJ = (r: number) => String.fromCharCode(65 + r);
/** een gat als "C12" (rij-letter en kolom vanaf 1), zoals langs de rand van de print */
export const gatNaam = (c: number, r: number) => `${RIJ(r)}${c + 1}`;
const eindTekst = (e: Eind) => {
  if (e[0] === 'pca') return `PCA9685 ${e[1]}`;
  if (e[0] === 'dc') return `DC-bus ${e[1] === '+' ? 'pen (+)' : 'huls (−)'}`;
  if (e[1] === 'klem') return `${PRINTNAAM[e[0]]} ${e[2]}`;
  return `${PRINTNAAM[e[0]]} ${gatNaam(e[1] as number, e[2] as number)}`;
};

// ---------------------------------------------------------------- de lengte van een draad uit het 3D-model
/** de plaats in de doos (x, y, z) van een eind van een draad */
function plaats(e: Eind): [number, number, number] {
  const L = indeling() as { rijen: { soort: string; cx: number; cz: number }[][]; X: number; cz7: number };
  const rij = L.rijen.flat(), y = M.voet + 1.6;
  const vind = (soort: string) => { const d = rij.find((q) => q.soort === soort)!; return soort === 'esp' ? { cx: d.cx + (d as any).x / 2 - 1.8 - M.esp.x / 2 - M.esp.x / 2 + M.esp.pin.eerste + ((M.esp.pin.n - 1) * M.esp.pin.steek) / 2, cz: d.cz } : d; };
  if (e[0] === 'dc') return [-L.X, M.dcbus.y, L.cz7 + M.dcbus.dz];
  const sl = e[0] === 'drager' ? 'esp' : e[0] === 'pca' ? 'uitgang' : e[0];
  const d = vind(sl), P = PR[e[0] === 'pca' ? 'uitgang' : e[0]], ox = d.cx - P.w / 2, oz = d.cz - P.h / 2;
  if (e[0] === 'pca') {
    const i = PCA_ZIJ.indexOf(e[1] as string), pca = P.pca!;
    const px = i >= 0 ? (i < 6 ? -29.2 : 29.2) : -25.4 + +(e[1] as string).slice(3) * 2.54, pz = i >= 0 ? -6.35 + i * 2.54 : 3.5;
    return [ox + pca.cx + px, y + 10 + 1.6, oz + pca.cy + pz];
  }
  if (e[1] === 'klem') {
    const [ref, nr] = (e[2] as string).split(':'), p = pinnen(P).find((q: any) => q.ref === ref && q.pin === nr);
    const [x, z] = gatXY(P, p.c, p.r);
    return [ox + x, y + 8, oz + z + 3];
  }
  const [x, z] = gatXY(P, e[1] as number, e[2] as number);
  return [ox + x, M.voet, oz + z];
}
/** lengte in mm: langs de assen (zoals een draad door de goten loopt) plus 40 mm om te strippen en een lusje, op 10 afgerond */
export const lengte = (d: Draad) => { const a = plaats(d.van), b = plaats(d.naar); return Math.ceil((Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + 40) / 10) * 10; };

// ---------------------------------------------------------------- een aanzicht van een print
const KLEUR_DRAAD = '#1f4fa3';
function printAanzicht(b: Blad, P: Print, sleutel: string, x0: number, yTop: number, s: number, onder: boolean) {
  const vrij = vrijeGaten(P);
  const X = (x: number) => x0 + (onder ? P.w - x : x) * s, Y = (y: number) => yTop - y * s;
  const g = (c: number, r: number): P => { const [x, y] = gatXY(P, c, r); return [X(x), Y(y)]; };
  b.rect(x0, yTop - P.h * s, P.w * s, P.h * s, 0.5);
  for (const [x, y] of P.schroeven) { b.cirkel([X(x), Y(y)], 1.35 * s, 0.35); b.tekst([X(x), Y(y) - 0.9], 'M2,5', 1.6, 'middle'); }
  for (const [x, y] of P.boringen) { b.cirkel([X(x), Y(y)], 1.35 * s, 0.35); b.cirkel([X(x), Y(y)], 2.5 * s, 0.18); }
  // het raster: elk gat, kolomnummers en rijletters langs de rand
  for (let c = 0; c < P.nx; c++) for (let r = 0; r < P.ny; r++) if (vrij(c, r)) b.el.push(`<circle cx="${g(c, r)[0].toFixed(2)}" cy="${b.y(g(c, r)[1]).toFixed(2)}" r="${(0.45 * s).toFixed(2)}" fill="none" stroke="#999" stroke-width="0.13"/>`);
  for (let c = 0; c < P.nx; c += c === 0 ? 4 : 5) b.tekst([g(c, 0)[0], yTop + 1.5], String(c + 1), 2, 'middle');
  for (let r = 0; r < P.ny; r++) b.tekst([onder ? x0 + P.w * s + 2.5 : x0 - 2.5, g(0, r)[1] - 0.7], RIJ(r), 2, 'middle');
  const pins = pinnen(P);
  if (!onder) {
    // componentenzijde: de omtrek van elk onderdeel, de pinnen (pin 1 vierkant) en de aanduiding
    for (const v of vormen(P) as any[]) {
      if (v.kant !== 'boven') continue;
      const xa = X(v.x0), xb = X(v.x1), ya = Y(v.y1), yb = Y(v.y0);
      if (v.rond) b.cirkel([(xa + xb) / 2, (ya + yb) / 2], v.rond * s, 0.35);
      else b.rect(Math.min(xa, xb), ya, Math.abs(xb - xa), yb - ya, 0.35);
      const t = v.rond ? v.ref : v.o.soort === 'pinrij' ? `${v.ref.replace(' ', ': ')} (pin 1 = antennekant)` : v.o.naam && v.o.naam !== v.ref ? (v.o.soort === 'adapter' ? `${v.ref}: ${v.o.naam}` : v.o.naam) : `${v.ref} ${v.waarde}`;
      const h = Math.min(2.6, Math.max(1.6, (Math.abs(xb - xa) / Math.max(4, t.length)) * 1.6));
      const midY = v.o.soort === 'mpt' || v.o.soort === 'mkds' ? ya + 0.9 : v.o.soort === 'pinrij' ? (v.o.r === 0 ? ya - 3.4 : yb + 1.4) : (ya + yb) / 2 - h / 3;
      b.tekst([(xa + xb) / 2, midY], t, h, 'middle', { vet: true });
      if (v.o.soort === 'adapter') b.tekst([(xa + xb) / 2, midY - 3.2], 'AO3400A in voet DIP-8', 1.6, 'middle');
      if (v.o.soort === 'pololu') b.tekst([(xa + xb) / 2, midY - 3.2], 'EN VIN GND VOUT PG', 1.6, 'middle');
    }
    if (P.pca) {
      const xa = X(P.pca.cx - 31.25), ya = Y(P.pca.cy + 12.7);
      b.el.push(`<rect x="${xa.toFixed(2)}" y="${b.y(ya + 25.4 * s).toFixed(2)}" width="${(62.5 * s).toFixed(2)}" height="${(25.4 * s).toFixed(2)}" fill="none" stroke="#111" stroke-width="0.35" stroke-dasharray="4 1.5 1 1.5"/>`);
      b.tekst([X(P.pca.cx), ya + 25.4 * s + 6], 'PCA9685 (-K2) op 4 afstandsbussen M2,5 x 10 erboven (streep-punt)', 2.2, 'middle');
    }
    for (const p of pins as any[]) {
      if (p.kant !== 'boven') continue;
      const [x, y] = g(p.c, p.r), r = 0.6 * s;
      if (p.pin === '1' && !/^-X/.test(p.ref)) b.el.push(`<rect x="${(x - r).toFixed(2)}" y="${b.y(y + r).toFixed(2)}" width="${(2 * r).toFixed(2)}" height="${(2 * r).toFixed(2)}" fill="#111"/>`);
      else b.el.push(`<circle cx="${x.toFixed(2)}" cy="${b.y(y).toFixed(2)}" r="${r.toFixed(2)}" fill="#111"/>`);
      if (/^-X/.test(p.ref)) b.tekst([x, y + 1.8], p.pin, 1.6, 'middle');
    }
  } else {
    // koperzijde: de eilandjes met een pin of een brug, de SMD-onderdelen en de bruggen
    for (const br of P.bruggen) {
      const pts = (br.soort === 'draad' ? [br.pad[0], br.pad[br.pad.length - 1]] : br.pad).map(([c, r]) => g(c, r));
      const w = { tin: 1.6, blank: 0.5, dik: 1.0, draad: 0.45 }[br.soort] ?? 0.5;
      const kleur = br.soort === 'draad' ? KLEUR_DRAAD : br.soort === 'tin' ? '#8a8d91' : '#111';
      const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${b.y(y).toFixed(2)}`).join(' ');
      b.el.push(`<path d="${d}" fill="none" stroke="${kleur}" stroke-width="${w * (br.soort === 'tin' || br.soort === 'dik' ? s : 1)}" stroke-linecap="round" stroke-linejoin="round"${br.soort === 'draad' ? ' stroke-dasharray="2.2 0.8"' : ''}/>`);
      for (const [c, r] of brugGaten(br)) { const [x, y] = g(c, r); b.el.push(`<circle cx="${x.toFixed(2)}" cy="${b.y(y).toFixed(2)}" r="${(0.75 * s).toFixed(2)}" fill="none" stroke="#111" stroke-width="0.25"/>`); }
    }
    for (const p of pins as any[]) { const [x, y] = g(p.c, p.r); b.el.push(`<circle cx="${x.toFixed(2)}" cy="${b.y(y).toFixed(2)}" r="${(0.75 * s).toFixed(2)}" fill="#c9a44c" stroke="#111" stroke-width="0.25"/>`); }
    for (const v of vormen(P) as any[]) {
      if (v.kant !== 'onder') continue;
      const xa = X(v.x0), xb = X(v.x1), ya = Y(v.y1), yb = Y(v.y0);
      b.el.push(`<rect x="${Math.min(xa, xb).toFixed(2)}" y="${b.y(yb).toFixed(2)}" width="${Math.abs(xb - xa).toFixed(2)}" height="${(yb - ya).toFixed(2)}" fill="${v.soort === 'ptc1812' ? '#f2d36b' : '#d9d9d9'}" fill-opacity="0.85" stroke="#111" stroke-width="0.3"/>`);
      b.tekst([(xa + xb) / 2, (ya + yb) / 2 - 0.6], v.ref, 1.6, 'middle', { vet: true });
    }
    // de draden naar de andere prints
    for (const d of DR) for (const e of [d.van, d.naar]) {
      if (e[0] !== sleutel || e[1] === 'klem') continue;
      const [x, y] = g(e[1] as number, e[2] as number);
      b.el.push(`<circle cx="${x.toFixed(2)}" cy="${b.y(y).toFixed(2)}" r="${(1.1 * s).toFixed(2)}" fill="none" stroke="#c8202f" stroke-width="0.35"/>`);
      b.tekst([x + 1.1 * s, y + ((e[1] as number) % 2 ? 0.9 : -1.9) * s], d.nr, 1.6, 'start', { kleur: '#c8202f', vet: true });
    }
  }
}

/** een opbouwtekening (A3, 2:1) van één gaatjesprint */
export function opbouwBlad(sleutel: string, nr: string, blad: string, project: Project): string {
  const P = PR[sleutel], b = new Blad(), s = 2, x0 = 210 - (P.w * s) / 2 + 10;
  b.tekst([30, 278], `${P.naam}: componentenzijde (2:1)`, 3.5, 'start', { vet: true });
  printAanzicht(b, P, sleutel, x0, 268, s, false);
  const y2 = 268 - P.h * s - 22;
  b.tekst([30, y2 + 10], `${P.naam}: koperzijde, gespiegeld (de print omgedraaid om de lange kant) (2:1)`, 3.5, 'start', { vet: true });
  printAanzicht(b, P, sleutel, x0, y2, s, true);
  // tabellen: de onderdelen en de draden naar buiten
  let y = y2 - P.h * s - 12;
  const onderdelen = (P.onderdelen as any[]).map((o) => {
    const ps = (pinnen({ ...P, onderdelen: [o] }) as any[]).map((p) => gatNaam(p.c, p.r));
    return `${o.ref}${o.waarde ? ' ' + o.waarde : ''}${o.naam && o.naam !== o.ref ? ' (' + o.naam + ')' : ''}: ${ps[0]}${ps.length > 1 ? '..' + ps[ps.length - 1] : ''}${o.soort === 'r1206' || o.soort === 'ptc1812' ? ' (koperzijde)' : ''}`;
  });
  const kol = 3, perKol = Math.ceil(onderdelen.length / kol), bk = 125;
  b.tekst([30, y], 'Onderdelen (aanduiding, waarde, eerste..laatste gat: rij-letter en kolom):', 2.6, 'start', { vet: true });
  onderdelen.forEach((t, i) => b.tekst([30 + Math.floor(i / perKol) * bk, y - 4.2 - (i % perKol) * 3.3], t.length > 62 ? t.slice(0, 60) + '…' : t, 2.1));
  y -= 6 + perKol * 3.3;
  const uit = DR.filter((d) => d.van[0] === sleutel || d.naar[0] === sleutel);
  if (y > 60) {
    b.tekst([30, y], `Draden naar buiten (TRN-14): ${uit.map((d) => d.nr).join(' ')}`, 2.4, 'start', { vet: true });
    b.tekst([30, y - 4], 'Lijnen op de koperzijde: grijs breed = soldeerbrug, zwart dun = blanke draad 0,5, zwart breed = blanke draad Ø1,0 (0,79 mm²), blauw streep = geïsoleerd draadje.', 2.1);
    b.tekst([30, y - 7.4], 'Rode cirkel = hier komt een draad van een andere print (W-nummer). Eerst de voetjes en klemmen, dan de SMD-onderdelen aan de koperzijde, dan de bruggen.', 2.1);
  }
  kader(b, { nr, naam: `Opbouw ${P.naam.toLowerCase()}`, materiaal: 'gaatjesprint FR2, raster 2,54', maken: 'zagen, solderen', massa: '—', schaal: '2:1', blad, soort: 'Opbouwtekening' }, project);
  return b.svg();
}

/** de interne draadlijst (A3) */
export function draadlijstBlad(nr: string, blad: string, project: Project): string {
  const b = new Blad(), k = [['Nr', 12], ['Van', 82], ['Naar', 82], ['Wat', 108], ['mm²', 14], ['Kleur', 18], ['Lengte', 18]] as [string, number][];
  b.tekst([30, 278], 'Interne draadlijst: draden tussen de prints in de doos', 4, 'start', { vet: true });
  b.tekst([30, 272], 'De draden naar de bordjes (G01− .. G16−, R1+ .. R6+) en de ingangen (IN01 .. IN16) staan in de README (Draden labelen). Lengte uit het 3D-model langs de goten + 40 mm.', 2.4);
  let y = 264;
  const rijH = 4.4;
  let x = 30;
  for (const [t, w] of k) { b.tekst([x + 1, y - 3.2], t, 2.5, 'start', { vet: true }); x += w; }
  b.lijn([30, y - 4.4], [30 + k.reduce((a, q) => a + q[1], 0), y - 4.4], 0.35);
  y -= 4.4;
  for (const d of DR) {
    const cel = [d.nr, eindTekst(d.van), eindTekst(d.naar), d.wat, getal(d.mm2, 2), d.kleur, `${lengte(d)} mm`];
    x = 30;
    cel.forEach((t, i) => { b.tekst([x + 1, y - 3.2], t, 2.25, 'start', { vet: i === 0 }); x += k[i][1]; });
    y -= rijH;
    b.lijn([30, y], [30 + k.reduce((a, q) => a + q[1], 0), y], 0.13);
  }
  b.tekst([30, y - 6], 'Doorsnede: 0,75 mm² (H05V-K) voor de 12 V van de DC-bus en de 0 V-retour (tot 5,2 A); 0,25 mm² voor de voeding van regelaar en ingangen; 0,14 mm² (LiY) voor signalen.', 2.3);
  b.tekst([30, y - 10], 'Op de prints zelf: 5,2 A-paden met blanke draad Ø1,0 (0,79 mm²) volgens de opbouwtekeningen TRN-10 tot TRN-13.', 2.3);
  kader(b, { nr, naam: 'Interne draadlijst', materiaal: 'montagedraad', maken: 'knippen, strippen, labelen', massa: '—', schaal: '—', blad, soort: 'Draadlijst' }, project);
  return b.svg();
}

// ---------------------------------------------------------------- A4-bladen (meetblad, invulblad)
class BladA4 extends Blad {
  svg() {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">\n<rect x="0" y="0" width="210" height="297" fill="#fff"/>\n${this.el.join('\n')}\n</svg>\n`;
  }
}
/** kader A4 staand (ISO 5457: 20 mm archiefrand, 10 rondom, centreermerken) en titelblok (ISO 7200) van 180 x 24 */
function kaderA4(b: BladA4, t: { nr: string; naam: string; soort: string; blad: string }, project: Project) {
  b.rect(20, 10, 180, 277, 0.7);
  b.lijn([105, 0], [105, 15], 0.7); b.lijn([105, 297], [105, 282], 0.7); b.lijn([0, 148.5], [25, 148.5], 0.7); b.lijn([210, 148.5], [195, 148.5], 0.7);
  const x0 = 20, y0 = 10, rh = 8;
  b.rect(x0, y0, 180, rh * 3, 0.5);
  for (let n = 1; n < 3; n++) b.lijn([x0, y0 + rh * n], [x0 + 180, y0 + rh * n], 0.25);
  const veld = (xa: number, rij: number, label: string, waarde: string, h2 = 2.6, vet = false) => {
    const y = y0 + rh * rij;
    if (xa > x0) b.lijn([xa, y], [xa, y + rh], 0.25);
    b.tekst([xa + 1.2, y + rh - 2.2], label, 1.7, 'start', { kleur: '#555' });
    b.tekst([xa + 1.2, y + 1.6], waarde, h2, 'start', { vet });
  };
  veld(x0, 2, 'Eigenaar', `Phlippo CAD · ${project.eigenaar ?? 'Ian'}`, 2.4); veld(x0 + 70, 2, 'Project', project.naam, 2.6, true); veld(x0 + 140, 2, 'Taal', 'nl', 2.4);
  veld(x0, 1, 'Titel', t.naam, 3, true); veld(x0 + 110, 1, 'Documentsoort', t.soort, 2.4);
  veld(x0, 0, 'Tekeningnummer', t.nr, 3, true); veld(x0 + 45, 0, 'Rev.', project.revisie ?? '0', 2.4); veld(x0 + 60, 0, 'Uitgifte', project.datum, 2.4);
  veld(x0 + 90, 0, 'Opgesteld', 'Phlippo CAD', 2.2); veld(x0 + 125, 0, 'Goedgekeurd', project.goedgekeurd ?? 'Ian', 2.2); veld(x0 + 155, 0, 'Blad', t.blad, 2.4);
}
/** een tabel met lege vakjes om in te vullen; kolommen [kop, breedte]; rijen: de vaste tekst per rij */
function invulTabel(b: Blad, x: number, y: number, kol: [string, number][], rijen: string[][], rh: number) {
  const bt = kol.reduce((a, q) => a + q[1], 0), n = rijen.length;
  b.rect(x, y - rh * (n + 1), bt, rh * (n + 1), 0.35);
  let xx = x;
  kol.forEach(([t, w], i) => { b.tekst([xx + 1, y - rh + 1.4], t, 2.1, 'start', { vet: true }); if (i) b.lijn([xx, y], [xx, y - rh * (n + 1)], 0.18); xx += w; });
  for (let j = 0; j <= n; j++) b.lijn([x, y - rh * (j + 1)], [x + bt, y - rh * (j + 1)], j ? 0.13 : 0.35);
  rijen.forEach((r, j) => { let xc = x; r.forEach((t, i) => { if (t) b.tekst([xc + 1, y - rh * (j + 2) + 1.4], t, 2.1); xc += kol[i][1]; }); });
}

/** ingebruikname- en meetblad (A4) */
export function meetBlad(nr: string, blad: string, project: Project): string {
  const b = new BladA4();
  b.tekst([25, 280], 'Ingebruikname en metingen', 5, 'start', { vet: true });
  b.tekst([25, 274.5], 'Multimeter, het dashboard (Instellingen › Testmodus). Vul de gemeten waarden in; alles binnen de grenzen = goed.', 2.4);
  const stappen = [
    ['0', 'Proefopstelling: eerst 1 bordje op groep 1 en 1 knop op IN01, de rest nog niet bedraden.', ''],
    ['1', 'Zonder adapter: weerstand tussen J+ (-X1:1) en 0 V (-X1:2)', '> 1 kΩ'],
    ['2', 'Adapter in de DC-bus: spanning -X1:1 – -X1:2 (J+)', '11,6 .. 12,4 V'],
    ['3', 'Spanning -X2:1 – -X2:8 (L+ na zekering en -Q17)', 'J+ − 0,15 V'],
    ['4', 'Regelaar -T2: VOUT – GND (draagprint)', '4,9 .. 5,1 V'],
    ['5', 'ESP 3V3 – G', '3,25 .. 3,35 V'],
    ['6', 'OE (PCA9685) – 0 V terwijl RESET ingedrukt is', '≥ 2,5 V'],
    ['7', 'OE – 0 V tijdens bedrijf (groen lampje)', '< 0,4 V'],
    ['8', '+12 V knoppen: -X4:21 – -X4:23', '11,4 .. 12,4 V'],
    ['9', 'Firmware: versie op het dashboard (Instellingen)', '1.1.0 of hoger'],
    ['10', 'Wifi-wachtwoord gewijzigd; BOOT 5 s zet het terug (proef)', 'gedaan'],
  ];
  invulTabel(b, 25, 270, [['Nr', 8], ['Meting of controle', 107], ['Grens', 26], ['Gemeten', 25], ['OK', 9]], stappen, 5.4);
  const yg = 270 - 5.4 * (stappen.length + 1) - 6;
  b.tekst([25, yg + 2], 'Per groep (testmodus "groep vast", vol licht): stroom in de − van het bordje, spanning drain – source van de MOSFET', 2.4, 'start', { vet: true });
  const groepen = Array.from({ length: 16 }, (_, k) => [String(k + 1), '', '', '']);
  invulTabel(b, 25, yg, [['Groep', 11], ['Stroom (≤ 0,32 A)', 32], ['U DS (< 0,1 V)', 26], ['OK', 9]], groepen, 6.0);
  b.tekst([110, yg - 2], 'Per ingang: knop of sensor bedienen,', 2.3, 'start', { vet: true });
  b.tekst([110, yg - 5.4], 'het dashboard toont "actief" (Ingangen).', 2.3);
  const ingangen = Array.from({ length: 16 }, (_, k) => [String(k + 1), '', '', '']);
  invulTabel(b, 110, yg - 8, [['IN', 9], ['COM aan', 25], ['Actief gezien', 31], ['OK', 9]], ingangen, 5.5);
  b.tekst([25, 41], 'Testmodus "looplicht": groep 1 tot 16 gaan om de beurt aan: kijk of elk bordje op de juiste plaats van de baan oplicht.', 2.2);
  b.tekst([25, 37.5], 'Een groep die niet aangaat: polyfuse -F(n+1) koud? MOSFET in zijn voetje? Meet de stroom pas met het bordje aangesloten.', 2.2);
  kaderA4(b, { nr, naam: 'Ingebruikname en metingen', soort: 'Meetblad', blad }, project);
  return b.svg();
}

/** invulblad voor de namen van de groepen en de ingangen (A4, om bij de baan te hangen) */
export function invulBlad(nr: string, blad: string, project: Project): string {
  const b = new BladA4();
  b.tekst([25, 280], 'Groepen en ingangen van de treinbaan', 5, 'start', { vet: true });
  b.tekst([25, 274.5], 'Hang dit blad bij de baan. Dezelfde namen in het dashboard (Instellingen) en op de labels van de draden (G01−, IN01).', 2.4);
  const g = Array.from({ length: 16 }, (_, k) => [`G${String(k + 1).padStart(2, '0')}`, '', '', '']);
  b.tekst([25, 268], 'Lichtgroepen (één bordje per groep)', 2.8, 'start', { vet: true });
  invulTabel(b, 25, 265, [['Groep', 14], ['Naam (dashboard)', 62], ['Plaats op de baan', 64], ['Bordje (1K / 0 Ω)', 30]], g, 6.3);
  const yi = 265 - 6.3 * 17 - 8;
  b.tekst([25, yi + 3], 'Ingangen (knoppen en sensoren)', 2.8, 'start', { vet: true });
  const i = Array.from({ length: 16 }, (_, k) => [`IN${String(k + 1).padStart(2, '0')}`, '', '', `COM${Math.floor(k / 4) + 1}`, '']);
  invulTabel(b, 25, yi, [['Ingang', 14], ['Naam', 50], ['Soort (knop, schakelaar, PNP, NPN)', 50], ['COM', 14], ['Start functie', 42]], i, 6.3);
  b.tekst([25, 37.5], 'Per COM (4 ingangen) één soort: contact of PNP: COM aan 0 V; NPN, hall of reed naar 0 V: COM aan +12 V.', 2.2);
  kaderA4(b, { nr, naam: 'Namen van groepen en ingangen', soort: 'Invulblad', blad }, project);
  return b.svg();
}
export { esc };
