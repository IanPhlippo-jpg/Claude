// Opslag en accessoires (FO-..): rekken met lagen voor halters, kettlebells, ballen en kleine spullen (eindframes in
// koker met ronde-hoekvoeten, liggers per laag, legplaat in traanplaat), palen en wandstrips met houders (schijven,
// stangen, banden, touwen), en losse accessoires (parallettes, laadstang, plyobox, schijvenkar). Pro-vormtaal: mat zwart,
// eindkappen en eindplaten, logoplaat. Node en browser.
import { staander, voetjes, hoorn, X, Y, Z, balk } from './bouwstenen.mjs';
import { mt } from './bouwstenen.mjs';

const pro = (b) => b.V.id !== 'thuis';
const MATEN = ['compact', 'standaard', 'XL'];

/** rek met lagen: c = { L, lagen: [{ z, d (diepte), helling (mm hoger achteraan), soort: 'halter'|'plank'|'bal' }], kg (per laag) } */
export function rekLagen(b, def, c) {
  // eindframe: paal voor en paal achter op een voet, een kopligger bovenop; per laag een arm tussen de palen (schuin bij
  // een helling) met twee liggers in de lengte erop. Alles stuik tegen elkaar gelast, niets steekt in elkaar.
  const L = mt(b, c.L ?? 1500, [-300, 400]), P = b.P('licht'), a = P.b, Dm = Math.max(...c.lagen.map((l) => l.d)), H = Math.max(...c.lagen.map((l) => l.z + (l.helling ?? 0))) + 60;
  const y1 = a / 2 + 20, y2 = Dm + a + 20, yv = y1 + a, D = y2 + a / 2 + 20;
  const xs = L > 1700 ? [-L / 2, 0, L / 2] : [-L / 2, L / 2];
  const frames = xs.map((x, i) => {
    b.groep(`Eindframe ${i + 1}`);
    const voet = b.staaf('Voet', 'licht', [x, 0, a / 2], [x, D, a / 2]); voetjes(b, voet, 2);
    const pv = staander(b, 'Paal voor', 'licht', x, y1, a, H), pa = staander(b, 'Paal achter', 'licht', x, y2, a, H);
    b.staaf('Kopligger', 'licht', [x, y1 - a / 2, H + a / 2], [x, y2 + a / 2, H + a / 2]);
    return { x, voet, pv, pa };
  });
  b.groep('frame');
  for (const [k, l] of c.lagen.entries()) {
    const yA = l.d, sl = (l.helling ?? 0) / Math.max(1, yA - yv), z = (y) => l.z + sl * (y - yv);
    for (const fr of frames) { b.groep(`Eindframe ${frames.indexOf(fr) + 1}`); b.staaf(`Laagarm ${k + 1}`, 'licht', [fr.x, y1 + a / 2, z(y1 + a / 2) - a], [fr.x, y2 - a / 2, z(y2 - a / 2) - a], { opm: 'tussen de palen gelast' }); }
    b.groep('frame');
    const ys = l.soort === 'bal' ? [(yv + yA) / 2 - 110, (yv + yA) / 2 + 110] : [yv, yA];
    for (let q = 0; q < xs.length - 1; q++) {
      const xa = xs[q] + a / 2, xb = xs[q + 1] - a / 2;
      for (const y of ys) b.staaf(`Ligger laag ${k + 1}`, 'licht', [xa, y, z(y) - a / 2 + a / 2], [xb, y, z(y) - a / 2 + a / 2], { opm: l.soort === 'bal' ? 'twee liggers op 220 mm: de bal rust ertussen' : 'op de laagarmen gelast' });
      if (l.soort === 'plank') { const zt = Math.max(z(yv), z(yA)) + a / 2; b.plaat(`Legplaat laag ${k + 1}`, [xa, yv - a / 2, zt], [xb, yA + a / 2, zt + 4], { opm: 'traanplaat 4 mm met rubberstrook, rand omgezet 20 mm (lip)' }); }
    }
  }
  const G = c.kg ?? 200;
  b.reken('Ligger van een laag (halve laag, 2 steunpunten)', b.o.delen.find((d) => /^Ligger laag/.test(d.naam)), 'ligger', xs[1] - xs[0], 0, { g: G / 2, proef: 'opslagpen' });
  c.lagen.forEach((l, k) => b.last(`Laag ${k + 1} vol`, G, [0, l.d / 2, l.z], { geval: 'vol' }));
}

