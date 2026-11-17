// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_PREFS, savePrefs, type PrefValue } from './prefs';
import * as view from './prefsView';
import * as sk from './prefsSketch';
import * as ui from './prefsUi';
import { lengthSnap, snapPoint } from './sketchSnaps';
import type { Sketch } from '../core/sketch/types';

// 0.5.16 (advice 5.2, item 4): more options of Tools ▸ Options that do something. Every test sets
// the option away from its default and shows that the function the program calls gives another result.
const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, 'colors.custom': '{}', ...o });
afterEach(() => use());

/** a closed cylinder of radius 5 along z from 0 to 20, its side as one curved face */
function cylinder() {
  const g = new THREE.CylinderGeometry(5, 5, 20, 32, 1, true).rotateX(Math.PI / 2).translate(0, 0, 10).toNonIndexed();
  const triangles = Array.from({ length: g.getAttribute('position').count / 3 }, (_, i) => i);
  return { g, face: { curved: true, triangles } };
}

describe('Colors and Display', () => {
  it('colors.backgroundAppearance: document scene, plain or gradient', () => {
    expect(view.viewportBackground(undefined)).toBeUndefined();
    expect(view.viewportBackground({ background: 'white' })).toBe('#ffffff');
    use({ 'colors.backgroundAppearance': 'Plain (Viewport Background color above)' });
    expect(view.viewportBackground({ background: 'white' })).toBe('var(--bg-viewport)');
    use({ 'colors.backgroundAppearance': 'Gradient (Top/Bottom Gradient Colors above)' });
    expect(view.viewportBackground(undefined)).toContain('var(--bg-viewport-2)');
  });
  it('colors.shadedWithEdges: the edge colour of Shaded With Edges', () => {
    use({ 'colors.custom': JSON.stringify({ '--shaded-edges': '#3355aa' }) });
    expect(view.shadedEdgeColor()).toBe('#000000');
    use({ 'colors.shadedWithEdges': true, 'colors.custom': JSON.stringify({ '--shaded-edges': '#3355aa' }) });
    expect(view.shadedEdgeColor()).toBe('#3355aa');
  });
  it('display.openEdges: the open edges of a surface in their own colour', () => {
    expect(view.openEdgeColor()).toBeNull();
    use({ 'display.openEdges': true });
    expect(view.openEdgeColor()).toBeTruthy();
    // an open tube has two boundary circles of 32 segments each; a closed box has none
    expect(view.openEdgeSegments(cylinder().g).length / 6).toBe(64);
    expect(view.openEdgeSegments(new THREE.BoxGeometry(1, 1, 1)).length).toBe(0);
  });
  it('display.shadedFaceHighlighting: a selected face filled or outlined', () => {
    expect(view.shadedFaceHighlight()).toBe(true);
    use({ 'display.shadedFaceHighlighting': false });
    expect(view.shadedFaceHighlight()).toBe(false);
  });
  it('display.highlightAllEdges: the edges of a selected feature', () => {
    expect(view.highlightFeatureEdges()).toBe(false);
    use({ 'display.highlightAllEdges': true });
    expect(view.highlightFeatureEdges()).toBe(true);
  });
  it('display.tempAxes: the axis of a cylindrical face under the pointer', () => {
    const { g, face } = cylinder();
    const axis = view.temporaryAxis(g, face)!;
    expect(axis).not.toBeNull();
    for (const p of axis) expect(Math.hypot(p.x, p.y)).toBeLessThan(1e-3);
    expect(Math.min(axis[0].z, axis[1].z)).toBeLessThan(0);
    expect(Math.max(axis[0].z, axis[1].z)).toBeGreaterThan(20);
    // a flat face has no axis
    expect(view.temporaryAxis(new THREE.PlaneGeometry(4, 4).toNonIndexed(), { curved: false, triangles: [0, 1] })).toBeNull();
    use({ 'display.tempAxes': false });
    expect(view.temporaryAxis(g, face)).toBeNull();
  });
  it('display.breadcrumbsAtCursor: the breadcrumbs at the pointer', () => {
    expect(view.breadcrumbsAtCursor()).toBe(false);
    use({ 'display.breadcrumbsAtCursor': true });
    expect(view.breadcrumbsAtCursor()).toBe(true);
  });
  it('fm.transparentFlyout: the flyout tree without its panel', () => {
    expect(view.flyoutTransparent()).toBe(true);
    use({ 'fm.transparentFlyout': false });
    expect(view.flyoutTransparent()).toBe(false);
  });
  it('sketch.displayPlaneShaded: the plane of the edited sketch shaded in the shaded styles', () => {
    expect(view.sketchPlaneShaded('shaded')).toBe(true);
    expect(view.sketchPlaneShaded('hiddenRemoved')).toBe(false);
    use({ 'sketch.displayPlaneShaded': false });
    expect(view.sketchPlaneShaded('shadedEdges')).toBe(false);
  });
  it('doc.planeIntersections: the lines where the planes cross', () => {
    const o = new THREE.Vector3();
    const planes = [
      { o, u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), s: 10 }, // front
      { o, u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1), s: 10 }, // top
      { o, u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0), s: 10 }, // right
    ];
    expect(view.planeIntersections(planes)).toEqual([]);
    use({ 'doc.planeIntersections': true });
    const lines = view.planeIntersections(planes);
    expect(lines.length).toBe(3);
    for (const [a, b] of lines) expect(a.distanceTo(b)).toBeCloseTo(20);
  });
});

