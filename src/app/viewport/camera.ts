import * as THREE from 'three';
import type { Sketch } from '../../core/sketch/types';

export type PlaneId = Sketch['plane'];

export interface PlaneBasis {
  u: THREE.Vector3;
  v: THREE.Vector3;
  n: THREE.Vector3;
}

export const PLANES: Record<PlaneId, PlaneBasis> = {
  front: { u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), n: new THREE.Vector3(0, 0, 1) },
  top: { u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1), n: new THREE.Vector3(0, 1, 0) },
  right: { u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0), n: new THREE.Vector3(1, 0, 0) },
};

export const PLANE_LABELS: Record<PlaneId, string> = { front: 'Voorvlak', top: 'Bovenvlak', right: 'Rechtervlak' };

export function sketchToWorld(plane: PlaneId, x: number, y: number): THREE.Vector3 {
  const b = PLANES[plane];
  return new THREE.Vector3().addScaledVector(b.u, x).addScaledVector(b.v, y);
}

export function worldToSketch(plane: PlaneId, w: THREE.Vector3): { x: number; y: number } {
  const b = PLANES[plane];
  return { x: w.dot(b.u), y: w.dot(b.v) };
}

export type StandardView = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric' | 'dimetric' | 'trimetric';

const Q = (from: THREE.Vector3, up: THREE.Vector3) => {
  const m = new THREE.Matrix4().lookAt(from.clone().normalize(), new THREE.Vector3(0, 0, 0), up);
  return new THREE.Quaternion().setFromRotationMatrix(m);
};

export const VIEW_QUATERNIONS: Record<StandardView, THREE.Quaternion> = {
  front: Q(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)),
  back: Q(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)),
  top: Q(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)),
  bottom: Q(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1)),
  right: Q(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)),
  left: Q(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)),
  isometric: Q(new THREE.Vector3(1, 1, 1), new THREE.Vector3(0, 1, 0)),
  dimetric: Q(new THREE.Vector3(1, 0.6, 1.4), new THREE.Vector3(0, 1, 0)),
  trimetric: Q(new THREE.Vector3(1.2, 0.8, 1.6), new THREE.Vector3(0, 1, 0)),
};

export function normalToView(plane: PlaneId): THREE.Quaternion {
  const b = PLANES[plane];
  return Q(b.n, b.v);
}

/**
 * Orthographic orbit camera: a target point, a rotation and a zoom
 * (world units per pixel). Mirrors how desktop CAD navigates.
 */