/** paal met houders op een H-voet (of een wandstrip): c = { H, houders: [{ z, dir: [x,y], L }], muur, voet } */
export function paalHouders(b, def, c) {
  const P = b.P(c.rol ?? 'staander'), a = P.b, H = mt(b, c.H ?? 1500, [-200, 200]);
  const f = Math.min(1, H / (c.H ?? 1500)); // compact: de houders schuiven mee naar beneden
  if (c.muur) {
    b.o.muur = a / 2;
    const p = staander(b, 'Wandstrip', c.rol ?? 'staander', 0, 0, 300, 300 + H);
    for (const z of [400, 250 + H]) b.plaat('Muurplaat', [-90, a / 2, z - 60], [90, a / 2 + 8, z + 60], { gaten: [[-66, z], [66, z]].map(([dx, zz]) => ({ p: [dx, a / 2, zz], d: 14 })), opm: 'muurplaat 8 mm, 2 x M12 keilbout' });
    b.o.context.push(balk([-800, a / 2 + 68, (H + 600) / 2], [800, a / 2 + 68, (H + 600) / 2], Z, H + 600, 120, false, 'muur'));
    for (const h of c.houders) hoorn(b, p, [0, 0, 300 + h.z * f], [h.dir[0], h.dir[1], h.dir[2] ?? 0], h.L ?? 200, h.naam ?? 'Houder');
    b.o.verankerd = 'muur'; b.o.anker = { arm: 250, z: 600, n: 4, kg: (c.kg ?? 100) };
  } else {
    const B = c.voet ?? 700;
    const v1 = b.staaf('Voet', 'staander', [-B / 2, 0, a / 2], [B / 2, 0, a / 2]), v2 = b.staaf('Voet dwars', 'staander', [0, -B / 2, a / 2], [0, -a / 2, a / 2]), v3 = b.staaf('Voet dwars', 'staander', [0, a / 2, a / 2], [0, B / 2, a / 2]);
    voetjes(b, v1, 2); voetjes(b, v2, 1); voetjes(b, v3, 1);
    const p = staander(b, 'Paal', 'staander', 0, 0, a, a + H);
    for (const h of c.houders) hoorn(b, p, [0, 0, a + h.z * f], [h.dir[0], h.dir[1], h.dir[2] ?? 0], h.L ?? 250, h.naam ?? 'Schijfhouder');
  }
  b.reken('Houder (volle houder, uitkragend)', b.o.delen.find((d) => /^(Houder|Schijfhouder)/.test(d.naam)), 'uitkrager', c.houders[0].L ?? 250, 0, { g: c.kg ?? 60, proef: 'schijfhouder', las: true });
  b.last('Volle houders', (c.kg ?? 60) * c.houders.length, [0, 0, 600], { geval: 'vol' });
}

