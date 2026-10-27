import { getPref } from '../prefs';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { Entity, Id, Sketch, SketchPoint } from '../../core/sketch/types';
import { entityLoops } from '../../core/sketch/geometry';
import { entityPoints } from '../../core/sketch/model';
import { findContours } from '../../core/sketch/contours';
import type { SolveResult } from '../../core/solver/solver';
import { getPlane, sketchToWorld, type PlaneId } from './camera';

export interface SceneColors {
  under: string;
  full: string;
  over: string;
  construction: string;
  selected: string;
  hover: string;
  grid: string;
  gridMajor: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  preview: string;
  originPart: string;
  originSketch: string;
  plane: string;
  contour: string;
}

export function readColors(el: HTMLElement): SceneColors {
  const cs = getComputedStyle(el);
  const g = (n: string) => cs.getPropertyValue(n).trim();
  return {
    under: g('--sk-under'),
    full: g('--sk-full'),
    over: g('--sk-over'),
    construction: g('--sk-construction'),
    selected: g('--sk-selected'),
    hover: g('--sk-hover'),
    grid: g('--sk-grid'),
    gridMajor: g('--sk-grid-major'),
    axisX: g('--sk-axis-x'),
    axisY: g('--sk-axis-y'),
    axisZ: g('--sk-axis-z'),
    preview: g('--accent'),
    originPart: g('--sk-origin-part'),
    originSketch: g('--sk-origin-sketch'),
    plane: g('--sk-plane'),
    contour: g('--sk-contour'),
  };
}

function rgba(css: string): { c: THREE.Color; a: number } {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((x) => parseFloat(x));
    return { c: new THREE.Color(parts[0] / 255, parts[1] / 255, parts[2] / 255), a: parts[3] ?? 1 };
  }
  return { c: new THREE.Color(css || '#888'), a: 1 };
}

export interface PreviewItem {
  /** polyline in sketch coordinates */
  points: SketchPoint[];
  dashed?: boolean;
}

export interface SceneInput {
  sketch: Sketch | null;
  plane: PlaneId;
  solve: SolveResult | null;
  selection: Set<string>;
  selectedPoints: Set<Id>;
  hover: { kind: 'point' | 'entity'; id: Id } | null;
  /** the boundary of the region under the cursor (lit like a hovered entity) */
  hoverIds?: Set<Id>;
  /** Selected Contours of an extrude / revolve: the picked regions, filled magenta on the sketch plane */
  pickedRegions?: { outer: SketchPoint[]; holes: SketchPoint[][] }[];
  preview: PreviewItem[];
  previewPoints: SketchPoint[];
  showGrid: boolean;
  /** world units per pixel, for dash sizes & grid density */
  scale: number;
  colors: SceneColors;
  /** sketches that are not active: drawn faded */
  otherSketches: { sketch: Sketch; plane: PlaneId }[];
  /** reference planes to draw (with highlight) */
  planes: { id: PlaneId; highlight: boolean }[];
  showOrigin: boolean;
  /** half-size of the drawn reference planes in world units */
  planeSize: number;
  /** "Shaded Sketch Contours": fill closed loops with translucent grey */
  shadedContours: boolean;
  /** the profile sketch under the yellow preview of a feature: its contours shaded dark, by design */
  underPreview?: boolean;
}

/** the contour fill under a feature preview: dark blue, so that it reads olive-grey through the yellow (measured against the intended design) */
const CONTOUR_UNDER_PREVIEW = { color: 0x00002c, opacity: 0.5 };

