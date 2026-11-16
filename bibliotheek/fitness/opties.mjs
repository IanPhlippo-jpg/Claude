// Varianten van een toestel (v5 fase B): de afwerking (frame-RAL, kussenkleur, chroom of zwart, logoplaat) en de
// opties per soort. Elke optie bouwt echte onderdelen bij (met botsingscontrole) of voegt kooponderdelen toe, zodat ze
// in de stuklijst, de prijs, de controles en de tekeningen meekomen. Node en browser.
import { balk, add, mul, sub, norm, aabb } from './model.mjs';
import { obb, botsen } from './controle.mjs';

/** standaardafwerking: de RAL van de stijl, zwarte bekleding, verchroomde schijfhouders, logoplaat */
export const AFWERKING = { leer: 'zwart', chroom: true, logo: true };
/** standaardkleuren zonder meerprijs (andere RAL-kleuren: kleine reeks bij de lakkerij, AANNAME + 20 % op het coaten) */
export const RAL_STANDAARD = ['9005', '7016', '7021', '9006'];

/** de soort voor de opties: de reeks bij strongman/buiten, anders de soort */
export const optieSoort = (def) => def.optiesSoort ?? def.soort;
/** de opties per soort: id, naam, uitleg */
export const OPTIES = {
  rek: [
    { id: 'opslag', naam: 'Extra schijvenopslag', uitleg: '2 extra schijfhouders Ø50 aan de achterste staanders' },
    { id: 'bandpinnen', naam: 'Bandpinnen', uitleg: '2 pinnen Ø30 onderaan voor weerstandsbanden' },
  ],
  bank: [
    { id: 'wielen', naam: 'Transportwielen', uitleg: '2 PU-wielen Ø60 aan de voorvoet, vrij van de vloer' },
  ],
  kabel: [
    { id: 'grepenset', naam: 'Grepenset', uitleg: 'touw, 2 D-grepen, enkelband en 2 karabiners' },
    { id: 'fijnstapel', naam: 'Fijninstelling', uitleg: '2 x 2,5 kg magnetisch bijleggewicht op de stapel' },
  ],
  selectorized: [
    { id: 'grepenset', naam: 'Grepenset', uitleg: 'touw, 2 D-grepen, enkelband en 2 karabiners' },
    { id: 'fijnstapel', naam: 'Fijninstelling', uitleg: '2 x 2,5 kg magnetisch bijleggewicht op de stapel' },
  ],
  multigym: [
    { id: 'opslag', naam: 'Extra schijvenopslag', uitleg: '2 extra schijfhouders Ø50 aan de achterste staanders' },
    { id: 'bandpinnen', naam: 'Bandpinnen', uitleg: '2 pinnen Ø30 onderaan voor weerstandsbanden' },
    { id: 'grepenset', naam: 'Grepenset', uitleg: 'touw, 2 D-grepen, enkelband en 2 karabiners' },
  ],
  // per reeks (P2-24 v6): strongman en buiten (EN 16630) hebben elk hun eigen opties
  park: [
    { id: 'valtegels', naam: 'Valtegels', uitleg: 'valdempende rubbertegels EN 1177 in de hele valruimte, dikte naar de valhoogte' },
  ],
  strongman: [
    { id: 'klemmen', naam: 'Schijfklemmen', uitleg: '2 snelsluitklemmen Ø50 per laadpen' },
  ],
  plate: [
    { id: 'opslag', naam: 'Schijvenopslag', uitleg: '2 schijfhouders Ø50 op het voetframe' },
    { id: 'klemmen', naam: 'Schijfklemmen', uitleg: '2 snelsluitklemmen Ø50 per schijfhouder' },
  ],
};

/** vrij genoeg? een balk (krimp 1) raakt geen ander staal, kussen of voorbeeldschijf */
function vrij(o, g, behalve = []) {
  const G = obb(g, 1);
  return ![...o.delen, ...o.kussens].some((d) => !behalve.includes(d) && d.geo.some((h) => botsen(G, obb(h, 0.5)))) && !o.toon.some((h) => h.kleur === 'schijf' && botsen(G, obb(h, 1)));
}

