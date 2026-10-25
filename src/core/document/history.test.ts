import { describe, expect, it } from 'vitest';
import { History } from './history';
import { createDocument } from './types';
import { parseDocument, serializeDocument } from './persistence';
import { addLine, createSketch } from '../sketch/model';

describe('history', () => {
  it('undo / redo round trip', () => {
    const h = new History<number>();
    h.push('a', 0);
    h.push('b', 1);
    expect(h.undoLabel).toBe('b');
    expect(h.undo(2)).toEqual({ label: 'b', state: 1 });
    expect(h.redo(1)).toEqual({ label: 'b', state: 2 });
    expect(h.undo(2)?.state).toBe(1);
    expect(h.undo(1)?.state).toBe(0);
    expect(h.undo(0)).toBeNull();
    h.push('c', 0);
    expect(h.canRedo).toBe(false);
  });
});

describe('persistence', () => {
  it('serializes and parses the own file format', () => {
    const doc = createDocument('Test');
    let s = createSketch('sk1', 'Sketch1');
    [s] = addLine(s, { x: 0, y: 0 }, { x: 1, y: 1 });
    doc.sketches[s.id] = s;
    doc.features.push({ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false });
    const text = serializeDocument(doc);
    const back = parseDocument(text);
    // a parsed document gets an id when the file had none
    expect(back.id).toBeTruthy();
    delete back.id;
    expect(back).toEqual(doc);
    expect(() => parseDocument('{"format":"x"}')).toThrow();
  });
});
