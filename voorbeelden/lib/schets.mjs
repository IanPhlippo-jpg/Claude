// Kleine bouwstenen om Phlippo CAD-documenten in code te maken (voorbeelden/bureau, voorbeelden/afzuiging).
// Een schets is een verzameling gesloten lussen (lijnen, bogen, cirkels) op een vlak; een vlak heeft u, v en een normaal.

/** een vlak door `origin` met normaal `n`; u en v zoals de app een vlak op een face legt (u = X tenzij n langs X ligt) */
export function vlak(id, name, origin, n, kind = 'face') {
  const u = Math.abs(n[0]) > 0.9 ? [0, 0, -1] : [1, 0, 0];
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return { id, name, origin, u, v, n, kind };
}

/** de standaardvlakken (Top: u = X, v = -Z, n = +Y) */
export const TOP = { id: 'top', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] };
export const FRONT = { id: 'front', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const r6 = (x) => Math.round(x * 1e6) / 1e6;

/** een punt van het onderdeel (x, y, z) in schetscoördinaten van het vlak */
export function opVlak(plane, p) {
  const d = sub(p, plane.origin);
  return [r6(dot(d, plane.u)), r6(dot(d, plane.v))];
}

export class Schets {
  constructor(id, name, plane) {
    this.id = id;
    this.name = name;
    this.plane = plane;
    this.points = { [`origin_${id}`]: { x: 0, y: 0 } };
    this.entities = {};
    this.scalars = {};
    this.entityOrder = [];
    this.n = 0;
  }

  pt(x, y) {
    const id = `${this.id}p${this.n++}`;
    this.points[id] = { x: r6(x), y: r6(y) };
    return id;
  }

  #ent(e) {
    const id = `${this.id}e${this.n++}`;
    this.entities[id] = { id, construction: false, ...e };
    this.entityOrder.push(id);
    return id;
  }

  #scalar(v) {
    const id = `${this.id}s${this.n++}`;
    this.scalars[id] = r6(v);
    return id;
  }

  /** gesloten veelhoek in schetscoördinaten */
  lus(pts) {
    const ids = pts.map(([x, y]) => this.pt(x, y));
    ids.forEach((p, i) => this.#ent({ kind: 'line', p1: p, p2: ids[(i + 1) % ids.length] }));
    return this;
  }

  /** gesloten veelhoek met punten van het onderdeel (x, y, z) */
  lusW(pts3) {
    return this.lus(pts3.map((p) => opVlak(this.plane, p)));
  }

  /** rechthoek met afgeronde hoeken (r = 0: scherp), in schetscoördinaten */
  rrect(x1, y1, x2, y2, r = 0) {
    [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
    [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];
    if (r <= 0) return this.lus([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);
    const P = [
      [x1 + r, y1], [x2 - r, y1], [x2, y1 + r], [x2, y2 - r], [x2 - r, y2], [x1 + r, y2], [x1, y2 - r], [x1, y1 + r],
    ].map(([x, y]) => this.pt(x, y));
    const C = [[x2 - r, y1 + r], [x2 - r, y2 - r], [x1 + r, y2 - r], [x1 + r, y1 + r]].map(([x, y]) => this.pt(x, y));
    const R = this.#scalar(r);
    for (let i = 0; i < 4; i++) {
      this.#ent({ kind: 'line', p1: P[2 * i], p2: P[2 * i + 1] });
      this.#ent({ kind: 'arc', center: C[i], start: P[2 * i + 1], end: P[(2 * i + 2) % 8], r: R, ccw: true });
    }
    return this;
  }

  /** rechthoek tussen twee hoekpunten van het onderdeel (de rechthoek ligt in het vlak) */
  rrectW(a3, b3, r = 0) {
    const [ax, ay] = opVlak(this.plane, a3);
    const [bx, by] = opVlak(this.plane, b3);
    return this.rrect(ax, ay, bx, by, r);
  }

  /** hulplijn (constructie), bv. de as van een draaiing; geeft het id van de lijn terug */
  as(x1, y1, x2, y2) {
    return this.#ent({ kind: 'line', p1: this.pt(x1, y1), p2: this.pt(x2, y2), construction: true });
  }

  cirkel(x, y, r) {
    this.#ent({ kind: 'circle', center: this.pt(x, y), r: this.#scalar(r) });
    return this;
  }

  cirkelW(c3, r) {
    const [x, y] = opVlak(this.plane, c3);
    return this.cirkel(x, y, r);
  }

  /** een lus van lijnen en bogen: het eerste item is het beginpunt [x, y], daarna [x, y] (lijn naar) of
   *  { boog: [cx, cy], naar: [x, y], ccw } (boog naar); eindigt het laatste niet op het beginpunt, dan sluit een lijn de lus */
  pad(items) {
    const start = this.pt(items[0][0], items[0][1]);
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    let prev = start;
    let prevXY = items[0];
    let dicht = false;
    for (let i = 1; i < items.length; i++) {
      const it = items[i];
      const xy = Array.isArray(it) ? it : it.naar;
      dicht = i === items.length - 1 && same(xy, items[0]);
      const p = dicht ? start : this.pt(xy[0], xy[1]);
      if (Array.isArray(it)) this.#ent({ kind: 'line', p1: prev, p2: p });
      else this.#ent({ kind: 'arc', center: this.pt(it.boog[0], it.boog[1]), start: prev, end: p, r: this.#scalar(Math.hypot(prevXY[0] - it.boog[0], prevXY[1] - it.boog[1])), ccw: it.ccw !== false });
      prev = p;
      prevXY = xy;
    }
    if (!dicht) this.#ent({ kind: 'line', p1: prev, p2: start });
    return this;
  }

  /** zoals pad(), maar met punten [x, z] van het onderdeel op een vlak met normaal ±Y; een boog { boog: [x, z], naar:
   *  [x, z] } is altijd de korte boog (de draairichting volgt uit de punten) */
  padW(items) {
    const y = this.plane.origin[1];
    const sk = (p) => opVlak(this.plane, [p[0], y, p[1]]);
    let vorig = sk(items[0]);
    const uit = [vorig];
    for (const it of items.slice(1)) {
      if (Array.isArray(it)) {
        vorig = sk(it);
        uit.push(vorig);
      } else {
        const c = sk(it.boog), e = sk(it.naar);
        const kruis = (vorig[0] - c[0]) * (e[1] - c[1]) - (vorig[1] - c[1]) * (e[0] - c[0]);
        uit.push({ boog: c, naar: e, ccw: kruis > 0 });
        vorig = e;
      }
    }
    return this.pad(uit);
  }

  json() {
    return {
      id: this.id, name: this.name, plane: this.plane.id, points: this.points, scalars: this.scalars, entities: this.entities,
      constraints: {}, entityOrder: this.entityOrder, constraintOrder: [], origin: `origin_${this.id}`,
    };
  }
}

/** bouwt een onderdeel op: schetsen en features in volgorde, met SOLIDWORKS-namen (Sketch1, Boss-Extrude1, Cut-Extrude1) */
export class Onderdeel {
  constructor(name, material) {
    this.name = name;
    this.material = material;
    this.sketches = {};
    this.features = [];
    this.planes = {};
    this.tel = { sketch: 0, boss: 0, cut: 0 };
  }

  /** een nieuw vlak (wordt bij het document bewaard), of een standaardvlak */
  vlak(plane) {
    const standaard = plane === TOP || plane === FRONT;
    if (!standaard && ['top', 'front', 'right'].includes(plane.id)) throw new Error(`vlak '${plane.id}' heeft de naam van een standaardvlak`);
    if (!standaard) this.planes[plane.id] = plane;
    return plane;
  }

  schets(plane, teken) {
    this.vlak(plane);
    const n = ++this.tel.sketch;
    const s = new Schets(`s${n}`, `Sketch${n}`, plane);
    teken(s);
    this.sketches[s.id] = s.json();
    this.features.push({ id: `ks${n}`, type: 'sketch', name: `Sketch${n}`, sketchId: s.id, suppressed: false });
    return s.id;
  }

  /** extrude van de laatste schets; op = 'boss' | 'cut'; omkeren = tegen de normaal in; terug = mm in de andere richting */
  extrude(op, depth, { omkeren = false, terug = 0, naam, draft } = {}) {
    const n = op === 'cut' ? ++this.tel.cut : ++this.tel.boss;
    const sketchId = `s${this.tel.sketch}`;
    const f = {
      id: `f${this.features.length + 1}`, type: 'extrude', name: naam ?? `${op === 'cut' ? 'Cut' : 'Boss'}-Extrude${n}`, sketchId,
      suppressed: false, op, end: 'blind', depth, reverse: omkeren,
    };
    if (terug) f.direction2 = { end: 'blind', depth: terug };
    if (draft) f.draft = { angle: draft, outward: false }; // aflopend naar binnen (afschuining)
    this.features.push(f);
    return this;
  }

  /** draaiing van de laatste schets om een hulplijn (Schets.as); op = 'boss' | 'cut', hoek in graden */
  revolve(op, asId, hoek = 360, { naam } = {}) {
    const n = op === 'cut' ? ++this.tel.cut : ++this.tel.boss;
    this.features.push({ id: `f${this.features.length + 1}`, type: 'revolve', name: naam ?? `${op === 'cut' ? 'Cut' : 'Boss'}-Revolve${n}`, sketchId: `s${this.tel.sketch}`, suppressed: false, op, axisEntityId: asId, angle: hoek, reverse: false });
    return this;
  }

  doc() {
    return { format: 'phlippo-cad', version: 1, name: this.name, units: 'mm', planes: this.planes, variables: {}, equations: [], sketches: this.sketches, features: this.features, material: this.material };
  }
}

/** een component met het onderdeel erin (zonder `format`), zoals de app het in een assemblage bewaart */
export function component(id, name, doc, position = [0, 0, 0], { rotation = [0, 0, 0, 1], fixed = true } = {}) {
  const { format, ...part } = doc;
  return { id, name, part: { ...part, kind: 'part' }, position, rotation, fixed, suppressed: false };
}
