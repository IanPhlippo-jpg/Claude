// Werkwijze en uren van een balustrade: de stappen in de werkplaats (zagen, staanders op de voetplaat, vulling lassen,
// handregel in verstek, klemgaten, coaten of verzinken) en op de werf (uitzetten, boren, verankeren, stellen, glas).
// De uren zijn ervaringswaarden voor één lasser (SCHATTING, instelbaar). Elke stap verdeelt zijn uren over de
// categorieën van de prijs (basis, hoek, trap, glas, zij, buiten, plaatsen). Node en browser.

export const UREN = {
  voorbereiden: 1.0, // tekening, materiaal klaarleggen, mal op de lastafel
  zaagPerStuk: 0.05, // zagen, ontbramen, merken
  voetplaat: 0.3, // per staander: haaks op de voetplaat hechten en rondom lassen
  console: 0.5, // per staander: 2 afstandhouders en de console
  regel: 0.15, // per regel tussen twee staanders
  spijl: 0.07, // per spijl: hechten, MIG aan beide kanten, slijpen
  staaf: 0.12, // per horizontale staaf
  plaat: 0.5, // per plaat of plint: passen, hechten om de 150, onderbroken lassen
  handregelPerM: 0.2, // handregel op de staanders lassen en slijpen
  verstek: 0.4, // per hoek of knik: verstek passen, doorlassen, vlak slijpen
  trapMal: 1.0, // per trap: de helling op de lastafel uitzetten
  trapFactor: 0.35, // extra op de uren van de schuine stukken
  klemgat: 0.1, // per klem: gat Ø11 boren, blindklinkmoer M8 zetten
  uprofiel: 0.3, // per stuk U-profiel: zagen, ontbramen, gaten nakijken
  coatKlaar: 0.6, // ontvetten, merken, naar de coater of verzinkerij
  plaatsenPerM: 1.5, // op de werf, per meter: uitzetten, boren, verankeren, stellen
  glasPerPlaat: 0.4, // op de werf: glas plaatsen (2 personen)
  zijFactor: 0.3, // extra op het plaatsen bij zijmontage (boren in de vloerrand, stellen)
};

const r2 = (x) => Math.round(x * 100) / 100;
const gw = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