describe('Selection', () => {
  it('selection.throughTransparency: a see-through body is picked past', () => {
    expect(view.selectThroughTransparency()).toBe(true);
    use({ 'selection.throughTransparency': false });
    expect(view.selectThroughTransparency()).toBe(false);
  });
  it('selection.wireframeHLV and selection.hlrShaded: hidden edges pickable per display style', () => {
    expect(view.hiddenEdgesPickable('wireframe')).toBe(true);
    expect(view.hiddenEdgesPickable('shaded')).toBe(false);
    use({ 'selection.wireframeHLV': false, 'selection.hlrShaded': true });
    expect(view.hiddenEdgesPickable('hiddenVisible')).toBe(false);
    expect(view.hiddenEdgesPickable('hiddenRemoved')).toBe(true);
  });
});

const sketch = (n = 1): Sketch => ({ id: 's1', name: 'Sketch1', plane: 'front', points: { o: { x: 100, y: 100 } }, scalars: {}, entities: {}, entityOrder: Array.from({ length: n }, (_, i) => 'e' + i), constraints: {}, constraintOrder: [], origin: 'o' } as unknown as Sketch);

describe('Sketch', () => {
  it('general.singleCommandPerPick: a sketch tool ends after one entity', async () => {
    const commit = vi.fn((label: string, fn: (s: Sketch) => Sketch) => void [label, fn]), end = vi.fn();
    sk.singlePickCommit(commit, 'line', end)('Line', (s) => s);
    await Promise.resolve();
    expect(end).not.toHaveBeenCalled();
    use({ 'general.singleCommandPerPick': true });
    const wrapped = sk.singlePickCommit(commit, 'line', end);
    wrapped('Move dimension', (s) => s);
    await Promise.resolve();
    expect(end).not.toHaveBeenCalled();
    wrapped('Line', (s) => s);
    await Promise.resolve();
    expect(end).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(3);
    // a tool that does not make entities stays on
    expect(sk.singlePickCommit(commit, 'trim', end)).toBe(commit);
  });
  it('sketch.splinePolygon: the control polygon of a spline', () => {
    const pts = [{ x: 0, y: 0 }, { x: 6, y: 6 }, { x: 12, y: 0 }];
    expect(sk.splineControlPolygon(pts, false)).toBeNull();
    use({ 'sketch.splinePolygon': true });
    const poly = sk.splineControlPolygon(pts, false)!;
    expect(poly.length).toBe(7);
    expect(poly[1]).toEqual({ x: 1, y: 1 });
    expect(poly[3]).toEqual(pts[1]);
    expect(sk.splineControlPolygon(pts, true)).toEqual(pts);
  });
  it('sketch.ghostImage: the sketch as it was at the start of a drag', () => {
    const s = sketch();
    sk.setDragGhost(s);
    expect(sk.dragGhost('s1')).toBe(s);
    expect(sk.dragGhost('s2')).toBeNull();
    sk.setDragGhost(null);
    expect(sk.dragGhost('s1')).toBeNull();
    use({ 'sketch.ghostImage': false });
    sk.setDragGhost(s);
    expect(sk.dragGhost('s1')).toBeNull();
  });
  it('sketch.fullyDefined: a feature only on a fully defined sketch', () => {
    expect(sk.underDefinedRefusal(sketch(), 'under')).toBeNull();
    use({ 'sketch.fullyDefined': true });
    expect(sk.underDefinedRefusal(sketch(), 'under')).toMatch(/not fully defined/);
    expect(sk.underDefinedRefusal(sketch(0), 'full')).toMatch(/not fully defined/);
    expect(sk.underDefinedRefusal(sketch(), 'full')).toBeNull();
  });
  it('sketch.sketchOnNewPart: a new part opens a sketch', () => {
    expect(sk.sketchOnNewPart()).toBe(false);
    use({ 'sketch.sketchOnNewPart': true });
    expect(sk.sketchOnNewPart()).toBe(true);
  });
  it('snaps.length: a line length in whole grid increments', () => {
    const from = { x: 0, y: 0 }, p = { x: 7.3, y: 0.2 };
    expect(lengthSnap(p, from, 2.5)).toEqual(p);
    const empty = sketch(0);
    const grid = { quick: false, shown: false, size: 2.5 };
    expect(snapPoint(empty, p, 0.01, from, grid).p).toEqual(p);
    use({ 'snaps.length': true });
    const q = lengthSnap(p, from, 2.5);
    expect(Math.hypot(q.x, q.y)).toBeCloseTo(7.5);
    expect(Math.atan2(q.y, q.x)).toBeCloseTo(Math.atan2(p.y, p.x));
    const r = snapPoint(empty, p, 0.01, from, grid).p;
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(7.5);
  });
});