/** parallettes (paar): gebogen buis Ø32 met voeten, rubberdoppen */
export function parallettes(b, def, c) {
  const h = c.h ?? 250, L = c.L ?? 600;
  for (const sx of [-1, 1]) {
    b.groep(`Parallette ${sx < 0 ? 'L' : 'R'}`);
    b.buis('Parallette', 'greep', [[sx * 250, -L / 2, 8], [sx * 250, -L / 2, h], [sx * 250, L / 2, h], [sx * 250, L / 2, 8]], { vlak: [1, 0, 0], R: 100, opm: `buis Ø32 gebogen tot een U (2 bochten R100), hoogte ${h} mm; rubberdop op de voeten` });
    for (const ye of [-L / 2, L / 2]) b.plaat('Voetplaat', [sx * 250 - 45, ye - 70, 0], [sx * 250 + 45, ye + 70, 8], { opm: 'voetplaat 8 mm met ronde hoeken en rubber eronder; de buis erop gelast' });
  }
  b.groep('frame');
  b.reken('Parallette (gebruiker in handstand, op één)', b.o.delen.find((d) => d.naam === 'Parallette'), 'ligger', L - 240, b.V.gebruiker, { proef: 'intrinsiek' });
  b.last('Gebruiker', 100, [0, 0, h + 400], { geval: 'steun' });
}
/** plyobox in staal: koker 40 frame met traanplaat bovenop en rubber onder */
export function plyobox(b, def, c) {
  const [B, D, H] = c.maat ?? [600, 500, 500], P = b.P('licht'), a = P.b;
  for (const [x, y] of [[-B / 2, -D / 2], [B / 2, -D / 2], [B / 2, D / 2], [-B / 2, D / 2]]) staander(b, 'Hoekpaal', 'licht', x, y, 0, H - 6);
  for (const z of [a / 2, H - 6 - a / 2]) {
    b.staaf('Rand voor', 'licht', [-B / 2 + a / 2, -D / 2, z], [B / 2 - a / 2, -D / 2, z]); b.staaf('Rand achter', 'licht', [-B / 2 + a / 2, D / 2, z], [B / 2 - a / 2, D / 2, z]);
    b.staaf('Rand zijkant', 'licht', [-B / 2, -D / 2 + a / 2, z], [-B / 2, D / 2 - a / 2, z]); b.staaf('Rand zijkant', 'licht', [B / 2, -D / 2 + a / 2, z], [B / 2, D / 2 - a / 2, z]);
  }
  b.plaat('Springvlak', [-B / 2 - a / 2, -D / 2 - a / 2, H - 6], [B / 2 + a / 2, D / 2 + a / 2, H], { opm: 'traanplaat 6 mm met antislip, randen r 5' });
  b.koop('rubbermat', 1, [], { naam: 'Rubberstrook onder de box', oppervlak: (B * D) / 1e6 });
  b.reken('Springvlak (landing, dynamisch x 2)', b.o.delen.find((d) => d.naam === 'Rand voor'), 'ligger', B, b.V.gebruiker * 2, { proef: 'intrinsiek' });
  b.last('Gebruiker op de box', 100, [0, 0, H + 900], { geval: 'sprong' });
}
/** schijvenkar: voetframe op 4 zwenkwielen, middenpaal met 4 schuine houders en een duwbeugel */
export function schijvenkar(b, def, c) {
  const P = b.P('staander'), a = P.b, B = 700, D = 600;
  const v1 = b.staaf('Voet voor', 'staander', [-B / 2, -D / 2, 90], [B / 2, -D / 2, 90]), v2 = b.staaf('Voet achter', 'staander', [-B / 2, D / 2, 90], [B / 2, D / 2, 90]);
  b.staaf('Voet midden', 'staander', [0, -D / 2 + a / 2, 90], [0, D / 2 - a / 2, 90]);
  b.koop(b.V.wiel, 4, [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => balk([sx * (B / 2 - 60), sy * D / 2, 0], [sx * (B / 2 - 60), sy * D / 2, 90 - a / 2], [1, 0, 0], 50, 50, true, 'rubber')), { naam: 'Zwenkwiel onder de kar (2 met rem)' });
  const p = staander(b, 'Paal', 'staander', 0, 0, 90 + a / 2, 1150);
  for (const [z, d] of [[400, [1, 0, 0.27]], [400, [-1, 0, 0.27]], [800, [1, 0, 0.27]], [800, [-1, 0, 0.27]]]) hoorn(b, p, [0, 0, z], d, 250);
  b.staaf('Duwbeugel', 'greep', [-250, -a / 2 - 120, 1050], [250, -a / 2 - 120, 1050], { opm: 'buis Ø32 met rubber handvat' });
  b.staaf('Beugelarm', 'licht', [0, -a / 2, 1050], [0, -a / 2 - 120 + 16, 1050], { kap: true });
  b.reken('Schijfhouder (volle houder)', b.o.delen.find((d) => d.naam === 'Schijfhouder'), 'uitkrager', 250, 0, { g: 60, proef: 'schijfhouder', las: true });
  b.last('Volle kar', 240, [0, 0, 600], { geval: 'vol' });
  void v1; void v2;
}

