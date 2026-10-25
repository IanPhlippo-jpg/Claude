import { describe, expect, it } from 'vitest';
import { threadSpecOf } from './rebuild';
import type { ThreadFeature } from '../document/types';

const base: ThreadFeature = { id: 't', type: 'thread', name: 'M14x2.0 Thread1', suppressed: false, edge: { center: [0, -40, 0], axis: [0, 1, 0], radius: 7, internal: false, label: 'Edge<1>' }, size: 'M14x2.0', diameter: 14, pitch: 2, length: 30, method: 'cut', rightHand: true, angle: 0, offset: false };

describe('thread options of the original', () => {
  it('Reverse Direction runs the thread the other way along the axis', () => {
    expect(threadSpecOf({ ...base, reverse: true })!.axis[1]).toBeCloseTo(-1, 9);
  });
  it('the optional start face moves the start to where the axis meets it', () => {
    const s = threadSpecOf({ ...base, startFace: { normal: [0, -1, 0], point: [5, -30, 5], label: 'Face<3>' } })!;
    expect(s.center[1]).toBeCloseTo(-30, 9);
    expect(s.center[0]).toBeCloseTo(0, 9);
  });
});
