// Live-koppeling van de tv-pagina aan de doos (firmware 2.0.0).
// ui/maak-tv.py hangt dit achter situatieplan/tv.html (die pagina blijft de bron: tekenen, simulatie, zetMelding) en
// schrijft zo ui/tv.html; de doos serveert dat als /tv/ (gzip, src/tv.h).
//
// - GET /api/meldingen?sinds=<volgnr> elke 250 ms: hall-, IR- en FTR-meldingen met de tijd van de doos.
//   Bij een melding staat het voertuig precies op dat punt. Daarna rijdt het met zijn gemeten snelheid (afstand langs de
//   rijbanen tussen zijn laatste 2 meldingen / tijd) verder over zijn route en wacht het voor het volgende meetpunt.
// - GET /api/staat?kort=1 elke 0,5 s: wissels (servo's), lichtgroepen, haltes (fase, bus); /api/staat bij een nieuwe rev.
// - Antwoordt de doos niet (of is de pagina als bestand geopend): de simulatie van het situatieplan draait.
// - ?api=http://host:poort: een andere doos (of een nep-doos om te testen); ?demo=1: altijd de simulatie. De doos zet
//   Access-Control-Allow-Origin: * op /api/staat, /api/plan en /api/meldingen (V5), dus alle drie werken van elders.
// - Meldingen zonder buscode (V1, V2): alleen aan een voertuig toewijzen als het zeker is. Op een meetpunt met
//   "alleenBus" gaat de melding naar de bus die de doos daar zag (volgorde per strook), anders naar de voorste bus die er
//   verwacht wordt; is er geen, dan alleen tellen (geen nieuw voertuig). Elders gaat ze naar de voorste auto die er
//   verwacht wordt en al de helft van de weg reed (per stuk tussen 2 sensoren: wie eerst binnenkwam, gaat eerst buiten),
//   of wordt ze een nieuwe auto;
//   rijdt er net een bus over het punt, dan alleen tellen. Een auto die na 2 x zijn verwachte rijtijd het volgende
//   meetpunt niet haalde, verdwijnt.
// - VN1 (firmware 2.2.0): "een bus rijdt over het punt" is niet meer "binnen 4 m van de getekende bus": de grens groeit
//   met de onzekerheid (de helft van de afstand van het vorige meetpunt van die bus tot dit punt, minimum 4 m), en een
//   bus die volgens de doos naar dit punt rijdt en op de tekening nog vóór het punt staat, telt altijd. De beslissing
//   zelf staat in ui/tv-logica.js (busOverPunt, getest met node --test ui/test/*.test.mjs).
// - Tijden van de doos (millis) lopen na 49,7 dagen over: verschillen altijd modulo 2^32 (V4).
(() => {
  'use strict';
  const SP = window.situatieplan;
  const zoek = new URLSearchParams(location.search);
  const BASIS = (zoek.get('api') || '').replace(/\/$/, '');
  // als bestand in firmware/ui geopend: de achtergrond staat in de map situatieplan
  if (location.protocol === 'file:') beeld.addEventListener('error', () => { if (!/situatieplan/.test(beeld.src)) beeld.src = '../../situatieplan/' + beeld.src.split('/').pop(); });
  // grotere letters op de tv (alle labels op het plan)
  const oudLabel = labelTekst;
  // elk label van dit beeld onthouden (rechthoek), zodat een live bus zijn naam niet over een ander label zet
  const LABELS = [];
  const maat = (t, fs) => { cx.font = `700 ${fs}px "Segoe UI", Arial, sans-serif`; return { w: cx.measureText(t).width + fs * 0.9, h: fs * 1.55 }; };
  labelTekst = (x, y, t, opt = {}) => {
    const fs = (opt.fs || 11) * 1.3, m = maat(t, fs);
    LABELS.push({ x0: x - m.w / 2, y0: y - m.h / 2, x1: x + m.w / 2, y1: y + m.h / 2 });
    return oudLabel(x, y, t, Object.assign({}, opt, { fs }));
  };
  const oudTeken0 = teken;
  teken = nu => { LABELS.length = 0; return oudTeken0(nu); };
  /** de eerste plaats rond (x, y) waar het label niets anders overlapt (boven, onder, links, rechts, verder weg) */
  const vrijePlek = (x, y, t, fs) => {
    const m = maat(t, fs * 1.3), d = 18;
    const kand = [[0, -d], [0, d + 4], [-(m.w / 2 + 14), 0], [m.w / 2 + 14, 0], [0, -2 * d - 6], [0, 2 * d + 10]];
    for (const [dx, dy] of kand) {
      const r = { x0: x + dx - m.w / 2 - 2, y0: y + dy - m.h / 2 - 2, x1: x + dx + m.w / 2 + 2, y1: y + dy + m.h / 2 + 2 };
      if (!LABELS.some(q => r.x0 < q.x1 && q.x0 < r.x1 && r.y0 < q.y1 && q.y0 < r.y1)) return [x + dx, y + dy];
    }
    return [x, y - d];
  };
  if (!SP || zoek.get('demo') === '1' || (location.protocol === 'file:' && !BASIS)) return;

  // V4: millis() van de doos loopt na 2^32 ms (49,7 dagen) over: verschillen en "later dan" modulo 2^32
  const msNa = (a, b) => (a - b) >>> 0; // ms van b tot a
  const later = (a, b) => a !== b && msNa(a, b) < 0x80000000;
  const D = { aan: false, volgnr: null, maxNr: -1, laatst: 0, kort: null, vol: null, rev: null, hist: {}, autoNr: 0, teller: {}, geteld: 0, fasen: {}, ftr: {}, flits: {} };
  const haal = async pad => { const r = await fetch(BASIS + pad, { cache: 'no-store' }); if (!r.ok) throw new Error(pad + ': ' + r.status); return r.json(); };
  const STD = 6; // m/s: aanname voor een voertuig waarvan nog niets gemeten is (zelfde orde als de simulatie)
  const pxm = () => (PLAN.schaal && PLAN.schaal.px_per_m) || 5;
  const lijst = k => (PLAN && PLAN[k]) || [];
  const SOORTEN = ['hallsensoren', 'ir_sensoren', 'stoppunten', 'ir_leds', 'wissels', 'verkeerslichten', 'lichtgroepen', 'lantaarns', 'servos', 'seinen', 'speakers'];
  const puntVan = id => { for (const k of SOORTEN) { const p = lijst(k).find(x => x.id === id); if (p) return { p, k }; } return null; };
  const koppel = (p, k) => p && p.koppeling && p.koppeling[k] != null ? p.koppeling[k] : null;

  // ------------------------------------------------------------------ plek van een punt en de weg tussen 2 plekken
  function afstandOp(baan, x, y) { // projectie op de polylijn van een baan
    const q = P[baan].p, c = P[baan].c;
    let best = Infinity, s = 0;
    for (let i = 1; i < q.length; i++) {
      const a = q[i - 1], b = q[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)), d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
      if (d < best) { best = d; s = c[i - 1] + Math.sqrt(L2) * t; }
    }
    return s;
  }
  const oudePlek = sensorPlek; // de pagina kent hallsensoren, stoppunten, IR-leds, wissels, verkeerslichten
  sensorPlek = id => {
    const r = oudePlek(id);
    if (r) return r;
    const z = puntVan(id);
    if (!z || !z.p.baan || !P[z.p.baan]) return null;
    return { baan: z.p.baan, s: z.p.afstand_px != null ? z.p.afstand_px : afstandOp(z.p.baan, z.p.x, z.p.y), soort: 'meet' };
  };
  function takken(id) { // waar je van baan `id` op een andere baan kan: begin.van / eind.voegt_in_op / eind.gaat_over_in
    const B = PLAN.rijbanen.find(r => r.id === id), L = P[id].L, uit = [];
    for (const r of PLAN.rijbanen) if (r.begin && r.begin.van === id && P[r.id]) uit.push({ van: id, op: r.begin.einde ? L : r.begin.afstand_px, naar: r.id, s: 0 });
    if (B && B.eind && B.eind.voegt_in_op && P[B.eind.voegt_in_op]) uit.push({ van: id, op: L, naar: B.eind.voegt_in_op, s: B.eind.afstand_px || 0 });
    if (B && B.eind && B.eind.gaat_over_in && P[B.eind.gaat_over_in]) uit.push({ van: id, op: L, naar: B.eind.gaat_over_in, s: 0 });
    return uit;
  }
  /** kortste weg in de rijrichting van plek a naar plek b: { d (px), over: [takken] } */
  function weg(a, b, diepte = 0, mag = () => true) {
    const Pa = P[a.baan];
    if (!Pa || diepte > 5) return null;
    const voor = x => Pa.gesloten ? mod(x - a.s, Pa.L) : x - a.s;
    let best = null;
    if (a.baan === b.baan) { let d = voor(b.s); if (Pa.gesloten && d < 3) d += Pa.L; if (d >= 3) best = { d, over: [] }; }
    for (const t of takken(a.baan)) {
      const d = voor(t.op);
      if (d < 0 || (best && d >= best.d) || !mag(t.naar)) continue;
      const r = weg({ baan: t.naar, s: t.s }, b, diepte + 1, mag);
      if (r && (!best || d + r.d < best.d)) best = { d: d + r.d, over: [t].concat(r.over) };
    }
    return best;
  }
  // V1: een meetpunt waar alleen bussen komen (dashboard, Bussen, Meetpunten: "alleen bussen"; of in het plan alleen_bus)
  function alleenBus(id) {
    const k = D.vol && (D.vol.punten || []).find(x => x && (x.id || x.punt) === id);
    if (k && k.alleenBus != null) return !!k.alleenBus;
    const z = puntVan(id);
    return !!(z && (z.p.alleen_bus || z.p.alleenBus));
  }
  // meetpunten: een bus ziet elke ontvanger (zijn code) en de hallsensoren waar alleen bussen komen (op een gedeelde strook
  // zegt een hallsensor niet welk voertuig het was); een auto ziet de andere hallsensoren en de FTR-lichtsluizen
  const meetpunten = bus => lijst('hallsensoren').filter(p => !!bus === alleenBus(p.id)).map(p => p.id)
    .concat(lijst('ir_sensoren').filter(p => bus || p.sensor === 'ftr' || D.ftr[p.id]).map(p => p.id));
  // een bus rijdt naar zijn eigen haltestrook: de strook met zijn naam (bv. "Haltestrook Lijnbus 1"), anders halte_lijnbus<nr>
  function eigenStrook(bus) {
    const b = D.vol && (D.vol.bussen || []).find(x => x && x.nr === bus), n = b && b.naam ? b.naam.toLowerCase() : null;
    return PLAN.rijbanen.find(r => n && r.begin && (r.naam || '').toLowerCase().includes(n)) || PLAN.rijbanen.find(r => r.id === 'halte_lijnbus' + bus) || null;
  }
  function volgende(plek, bus) {
    const eigen = bus && eigenStrook(bus), stroken = PLAN.rijbanen.filter(r => r.begin && r.eind && r.eind.voegt_in_op);
    const mag = id => !eigen || id === eigen.id || !stroken.some(r => r.id === id);
    let best = null;
    for (const id of meetpunten(bus)) {
      const pl = sensorPlek(id), r = pl && (weg(plek, pl, 0, mag) || weg(plek, pl));
      if (r && (!best || r.d < best.d)) best = Object.assign(r, { id });
    }
    return best;
  }
  function zetEinde(v) { // de baan van het voertuig eindigt waar zijn route afslaat
    const b = v.benen[v.li], t = v.route && v.route[0];
    if (b && t && t.van === b.baan) b.s1 = P[b.baan].gesloten ? v.s + mod(t.op - v.s, P[b.baan].L) : t.op;
  }
  function plan(v, plek, bus) {
    const r = volgende(plek, bus);
    v.route = r ? r.over.slice() : null;
    v.rest = r ? r.d : null;
    v.routeL = v.rest;
    v.doel = r ? r.id : null;
    v.verwachtS = r && v.v > 0 ? r.d / v.v : null; // verwachte rijtijd tot het volgende meetpunt (V1)
    zetEinde(v);
  }
  // verder rijden: hoogstens tot net voor het volgende meetpunt; afslaan zoals de route zegt
  let bezig = null;
  const oudStap = stapLive;
  stapLive = (v, dt) => {
    if (!v.live || v.rest == null) return oudStap(v, dt);
    if (v.vast) return oudStap(v, 0);
    const mag = Math.max(0, v.rest - 2);
    let stap = v.v * dt;
    if (stap > mag) { stap = mag; dt = v.v > 0 ? mag / v.v : 0; }
    bezig = v;
    oudStap(v, dt);
    bezig = null;
    v.rest -= stap;
    zetEinde(v);
  };
  const oudVolgend = volgendeBaan;
  volgendeBaan = (baan, s) => {
    const v = bezig;
    if (v && v.route && v.route.length && v.route[0].van === baan) { const t = v.route.shift(); return { baan: t.naar, s: t.s }; }
    return oudVolgend(baan, s);
  };
  const oudWissels = standWissels;
  standWissels = () => { if (!D.aan) oudWissels(); }; // live: de stand komt van de servo's van de doos

  // ------------------------------------------------------------------------------------------- meldingen
  function snelheidSchatting(bus, plek) {
    const k = bus && D.kort && (D.kort.bussen || []).find(b => b.nr === bus); // de doos kent de rijtijd van het traject
    if (k && k.fractie > 0.05 && k.van && k.naar && later(D.kort.msNu, k.gezienMs)) {
      const a = sensorPlek(k.van), b = sensorPlek(k.naar), r = a && b && weg(a, b);
      if (r) return r.d / (msNa(D.kort.msNu, k.gezienMs) / 1000 / k.fractie) / pxm();
    }
    const gem = Object.values(D.hist).filter(h => h.snel > 0 && !!h.bus === !!bus).map(h => h.snel);
    return gem.length ? gem.reduce((a, b) => a + b) / gem.length : null;
  }
  /** VN1: rijdt er nu een live bus over dit punt? (de beslissing: TvLogica.busOverPunt in ui/tv-logica.js) */
  function busOver(plek, punt) {
    const bussen = SP.voertuigen.filter(v => v.live && v.busNr && v.benen[v.li]).map(v => {
      const hier = { baan: v.benen[v.li].baan, s: v.s }, a = weg(hier, plek), b = weg(plek, hier), h = D.hist[v.id];
      const vorig = h && h.plek ? weg(h.plek, plek) : null;
      const k = D.kort && (D.kort.bussen || []).find(x => x && x.nr === v.busNr);
      return { voor: a ? a.d : null, na: b ? b.d : null, vorig: vorig ? vorig.d : null,
        doosHier: !!(k && k.naar === punt && hier.baan === plek.baan && a) }; // volgens de doos nog niet voorbij
    });
    return window.TvLogica.busOverPunt(bussen, pxm());
  }
  /** V1/V2: wie hoort bij een melding zonder buscode? { id, bus } of null (alleen tellen, geen nieuw voertuig) */
  function wie(m, plek) {
    const verwacht = f => SP.voertuigen.filter(v => v.live && !v.vast && v.doel === m.punt && f(v)).sort((a, b) => a.rest - b.rest); // voorste eerst
    if (alleenBus(m.punt)) {
      // de doos volgt bussen zonder code in volgorde per strook: de bus die zij hier net zag, gaat voor
      const k = D.kort && (D.kort.bussen || []).find(b => b.van === m.punt && b.gezienMs != null && Math.min(msNa(m.ms, b.gezienMs), msNa(b.gezienMs, m.ms)) <= 1500);
      if (k) return { id: 'bus' + k.nr, bus: k.nr };
      const b = verwacht(v => !!v.busNr)[0];
      return b ? { id: b.id, bus: b.busNr } : null;
    }
    // de voorste auto die hier verwacht wordt en al minstens de helft van zijn weg reed; anders is het een andere auto
    const a = verwacht(v => v.soort === 'auto' && !v.busNr && v.rest <= 0.5 * (v.routeL || 0))[0];
    if (a) return { id: a.id, bus: 0 };
    if (busOver(plek, m.punt)) return null; // de magneet van een bus op de gedeelde strook: geen nieuwe auto
    return { id: 'auto' + (++D.autoNr), bus: 0 };
  }
  function verwerk(m, msNu) {
    const plek = m.punt && sensorPlek(m.punt);
    if (!plek) return;
    if (m.soort === 'ftr') D.ftr[m.punt] = true;
    D.flits[m.punt] = performance.now();
    D.teller[m.punt] = (D.teller[m.punt] || 0) + 1;
    let bus = m.bus || 0, id = 'bus' + bus;
    if (!bus) {
      const w = wie(m, plek);
      if (!w) { D.geteld++; return; } // niet zeker: alleen geteld
      id = w.id;
      bus = w.bus;
    }
    const h = D.hist[id];
    let snel = null;
    if (h && later(m.ms, h.ms)) {
      const r = weg(h.plek, plek), dt = msNa(m.ms, h.ms) / 1000;
      if (r && r.d / dt / pxm() < 40) snel = r.d / dt / pxm();
    }
    if (snel == null) snel = (h && h.snel) || snelheidSchatting(bus, plek) || STD;
    SP.zetMelding({ sensor: m.punt, voertuig: id, soort: bus ? 'bus' : 'auto', snelheid: snel == null ? undefined : snel });
    D.hist[id] = { plek, ms: m.ms, snel, bus, gezien: performance.now() };
    const v = SP.voertuigen.find(x => x.id === id);
    if (!v) return;
    v.live = true;
    v.vast = false;
    if (bus) v.busNr = bus;
    if (plek.soort === 'meet' && snel != null) v.v = snel * pxm(); // de pagina zet een onbekend punt niet stil
    plan(v, plek, bus);
    const oud = msNa(msNu, m.ms) / 1000; // de melding is al even oud: zo ver is het voertuig al
    if (oud > 0 && oud < 8 && v.v > 0) stapLive(v, oud);
  }
  async function lusMeldingen() {
    try {
      if (!D.vol) D.vol = await haal('/api/staat'); // eerst de meetpunten kennen (alleenBus), dan pas meldingen verwerken
      const j = await haal('/api/meldingen?sinds=' + (D.volgnr == null ? 0 : D.volgnr));
      D.laatst = performance.now();
      if (!D.aan) aanzetten();
      if (D.volgnr != null && j.volgnr < D.volgnr) D.maxNr = -1; // de doos is herstart
      const eerst = D.volgnr == null;
      for (const m of (j.meldingen || []).slice().sort((a, b) => a.nr - b.nr)) {
        if (m.nr <= D.maxNr) continue;
        D.maxNr = m.nr;
        if (eerst && msNa(j.msNu, m.ms) > 20000) continue; // bij het openen: alleen de laatste 20 s
        verwerk(m, j.msNu);
      }
      D.volgnr = j.volgnr;
    } catch (e) {
      if (D.aan && performance.now() - D.laatst > 5000) uitzetten();
    }
    setTimeout(lusMeldingen, D.aan ? 250 : 3000);
  }

  // --------------------------------------------------------------------- wissels, lichten, haltes, lampen
  const servoVan = p => {
    const k = koppel(p, 'servo');
    if (k) return k;
    const s = D.vol && (D.vol.servos || []).find(x => x && x.naam === p.naam);
    return s ? s.nr : /^W\d+$/.test(p.id) ? +p.id.slice(1) : 0;
  };
  const servoLive = nr => Object.assign({}, D.vol && (D.vol.servos || []).find(x => x && x.nr === nr), D.kort && (D.kort.servos || []).find(x => x.nr === nr));
  const groepAan = nr => { const g = D.kort && (D.kort.groepen || []).find((x, i) => (x.nr || i + 1) === nr); return !!(g && (g.brandt != null ? g.brandt : g.aan)); };
  const halteVol = nr => D.vol && (D.vol.haltes || []).find(x => x && x.nr === nr);
  function stopVan(nr) {
    const k = lijst('stoppunten').find(p => koppel(p, 'halte') === nr);
    if (k) return k;
    const h = halteVol(nr), a = h && puntVan(h.aankomstPunt);
    if (!a) return null;
    return a.k === 'stoppunten' ? a.p : lijst('stoppunten').find(p => p.baan === a.p.baan) || null;
  }
  function lichtVan(nr) {
    const k = lijst('verkeerslichten').find(p => koppel(p, 'halte') === nr);
    if (k) return k;
    const st = stopVan(nr);
    return st ? lijst('verkeerslichten').find(p => p.baan === st.baan) || null : null;
  }
  function pasToe() {
    const k = D.kort;
    if (!k) return;
    for (const w of lijst('wissels')) { const s = servoLive(servoVan(w)); if (s.stand === 'a') zetWissel(w.id, 'rechtdoor'); if (s.stand === 'b') zetWissel(w.id, 'afbuigen'); }
    for (const h of k.haltes || []) {
      const vol = halteVol(h.nr) || {}, vl = lichtVan(h.nr), st = stopVan(h.nr), lt = vol.licht || {};
      if (vl) zetLicht(vl.id, lt.groen ? (groepAan(lt.groen) ? 'groen' : 'rood') : h.fase === 'groen' ? 'groen' : 'rood');
      const v = h.bus && SP.voertuigen.find(x => x.id === 'bus' + h.bus);
      if (st && h.bus && ['stop', 'wachten', 'verkeer'].includes(h.fase)) {
        if (!v || !v.vast) { // de bus staat aan de halte
          SP.zetMelding({ sensor: st.id, voertuig: 'bus' + h.bus, soort: 'bus' });
          const n = SP.voertuigen.find(x => x.id === 'bus' + h.bus);
          if (n) { n.live = true; n.vast = true; n.busNr = h.bus; plan(n, sensorPlek(st.id), h.bus); }
        }
        if (h.fase === 'stop') for (const i of lijst('ir_leds')) if (i.stoppunt === st.id) IRFLITS[i.id] = 0.8;
      } else if (v && v.vast) { // groen: de bus vertrekt met zijn laatst gemeten snelheid
        v.vast = false;
        const hs = D.hist[v.id];
        v.v = ((hs && hs.snel) || snelheidSchatting(h.bus) || STD) * pxm();
      }
      D.fasen[h.nr] = h;
    }
    // weg: een auto die na 2 x zijn verwachte rijtijd het volgende meetpunt niet haalde (zonder meetpunt voor zich: na 20 s),
    // een bus na 3 minuten zonder melding (niet zolang hij aan een halte staat)
    const nu = performance.now(), l = SP.voertuigen;
    for (let i = l.length - 1; i >= 0; i--) {
      const v = l[i], hs = D.hist[v.id];
      if (!v.live || v.vast) continue;
      const s = hs ? (nu - hs.gezien) / 1000 : 1e9;
      if (v.busNr ? s > 180 : v.verwachtS ? s > 2 * v.verwachtS : s > 20) { l.splice(i, 1); delete D.hist[v.id]; }
    }
  }
  async function lusStaat() {
    try {
      const k = await haal('/api/staat?kort=1');
      if (k.rev !== D.rev || !D.vol) { D.vol = await haal('/api/staat'); D.rev = k.rev; }
      D.kort = k;
      if (D.aan) pasToe();
    } catch (e) { /* lusMeldingen beslist over live of simulatie */ }
    setTimeout(lusStaat, D.aan ? 500 : 3000);
  }
  async function planVanDoos() { // het plan op de doos (dashboard, Plan) gaat voor op het ingebakken plan
    try {
      const j = await haal('/api/plan');
      if (!j || !Array.isArray(j.rijbanen) || JSON.stringify(j) === JSON.stringify(PLAN)) return;
      const oud = PLAN;
      try { laadPlan(j); } catch (e) { laadPlan(oud); return; } // de simulatie kent alleen het plan van Station Turnhout
      if (j.achtergrond) beeld.src = BASIS + '/tv/' + j.achtergrond;
      SP.voertuigen.length = 0;
      maatvoering();
      BANENLAAG = null;
      legende();
    } catch (e) { /* geen plan op de doos: het ingebakken plan blijft */ }
  }
  function aanzetten() { D.aan = true; D.hist = {}; SP.zetBron('live'); planVanDoos(); }
  function uitzetten() { D.aan = false; D.volgnr = null; D.maxNr = -1; SP.zetBron('simulatie'); }

  // ------------------------------------------------------------------------------- tekenen (bovenop de pagina)
  const FASE = { aankomst: ['komt aan', '#f5c400', '#1d1d1d'], stop: ['stopt', '#d62f2b', '#fff'], wachten: ['wacht', '#d62f2b', '#fff'],
    verkeer: ['wacht op vrije weg', '#f08c00', '#1d1d1d'], groen: ['vertrekt', '#1f9e48', '#fff'], vertrek: ['vertrekt', '#1f9e48', '#fff'] };
  function lamp(x, y, aan, r) {
    if (aan) { const g = cx.createRadialGradient(x, y, 1, x, y, r * 3.2); g.addColorStop(0, 'rgba(255,214,90,.95)'); g.addColorStop(1, 'rgba(255,214,90,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 3.2, 0, 7); cx.fill(); }
    cx.fillStyle = aan ? '#ffe27a' : '#5a5a5a'; cx.strokeStyle = '#1d1d1d'; cx.lineWidth = 1.6;
    cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill(); cx.stroke();
  }
  function tekenExtra() {
    cx.setTransform(K, 0, 0, K, 0, 0);
    const nu = performance.now();
    for (const p of lijst('lichtgroepen').concat(lijst('lantaarns'))) {
      lamp(p.x, p.y, groepAan(koppel(p, 'groep')), 7);
      labelTekst(p.x, p.y + 20, p.naam || p.id, { fs: 10 });
    }
    for (const p of lijst('servos').concat(lijst('seinen'))) { // slagboom: A open (rechtop), B dicht; armsein: A stop (horizontaal), B veilig (schuin)
      const s = servoLive(servoVan(p)), t = s.a != null && s.b !== s.a ? Math.max(0, Math.min(1, ((s.us || s.a) - s.a) / (s.b - s.a))) : 0;
      const sein = (s.soort || (p.id.startsWith('SEIN') ? 'armsein' : 'slagboom')) === 'armsein';
      cx.lineCap = 'round';
      if (sein) {
        cx.strokeStyle = '#2a2a2a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(p.x, p.y + 18); cx.lineTo(p.x, p.y - 18); cx.stroke();
        const h = -t * Math.PI / 4;
        cx.strokeStyle = '#d62f2b'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(p.x, p.y - 16); cx.lineTo(p.x + 24 * Math.cos(h), p.y - 16 + 24 * Math.sin(h)); cx.stroke();
      } else {
        const h = -(1 - t) * Math.PI / 2, ex = p.x + 40 * Math.cos(h), ey = p.y + 40 * Math.sin(h);
        cx.strokeStyle = '#fff'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(ex, ey); cx.stroke();
        cx.strokeStyle = '#d62f2b'; cx.setLineDash([7, 7]); cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(ex, ey); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle = '#2a2a2a'; cx.beginPath(); cx.arc(p.x, p.y, 4.5, 0, 7); cx.fill();
      }
      labelTekst(p.x, p.y + 30, p.naam || p.id, { fs: 10 });
    }
    // de eerste hallsensor tekent de pagina zelf; de soort volgt uit de lijst (VN3: ook HW1, HS_... uit het sensoradvies)
    for (const [p, ir] of lijst('ir_sensoren').map(q => [q, true]).concat(lijst('hallsensoren').slice(1).map(q => [q, false]))) {
      const f = Math.max(0, 1 - (nu - (D.flits[p.id] || -1e9)) / 900);
      if (f > 0) { // een melding: een duidelijke gloed (ook als ze aan geen voertuig toegewezen werd, V1)
        const k = ir ? '40,170,255' : '255,200,0', g = cx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 34);
        g.addColorStop(0, `rgba(${k},${f})`); g.addColorStop(0.5, `rgba(${k},${0.65 * f})`); g.addColorStop(1, `rgba(${k},0)`);
        cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, 34, 0, 7); cx.fill();
      }
      cx.fillStyle = ir ? '#0a7fbf' : '#c9a400'; cx.strokeStyle = '#fff'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(p.x, p.y - 8); cx.lineTo(p.x + 8, p.y); cx.lineTo(p.x, p.y + 8); cx.lineTo(p.x - 8, p.y); cx.closePath(); cx.fill(); cx.stroke();
      labelTekst(p.x, p.y - 20, p.naam || p.id, { fs: 10, kleur: ir ? '#0a5f8f' : '#1d1d1d' });
    }
    for (const p of lijst('speakers')) {
      cx.fillStyle = '#1f7f86'; cx.strokeStyle = '#fff'; cx.lineWidth = 1.6; cx.beginPath(); cx.arc(p.x, p.y, 8, 0, 7); cx.fill(); cx.stroke();
      cx.strokeStyle = '#1f7f86'; cx.lineWidth = 2; for (const r of [12, 16]) { cx.beginPath(); cx.arc(p.x, p.y, r, -0.7, 0.7); cx.stroke(); }
      labelTekst(p.x, p.y + 22, p.naam || p.id, { fs: 10 });
    }
    if (!D.aan) return;
    for (const h of Object.values(D.fasen)) { // haltes: fase en aftellen bij het verkeerslicht
      const f = FASE[h.fase], vl = lichtVan(h.nr) || stopVan(h.nr);
      if (f && vl) labelTekst(vl.x, vl.y + 26, f[0] + (h.resterendS ? ' ' + h.resterendS + ' s' : ''), { fs: 11, achter: f[1], kleur: f[2], rand: '#1d1d1d' });
    }
    for (const v of SP.voertuigen) { // live bussen: hun naam in hun kleur
      if (!v.live || !v.busNr || !v.spoor.length) continue;
      const b = D.vol && (D.vol.bussen || []).find(x => x && x.nr === v.busNr), kop = v.spoor[v.spoor.length - 1];
      const naam = b ? b.naam : 'Bus ' + v.busNr, [lx, ly] = vrijePlek(kop.x, kop.y, naam, 11);
      labelTekst(lx, ly, naam, { fs: 11, achter: (b && b.kleur) || '#333', kleur: '#fff', rand: '#111' });
    }
  }
  const oudTeken = teken;
  teken = nu => { oudTeken(nu); try { tekenExtra(); } catch (e) { /* tekenen mag de pagina niet stilleggen */ } };
  function legende() { // de extra tekens in de legende, alleen wat in het plan staat
    const el = document.getElementById('legende');
    if (!el) return;
    el.querySelectorAll('.live-leg').forEach(x => x.remove());
    const item = (svg, tekst) => { const d = document.createElement('div'); d.className = 'live-leg'; d.innerHTML = '<svg viewBox="0 0 52 28">' + svg + '</svg>' + tekst; el.append(d); };
    if (lijst('lichtgroepen').length || lijst('lantaarns').length) item('<circle cx="26" cy="14" r="9" fill="#ffe27a" stroke="#222" stroke-width="2"/>', 'lichtgroep (geel = aan)');
    if (lijst('servos').length || lijst('seinen').length) item('<path d="M8 20h36" stroke="#d62f2b" stroke-width="6" stroke-dasharray="7 7"/><circle cx="8" cy="20" r="4" fill="#222"/>', 'slagboom of sein');
    if (lijst('ir_sensoren').length) item('<path d="M26 5l9 9-9 9-9-9z" fill="#0a7fbf" stroke="#fff" stroke-width="2"/>', 'IR/FTR-ontvanger');
    if (lijst('speakers').length) item('<circle cx="22" cy="14" r="8" fill="#1f7f86"/><path d="M33 7a10 10 0 0 1 0 14" stroke="#1f7f86" stroke-width="2.5" fill="none"/>', 'geluidskastje');
  }
  const start = () => { if (!PLAN) { setTimeout(start, 100); return; } legende(); lusMeldingen(); lusStaat(); }; // wacht tot de pagina haar plan heeft
  start();
})();
