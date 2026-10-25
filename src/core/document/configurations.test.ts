import { describe, expect, it } from 'vitest';
import { createDocument, type ExtrudeFeature } from './types';
import { activateConfiguration, activeConfiguration, addConfiguration, configurations, deleteConfiguration, documentForConfiguration, setConfigurationDimension, setConfigurationSuppressed, updateConfiguration } from './configurations';
import { dimensionTable } from './equations';

function partWithExtrude() {
  const doc = createDocument('PLATES');
  const f = { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', op: 'boss', depth: 10, endCondition: 'blind', reverse: false, draft: 0, suppressed: false } as unknown as ExtrudeFeature;
  return { ...doc, features: [f] };
}

describe('configurations', () => {
  it('has Default when none are stored', () => {
    const doc = partWithExtrude();
    expect(configurations(doc).map((c) => c.name)).toEqual(['Default']);
    expect(activeConfiguration(doc).name).toBe('Default');
  });

  it('adds a configuration as a copy of the active values and makes it active', () => {
    const d1 = addConfiguration(partWithExtrude(), '210', { description: '210 mm plate' });
    expect(configurations(d1).map((c) => c.name)).toEqual(['Default', '210']);
    expect(activeConfiguration(d1).name).toBe('210');
    expect(activeConfiguration(d1).dims['D1@Boss-Extrude1']).toBe(10);
    expect(configurations(addConfiguration(d1, '210')).map((c) => c.name)).toEqual(['Default', '210', '2102']);
  });

  it('switching applies the dimension values of the target and keeps the old ones', () => {
    let d = addConfiguration(partWithExtrude(), '270');
    d = setConfigurationDimension(d, activeConfiguration(d).id, 'D1@Boss-Extrude1', 27);
    expect((d.features[0] as ExtrudeFeature).depth).toBe(27);
    const def = configurations(d)[0];
    d = activateConfiguration(d, def.id);
    expect(activeConfiguration(d).name).toBe('Default');
    expect((d.features[0] as ExtrudeFeature).depth).toBe(10);
    d = activateConfiguration(d, configurations(d)[1].id);
    expect((d.features[0] as ExtrudeFeature).depth).toBe(27);
    expect(dimensionTable(d)[0].value).toBe(27);
  });

  it('edits an inactive configuration without touching the document values', () => {
    let d = addConfiguration(partWithExtrude(), 'B');
    const def = configurations(d)[0];
    d = setConfigurationDimension(d, def.id, 'D1@Boss-Extrude1', 5);
    expect((d.features[0] as ExtrudeFeature).depth).toBe(10);
    expect(configurations(d)[0].dims['D1@Boss-Extrude1']).toBe(5);
    d = setConfigurationSuppressed(d, def.id, 'f1', true);
    expect(d.features[0].suppressed).toBe(false);
    d = activateConfiguration(d, def.id);
    expect(d.features[0].suppressed).toBe(true);
    expect((d.features[0] as ExtrudeFeature).depth).toBe(5);
  });

  it('deletes and renames, never the last one', () => {
    let d = addConfiguration(partWithExtrude(), 'B');
    d = updateConfiguration(d, activeConfiguration(d).id, { name: 'C' });
    expect(activeConfiguration(d).name).toBe('C');
    d = deleteConfiguration(d, activeConfiguration(d).id);
    expect(configurations(d).map((c) => c.name)).toEqual(['Default']);
    expect(deleteConfiguration(d, configurations(d)[0].id)).toBe(d);
  });

  it('documentForConfiguration applies a named configuration and caches it', () => {
    let d = addConfiguration(partWithExtrude(), '330');
    d = setConfigurationDimension(d, activeConfiguration(d).id, 'D1@Boss-Extrude1', 33);
    d = activateConfiguration(d, configurations(d)[0].id);
    const a = documentForConfiguration(d, '330');
    expect((a.features[0] as ExtrudeFeature).depth).toBe(33);
    expect(documentForConfiguration(d, '330')).toBe(a);
    expect(documentForConfiguration(d, 'Default')).toBe(d);
    expect(documentForConfiguration(d, undefined)).toBe(d);
  });
});
