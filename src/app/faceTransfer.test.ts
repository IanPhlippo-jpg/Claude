import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { planarFaces } from '../core/features/solid';
import { FACE_TAG } from '../core/features/faceNames';
import { dominantTag, flatness, normalThreshold, transferFace, type FaceBody } from './faceTransfer';

/** an open cylinder along y (no caps), non-indexed, every triangle tagged `tag` */
function tube(r: number, h: number, segments: number, y = 0, tag = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, segments, 1, true).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(0, y + h / 2, 0);
  if (tag) g.setAttribute(FACE_TAG, new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(tag), 1));
  return g;
}
function body(...parts: THREE.BufferGeometry[]): FaceBody {
  const g = parts.length === 1 ? parts[0] : mergeGeometries(parts, false)!;
  return { geometry: g, faces: planarFaces(g, 'b') };
}
const curvedBy = (b: FaceBody, area: number) => b.faces.filter((f) => f.curved).sort((p, q) => Math.abs(p.area - area) - Math.abs(q.area - area))[0];

describe('a selected face carried to the other tessellation (docs/32 SW-parity 2)', () => {
  it('a whole cylinder: its mean normal says nothing, so it is matched without the 0.95 normal check', () => {
    const mesh = body(tube(10, 20, 48)), exact = body(tube(10, 20, 96));
    const from = mesh.faces.find((f) => f.curved)!;
    expect(from).toBeTruthy();
    expect(flatness(mesh.geometry, from)).toBeLessThan(0.1);
    expect(normalThreshold(flatness(mesh.geometry, from))).toBe(-Infinity);
    const id = transferFace(mesh, from, exact);
    expect(exact.faces.find((f) => f.id === id)?.curved).toBe(true);
  });

  it('a bore inside a boss (two coaxial cylinders, one centroid): told apart by their area', () => {
    const mesh = body(tube(20, 30, 64), tube(8, 30, 48)), exact = body(tube(20, 30, 128), tube(8, 30, 96));
    const outerArea = 2 * Math.PI * 20 * 30, innerArea = 2 * Math.PI * 8 * 30;
    const inner = curvedBy(mesh, innerArea), outer = curvedBy(mesh, outerArea);
    expect(transferFace(mesh, inner, exact)).toBe(curvedBy(exact, innerArea).id);
    expect(transferFace(mesh, outer, exact)).toBe(curvedBy(exact, outerArea).id);
  });

  it('the face name (ftag) goes first: a face that moved far is found by its name, not by the face now in its place', () => {
    const mesh = body(tube(10, 20, 48, 0, 11), tube(10, 20, 48, 40, 22));
    // after the change the face named 11 lies higher up and the one named 22 sits where 11 was
    const exact = body(tube(10, 20, 96, 80, 11), tube(10, 20, 96, 0, 22));
    const from = mesh.faces.find((f) => f.curved && dominantTag(mesh.geometry, f) === 11)!;
    const id = transferFace(mesh, from, exact);
    const to = exact.faces.find((f) => f.id === id)!;
    expect(dominantTag(exact.geometry, to)).toBe(11);
    expect(to.centroid[1]).toBeGreaterThan(80);
  });

  it('a flat face keeps the strict check: the top of a box goes to the top of the box', () => {
    const box = (s: number) => { const g = new THREE.BoxGeometry(s, s, s).toNonIndexed(); g.deleteAttribute('uv'); return body(g); };
    const mesh = box(20), exact = box(22);
    const top = mesh.faces.find((f) => f.normal[1] > 0.99)!;
    const id = transferFace(mesh, top, exact);
    expect(exact.faces.find((f) => f.id === id)?.normal[1]).toBeGreaterThan(0.99);
  });
});