/** de stappen met hun uren en categorieën */
export function stappen(o, sl, U = UREN) {
  const k = o.k, S = [], P = sl.posities, tel = (rol) => P.filter((p) => p.rol === rol).reduce((t, p) => t + p.n, 0);
  const telTrap = (rol) => o.delen.filter((d) => d.rol === rol && d.cat === 'trap').length;
  const stap = (titel, cats, tekst, proces = '') => { const c = Object.fromEntries(Object.entries(cats).filter(([, u]) => u > 0).map(([a, u]) => [a, r2(u)])); S.push({ titel, uren: r2(Object.values(c).reduce((t, u) => t + u, 0)), cats: c, tekst, proces }); };
  const stukken = P.filter((p) => p.soort === 'staaf' || p.soort === 'koopstaaf').reduce((t, p) => t + p.n, 0);
  const nSt = o.staanders.length, zij = k.bevestiging === 'zij', trap = k.vorm === 'trap', m = o.lengte / 1000, nHoek = o.hoeken + o.knikken;
  stap('Voorbereiden en zagen', { basis: U.voorbereiden + stukken * U.zaagPerStuk }, `Zaag de ${stukken} stukken volgens de zaaglijst en het zaagplan (staven van 6 m). Schuine stukken langs de trap op ${trap ? gw((Math.atan(k.optrede / k.aantrede) * 180) / Math.PI) : 0}°, de handregel in verstek op de hoeken. Ontbramen en elk stuk merken met zijn positienummer.`);
  if (k.soort === 'glasU') {
    stap('U-profiel op maat', { basis: tel('uprofiel') * U.uprofiel }, `Zaag de ${tel('uprofiel')} stukken U-profiel (alu, zaagblad voor aluminium), verstek op de hoeken. Controleer de voorgeboorde gaten (anker om de ${o.ankerAfstand} mm) en boor bij waar nodig Ø11. Niet lassen, niet coaten: het profiel is geanodiseerd.`, 'zagen');
  } else {
    if (zij) stap('Staanders met console en afstandhouders', { zij: nSt * U.console }, `${nSt} staanders: las 2 afstandhouders (koker 40x40x3, 30 lang) haaks op de staander, en de console (lasergesneden, ${o.staander?.voet.b} x 230 x ${o.staander?.voet.t}) erop. Hoeklas a3 rondom (ISO 2553). Gebruik een mal zodat alle consoles even ver van de top staan.`, 'MAG');
    else stap('Staanders op de voetplaat', { basis: nSt * U.voetplaat }, `${nSt} staanders haaks op de voetplaat (${o.staander?.voet.b} x ${o.staander?.voet.l} x ${o.staander?.voet.t}, lasergesneden met ${o.staander?.voet.gaten.length} ankergaten). Hecht, controleer haaks met de winkelhaak in 2 richtingen, en las rondom (hoeklas a${o.staander ? Math.min(5, Math.max(3, Math.round(o.staander.voet.t / 2.5))) : 4}).`, 'MAG');
    const reg = tel('onderregel') + tel('bovenregel');
    if (reg) stap('Regels tussen de staanders', { basis: reg * U.regel, trap: (telTrap('onderregel') + telTrap('bovenregel')) * U.regel * U.trapFactor }, `${reg} regels (koker 40x20x2): leg de staanders op de lastafel op hun afstand, hecht de regels haaks (langs de trap op de helling, schuin gezaagd) en las ze rondom.`, 'MAG');
    if (tel('spijl')) stap('Spijlen lassen', { basis: tel('spijl') * U.spijl, trap: telTrap('spijl') * U.spijl * U.trapFactor }, `${tel('spijl')} spijlen tussen de onderregel en de ${tel('bovenregel') ? 'bovenregel' : 'handregel'}: gebruik een latje met de tussenruimte als mal, hecht onder en boven, las rondom (a3) en slijp de lassen vlak. Langs de trap staan de spijlen verticaal en zijn ze schuin gezaagd.`, 'MAG');
    if (tel('staaf')) stap('Horizontale staven lassen', { basis: tel('staaf') * U.staaf, trap: telTrap('staaf') * U.staaf * U.trapFactor }, `${tel('staaf')} staven tussen de staanders: afstandsblokjes als mal, hecht beide uiteinden en las rondom (a3). Langs de trap lopen ze evenwijdig met de helling.`, 'MAG');
    const pl = P.filter((p) => p.rol === 'plaat' || p.rol === 'plint').reduce((t, p) => t + p.n, 0);
    if (pl) stap('Platen inlassen', { basis: pl * U.plaat }, `${pl} platen (3 mm, lasergesneden): in het midden van de staander, hechten om de 150 mm aan beide kanten en onderbroken lassen 30/150 (zodat de plaat niet trekt).`, 'MAG');
    stap('Handregel lassen', { basis: m * U.handregelPerM, hoek: o.hoeken * U.verstek, trap: o.knikken * U.verstek + (trap ? U.trapMal : 0) }, `Leg de handregel (${k.hr === 'rond' ? 'Ø42,4' : 'plat 50x8'}) op de staanders; ${nHoek ? `${nHoek} verstek${nHoek > 1 ? 'ken' : ''} doorlassen (V-naad) en vlak slijpen; ` : ''}las hem op elke staander (hoeklas a3 aan beide kanten). ${k.soort === 'glasstaal' && k.hr === 'rond' ? 'Inox handregel: niet lassen, op de dragers schroeven.' : ''}`, 'MAG / TIG');
    if (o.klemmen.length) stap('Gaten voor de glasklemmen', { glas: o.klemmen.length * U.klemgat }, `${o.klemmen.length} gaten Ø11 in de staanders (2 per kant per glasplaat), blindklinkmoer M8 zetten. Na het coaten: de klemmen losjes vastzetten.`, 'boren');
    if (o.st.staander !== 'inox') stap(k.plaats === 'buiten' ? 'Naar de verzinkerij en de coater' : 'Klaarmaken voor de coater', k.plaats === 'buiten' ? { basis: U.coatKlaar + m * 0.05, buiten: 0.5 } : { basis: U.coatKlaar + m * 0.05 }, k.plaats === 'buiten' ? 'Buiten: boor ontluchtings- en afloopgaten Ø10 in elke koker (onder en boven, bij elke regel), ontvetten, naar de verzinkerij (thermisch verzinken), dan duplex poedercoaten. Ankergaten en klinkmoeren afstoppen.' : 'Ontvetten, de klinkmoeren en ankergaten afstoppen, merken. Laten stralen en poedercoaten.');
  }
  // op de werf
  const nGlas = P.filter((p) => p.soort === 'glas').reduce((t, p) => t + p.n, 0);
  stap('Plaatsen', { plaatsen: m * U.plaatsenPerM + nGlas * U.glasPerPlaat, zij: zij ? m * U.plaatsenPerM * U.zijFactor : 0 }, `${zij ? 'Zijmontage: boor de ankers in de vloerrand' : 'Bovenop de vloer: zet de voetplaten uit'} volgens het plaatsingsblad, ${o.ankers.length} ankers, stel waterpas en loodrecht met uitvulplaatjes${nGlas ? `, plaats ${nGlas} glasplaten (2 personen, zuignappen)` : ''}.`);
  return S;
}