export class CadCamera {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10000, 10000);
  target = new THREE.Vector3();
  rotation = VIEW_QUATERNIONS.isometric.clone();
  /** world units per pixel */
  scale = 0.25;
  width = 1;
  height = 1;
  /** name of the current standard view; '' after free rotation */
  viewName = 'isometric';
  private history: { q: THREE.Quaternion; c: THREE.Vector3; s: number; name: string }[] = [];
  onViewName: ((name: string) => void) | null = null;
  private anim: { t0: number; dur: number; q0: THREE.Quaternion; q1: THREE.Quaternion; c0: THREE.Vector3; c1: THREE.Vector3; s0: number; s1: number } | null = null;
  onChange: (() => void) | null = null;

  resize(w: number, h: number): void {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.update();
  }

  update(): void {
    const hw = (this.width * this.scale) / 2;
    const hh = (this.height * this.scale) / 2;
    this.camera.left = -hw;
    this.camera.right = hw;
    this.camera.top = hh;
    this.camera.bottom = -hh;
    this.camera.quaternion.copy(this.rotation);
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(this.rotation);
    this.camera.position.copy(this.target).addScaledVector(back, 1000);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.onChange?.();
  }

  /** screen pixel -> world ray origin + direction */
  pixelToRay(px: number, py: number): THREE.Ray {
    const ndc = new THREE.Vector3((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1, -1);
    const origin = ndc.clone().unproject(this.camera);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
    return new THREE.Ray(origin, dir);
  }

  pixelToPlane(px: number, py: number, plane: PlaneId): { x: number; y: number } | null {
    const ray = this.pixelToRay(px, py);
    const b = PLANES[plane];
    const p = new THREE.Plane(b.n, 0);
    const hit = ray.intersectPlane(p, new THREE.Vector3());
    if (!hit) return null;
    return worldToSketch(plane, hit);
  }

  worldToPixel(w: THREE.Vector3): { x: number; y: number } {
    const p = w.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height };
  }

  /** zoom about a pixel position */
  zoomAt(px: number, py: number, factor: number): void {
    const before = this.pixelToRay(px, py).origin;
    this.scale = Math.min(50, Math.max(0.001, this.scale * factor));
    this.update();
    const after = this.pixelToRay(px, py).origin;
    this.target.add(before).sub(after);
    this.update();
  }

  pan(dxPx: number, dyPx: number): void {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.rotation);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.rotation);
    this.target.addScaledVector(right, -dxPx * this.scale).addScaledVector(up, dyPx * this.scale);
    this.update();
  }

  private pushHistory(): void {
    this.history.push({ q: this.rotation.clone(), c: this.target.clone(), s: this.scale, name: this.viewName });
    if (this.history.length > 50) this.history.shift();
  }

  /** Heads-up "Previous View" */
  previousView(): void {
    const h = this.history.pop();
    if (!h) return;
    this.setViewName(h.name);
    this.animateTo(h.q, h.c, h.s);
  }

  private setViewName(n: string): void {
    this.viewName = n;
    this.onViewName?.(n);
  }

  /** zoom so the pixel rectangle fills the viewport */
  zoomToArea(x0: number, y0: number, x1: number, y1: number): void {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    if (w < 4 || h < 4) return;
    this.pushHistory();
    const center = this.pixelToRay((x0 + x1) / 2, (y0 + y1) / 2).origin;
    // keep the camera plane: project centre onto the plane through target
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
    const t = center.clone().sub(this.target).dot(fwd);
    center.addScaledVector(fwd, -t);
    const scale = Math.max((w * this.scale) / this.width, (h * this.scale) / this.height);
    this.animateTo(this.rotation, center, scale);
  }

  zoomStep(factor: number): void {
    this.scale = Math.min(50, Math.max(0.001, this.scale * factor));
    this.update();
  }

  orbit(dxPx: number, dyPx: number): void {
    if (this.viewName) this.setViewName('');
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dxPx * 0.008);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.rotation);
    const pitch = new THREE.Quaternion().setFromAxisAngle(right, -dyPx * 0.008);
    this.rotation.premultiply(pitch).premultiply(yaw).normalize();
    this.update();
  }

  /** rotate by a fixed step about screen axes (view-cube arrows) */
  rotateStep(axis: 'x' | 'y' | 'z', deg: number): void {
    this.pushHistory();
    this.setViewName('');
    const v = axis === 'x' ? new THREE.Vector3(1, 0, 0) : axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    v.applyQuaternion(this.rotation);
    const q = new THREE.Quaternion().setFromAxisAngle(v, (deg * Math.PI) / 180);
    this.animateTo(this.rotation.clone().premultiply(q), this.target, this.scale);
  }

  animateTo(q: THREE.Quaternion, target: THREE.Vector3, scale: number, dur = 260): void {
    this.anim = { t0: performance.now(), dur, q0: this.rotation.clone(), q1: q.clone().normalize(), c0: this.target.clone(), c1: target.clone(), s0: this.scale, s1: scale };
    this.tick();
  }

  private tick = () => {
    if (!this.anim) return;
    const a = this.anim;
    const t = Math.min(1, (performance.now() - a.t0) / a.dur);
    const e = 1 - Math.pow(1 - t, 3);
    this.rotation.copy(a.q0).slerp(a.q1, e);
    this.target.copy(a.c0).lerp(a.c1, e);
    this.scale = a.s0 + (a.s1 - a.s0) * e;
    this.update();
    if (t < 1) requestAnimationFrame(this.tick);
    else this.anim = null;
  };

  setView(view: StandardView): void {
    this.pushHistory();
    this.setViewName(view);
    this.animateTo(VIEW_QUATERNIONS[view], this.target, this.scale);
  }

  normalTo(plane: PlaneId): void {
    this.pushHistory();
    this.setViewName('normalTo');
    this.animateTo(normalToView(plane), this.target, this.scale);
  }

  /** fit a world-space bounding box with margin */
  fit(box: THREE.Box3 | null, margin = 1.25): void {
    this.pushHistory();
    if (!box || box.isEmpty() || box.getSize(new THREE.Vector3()).length() < 1e-6) {
      this.animateTo(this.rotation, box && !box.isEmpty() ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3(), 0.25);
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    // project box corners to the view plane to get extents
    const inv = this.rotation.clone().invert();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center).applyQuaternion(inv);
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
    const w = Math.max(1e-3, maxX - minX), h = Math.max(1e-3, maxY - minY);
    const scale = Math.max((w * margin) / this.width, (h * margin) / this.height, 0.001);
    this.animateTo(this.rotation, center, scale);
  }
}
