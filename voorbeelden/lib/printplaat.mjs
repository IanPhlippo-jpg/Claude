// Printplaat-artwork als decal: het bovenvlak van een print zoals hij er echt uitziet. Soldeermasker met de textuur van
// het glasweefsel (FR4) eronder, koperbanen en kopervlakken onder het masker (iets lichter, zoals op een echte print),
// blanke pads (HASL tin of ENIG goud), via's en de witte opdruk (zeefdruk) met tekst en omtrekken.
// Coördinaten in mm met de oorsprong linksboven in het beeld; van boven gezien loopt beeld-x langs +X en beeld-y langs
// +Z van het onderdeel (zo legt de app een decal op een vlak dat naar +Y wijst). `decal()` geeft het Decal-object voor
// het document van het onderdeel.

const MASKERS = {
  // [masker, koper onder het masker, rand van een baan]
  zwart: ['#16171a', '#2e3035', '#0d0e10'],
  rood: ['#a8131d', '#d4404a', '#7e0c14'],
  blauw: ['#123d8c', '#2457b8', '#0b2b66'],
  groen: ['#155c30', '#23793f', '#0e4423'],
};
const SILK = '#f2f2ec';
const FONT = "Arial, 'Liberation Sans', 'DejaVu Sans', sans-serif";
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (v) => +v.toFixed(3);