/** de opties van toestel def op bouwer b (na de bouw en het pro-uiterlijk, vóór afwerken) */
export function optiesBouwen(b, def) {
  const o = b.o, gekozen = new Set(o.opties?.opties ?? []), lijst = OPTIES[optieSoort(def)] ?? [], oud = b.huidig;
  o.gekozenOpties = [];
  for (const opt of lijst) {
    if (!gekozen.has(opt.id)) continue;
    const ok = BOUW[`${optieSoort(def)}:${opt.id}`]?.(b, def) ?? false;
    o.gekozenOpties.push({ ...opt, gelukt: ok !== false, melding: ok === false ? 'past niet op dit toestel (geen vrije plaats)' : '' });
  }
  b.groep(oud);
}

const vast = (d) => d.soort === 'staaf' && !d.pad && d.P.vorm === 'koker' && /^(frame|Zijframe|Staander|Toren)/.test(d.groep);
const BOUW = {
  // twee schijfhouders aan de achterste staanders, naar buiten, op 450 mm (of 800 als 450 bezet is)
  'rek:opslag': (b) => {
    const o = b.o, st = o.delen.filter((d) => vast(d) && Math.abs(d.u[2]) > 0.99 && d.L > 600);
    if (!st.length) return false;
    const yMax = Math.max(...st.map((d) => d.a[1])), achter = st.filter((d) => d.a[1] > yMax - 5);
    let n = 0;
    for (const d of achter) {
      const sx = Math.sign(d.a[0]) || 1, z0 = Math.min(d.a[2], d.b[2]);
      for (const z of [z0 + 450, z0 + 800, z0 + 1150]) {
        const p = [d.a[0] + (sx * d.P.b) / 2, d.a[1], z], g = balk(p, add(p, [sx * 250, 0, 0]), [0, 1, 0], 48.3, 48.3, true);
        if (!vrij(o, g, [d])) continue;
        b.groep(d.groep);
        b.staaf('Schijfhouder (optie)', 'sleeve', p, add(p, [sx * 250, 0, 0]), { opm: 'optie schijvenopslag: aan de staander gelast, eindkap' });
        n++; break;
      }
    }
    return n > 0;
  },
  // bandpinnen: 2 pinnen Ø30 x 120 naar voren op de voorste voeten
  'rek:bandpinnen': (b) => {
    const o = b.o, voeten = o.delen.filter((d) => vast(d) && Math.abs(d.u[1]) > 0.99 && Math.min(d.a[2], d.b[2]) < 80);
    let n = 0;
    for (const d of voeten.sort((p, q) => Math.min(p.a[1], p.b[1]) - Math.min(q.a[1], q.b[1])).slice(0, 2)) {
      const e = d.a[1] < d.b[1] ? d.a : d.b, sx = Math.sign(e[0]) || 1, p = [e[0] + (sx * d.P.b) / 2, e[1] + 120, e[2]], g = balk(p, add(p, [sx * 120, 0, 0]), [0, 1, 0], 30, 30, true);
      if (!vrij(o, g, [d])) continue;
      b.groep(d.groep);
      b.staaf('Bandpin (optie)', 'r30', p, add(p, [sx * 120, 0, 0]), { opm: 'rond Ø30 x 120, aan de voet gelast, kop afgerond R5: voor weerstandsbanden' });
      n++;
    }
    return n > 0;
  },
  // transportwielen aan de uiteinden van de voorvoet (als ze er nog niet zijn)
  'bank:wielen': (b) => {
    const o = b.o;
    if (o.koop.some((k) => k.key === 'transportwiel')) return true;
    const vv = o.delen.find((d) => /^(Voorvoet|Lage voet)$/.test(d.naam));
    if (!vv) return false;
    const geo = [];
    for (const e of [vv.a, vv.b]) { const sx = Math.sign(e[0] - (vv.a[0] + vv.b[0]) / 2) || 1, g = balk([e[0] + sx * 2, e[1], 35], [e[0] + sx * 28, e[1], 35], [0, 1, 0], 60, 60, true, 'rubber'); geo.push(g); }
    b.koop('transportwiel', 2, geo, { naam: 'Transportwiel PU Ø60 aan de voorvoet (optie; as M10 in een lasmoer)' });
    return true;
  },
  'kabel:grepenset': (b) => { b.koop('grepenset', 1, [], { naam: 'Grepenset: touw, 2 D-grepen, enkelband, 2 karabiners (optie)', groep: 'afwerking' }); return true; },
  'selectorized:grepenset': (b) => BOUW['kabel:grepenset'](b),
  'selectorized:fijnstapel': (b) => BOUW['kabel:fijnstapel'](b),
  'multigym:opslag': (b) => BOUW['rek:opslag'](b),
  // valtegels: de hele valruimte (EN 16630) in rubbertegels van 45 mm
  'park:valtegels': (b) => {
    const o = b.o; if (!o.valruimte) return false;
    const z = o.context.findIndex((g) => g.kleur === 'valzone'); const vz = z >= 0 ? o.context.splice(z, 1)[0] : null;
    const box = o.delen.flatMap((d) => d.geo).map(aabb), mn = [0, 1].map((i) => Math.min(...box.map((q) => q[0][i]))), mx = [0, 1].map((i) => Math.max(...box.map((q) => q[1][i]))), X0 = o.valruimte.X;
    const w = mx[0] - mn[0] + 2 * X0, d = mx[1] - mn[1] + 2 * X0;
    const Y0 = o.valruimte.Y, dt = Y0 <= 1600 ? 45 : Y0 <= 2100 ? 60 : 80, key = dt === 45 ? 'valtegel' : `valtegel${dt}`; // EN 1177: dikte naar de kritische valhoogte (P2-11)
    b.koop(key, 1, [balk([(mn[0] + mx[0]) / 2 - w / 2, (mn[1] + mx[1]) / 2, dt / 2], [(mn[0] + mx[0]) / 2 + w / 2, (mn[1] + mx[1]) / 2, dt / 2], [0, 1, 0], d, dt, false, 'valtegel')], { naam: `Valtegels EN 1177 ${dt} mm in de valruimte (${(w / 1000).toFixed(1).replace('.', ',')} x ${(d / 1000).toFixed(1).replace('.', ',')} m)`, oppervlak: Math.round((w * d) / 1e4) / 100, groep: 'afwerking' });
    void vz; return true;
  },
  'strongman:klemmen': (b) => {
    const n = b.o.delen.filter((d) => d.naam === 'Laadpen').length; if (!n) return false;
    b.koop('kraagklem', 2 * n, [], { naam: `Snelsluitklem Ø50 (lock-jaw), 2 per laadpen (${n} laadpennen)`, groep: 'afwerking' }); return true;
  },
  'multigym:bandpinnen': (b) => BOUW['rek:bandpinnen'](b),
  'multigym:grepenset': (b) => BOUW['kabel:grepenset'](b),
  'kabel:fijnstapel': (b) => {
    const o = b.o, s = o.stapels[0];
    if (!s) return false;
    b.koop('fijnstapel', 1, [], { naam: 'Fijninstelling: 2 x 2,5 kg magnetisch bijleggewicht op de bovenplaat (optie)', groep: 'afwerking' });
    return true;
  },
  // schijvenopslag op het voetframe: 2 rechtopstaande houders Ø50 x 300 op een vrije plaats achteraan
  'plate:opslag': (b) => {
    const o = b.o, vloer = o.delen.filter((d) => d.soort === 'staaf' && d.P.vorm === 'koker' && (/^(Voetframe|Vloerrail|Voorvoet|Achtervoet)$/.test(d.naam) || (!d.pad && Math.abs(d.u[2]) < 0.01)) && aabb(d.geo[0])[1][2] < 140);
    const kand = [];
    for (const d of vloer) for (const g of d.geo) { const [mn, mx] = aabb(g); kand.push([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mx[2], d]); }
    kand.sort((p, q) => q[1] - p[1]);
    let n = 0; const gebruikt = [];
    for (const [x, y, z, d] of kand) {
      if (n >= 2 || gebruikt.some(([u, v]) => Math.hypot(u - x, v - y) < 400)) continue;
      const g = balk([x, y, z], [x, y, z + 300], [1, 0, 0], 48.3, 48.3, true), ruim = balk([x, y, z + 20], [x, y, z + 300], [1, 0, 0], 460, 460, true);
      if (!vrij(o, g, [d]) || !vrij(o, ruim, [d])) continue;
      b.groep('frame');
      b.staaf('Schijfhouder opslag (optie)', 'sleeve', [x, y, z], [x, y, z + 300], { opm: 'optie: rechtop op het voetframe gelast, kraag Ø100, eindkap; ruimte voor schijven Ø450' });
      gebruikt.push([x, y]); n++;
    }
    return n > 0;
  },
  'plate:klemmen': (b) => { const n = b.o.delen.filter((d) => /^Schijfhouder/.test(d.naam)).length; if (!n) return false; b.koop('kraagklem', n, [], { naam: `Snelsluitklem Ø50 (${n}, 1 per schijfhouder; optie)`, groep: 'afwerking' }); return true; },
};
void sub; void norm; void mul;
