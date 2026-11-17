/**
 * What the Display, Selection and Colors options of Tools ▸ Options do in the graphics area (0.5.16, advice 5.2 item
 * 4): small functions of the options that the viewport, the body scene and the sketch scene call where the option
 * takes effect. prefsView.test.ts proves each one; the list of options that do something is prefsWired.ts.
 */
import * as THREE from 'three';
import { customColors, getPref } from './prefs';
import { cylinderAxis } from '../core/assembly/assembly';

const on = (key: string) => getPref(key) !== false;

/** a colour of the Colors list (Options ▸ Colors): the edited one, else the theme's value of its token */
function listColor(token: string, fallback: string): string {
  const edited = customColors()[token];
  if (edited) return edited;
  const css = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return css || fallback;
}

/* ---------- Colors -------------------------------------------------------------- */

/**
 * Colors ▸ Background appearance: the CSS background of the graphics area (undefined = the theme's default gradient).
 * "Use document scene background" follows Edit Scene; Plain and Gradient use the Viewport Background and Top/Bottom
 * Gradient colours of the list, whatever the document's scene says.
 */
export function viewportBackground(sc?: { background: string; color?: string }): string | undefined {
  const mode = String(getPref('colors.backgroundAppearance'));
  if (mode.startsWith('Plain')) return 'var(--bg-viewport)';
  if (mode.startsWith('Gradient')) return 'linear-gradient(180deg, var(--bg-viewport) 0%, var(--bg-viewport-2) 100%)';
  if (!sc || sc.background === 'gradient') return undefined;
  return sc.background === 'white' ? '#ffffff' : sc.background === 'color' ? sc.color ?? '#ffffff' : 'linear-gradient(180deg, #5a5f66 0%, #c9ccd1 62%, #f2f2f2 100%)';
}

/** Colors ▸ Use specified color for Shaded With Edges mode: the edges in "Edges in Shaded With Edges Mode", else black */
export const shadedEdgeColor = (): string => (getPref('colors.shadedWithEdges') === true ? listColor('--shaded-edges', '#000000') : '#000000');

/** Display ▸ Show open edges of surfaces in different color: the colour "Surfaces, Open Edges" (null: off) */
export const openEdgeColor = (): string | null => (getPref('display.openEdges') === true ? listColor('--open-edges', '#d01818') : null);

const openEdgeCache = new WeakMap<THREE.BufferGeometry, number[]>();
/** the open edges of a surface: triangle sides used by one triangle only (positions merged at 1e-4 mm), as segments */
export function openEdgeSegments(g: THREE.BufferGeometry): number[] {
  const hit = openEdgeCache.get(g);
  if (hit) return hit;
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.getAttribute('position');
  // rounded to 1e-4 mm, -0 as 0 (the seam of a revolved surface meets itself at sin(2π) ≈ -2e-16)
  const q = (v: number) => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4);
  const key = (i: number) => `${q(pos.getX(i))},${q(pos.getY(i))},${q(pos.getZ(i))}`;
  const sides = new Map<string, { a: number; b: number; n: number }>();
  for (let t = 0; t < pos.count / 3; t++) {
    for (let k = 0; k < 3; k++) {
      const a = t * 3 + k, b = t * 3 + ((k + 1) % 3);
      const ka = key(a), kb = key(b);
      if (ka === kb) continue;
      const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const s = sides.get(id);
      if (s) s.n++;
      else sides.set(id, { a, b, n: 1 });
    }
  }
  const out: number[] = [];
  for (const s of sides.values()) if (s.n === 1) out.push(pos.getX(s.a), pos.getY(s.a), pos.getZ(s.a), pos.getX(s.b), pos.getY(s.b), pos.getZ(s.b));
  openEdgeCache.set(g, out);
  return out;
}

/* ---------- Display ------------------------------------------------------------- */

/** Display ▸ Use shaded face highlighting: a selected face is filled; off, only its boundary takes the selection colour */
export const shadedFaceHighlight = (): boolean => on('display.shadedFaceHighlighting');

/** Display ▸ Highlight all edges of features selected in graphics view: the boundaries of the feature's faces light up */
export const highlightFeatureEdges = (): boolean => getPref('display.highlightAllEdges') === true;

/**
 * Display ▸ Display temporary axes upon hover over cylindrical faces: the axis of the cylindrical face under the
 * pointer, as a segment a little longer than the face (null when the option is off or the face is not a cylinder).
 */