export class Plaat {
  /**
   * @param w breedte (mm, langs beeld-x)  @param h hoogte (mm, langs beeld-y)
   * @param opts masker: zwart | rood | blauw | groen | fr2 (gaatjesprint zonder masker) | geen (doorzichtig: opschrift op
   *   een kap); afwerking: hasl | enig; ppm: pixels per mm van het beeld
   */
  constructor(w, h, { masker = 'zwart', afwerking = 'hasl', ppm = 36, seed = 7 } = {}) {
    Object.assign(this, { w, h, masker, afwerking, ppm, seed });
    this.koper = []; // onder het masker
    this.blank = []; // pads en ringen (open in het masker)
    this.gaten = []; // donkere gaten (boven alles behalve de opdruk)
    this.zeef = []; // opdruk
    this.vrij = []; // eigen svg boven het masker (bv. de matrixcode op een kap)
    this.groep = null; // transformatie voor tekeningcoördinaten
  }
  /** teken in een ander assenstelsel (bv. de maattekening van de fabrikant): matrix a b c d e f van SVG */
  stelsel(m) { this.groep = m; return this; }
  baan(pts, b = 0.25) { this.koper.push(`<polyline points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="K" stroke-width="${b}" stroke-linecap="round" stroke-linejoin="round"/>`); return this; }
  vlak(pts) { this.koper.push(`<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="K"/>`); return this; }
  /** SMD-pad (rechthoek, midden x y) */
  pad(x, y, w, h, r = 0.08) { this.blank.push(`<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="P"/>`); return this; }
  /** doorgemetalliseerd gat: koperring met (donker) gat; het echte gat zit in het model */
  ring(x, y, d, gat = d * 0.55, vierkant = false) {
    this.blank.push(vierkant ? `<rect x="${f(x - d / 2)}" y="${f(y - d / 2)}" width="${f(d)}" height="${f(d)}" fill="P"/>` : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(d / 2)}" fill="P"/>`);
    this.gaten.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(gat / 2)}" fill="#050505"/>`);
    return this;
  }
  via(x, y, d = 0.6) { this.koper.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(d / 2)}" fill="K"/>`); this.gaten.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(d * 0.22)}" fill="#3a3324"/>`); return this; }
  gat(x, y, d) { this.gaten.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(d / 2)}" fill="#141210"/>`); return this; }
  tekst(x, y, t, { h = 1, anker = 'middle', draai = 0, vet = false, kleur = SILK, laag = 'zeef' } = {}) {
    const tr = draai ? ` transform="rotate(${draai} ${f(x)} ${f(y)})"` : '';
    this[laag].push(`<text x="${f(x)}" y="${f(y)}" font-family="${FONT}" font-size="${f(h * 1.38)}" font-weight="${vet ? 700 : 400}" text-anchor="${anker}" dominant-baseline="central" fill="${kleur}"${tr}>${esc(t)}</text>`);
    return this;
  }
  lijn(pts, b = 0.15, kleur = SILK) { this.zeef.push(`<polyline points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="${kleur}" stroke-width="${b}" stroke-linecap="round" stroke-linejoin="round"/>`); return this; }
  kader(x, y, w, h, b = 0.15) { return this.lijn([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], b); }
  cirkel(x, y, r, b = 0.15, vol = false) { this.zeef.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${vol ? `fill="${SILK}"` : `fill="none" stroke="${SILK}" stroke-width="${b}"`}/>`); return this; }
  eigen(svg) { this.vrij.push(svg); return this; }

  svg() {
    const { w, h, ppm, masker, seed } = this;
    const [M, K, R] = MASKERS[masker] ?? MASKERS.zwart;
    const pad = this.afwerking === 'enig' ? 'url(#goud)' : 'url(#tin)';
    const kleur = (s) => s.replace(/"K"/g, `"${K}"`).replace(/"P"/g, `"${pad}"`);
    const g = (inhoud) => (this.groep ? `<g transform="matrix(${this.groep.join(' ')})">${inhoud}</g>` : inhoud);
    const defs = `<defs>
<linearGradient id="tin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4e6e6"/><stop offset="0.55" stop-color="#b9bcbd"/><stop offset="1" stop-color="#d6d8d8"/></linearGradient>
<linearGradient id="goud" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d58a"/><stop offset="0.5" stop-color="#cfa547"/><stop offset="1" stop-color="#e6c56f"/></linearGradient>
<pattern id="weefsel" width="0.5" height="0.5" patternUnits="userSpaceOnUse"><path d="M0 0.125h0.5M0 0.375h0.5" stroke="#000" stroke-opacity="0.10" stroke-width="0.09"/><path d="M0.125 0v0.5M0.375 0v0.5" stroke="#fff" stroke-opacity="0.05" stroke-width="0.09"/></pattern>
<filter id="ruis" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="3.1" numOctaves="2" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.35"/></filter>
<filter id="vezel" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.25 2.4" numOctaves="3" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.14  0 0 0 0 0.04  0 0 0 0.9 -0.3"/></filter>
<filter id="glans" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.03"/></filter>
</defs>`;
    let lagen;
    if (masker === 'geen') {
      lagen = g(this.vrij.join('') + this.zeef.join(''));
    } else if (masker === 'fr2') {
      // gaatjesprint (FR2, hardpapier): geen masker, bruin met vezels; de koperen eilandjes zitten aan de onderkant
      lagen = `<rect width="${w}" height="${h}" fill="#b98a4b"/><rect width="${w}" height="${h}" filter="url(#vezel)"/>` + g(kleur(this.koper.join('')) + kleur(this.blank.join('')) + this.gaten.join('') + this.vrij.join('') + this.zeef.join(''));
    } else {
      // het masker over glasweefsel; koper eronder iets lichter met een donkere rand; open pads; opdruk bovenop
      lagen = `<rect width="${w}" height="${h}" fill="${M}"/><rect width="${w}" height="${h}" fill="url(#weefsel)"/>`
        + g(`<g stroke="${R}" stroke-width="0.06" filter="url(#glans)">${kleur(this.koper.join(''))}</g>`)
        + `<rect width="${w}" height="${h}" filter="url(#ruis)" opacity="0.55"/>`
        + g(kleur(this.blank.join('')) + this.gaten.join('') + this.vrij.join('') + this.zeef.join(''));
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * ppm)}" height="${Math.round(h * ppm)}" viewBox="0 0 ${w} ${h}">${defs}${lagen}</svg>`;
  }
  dataUrl() { return 'data:image/svg+xml;base64,' + Buffer.from(this.svg(), 'utf8').toString('base64'); }
  /** de decal op het bovenvlak (normaal +Y) met het midden op (cx, y, cz) in het onderdeel */
  decal(id, naam, [cx, y, cz], { normaal = [0, 1, 0], draai = 0 } = {}) {
    return { id, name: naam, face: { normal: normaal, point: [cx, y, cz] }, image: this.dataUrl(), width: this.w, height: this.h, rotation: draai };
  }
}

/** opschrift op een chip of onderdeel: zwart vlak niet tekenen, alleen de tekst in lichtgrijs (lasergemarkeerd) */
export function opschrift(w, h, teksten, { kleur = '#b9bbbd', ppm = 60 } = {}) {
  const p = new Plaat(w, h, { masker: 'geen', ppm });
  for (const [x, y, t, o = {}] of teksten) p.tekst(x, y, t, { kleur, ...o });
  return p;
}
