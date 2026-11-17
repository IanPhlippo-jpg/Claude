/**
 * What the Sketch options of Tools ▸ Options (and General ▸ Single command per pick) do while sketching (0.5.16,
 * advice 5.2 item 4): small functions the sketch tools, the sketch scene, the store and the New dialogs call.
 * prefsView.test.ts proves each one; the list of options that do something is prefsWired.ts.
 */
import { getPref } from './prefs';
import type { Sketch, SketchPoint } from '../core/sketch/types';

const on = (key: string) => getPref(key) !== false;

/** the tools that make sketch entities or dimensions: General ▸ Single command per pick ends them after one */
const SINGLE_PICK_TOOLS = new Set([
  'line', 'centerline', 'midpointLine', 'rectangle', 'centerRectangle', 'rect3Corner', 'rect3Center', 'parallelogram',
  'circle', 'perimeterCircle', 'arc3', 'arcCenter', 'tangentArc', 'spline', 'styleSpline', 'point', 'polygon', 'slot',
  'centerSlot', 'arcSlot', 'centerArcSlot', 'ellipse', 'partialEllipse', 'parabola', 'conic', 'hdim', 'vdim', 'dimension',
]);

/**
 * General ▸ Single command per pick: the sketch and dimension tools are cleared after each use. The commit the sketch
 * tools call is wrapped so the tool goes back to Select after the entity or dimension it made (moving a dimension
 * label while the tool is on does not count).
 */
export function singlePickCommit<F extends (label: string, fn: (s: Sketch) => Sketch) => void>(commit: F, tool: string, endTool: () => void): F {
  if (getPref('general.singleCommandPerPick') !== true || !SINGLE_PICK_TOOLS.has(tool)) return commit;
  return ((label: string, fn: (s: Sketch) => Sketch) => {
    commit(label, fn);
    if (label !== 'Move dimension') queueMicrotask(endTool);
  }) as F;
}

/**
 * Sketch ▸ Show spline control polygon by default: the control polygon of a spline (null when the option is off). A
 * Style Spline is a Bezier curve whose points are its poles; a spline through points (Catmull-Rom) has the poles of its
 * cubic pieces: p1, p1 + (p2 - p0)/6, p2 - (p3 - p1)/6, p2 for every span.
 */
export function splineControlPolygon(pts: SketchPoint[], style: boolean): SketchPoint[] | null {
  if (getPref('sketch.splinePolygon') !== true || pts.length < 2) return null;
  if (style || pts.length === 2) return pts.slice();
  const out: SketchPoint[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    out.push({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }, p2);
  }
  return out;
}

let ghost: Sketch | null = null;
/**
 * Sketch ▸ Ghost image on drag: the sketch as it was when a drag started, drawn faded under the dragged geometry until
 * the drag ends (the store calls this at the start and the end of a drag; null clears it).
 */
export function setDragGhost(sketch: Sketch | null): void {
  ghost = sketch && on('sketch.ghostImage') ? sketch : null;
}
/** the ghost of the sketch being dragged (null: no drag, another sketch, or the option is off) */
export const dragGhost = (sketchId: string | undefined): Sketch | null => (ghost && ghost.id === sketchId ? ghost : null);

/**
 * Sketch ▸ Use fully defined sketches: a feature is refused on a sketch that is not fully defined (the message says
 * why), else null. An empty sketch counts as under defined.
 */
export function underDefinedRefusal(sketch: Sketch | null | undefined, status: string | null | undefined): string | null {
  if (getPref('sketch.fullyDefined') !== true || !sketch) return null;
  if (status === 'full' && sketch.entityOrder.length > 0) return null;
  return `${sketch.name} is not fully defined. Options ▸ Sketch ▸ Use fully defined sketches: define it fully (Fully Define Sketch) before making a feature.`;
}

/** Use fully defined sketches, where a feature starts: says why and returns true when the feature is refused */
export function refuseUnderDefined(sketch: Sketch | null | undefined, status: string | null | undefined, say: (text: string, level: 'warn') => void): boolean {
  const why = underDefinedRefusal(sketch, status);
  if (why) say(why, 'warn');
  return !!why;
}

/** Sketch ▸ Create sketch on new part: a new part opens with a sketch on the Front plane */
export const sketchOnNewPart = (): boolean => getPref('sketch.sketchOnNewPart') === true;
