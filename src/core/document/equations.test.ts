import { describe, expect, it } from 'vitest';
import { addCircle, addConstraint, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from './types';
import { applyEquations, dimensionTable, evaluateEquations, evaluateExpression, featureDimensionNames } from './equations';

describe('expressions', () => {
  it('arithmetic with precedence, powers and functions in degrees', () => {
    const look = (n: string) => ({ Width: 80, 'D1@Sketch1': 35 })[n];
    expect(evaluateExpression('1 + 2 * 3', look)).toBe(7);
    expect(evaluateExpression('(1 + 2) * 3', look)).toBe(9);
    expect(evaluateExpression('2 ^ 3 ^ 2', look)).toBe(512);
    expect(evaluateExpression('-"Width" / 4', look)).toBe(-20);
    expect(evaluateExpression('"D1@Sketch1" + Width', look)).toBe(115);
    expect(evaluateExpression('sin(30)', look)).toBeCloseTo(0.5, 10);
    expect(evaluateExpression('sqrt(16) + abs(-2) + int(3.9) + max(1, 5, 2)', look)).toBe(14);
    expect(evaluateExpression('pi * 2', look)).toBeCloseTo(2 * Math.PI, 10);
  });
  it('reports unknown names, division by zero and syntax errors', () => {
    expect(() => evaluateExpression('"Depth" * 2', () => undefined)).toThrow(/Unknown name/);
    expect(() => evaluateExpression('1 / 0', () => undefined)).toThrow(/Division by zero/);
    expect(() => evaluateExpression('1 +', () => undefined)).toThrow();
    expect(() => evaluateExpression('(1 + 2', () => undefined)).toThrow(/Expected/);
  });
});

describe('equations in a document', () => {
  const build = () => {
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'top');
    const [s1, line] = addLine(s, { x: 0, y: 0 }, { x: 80, y: 0 });
    s = s1;
    const [s2, circle] = addCircle(s, { x: 40, y: -40 }, 17.5);
    s = s2;
    s = addConstraint(s, 'distance', [line.p1, line.p2], { value: 80 })[0];
    s = addConstraint(s, 'diameter', [circle.id], { value: 35 })[0];
    doc.sketches.sk1 = s;
    const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
    const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
    doc.features = [f1, f2];
    return doc;
  };

  it('names the dimensions D1@Sketch1, D2@Sketch1 and D1@Boss-Extrude1', () => {
    const doc = build();
    const names = dimensionTable(doc).map((d) => `${d.name}=${d.value}`);
    expect(names).toEqual(['D1@Sketch1=80', 'D2@Sketch1=35', 'D1@Boss-Extrude1=10']);
    expect(featureDimensionNames(doc.features[1])[0].prop).toBe('depth');
  });

  it('global variables drive sketch and feature dimensions', () => {
    const doc = build();
    doc.equations = [
      { id: 'e1', target: 'Width', expression: '100' },
      { id: 'e2', target: 'D1@Sketch1', expression: '"Width"' },
      { id: 'e3', target: 'D2@Sketch1', expression: '"Width" * 0.4' },
      { id: 'e4', target: 'D1@Boss-Extrude1', expression: '"D1@Sketch1" / 8' },
    ];
    const { doc: out, result } = applyEquations(doc);
    expect(result.errors).toEqual({});
    expect(result.variables).toEqual({ Width: 100 });
    const s = out.sketches.sk1;
    const dims = s.constraintOrder.map((id) => s.constraints[id].value);
    expect(dims).toEqual([100, 40]);
    expect((out.features[1] as ExtrudeFeature).depth).toBe(12.5);
    // the input document is not modified
    expect((doc.features[1] as ExtrudeFeature).depth).toBe(10);
  });

  it('detects circular references and unknown names without stopping the others', () => {
    const doc = build();
    doc.equations = [
      { id: 'a', target: 'A', expression: '"B" + 1' },
      { id: 'b', target: 'B', expression: '"A" + 1' },
      { id: 'c', target: 'C', expression: '"Nope"' },
      { id: 'd', target: 'D', expression: '2 * 21' },
    ];
    const r = evaluateEquations(doc);
    expect(r.values.d).toBe(42);
    expect(Object.values(r.errors).some((e) => /Circular/.test(e))).toBe(true);
    expect(r.errors.a && r.errors.b).toBeTruthy();
    expect(r.errors.c).toMatch(/Unknown name/);
  });
});
