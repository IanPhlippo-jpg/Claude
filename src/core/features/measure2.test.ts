import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { massProperties, massPropertiesInFrame, overrideMassProperties } from './measure';

describe('mass properties: coordinate system and override', () => {
  const box = new THREE.BoxGeometry(20, 10, 10).translate(10, 0, 0);
  const m = massProperties(box, 0.001);
  it('centre of mass relative to a coordinate system', () => {
    const r = massPropertiesInFrame(m, new THREE.Vector3(10, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1));
    expect(r.centroid.length()).toBeCloseTo(0, 6);
    // the box's long side lies along the frame's y axis now: Iyy (about y) is the small moment
    expect(r.inertiaCentroid[1][1]).toBeCloseTo(m.inertiaCentroid[0][0], 3);
  });
  it('override mass scales the inertia, override centre moves it', () => {
    const r = overrideMassProperties(m, { mass: m.mass * 2, centroid: [0, 0, 0] });
    expect(r.mass).toBeCloseTo(4, 6);
    expect(r.inertiaCentroid[2][2]).toBeCloseTo(m.inertiaCentroid[2][2] * 2, 3);
    expect(r.inertiaOrigin[2][2]).toBeCloseTo(r.inertiaCentroid[2][2], 3);
  });
});
