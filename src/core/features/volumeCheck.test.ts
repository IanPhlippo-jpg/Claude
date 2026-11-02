import { describe, expect, it } from 'vitest';
import { volumeMismatch } from './volumeCheck';

describe('exact vs faceted volume cross-check (QA F159)', () => {
  it('stays quiet within the tessellation margin and speaks above 0.5 %', () => {
    expect(volumeMismatch(30439.07, 30439.91)).toBeNull();
    expect(volumeMismatch(1000, 1004.9)).toBeNull();
    // the F140 case: 8.58 mm³ on 30 440 is 0.03 %: below the limit on volume alone, so the strict QA tests guard it
    expect(volumeMismatch(30439.07, 30431.33)).toBeNull();
    const w = volumeMismatch(1000, 1006);
    expect(w).toMatch(/differ by 0\.6 %/);
    expect(volumeMismatch(54393.4, 54428.24 + 600)).toMatch(/Warning: the exact volume/);
  });
  it('ignores empty or broken numbers', () => {
    expect(volumeMismatch(0, 0)).toBeNull();
    expect(volumeMismatch(NaN, 10)).toBeNull();
  });
});
