import { describe, expect, it } from 'vitest';
import { createDocument, type Document, type ExtrudeFeature } from './types';
import { activateConfiguration, addConfiguration, bomDescription, bomPartNumber, configurations, updateConfiguration } from './configurations';

function partWithExtrude() {
  const doc = createDocument('PLATES');
  const f = { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', op: 'boss', depth: 10, endCondition: 'blind', reverse: false, draft: 0, suppressed: false } as unknown as ExtrudeFeature;
  return { ...doc, features: [f] };
}

describe('configuration properties', () => {
  it('Suppress new features: a feature added in B is suppressed in Default', () => {
    let d = addConfiguration(partWithExtrude(), 'B');
    d = { ...d, features: [...d.features, { ...d.features[0], id: 'f2', name: 'Boss-Extrude2' } as ExtrudeFeature] };
    const def = configurations(d).find((c) => c.name === 'Default')!;
    d = activateConfiguration(d, def.id);
    expect(d.features.find((f) => f.id === 'f2')?.suppressed).toBe(true);
    expect(d.features.find((f) => f.id === 'f1')?.suppressed).toBe(false);
  });
  it('with Suppress new features off the new feature stays', () => {
    let d: Document = partWithExtrude();
    d = addConfiguration(d, 'B');
    const def = configurations(d).find((c) => c.name === 'Default')!;
    d = updateConfiguration(d, def.id, { suppressNew: false });
    d = { ...d, features: [...d.features, { ...d.features[0], id: 'f2', name: 'Boss-Extrude2' } as ExtrudeFeature] };
    d = activateConfiguration(d, def.id);
    expect(d.features.find((f) => f.id === 'f2')?.suppressed).toBe(false);
  });
  it('BOM part number and description follow the options', () => {
    let d = addConfiguration(partWithExtrude(), '210', { description: '210 mm plate' });
    const id = configurations(d).find((c) => c.name === '210')!.id;
    expect(bomPartNumber(d, '210')).toBe('PLATES');
    expect(bomDescription(d, '210')).toBe('210 mm plate');
    d = updateConfiguration(d, id, { bomName: 'configuration', descriptionInBom: false });
    expect(bomPartNumber(d, '210')).toBe('210');
    expect(bomDescription(d, '210')).toBe('210');
    d = updateConfiguration(d, id, { bomName: 'user', bomUserName: 'PL-210' });
    expect(bomPartNumber(d, '210')).toBe('PL-210');
  });
});
