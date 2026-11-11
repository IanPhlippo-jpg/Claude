import { describe, expect, it } from 'vitest';
import { exportQuestion } from './exportQuestion';

describe('export of a model with rebuild errors (QA 0.5.13, F204)', () => {
  it('asks before writing a file of a model that did not rebuild', () => {
    expect(exportQuestion('Part1', { f3: 'The fillet failed' }, 'STEP file', true)).toMatch(/Part1 has 1 feature that could not be rebuilt.*STEP file/);
    expect(exportQuestion('Part1', { f3: 'a', f4: 'b' }, 'viewer', true)).toMatch(/2 features/);
  });
  it('does not ask for a clean model, nor when the warning is switched off in Options (as Save)', () => {
    expect(exportQuestion('Part1', {}, 'STEP file', true)).toBeNull();
    expect(exportQuestion('Part1', { f3: 'x' }, 'STEP file', false)).toBeNull();
  });
});
