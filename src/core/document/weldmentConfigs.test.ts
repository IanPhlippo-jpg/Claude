import { describe, expect, it } from 'vitest';
import { createDocument, type Feature } from './types';
import { activateConfiguration, activeConfiguration, addWeldmentConfigurations, configurations } from './configurations';

describe('weldment configurations', () => {
  it('adds Default<As Machined> (shown) and Default<As Welded>; As Welded suppresses the cuts after the weldment', () => {
    const doc = createDocument('Frame');
    doc.weldment = true;
    doc.features = [
      { id: 'w', type: 'weldment', name: 'Weldment', suppressed: false },
      { id: 'm', type: 'structuralMember', name: 'Structural Member1', suppressed: false },
      { id: 'c', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false },
    ] as unknown as Feature[];
    const d = addWeldmentConfigurations(doc);
    expect(configurations(d).map((c) => c.name)).toEqual(['Default', 'Default<As Machined>', 'Default<As Welded>']);
    expect(activeConfiguration(d).name).toBe('Default<As Machined>');
    const welded = activateConfiguration(d, configurations(d)[2].id);
    expect(welded.features.find((f) => f.id === 'c')!.suppressed).toBe(true);
    expect(welded.features.find((f) => f.id === 'm')!.suppressed).toBe(false);
    const back = activateConfiguration(welded, configurations(welded)[1].id);
    expect(back.features.find((f) => f.id === 'c')!.suppressed).toBe(false);
    // a second call leaves the configurations as they are
    expect(configurations(addWeldmentConfigurations(back))).toHaveLength(3);
  });
});
