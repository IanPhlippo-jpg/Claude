import * as THREE from 'three';
import type { Entity, Id, Sketch, SketchPoint } from '../../core/sketch/types';
import { sampleEntity } from '../../core/sketch/geometry';
import type { SolveResult } from '../../core/solver/solver';
import { PLANES, sketchToWorld, type PlaneId } from './camera';

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
  preview: PreviewItem[];
  previewPoints: SketchPoint[];
  showGrid: boolean;
  /** world units per pixel, for dash sizes & grid density */
  scale: number;
  colors: SceneColors;
  /** sketches that are not active: drawn faded */
  otherSketches: { sketch: Sketch; plane: PlaneId }[];
}

/** Owns the three.js scene graph for sketch rendering. */
export class SketchScene {
  readonly scene = new THREE.Scene();
  private group = new THREE.Group();
  private gridGroup = new THREE.Group();
  private pointsMat = new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, transparent: true, depthTest: false });

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
    const b = PLANES[input.plane];
    // adaptive spacing: ~ every 40..100px
    const target = 60 * input.scale;
    const step = Math.pow(10, Math.floor(Math.log10(target)));
    const spacing = target / step >= 5 ? step * 5 : target / step >= 2 ? step * 2 : step;
    const extent = Math.max(input.scale * 4000, 200);
    const count = Math.min(400, Math.ceil(extent / spacing));
    const minor: number[] = [], major: number[] = [];
    const push = (arr: number[], a: THREE.Vector3, c: THREE.Vector3) => arr.push(a.x, a.y, a.z, c.x, c.y, c.z);
    if (input.showGrid) {
      for (let i = -count; i <= count; i++) {
        const d = i * spacing;
        const arr = i % 5 === 0 ? major : minor;
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
    // axes of the sketch plane
    const axisLen = count * spacing;
    const ax: number[] = [], ay: number[] = [];
    push(ax, b.u.clone().multiplyScalar(-axisLen), b.u.clone().multiplyScalar(axisLen));
    push(ay, b.v.clone().multiplyScalar(-axisLen), b.v.clone().multiplyScalar(axisLen));
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
    const pts: number[] = [], ptsCol: number[] = [];

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
      if (input.hover?.kind === 'entity' && input.hover.id === e.id) return rgba(c.hover).c;
      const st = input.solve?.entityStatus[e.id];
      if (st === 'over') return rgba(c.over).c;
      if (e.construction) return rgba(c.construction).c;
      if (st === 'full') return rgba(c.full).c;
      return rgba(c.under).c;
    };

    const drawSketch = (sk: Sketch, plane: PlaneId, faded: boolean) => {
      for (const id of sk.entityOrder) {
        const e = sk.entities[id];
        if (e.kind === 'point') continue;
        let color = faded ? rgba(input.colors.construction).c : entityColor(e, input);
        if (faded) color = color.clone().lerp(new THREE.Color(0.5, 0.5, 0.5), 0.3);
        addPolyline(plane, sampleEntity(sk, e, 96), color, e.construction);
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
        const ids = e.kind === 'point' ? [e.p] : e.kind === 'line' ? [e.p1, e.p2] : e.kind === 'circle' ? [e.center] : e.kind === 'arc' ? [e.center, e.start, e.end] : e.points;
        for (const pid of ids) pushPt(pid, ptColor(pid, e));
      }
      pushPt(sk.origin, rgba(input.colors.full).c);
    };

    for (const o of input.otherSketches) drawSketch(o.sketch, o.plane, true);
    if (input.sketch) drawSketch(input.sketch, input.plane, false);

    // preview geometry (tool in progress)
    const pc = rgba(input.colors.preview).c;
    for (const item of input.preview) addPolyline(input.plane, item.points, pc, !!item.dashed);
    for (const p of input.previewPoints) {
      const w = sketchToWorld(input.plane, p.x, p.y);
      pts.push(w.x, w.y, w.z);
      ptsCol.push(pc.r, pc.g, pc.b);
    }

    if (solid.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(solid, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(solidCol, 3));
      this.group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true })));
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
