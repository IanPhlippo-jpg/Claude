import { describe, expect, it } from 'vitest';
import { createDocument } from './types';
import { evaluateEquations } from './equations';
import { parseDocument, serializeDocument } from './persistence';

// Names written by older builds are rewritten when a file is opened (QA v0.5.10 F165, F50).
describe('opening a file with old names', () => {
  it('rewrites the vendor-prefixed density file property to "Density" and still evaluates it', () => {
    const d = createDocument('Part1');
    d.material = { name: 'AISI 1020', density: 7900, color: '#b8bcc2' };
    d.equations = [{ id: 'e1', target: 'MassPerMm3', expression: '"SW-Density@Part1" * 1000' }];
    const back = parseDocument(serializeDocument(d));
    expect(back.equations[0].expression).toBe('"Density@Part1" * 1000');
    expect(JSON.stringify(back)).not.toMatch(/SW-/);
    expect(evaluateEquations(back).variables.MassPerMm3).toBeCloseTo(7.9, 9);
  });

  it('leaves expressions without the old name alone', () => {
    const d = createDocument('Part1');
    d.equations = [{ id: 'e1', target: 'Width', expression: '80 / 2' }];
    expect(parseDocument(serializeDocument(d)).equations[0].expression).toBe('80 / 2');
  });

  it('renames the default frame feature name, but not a name the user typed', () => {
    const d = createDocument('Part1');
    d.weldment = true;
    d.features = [
      { id: 'w1', type: 'weldment', name: 'Weldment', suppressed: false },
      { id: 'w2', type: 'weldment', name: 'My frame', suppressed: false },
    ];
    const back = parseDocument(serializeDocument(d));
    expect(back.features.map((f) => f.name)).toEqual(['Frame', 'My frame']);
    expect(back.features[0].type).toBe('weldment');
  });
});