export function temporaryAxis(g: THREE.BufferGeometry, face: { curved: boolean; triangles: number[] }): [THREE.Vector3, THREE.Vector3] | null {
  if (!on('display.tempAxes') || !face.curved || face.triangles.length < 4) return null;
  const ax = cylinderAxis(g, face.triangles);
  if (!ax || !(ax.radius > 1e-6)) return null;
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.getAttribute('position');
  const dir = ax.dir.clone().normalize();
  let t0 = Infinity, t1 = -Infinity;
  const p = new THREE.Vector3();
  for (const t of face.triangles) {
    for (let k = 0; k < 3; k++) {
      p.fromBufferAttribute(pos, t * 3 + k);
      const d = p.clone().sub(ax.point);
      const along = d.dot(dir);
      // a cylinder: every vertex at the radius from the axis (a sphere or a free-form face is not)
      if (Math.abs(d.addScaledVector(dir, -along).length() - ax.radius) > Math.max(0.02 * ax.radius, 1e-3)) return null;
      t0 = Math.min(t0, along);
      t1 = Math.max(t1, along);
    }
  }
  const margin = Math.max(0.1 * (t1 - t0), ax.radius * 0.3);
  return [ax.point.clone().addScaledVector(dir, t0 - margin), ax.point.clone().addScaledVector(dir, t1 + margin)];
}

/** Display ▸ Show breadcrumbs at mouse pointer: the breadcrumbs open at the pointer instead of the top left corner */
export const breadcrumbsAtCursor = (): boolean => getPref('display.breadcrumbsAtCursor') === true;

/** Feature Tree ▸ Use transparent flyout Feature Tree in parts/assemblies */
export const flyoutTransparent = (): boolean => on('fm.transparentFlyout');

/** Sketch ▸ Display plane when shaded: the plane of the sketch being edited is drawn shaded in the shaded styles */
export const sketchPlaneShaded = (style: string): boolean => on('sketch.displayPlaneShaded') && (style === 'shaded' || style === 'shadedEdges');

/**
 * Document Properties ▸ Plane Display ▸ Show intersections: the lines where the shown planes cross, clipped to both
 * squares (each plane: origin o, axes u and v, half size s). The intended look draws them in the plane edge colour.
 */
export function planeIntersections(planes: { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; s: number }[]): [THREE.Vector3, THREE.Vector3][] {
  if (!on('doc.planeIntersections')) return [];
  const out: [THREE.Vector3, THREE.Vector3][] = [];
  // the part of the line p + t·d inside a plane's square: [tMin, tMax] or null
  const clip = (pl: (typeof planes)[number], p: THREE.Vector3, d: THREE.Vector3, range: [number, number]): [number, number] | null => {
    let [lo, hi] = range;
    for (const ax of [pl.u.clone().normalize(), pl.v.clone().normalize()]) {
      const a = p.clone().sub(pl.o).dot(ax), b = d.dot(ax);
      if (Math.abs(b) < 1e-12) { if (Math.abs(a) > pl.s) return null; continue; }
      const t1 = (-pl.s - a) / b, t2 = (pl.s - a) / b;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
    }
    return hi > lo + 1e-9 ? [lo, hi] : null;
  };
  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      const A = planes[i], B = planes[j];
      const na = A.u.clone().cross(A.v).normalize(), nb = B.u.clone().cross(B.v).normalize();
      const d = na.clone().cross(nb);
      if (d.lengthSq() < 1e-10) continue;
      d.normalize();
      // a point on both planes: solve na·x = na·oa, nb·x = nb·ob with x in the span of na and nb
      const ca = na.dot(A.o), cb = nb.dot(B.o), k = na.dot(nb), det = 1 - k * k;
      const p = na.clone().multiplyScalar((ca - cb * k) / det).addScaledVector(nb, (cb - ca * k) / det);
      const r1 = clip(A, p, d, [-Infinity, Infinity]);
      const r2 = r1 && clip(B, p, d, r1);
      if (r2) out.push([p.clone().addScaledVector(d, r2[0]), p.clone().addScaledVector(d, r2[1])]);
    }
  }
  return out;
}

/* ---------- Selection ----------------------------------------------------------- */

/** Selection ▸ Enable selection through transparency: a click on a see-through body picks the opaque face behind it */
export const selectThroughTransparency = (): boolean => on('selection.throughTransparency');

/**
 * Selection ▸ Allow selection in wireframe and HLV modes / Allow selection in HLR and shaded modes: whether an edge
 * hidden behind a face can be picked in this display style.
 */
export const hiddenEdgesPickable = (style: string): boolean => (style === 'wireframe' || style === 'hiddenVisible' ? on('selection.wireframeHLV') : getPref('selection.hlrShaded') === true);