/** Owns the three.js scene graph for sketch rendering. */
export class SketchScene {
  /** the graphics area in CSS pixels (fat lines need it) and the sketch line width in px */
  static resolution = new THREE.Vector2(1280, 720);
  static lineWidth = 2;
  readonly scene = new THREE.Scene();
  private group = new THREE.Group();
  private gridGroup = new THREE.Group();
  private pointsMat = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, transparent: true, depthTest: false });

  constructor() {
    this.scene.add(this.gridGroup);
    this.scene.add(this.group);
  }

  private clear(g: THREE.Group) {
    for (const child of [...g.children]) {
      g.remove(child);
      const m = child as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    }
  }

  private buildGrid(input: SceneInput) {
    this.clear(this.gridGroup);
    const b = getPlane(input.plane);
    // adaptive spacing: ~ every 40..100px
    const target = 60 * input.scale;
    const step = Math.pow(10, Math.floor(Math.log10(target)));
    const minorPerMajor = Math.max(1, Math.round(Number(getPref('doc.gridMinor')) || 4));
    // Document Properties ▸ Grid/Snap: automatic scaling (adaptive) or the major spacing divided by the minor lines
    const spacing = getPref('doc.gridAutoScale') === false ? Math.max(0.01, (Number(getPref('doc.gridMajor')) || 10) / minorPerMajor) : target / step >= 5 ? step * 5 : target / step >= 2 ? step * 2 : step;
    const extent = Math.max(input.scale * 4000, 200);
    const count = Math.min(400, Math.ceil(extent / spacing));
    const minor: number[] = [], major: number[] = [];
    const push = (arr: number[], a: THREE.Vector3, c: THREE.Vector3) => arr.push(a.x, a.y, a.z, c.x, c.y, c.z);
    if (input.showGrid) {
      for (let i = -count; i <= count; i++) {
        const d = i * spacing;
        const arr = i % minorPerMajor === 0 ? major : minor;
        push(arr, sketchToWorld(input.plane, d, -count * spacing), sketchToWorld(input.plane, d, count * spacing));
        push(arr, sketchToWorld(input.plane, -count * spacing, d), sketchToWorld(input.plane, count * spacing, d));
      }
    }
    const mk = (arr: number[], css: string) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const { c, a } = rgba(css);
      const m = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: a, depthWrite: false });
      this.gridGroup.add(new THREE.LineSegments(g, m));
    };
    if (minor.length) mk(minor, input.colors.grid);
    if (major.length) mk(major, input.colors.gridMajor);
    // axes of the sketch plane: only together with the grid (desktop CAD shows just the origin glyph)
    if (!input.sketch || !input.showGrid) return;
    const axisLen = count * spacing;
    const ax: number[] = [], ay: number[] = [];
    push(ax, b.o.clone().addScaledVector(b.u, -axisLen), b.o.clone().addScaledVector(b.u, axisLen));
    push(ay, b.o.clone().addScaledVector(b.v, -axisLen), b.o.clone().addScaledVector(b.v, axisLen));
    const colX = input.plane === 'right' ? input.colors.axisZ : input.colors.axisX;
    const colY = input.plane === 'top' ? input.colors.axisZ : input.colors.axisY;
    mk(ax, colX);
    mk(ay, colY);
  }

  update(input: SceneInput): void {
    this.buildGrid(input);
    this.clear(this.group);
    const solid: number[] = [], solidCol: number[] = [];
    const dashed: number[] = [], dashedCol: number[] = [];
    const cons: number[] = [], consCol: number[] = [];
    const pts: number[] = [], ptsCol: number[] = [];
    // construction geometry by design: the sketch colour, thinner, long dash - gap - dot - gap
    const DASHDOT = [10, 3, 1.5, 3].map((v) => v * input.scale);
    const addDashDot = (plane: PlaneId, poly: SketchPoint[], color: THREE.Color) => {
      let k = 0, left = DASHDOT[0];
      for (let i = 0; i < poly.length - 1; i++) {
        const a = poly[i], b = poly[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        let t = 0;
        while (t < len - 1e-12) {
          const step = Math.min(left, len - t);
          if (k % 2 === 0) {
            const p0 = sketchToWorld(plane, a.x + ((b.x - a.x) * t) / len, a.y + ((b.y - a.y) * t) / len);
            const p1 = sketchToWorld(plane, a.x + ((b.x - a.x) * (t + step)) / len, a.y + ((b.y - a.y) * (t + step)) / len);
            cons.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
            consCol.push(color.r, color.g, color.b, color.r, color.g, color.b);
          }
          t += step;
          left -= step;
          if (left <= 1e-12) { k = (k + 1) % DASHDOT.length; left = DASHDOT[k]; }
        }
      }
    };

    const addPolyline = (plane: PlaneId, poly: SketchPoint[], color: THREE.Color, dash: boolean) => {
      const arr = dash ? dashed : solid, col = dash ? dashedCol : solidCol;
      for (let i = 0; i < poly.length - 1; i++) {
        const a = sketchToWorld(plane, poly[i].x, poly[i].y), b = sketchToWorld(plane, poly[i + 1].x, poly[i + 1].y);
        arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
        col.push(color.r, color.g, color.b, color.r, color.g, color.b);
      }
    };

    const entityColor = (e: Entity, input: SceneInput): THREE.Color => {
      const c = input.colors;
      if (input.selection.has(e.id)) return rgba(c.selected).c;
      if ((input.hover?.kind === 'entity' && input.hover.id === e.id) || input.hoverIds?.has(e.id)) return rgba(c.hover).c;
      const st = input.solve?.entityStatus[e.id];
      if (st === 'over') return rgba(c.over).c;
      if (st === 'full') return rgba(c.full).c;
      return rgba(c.under).c;
    };

    const drawSketch = (sk: Sketch, plane: PlaneId, faded: boolean) => {
      for (const id of sk.entityOrder) {
        const e = sk.entities[id];
        if (e.kind === 'point') continue;
        let color = faded ? rgba(input.colors.construction).c : entityColor(e, input);
        if (faded) color = color.clone().lerp(new THREE.Color(0.5, 0.5, 0.5), 0.3);
        // Sketch Color: a shown sketch in its own colour
        if (faded && sk.color) color = new THREE.Color(sk.color);
        for (const loop of entityLoops(sk, e, 96)) {
          if (e.construction) addDashDot(plane, loop, color);
          else addPolyline(plane, loop, color, false);
        }
      }
      if (faded) return;
      // points
      const seen = new Set<Id>();
      const pushPt = (pid: Id, col: THREE.Color) => {
        if (seen.has(pid)) return;
        seen.add(pid);
        const p = sk.points[pid];
        const w = sketchToWorld(plane, p.x, p.y);
        pts.push(w.x, w.y, w.z);
        ptsCol.push(col.r, col.g, col.b);
      };
      const ptColor = (pid: Id, owner: Entity) => {
        if (input.selectedPoints.has(pid)) return rgba(input.colors.selected).c;
        if (input.hover?.kind === 'point' && input.hover.id === pid) return rgba(input.colors.hover).c;
        if (input.solve?.entityStatus[owner.id] === 'over') return rgba(input.colors.over).c;
        if (input.solve && !input.solve.freePoints.has(pid)) return rgba(input.colors.full).c;
        return rgba(input.colors.under).c;
      };
      for (const id of sk.entityOrder) {
        const e = sk.entities[id];
        // an Equation Driven Curve shows only its end points (the samples are internal)
        const ids = e.kind === 'spline' && e.equation ? [e.points[0], e.points[e.points.length - 1]] : entityPoints(e);
        for (const pid of ids) pushPt(pid, ptColor(pid, e));
      }
      pushPt(sk.origin, rgba(input.colors.full).c);
    };

    for (const o of input.otherSketches) drawSketch(o.sketch, o.plane, true);
    // shaded sketch contours (drawn first so lines stay on top)
    if (input.sketch && input.shadedContours) {
      const { c: cc, a: ca } = input.underPreview ? { c: new THREE.Color(CONTOUR_UNDER_PREVIEW.color), a: CONTOUR_UNDER_PREVIEW.opacity } : rgba(input.colors.contour);
      for (const contour of findContours(input.sketch)) {
        if (contour.points.length < 3) continue;
        const shape = new THREE.Shape(contour.points.map((p) => new THREE.Vector2(p.x, p.y)));
        const g = new THREE.ShapeGeometry(shape);
        // map (u,v,0) onto the sketch plane
        const pos = g.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const w = sketchToWorld(input.plane, pos.getX(i), pos.getY(i));
          pos.setXYZ(i, w.x, w.y, w.z);
        }
        pos.needsUpdate = true;
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: ca, depthWrite: false, side: THREE.DoubleSide }));
        m.renderOrder = -1;
        this.group.add(m);
      }
    }
    for (const r of input.pickedRegions ?? []) {
      const shape = new THREE.Shape(r.outer.map((p) => new THREE.Vector2(p.x, p.y)));
      for (const h of r.holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
      const g = new THREE.ShapeGeometry(shape);
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) { const w = sketchToWorld(input.plane, pos.getX(i), pos.getY(i)); pos.setXYZ(i, w.x, w.y, w.z); }
      pos.needsUpdate = true;
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8a2f8f, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.renderOrder = 1;
      this.group.add(m);
    }
    if (input.sketch) drawSketch(input.sketch, input.plane, false);

    // reference planes by design: a thin blue-grey outline (no fill), dashed centre lines,
    // the hovered/selected plane in orange with a faint fill
    for (const pl of input.planes) {
      const b = getPlane(pl.id);
      const s = input.planeSize;
      const h = s * 0.75;
      const corners = [
        b.u.clone().multiplyScalar(-s).addScaledVector(b.v, -h),
        b.u.clone().multiplyScalar(s).addScaledVector(b.v, -h),
        b.u.clone().multiplyScalar(s).addScaledVector(b.v, h),
        b.u.clone().multiplyScalar(-s).addScaledVector(b.v, h),
      ];
      const col = pl.highlight ? rgba(input.colors.hover).c : rgba(input.colors.plane).c;
      // invisible quad keeps the plane pickable-looking (faint fill only when highlighted)
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap((c) => [c.x, c.y, c.z]), 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: pl.highlight ? 0.1 : 0.03, side: THREE.DoubleSide, depthWrite: false }));
      this.group.add(mesh);
      const outline = new THREE.BufferGeometry();
      outline.setAttribute('position', new THREE.Float32BufferAttribute([...corners, corners[0]].flatMap((c) => [c.x, c.y, c.z]), 3));
      this.group.add(new THREE.Line(outline, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: pl.highlight ? 1 : 0.75 })));
      // dashed centre lines through the origin
      const mid = new THREE.BufferGeometry();
      const mu = b.u.clone().multiplyScalar(s), mv = b.v.clone().multiplyScalar(h);
      mid.setAttribute('position', new THREE.Float32BufferAttribute([-mu.x, -mu.y, -mu.z, mu.x, mu.y, mu.z, -mv.x, -mv.y, -mv.z, mv.x, mv.y, mv.z], 3));
      const midLines = new THREE.LineSegments(mid, new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: 0.6, dashSize: 5 * input.scale, gapSize: 4 * input.scale }));
      midLines.computeLineDistances();
      this.group.add(midLines);
    }

    // origin glyph: two short arrows (blue in part mode, red in sketch mode)
    if (input.showOrigin) {
      const L = 14 * input.scale;
      const col = rgba(input.sketch ? input.colors.originSketch : input.colors.originPart).c;
      const b = getPlane(input.plane);
      const arr: number[] = [];
      const seg = (a: THREE.Vector3, c: THREE.Vector3) => arr.push(a.x, a.y, a.z, c.x, c.y, c.z);
      // part origin at the world origin; sketch origin at the origin of its plane (a face plane may be offset)
      const o = input.sketch ? b.o.clone() : new THREE.Vector3();
      const ux = o.clone().addScaledVector(b.u, L), uy = o.clone().addScaledVector(b.v, L);
      seg(o, ux);
      seg(o, uy);
      const head = 0.3;
      seg(ux, ux.clone().addScaledVector(b.u, -L * head).addScaledVector(b.v, L * head * 0.5));
      seg(ux, ux.clone().addScaledVector(b.u, -L * head).addScaledVector(b.v, -L * head * 0.5));
      seg(uy, uy.clone().addScaledVector(b.v, -L * head).addScaledVector(b.u, L * head * 0.5));
      seg(uy, uy.clone().addScaledVector(b.v, -L * head).addScaledVector(b.u, -L * head * 0.5));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      // in a sketch the origin stays on top; in the part it hides behind the bodies, by design
      const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, depthTest: !input.sketch, transparent: !!input.sketch }));
      ls.renderOrder = 9;
      this.group.add(ls);
    }

    // preview geometry (tool in progress)
    const pc = rgba(input.colors.preview).c;
    for (const item of input.preview) addPolyline(input.plane, item.points, pc, !!item.dashed);
    for (const p of input.previewPoints) {
      const w = sketchToWorld(input.plane, p.x, p.y);
      pts.push(w.x, w.y, w.z);
      ptsCol.push(pc.r, pc.g, pc.b);
    }

    if (solid.length) {
      // sketch lines about 2 px wide and smooth, by design draws them (a GL line is only 1 device pixel)
      const g = new LineSegmentsGeometry();
      g.setPositions(solid);
      g.setColors(solidCol);
      const m = new LineMaterial({ vertexColors: true, linewidth: SketchScene.lineWidth, worldUnits: false, transparent: !!input.underPreview });
      m.resolution.copy(SketchScene.resolution);
      const ls = new LineSegments2(g, m);
      ls.frustumCulled = false;
      // under a feature preview the sketch lines lie on its yellow edges: drawn after them so they win
      if (input.underPreview) { ls.renderOrder = 3; Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); }
      this.group.add(ls);
    }
    if (cons.length) {
      const g = new LineSegmentsGeometry();
      g.setPositions(cons);
      g.setColors(consCol);
      const m = new LineMaterial({ vertexColors: true, linewidth: Math.max(1, SketchScene.lineWidth * 0.6), worldUnits: false, transparent: !!input.underPreview });
      m.resolution.copy(SketchScene.resolution);
      const ls = new LineSegments2(g, m);
      ls.frustumCulled = false;
      // under a feature preview the sketch lines lie on its yellow edges: drawn after them so they win
      if (input.underPreview) { ls.renderOrder = 3; Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); }
      this.group.add(ls);
    }
    if (dashed.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(dashed, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(dashedCol, 3));
      const ls = new THREE.LineSegments(g, new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 6 * input.scale, gapSize: 4 * input.scale }));
      ls.computeLineDistances();
      this.group.add(ls);
    }
    if (pts.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(ptsCol, 3));
      const p = new THREE.Points(g, this.pointsMat);
      p.visible = getPref('sketch.entityPoints') !== false;
      p.renderOrder = 10;
      this.group.add(p);
    }
  }

  bounds(): THREE.Box3 | null {
    const box = new THREE.Box3();
    let any = false;
    this.group.traverse((o) => {
      if ((o as THREE.LineSegments).isLineSegments || (o as THREE.Points).isPoints) {
        const g = (o as THREE.Mesh).geometry;
        g.computeBoundingBox();
        if (g.boundingBox) {
          box.union(g.boundingBox);
          any = true;
        }
      }
    });
    return any ? box : null;
  }
}
