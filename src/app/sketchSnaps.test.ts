import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, savePrefs, type PrefValue } from './prefs';
import { automaticRelations, directionSnap, gridSnapOn, snapPoint } from './sketchSnaps';
import { addArc, addCircle, addLine, createSketch } from '../core/sketch/model';
import type { Sketch } from '../core/sketch/types';

// QA v0.5.11 F112: System Options ▸ Sketch ▸ Relations/Snaps and Document Properties ▸ Grid/Snap change where the
// pointer lands while sketching. Each test turns one option off (or on) and shows the snap goes (or comes).
const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, ...o });
afterEach(() => use());
const GRID = { quick: false, shown: false, size: 10 };

function sketch(): { s: Sketch; line: { p1: string; p2: string } } {
  let s = createSketch('s', 'S');
  let l;
  [s, l] = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 });
  [s] = addLine(s, { x: 30, y: -10 }, { x: 30, y: 30 });
  [s] = addCircle(s, { x: 100, y: 0 }, 10);
  [s] = addArc(s, { x: 0, y: 100 }, { x: 10, y: 100 }, { x: 0, y: 110 });
  return { s, line: l };
}
const kind = (o: Record<string, PrefValue>, p: { x: number; y: number }, ref: { x: number; y: number } | null = null, grid = GRID) => {
  use(o);
  return snapPoint(sketch().s, p, 1, ref, grid).snap?.kind ?? null;
};

