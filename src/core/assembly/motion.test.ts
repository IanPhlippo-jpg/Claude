import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import type { Document } from '../document/types';
import { motionTransforms, motorAngle, motorAxis, movingComponents, type MotionStudy, type RotaryMotor } from './motion';

const doc = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')) as Document;
const comps = doc.components ?? [];
const motor: RotaryMotor = { id: 'mo1', name: 'RotaryMotor1', componentId: 'c5', motion: 'oscillating', rpm: 10, amplitude: 40, frequency: 0.5, reverse: false };

describe('Motion Study ▸ Rotary Motor on the door handle', () => {
  it('turns about the spindle axis (the concentric mate of the lever)', () => {
    const ax = motorAxis(doc, comps, motor)!;
    expect(Math.abs(ax.dir.z)).toBeCloseTo(1, 3);
    expect(Math.hypot(ax.point.x, ax.point.y)).toBeLessThan(1e-3);
  });
  it('the square spindle turns with the lever, the rosette and the door stay', () => {
    const ax = motorAxis(doc, comps, motor)!;
    const moving = movingComponents(doc, comps, 'c5', ax);
    expect(moving.has('c4')).toBe(true);
    expect(moving.has('c2')).toBe(false);
    expect(moving.has('c1')).toBe(false);
  });
  it('oscillating motor: 40° after a quarter period, back at 0 after half a period', () => {
    expect(motorAngle(motor, 0.5)).toBeCloseTo(40, 6);
    expect(motorAngle(motor, 1)).toBeCloseTo(0, 6);
    const study: MotionStudy = { name: 'Motion Study 1', duration: 5, motors: [motor] };
    const m = motionTransforms(doc, comps, study, 0.5).get('c5')!;
    const p = new THREE.Vector3(100, 0, 49).applyMatrix4(m);
    expect(Math.atan2(p.y, p.x) * 180 / Math.PI).toBeCloseTo(40, 3);
  });
});