const MO = (t, p, bt, bp) => ({ thuis: t, pro: p, bronT: bt, bronP: bp });
const O = (id, naam, kort, uitleg, maxLast, markt, cfg, bouw = rekLagen) => ({ id, soort: 'opslag', naam, kort, uitleg, spieren: '-', oefeningen: ['opbergen'], maxLast, markt, maten: MATEN, cfg, bouw(b) { bouw(b, this, this.cfg); } });
const R2 = (z1, z2, d = 380, s = 'halter', h = 60) => [{ z: z1, d, helling: h, soort: s }, { z: z2, d: d - 40, helling: h, soort: s }];
export const OPSLAG = [
  O('FO-01', 'Halterrek 2 lagen kort', 'Halterrek 1,2 m met 2 schuine lagen.', 'Twee eindframes in koker, per laag twee liggers met 60 mm helling; voor 5 paar halters.', { thuis: 150, pro: 250 }, MO([180, 400], [450, 1100], 'Gorilla / Bodycraft halterrek ± € 180-400', 'Rogue / Eleiko dumbbell rack ± € 450-1100'), { L: 1200, lagen: R2(420, 760), kg: 200 }),
  O('FO-02', 'Halterrek 2 lagen lang', 'Halterrek 1,8 m met 2 schuine lagen en middenframe.', 'Drie eindframes, per laag twee liggers met 60 mm helling; voor 10 paar halters.', { thuis: 300, pro: 450 }, MO([300, 600], [700, 1600], 'Gorilla / ATX halterrek 10 paar ± € 300-600', 'Rogue DR-2 / Eleiko ± € 700-1600'), { L: 1800, lagen: R2(420, 760), kg: 300 }),
  O('FO-03', 'Halterrek 3 lagen', 'Halterrek 1,5 m met 3 schuine lagen.', 'Twee eindframes, drie lagen met liggers; voor 15 paar lichte halters.', { thuis: 300, pro: 400 }, MO([250, 550], [650, 1400], 'Gorilla / ATX 3 lagen ± € 250-550', 'Rogue / Eleiko 3 tier ± € 650-1400'), { L: 1500, lagen: [{ z: 350, d: 420, helling: 60, soort: 'halter' }, { z: 650, d: 380, helling: 60, soort: 'halter' }, { z: 930, d: 340, helling: 60, soort: 'halter' }], kg: 200 }),
  O('FO-04', 'Kettlebellrek 2 legplaten', 'Rek met 2 legplaten in traanplaat met opstaande rand.', 'Twee eindframes, twee vlakke lagen met traanplaat en een lip vooraan; voor 10-14 kettlebells.', { thuis: 300, pro: 500 }, MO([200, 450], [550, 1200], 'Gorilla / ATX kettlebellrek ± € 200-450', 'Rogue KB rack ± € 550-1200'), { L: 1300, lagen: [{ z: 300, d: 420, soort: 'plank' }, { z: 700, d: 420, soort: 'plank' }], kg: 250 }),
  O('FO-05', 'Ballenrek 2 lagen', 'Rek voor medicine balls en wall balls.', 'Twee eindframes, per laag twee liggers op 220 mm waartussen de ballen rusten.', { thuis: 100, pro: 150 }, MO([150, 350], [400, 900], 'Gorilla / ATX ballenrek ± € 150-350', 'Rogue / Eleiko ball rack ± € 400-900'), { L: 1500, lagen: [{ z: 450, d: 420, soort: 'bal' }, { z: 950, d: 420, soort: 'bal' }], kg: 80 }),
  O('FO-06', 'Ballenrek 3 lagen', 'Hoog rek voor 9-12 ballen.', 'Twee eindframes, drie lagen liggers voor ballen.', { thuis: 150, pro: 200 }, MO([200, 450], [500, 1100], 'ATX ballenrek 3 lagen ± € 200-450', 'Rogue ball rack ± € 500-1100'), { L: 1500, lagen: [{ z: 400, d: 420, soort: 'bal' }, { z: 850, d: 420, soort: 'bal' }, { z: 1300, d: 420, soort: 'bal' }], kg: 80 }),
  O('FO-07', 'Opbergrek 3 legplaten', 'Rek met 3 legplaten voor kleine spullen.', 'Twee eindframes, drie vlakke lagen in traanplaat met lip; voor kettlebells, plaatjes en accessoires.', { thuis: 200, pro: 300 }, MO([200, 450], [500, 1100], 'Gorilla / ATX opbergrek ± € 200-450', 'Rogue / Eleiko storage ± € 500-1100'), { L: 1500, lagen: [{ z: 300, d: 460, soort: 'plank' }, { z: 750, d: 460, soort: 'plank' }, { z: 1200, d: 460, soort: 'plank' }], kg: 150 }),
  O('FO-08', 'Halterrek lang met plank', 'Halterrek 2,1 m: 2 schuine lagen en een legplaat bovenaan.', 'Drie eindframes; twee lagen met liggers voor halters en een legplaat voor kettlebells.', { thuis: 300, pro: 450 }, MO([350, 700], [900, 1900], 'ATX halterrek 2,1 m ± € 350-700', 'Rogue / Eleiko ± € 900-1900'), { L: 2100, lagen: [{ z: 400, d: 420, helling: 60, soort: 'halter' }, { z: 720, d: 380, helling: 60, soort: 'halter' }, { z: 1000, d: 360, soort: 'plank' }], kg: 300 }),
  O('FO-09', 'Schijvenboom compact', 'Paal met 4 schijfhouders op een kruisvoet.', 'Kruisvoet in koker, paal en 4 schijfhouders Ø50 met kraag.', { thuis: 150, pro: 200 }, MO([120, 250], [300, 700], 'Gorilla / ATX schijvenboom ± € 120-250', 'Rogue / Eleiko plate tree ± € 300-700'), { H: 1100, houders: [{ z: 350, dir: [1, 0] }, { z: 350, dir: [-1, 0] }, { z: 750, dir: [1, 0] }, { z: 750, dir: [-1, 0] }], kg: 60, voet: 700 }, paalHouders),
  O('FO-10', 'Schijvenboom 8 houders', 'Paal met 8 schijfhouders in vier richtingen.', 'Kruisvoet, paal en 8 houders: twee hoogtes in vier richtingen.', { thuis: 300, pro: 400 }, MO([200, 400], [450, 950], 'ATX plate tree 8 ± € 200-400', 'Rogue / Eleiko ± € 450-950'), { H: 1200, houders: [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap((d) => [{ z: 380, dir: d }, { z: 820, dir: d }]), kg: 60, voet: 900 }, paalHouders),
  O('FO-11', 'Bumperplaatrek', 'Paal met schuine houders voor bumperplaten.', 'Kruisvoet en paal met 4 schuin omhoog wijzende houders (15°): de schijven kunnen er niet af rollen.', { thuis: 200, pro: 300 }, MO([180, 350], [400, 850], 'Gorilla bumper plate rack ± € 180-350', 'Rogue bumper storage ± € 400-850'), { H: 1000, houders: [{ z: 400, dir: [1, 0, 0.27] }, { z: 400, dir: [-1, 0, 0.27] }, { z: 750, dir: [1, 0, 0.27] }, { z: 750, dir: [-1, 0, 0.27] }], kg: 75, voet: 800 }, paalHouders),
  O('FO-12', 'Wandstrip schijven', 'Wandstrip met 4 schijfhouders.', 'Koker tegen de muur met 2 muurplaten en 4 schijfhouders naar voren.', { thuis: 150, pro: 200 }, MO([100, 200], [250, 600], 'Gorilla wall plate holder ± € 100-200', 'Rogue wall mount plate storage ± € 250-600'), { muur: true, H: 1200, houders: [300, 600, 900, 1200].map((z) => ({ z: z - 150, dir: [0, -1], L: 220 })), kg: 50 }, paalHouders),
  O('FO-13', 'Wandstrip haken', 'Wandstrip met 6 haken voor banden, touwen en riemen.', 'Koker tegen de muur met 2 muurplaten en 6 korte haken (rond Ø25, kop afgerond).', { thuis: 60, pro: 80 }, MO([60, 150], [150, 400], 'wandhaken accessoires ± € 60-150', 'Rogue hanger / wall storage ± € 150-400'), { muur: true, H: 1300, rol: 'licht', houders: [200, 400, 600, 800, 1000, 1200].map((z) => ({ z, dir: [0, -1, 0.2], L: 150, naam: 'Houder haak' })), kg: 15 }, paalHouders),
  O('FO-14', 'Parallettes hoog (paar)', 'Twee parallettes van 25 cm in gebogen buis.', 'Elke parallette is één gebogen buis Ø32 met voetplaatjes en rubber; voor L-sits, handstanden en dips.', undefined, MO([60, 130], [150, 300], 'Gorilla / ATX parallettes ± € 60-130', 'Rogue / Eleiko parallettes ± € 150-300'), { h: 250 }, parallettes),
  O('FO-15', 'Parallettes laag (paar)', 'Twee lage parallettes van 12 cm.', 'Zoals de hoge parallettes, maar 12 cm hoog voor push-ups en planches.', undefined, MO([40, 90], [100, 220], 'mini parallettes ± € 40-90', 'Rogue mini ± € 100-220'), { h: 120, L: 450 }, parallettes),
  O('FO-16', 'Plyobox staal 50 cm', 'Springbox in koker en traanplaat, 60 x 50 x 50 cm.', 'Frame in koker met een springvlak in traanplaat en rubber onderaan.', undefined, MO([80, 160], [180, 350], 'houten/schuim plyobox ± € 80-160', 'Rogue steel plyo box ± € 180-350'), { maat: [600, 500, 500] }, plyobox),
  O('FO-17', 'Plyobox staal 75 cm', 'Hoge springbox 75 x 60 x 75 cm.', 'Zoals de plyobox van 50 cm, maar 75 cm hoog en breder voor stabiliteit.', undefined, MO([110, 200], [240, 420], 'plyobox 75 ± € 110-200', 'Rogue steel plyo box ± € 240-420'), { maat: [750, 600, 750] }, plyobox),
  O('FO-18', 'Schijvenkar', 'Rijdende schijvenboom met 4 houders en duwbeugel.', 'Voetframe op 4 zwenkwielen (2 met rem), paal met 4 schuine houders en een duwbeugel.', { thuis: 200, pro: 240 }, MO([200, 400], [450, 900], 'ATX plate trolley ± € 200-400', 'Eleiko / Rogue plate cart ± € 450-900'), {}, schijvenkar),
  O('FO-19', 'Opbergrek 4 legplaten', 'Hoog opbergrek 1,8 m met 4 legplaten.', 'Drie eindframes, vier vlakke lagen in traanplaat met lip.', { thuis: 150, pro: 250 }, MO([250, 550], [650, 1400], 'ATX opbergrek ± € 250-550', 'Rogue / Eleiko storage ± € 650-1400'), { L: 1800, lagen: [{ z: 250, d: 460, soort: 'plank' }, { z: 650, d: 460, soort: 'plank' }, { z: 1050, d: 460, soort: 'plank' }, { z: 1450, d: 460, soort: 'plank' }], kg: 150 }),
  O('FO-20', 'Halterrek 3 lagen lang', 'Halterrek 2,1 m met 3 schuine lagen.', 'Drie eindframes, drie lagen met liggers en 60 mm helling; voor 20 paar halters.', { thuis: 300, pro: 400 }, MO([400, 800], [1000, 2200], 'ATX 3 lagen 2,1 m ± € 400-800', 'Rogue / Eleiko ± € 1000-2200'), { L: 2100, lagen: [{ z: 350, d: 420, helling: 60, soort: 'halter' }, { z: 650, d: 380, helling: 60, soort: 'halter' }, { z: 930, d: 340, helling: 60, soort: 'halter' }], kg: 300 }),
  O('FO-21', 'Opbergbank', 'Lage bank met legplaat onder en zitvlak bovenaan.', 'Twee eindframes, een legplaat op 20 cm en een zitvlak in traanplaat op 45 cm: om op te zitten en spullen onder te leggen.', { thuis: 150, pro: 200 }, MO([120, 250], [300, 650], 'opbergbank ± € 120-250', 'Rogue / Eleiko storage bench ± € 300-650'), { L: 1200, lagen: [{ z: 200, d: 380, soort: 'plank' }, { z: 450, d: 380, soort: 'plank' }], kg: 150 }),
  O('FO-22', 'Wandstrip kettlebells', 'Wandstrip met 5 lange houders voor kettlebells.', 'Koker tegen de muur met 2 muurplaten en 5 schuine houders van 300 mm.', { thuis: 150, pro: 200 }, MO([80, 180], [200, 450], 'wandrek kettlebells ± € 80-180', 'Rogue KB wall storage ± € 200-450'), { muur: true, H: 1300, houders: [200, 450, 700, 950, 1200].map((z) => ({ z, dir: [0, -1, 0.15], L: 300 })), kg: 40 }, paalHouders),
  O('FO-23', 'Wandstrip stangen', 'Wandstrip met 4 paar haken voor stangen.', 'Koker tegen de muur met 2 muurplaten en 4 paar korte haken naar links en rechts (stangen horizontaal).', { thuis: 100, pro: 150 }, MO([80, 180], [200, 500], 'gun rack muur ± € 80-180', 'Rogue horizontal bar storage ± € 200-500'), { muur: true, H: 1200, houders: [250, 550, 850, 1150].flatMap((z) => [{ z, dir: [1, -0.3, 0.2], L: 140, naam: 'Houder stang' }, { z, dir: [-1, -0.3, 0.2], L: 140, naam: 'Houder stang' }]), kg: 25 }, paalHouders),
  O('FO-24', 'Bandenpaal', 'Vrijstaande paal met 8 pinnen voor banden en touwen.', 'Kruisvoet en paal met 8 korte schuine pinnen in vier richtingen.', { thuis: 50, pro: 80 }, MO([60, 130], [150, 350], 'band/rope stand ± € 60-130', 'Rogue band storage ± € 150-350'), { H: 1500, houders: [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap((d) => [{ z: 800, dir: [...d, 0.3], L: 160, naam: 'Houder haak' }, { z: 1300, dir: [...d, 0.3], L: 160, naam: 'Houder haak' }]), kg: 10, voet: 700 }, paalHouders),
  O('FO-25', 'Schijvenboom bumpers en stangen', 'Paal met 4 schijfhouders en 2 stanghouders bovenaan.', 'Kruisvoet, paal met 4 schijfhouders en bovenaan 2 kokers waar je stangen rechtop in zet.', { thuis: 250, pro: 350 }, MO([200, 400], [500, 1000], 'ATX plate tree met stanghouders ± € 200-400', 'Rogue / Eleiko combo ± € 500-1000'), { H: 1300, houders: [{ z: 350, dir: [1, 0] }, { z: 350, dir: [-1, 0] }, { z: 750, dir: [1, 0] }, { z: 750, dir: [-1, 0] }, { z: 1150, dir: [0, 1, 0.5], L: 200, naam: 'Stanghouder' }, { z: 1150, dir: [0, -1, 0.5], L: 200, naam: 'Stanghouder' }], kg: 60, voet: 900 }, paalHouders),
];
void X; void Y; void pro;