describe('Feature Tree, General, Templates, Import/Export, Units', () => {
  it('general.autoShowPM: a command shows its Property Panel', () => {
    expect(ui.autoShowPropertyPanel('tree', true)).toBe(true);
    expect(ui.autoShowPropertyPanel('tree', false)).toBe(false);
    use({ 'general.autoShowPM': false });
    expect(ui.autoShowPropertyPanel('tree', true)).toBe(false);
    expect(ui.autoShowPropertyPanel('properties', true)).toBe(true);
  });
  it('fm.tree: Hide/show tree items', () => {
    expect(ui.treeItemShown(DEFAULT_PREFS, 'Equations', false)).toBe(false);
    expect(ui.treeItemShown({ 'fm.tree.Equations': 'Show' }, 'Equations', false)).toBe(true);
    expect(ui.treeItemShown({ 'fm.tree.History': 'Hide' }, 'History', true)).toBe(false);
  });
  it('fm.slowDoubleClick: a slow second click opens the name', () => {
    ui.slowDoubleClick('f1', false, 1000);
    expect(ui.slowDoubleClick('f1', true, 1800)).toBe(true);
    expect(ui.slowDoubleClick('f1', true, 2000)).toBe(false); // a fast double-click
    expect(ui.slowDoubleClick('f2', true, 3000)).toBe(false); // another item
    use({ 'fm.slowDoubleClick': false });
    ui.slowDoubleClick('f1', false, 5000);
    expect(ui.slowDoubleClick('f1', true, 5800)).toBe(false);
  });
  it('fm.arrowKeyNav: the arrow keys walk the tree after a click in it', () => {
    ui.setTreeFocus(true);
    expect(ui.treeArrowKeys()).toBe(false);
    use({ 'fm.arrowKeyNav': true });
    expect(ui.treeArrowKeys()).toBe(true);
    ui.setTreeFocus(false);
    expect(ui.treeArrowKeys()).toBe(false);
    expect(ui.treeArrowTarget(['a', 'b', 'c'], 'b', 'ArrowDown')).toBe('c');
    expect(ui.treeArrowTarget(['a', 'b', 'c'], 'b', 'ArrowUp')).toBe('a');
    expect(ui.treeArrowTarget(['a', 'b', 'c'], 'c', 'ArrowDown')).toBeNull();
    expect(ui.treeArrowTarget(['a', 'b', 'c'], null, 'ArrowDown')).toBe('a');
  });
  it('fm.commentsInPM: the comments of the edited feature in its Property Panel', () => {
    const comments = [{ featureId: 'f1', text: 'a' }, { featureId: 'f2', text: 'b' }];
    expect(ui.commentsForPropertyPanel(comments, 'f1')).toEqual([comments[0]]);
    use({ 'fm.commentsInPM': false });
    expect(ui.commentsForPropertyPanel(comments, 'f1')).toEqual([]);
  });
  it('templates.part, templates.assembly, templates.mode: the default templates', () => {
    const list = [{ name: 'Part', kind: 'part' }, { name: 'Assembly', kind: 'assembly' }, { name: 'Part-ABS-MMGS', kind: 'part' }, { name: 'Assembly-IPS', kind: 'assembly' }];
    expect(ui.defaultTemplate(list, 'part')?.name).toBe('Part');
    expect(ui.promptForTemplate()).toBe(false);
    use({ 'templates.part': 'C:\\Templates\\Part-ABS-MMGS.prtdot', 'templates.assembly': 'Assembly-IPS.asmdot', 'templates.mode': 'Prompt user to select document template' });
    expect(ui.defaultTemplate(list, 'part')?.name).toBe('Part-ABS-MMGS');
    expect(ui.defaultTemplate(list, 'assembly')?.name).toBe('Assembly-IPS');
    expect(ui.promptForTemplate()).toBe(true);
  });
  it('import.runDiagnostics: Import Diagnostics after an import', () => {
    expect(ui.runImportDiagnostics()).toBe(false);
    use({ 'import.runDiagnostics': true });
    expect(ui.runImportDiagnostics()).toBe(true);
  });
  it('import.format and export.format: the options of the chosen file format', () => {
    expect(ui.shownForFormat('import.runDiagnostics', { 'import.format': 'General' })).toBe(true);
    expect(ui.shownForFormat('import.units', { 'import.format': 'General' })).toBe(false);
    expect(ui.shownForFormat('import.units', { 'import.format': 'STL' })).toBe(true);
    expect(ui.shownForFormat('import.format', { 'import.format': 'STL' })).toBe(true);
    expect(ui.shownForFormat('export.stlFormat', { 'export.format': 'STL' })).toBe(true);
    expect(ui.shownForFormat('export.stlFormat', { 'export.format': 'STEP' })).toBe(false);
    expect(ui.shownForFormat('export.units', { 'export.format': 'STEP' })).toBe(true);
    expect(ui.shownForFormat('general.recentMax', { 'export.format': 'PDF' })).toBe(true);
  });
  it('doc.forceUnit and doc.timeUnit: forces and times in the document units', () => {
    expect(ui.forceUnit()).toEqual({ label: 'N', perNewton: 1 });
    expect(ui.timeUnit()).toEqual({ label: 'sec', perSecond: 1 });
    use({ 'doc.forceUnit': 'kilonewton', 'doc.timeUnit': 'minute' });
    expect(ui.forceUnit().label).toBe('kN');
    expect(100 * ui.forceUnit().perNewton).toBeCloseTo(0.1);
    expect(ui.timeUnit()).toEqual({ label: 'min', perSecond: 1 / 60 });
    use({ 'doc.forceUnit': 'pound-force' });
    expect(4.4482216152605 * ui.forceUnit().perNewton).toBeCloseTo(1);
  });
});