describe('Relations/Snaps', () => {
  it('snaps.enableSnapping: off, nothing snaps', () => {
    expect(kind({}, { x: 40.5, y: 0.3 })).toBe('endpoint');
    expect(kind({ 'snaps.enableSnapping': false }, { x: 40.5, y: 0.3 })).toBe(null);
  });
  it('snaps.endPoints: end points and the origin', () => {
    expect(kind({ 'snaps.endPoints': false }, { x: 40.5, y: 0.3 })).not.toBe('endpoint');

  });
  it('snaps.centerPoints: the centre of a circle', () => {
    expect(kind({}, { x: 100.3, y: 0.2 })).toBe('center');
    expect(kind({ 'snaps.centerPoints': false }, { x: 100.3, y: 0.2 })).not.toBe('center');
  });
  it('snaps.midPoints: the middle of a line', () => {
    expect(kind({}, { x: 20.2, y: 0.3 })).toBe('midpoint');
    expect(kind({ 'snaps.midPoints': false }, { x: 20.2, y: 0.3 })).toBe('on');
  });
  it('snaps.quadrantPoints: the quadrant points of a circle', () => {
    expect(kind({}, { x: 110.2, y: 0.3 })).toBe('quadrant');
    expect(kind({ 'snaps.quadrantPoints': false }, { x: 110.2, y: 0.3 })).toBe('on');
  });
  it('snaps.intersections: the crossing of two lines', () => {
    use();
    expect(snapPoint(sketch().s, { x: 30.3, y: 0.4 }, 1, null, GRID)).toMatchObject({ p: { x: 30, y: 0 }, snap: { kind: 'intersection' } });
    expect(kind({ 'snaps.intersections': false }, { x: 30.3, y: 0.4 })).toBe('on');
  });
  it('snaps.nearest: a point on a curve', () => {
    expect(kind({}, { x: 10, y: 0.4 })).toBe('on');
    expect(kind({ 'snaps.nearest': false }, { x: 10, y: 0.4 })).not.toBe('on');
  });
  it('snaps.hv: horizontal / vertical from the start of the line', () => {
    expect(kind({}, { x: 60, y: 50.4 }, { x: 0, y: 50 })).toBe('horizontal');
    expect(kind({ 'snaps.hv': false }, { x: 60, y: 50.4 }, { x: 0, y: 50 })).not.toBe('horizontal');
  });
  it('snaps.hvPoints: lining up with an existing point', () => {
    expect(kind({}, { x: 40.4, y: 60 })).toBe('align');
    expect(kind({ 'snaps.hvPoints': false }, { x: 40.4, y: 60 })).toBe(null);
  });
  it('snaps.parallel: a line drawn parallel to an existing one', () => {
    // from (0,50) towards (39.8, 60.2): within 1.5° of the direction (2:1 slope)? no; use a sloped reference line
    let s = createSketch('s', 'S');
    [s] = addLine(s, { x: 0, y: 0 }, { x: 100, y: 50 });
    use();
    const r = snapPoint(s, { x: 40, y: 80.6 }, 1, { x: 0, y: 60 }, GRID);
    expect(r.snap?.kind).toBe('parallel');
    expect((r.p.y - 60) / r.p.x).toBeCloseTo(0.5);
    use({ 'snaps.parallel': false });
    expect(snapPoint(s, { x: 40, y: 80.6 }, 1, { x: 0, y: 60 }, GRID).snap).toBe(null);
  });
  it('snaps.perpendicular: a line drawn perpendicular to an existing one', () => {
    let s = createSketch('s', 'S');
    [s] = addLine(s, { x: 0, y: 0 }, { x: 100, y: 50 });
    use();
    const r = snapPoint(s, { x: 20.5, y: 20 }, 1, { x: 30, y: 0 }, GRID);
    expect(r.snap?.kind).toBe('perpendicular');
    use({ 'snaps.perpendicular': false });
    expect(snapPoint(s, { x: 20.5, y: 20 }, 1, { x: 30, y: 0 }, GRID).snap).toBe(null);
  });
  it('snaps.angle and snaps.snapAngle: the line snaps to multiples of the angle', () => {
    const s = createSketch('s', 'S');
    use();
    expect(directionSnap(s, { x: 50, y: 50.6 }, { x: 0, y: 0 }, 1)).toBe(null);
    use({ 'snaps.angle': true });
    expect(directionSnap(s, { x: 50, y: 50.6 }, { x: 0, y: 0 }, 1)?.kind).toBe('angle');
    use({ 'snaps.angle': true, 'snaps.snapAngle': 30 });
    expect(directionSnap(s, { x: 50, y: 50.6 }, { x: 0, y: 0 }, 1)).toBe(null);
    expect(directionSnap(s, { x: 50, y: 28.6 }, { x: 0, y: 0 }, 1)?.kind).toBe('angle');
  });
  it('snaps.grid and snaps.gridOnlyWhenDisplayed: the grid snap without the Quick Snaps button', () => {
    use();
    expect(gridSnapOn(false, true)).toBe(false);
    use({ 'snaps.grid': true });
    expect(gridSnapOn(false, false)).toBe(false);
    expect(gridSnapOn(false, true)).toBe(true);
    use({ 'snaps.grid': true, 'snaps.gridOnlyWhenDisplayed': false });
    expect(gridSnapOn(false, false)).toBe(true);
    expect(snapPoint(createSketch('s', 'S'), { x: 13, y: 27 }, 1, null, GRID).p).toEqual({ x: 10, y: 30 });
  });
  it('doc.gridSnapPoints: snap points per minor line', () => {
    use();
    expect(snapPoint(createSketch('s', 'S'), { x: 13, y: 27 }, 1, null, { ...GRID, quick: true }).p).toEqual({ x: 10, y: 30 });
    use({ 'doc.gridSnapPoints': 2 });
    expect(snapPoint(createSketch('s', 'S'), { x: 13, y: 27 }, 1, null, { ...GRID, quick: true }).p).toEqual({ x: 15, y: 25 });
  });
  it('snaps.automaticRelations: a snap adds its relation only when on', () => {
    expect(automaticRelations()).toBe(true);
    use({ 'snaps.automaticRelations': false });
    expect(automaticRelations()).toBe(false);
  });
  // QA 0.5.12 F112: Tangent
  it('snaps.tangent: a line from outside snaps to the tangent point of a circle, an arc only within its span', () => {
    const from = { x: 50, y: 0 };
    // circle centre (100, 0) radius 10: tangent points at x = 98, y = ±9.798
    const hit = snapPoint(sketch().s, { x: 98.3, y: 9.6 }, 1, from, GRID);
    expect(hit.snap?.kind).toBe('tangent');
    expect(hit.p.x).toBeCloseTo(98, 9);
    expect(hit.p.y).toBeCloseTo(Math.sqrt(96), 9);
    // the line from `from` to the point touches the circle: it is perpendicular to the radius
    expect((hit.p.x - from.x) * (hit.p.x - 100) + (hit.p.y - from.y) * hit.p.y).toBeCloseTo(0, 9);
    expect(kind({ 'snaps.tangent': false }, { x: 98.3, y: 9.6 }, from)).toBe('on');
    // arc centre (0, 100) radius 10 from 0° to 90°: from (50, 100) only the upper tangent point lies on the arc
    expect(kind({}, { x: 2.2, y: 109.6 }, { x: 50, y: 100 })).toBe('tangent');
    expect(kind({}, { x: 2.2, y: 90.4 }, { x: 50, y: 100 })).not.toBe('tangent');
    // no tangent without a start point, and a point snap still wins
    expect(kind({}, { x: 98.3, y: 9.6 })).toBe('on');
  });
});
