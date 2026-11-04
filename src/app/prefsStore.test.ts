// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyColorScheme, DEFAULT_PREFS, savePrefs, type PrefValue } from './prefs';
import { useStore } from './store';
import { createDocument } from '../core/document/types';
import { addComment } from './assemblyCommands';
import { brepEnabled } from './brepRefine';
import { rebuildWorkerEnabled } from './rebuildWorker';
import { applySoftwareGL } from './softwareGL';

// QA v0.5.11 F112: options whose effect is a store action (Options ▸ OK, a new mate, an inserted component, a model
// view) or a switch the program reads at a decision point. Each test runs the action with the option changed.
const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, ...o });
const st = () => useStore.getState();
beforeEach(() => use());
afterEach(() => use());

describe('Options ▸ OK applies the settings (setPrefs)', () => {
  it('colors.background: Dark switches the dark theme', () => {
    st().setPrefs({ ...DEFAULT_PREFS, 'colors.background': 'Dark' });
    expect(st().theme).toBe('dark');
    st().setPrefs({ ...DEFAULT_PREFS });
    expect(st().theme).toBe('light');
  });
  it('view.reverseWheel: the mouse wheel zooms the other way', () => {
    st().setPrefs({ ...DEFAULT_PREFS, 'view.reverseWheel': true });
    expect(st().reverseWheel).toBe(true);
    st().setPrefs({ ...DEFAULT_PREFS });
    expect(st().reverseWheel).toBe(false);
  });
  it('doc.unitSystem and doc.lengthUnit: the unit system and (Custom) the length unit of the document', () => {
    st().newDocument('part');
    st().setPrefs({ ...DEFAULT_PREFS, 'doc.unitSystem': 'IPS (inch, pound, second)' });
    expect(st().unitSystem).toBe('IPS');
    st().setPrefs({ ...DEFAULT_PREFS, 'doc.unitSystem': 'Custom', 'doc.lengthUnit': 'centimeters' });
    expect(st().doc.units).toBe('cm');
    st().setPrefs({ ...DEFAULT_PREFS });
  });
  it('doc.gridMajor and doc.displayGrid: the grid size and the grid', () => {
    st().setPrefs({ ...DEFAULT_PREFS, 'doc.gridMajor': 25, 'doc.displayGrid': true });
    expect(st().gridSize).toBe(25);
    expect(st().show.grid).toBe(true);
    st().setPrefs({ ...DEFAULT_PREFS });
    expect(st().gridSize).toBe(10);
    expect(st().show.grid).toBe(false);
  });
  it('colors.scheme and colors.iconColors: the colour tokens and the icon colours on the page', () => {
    applyColorScheme({ ...DEFAULT_PREFS, 'colors.scheme': 'Green', 'colors.iconColors': 'Classic' });
    expect(document.documentElement.style.getPropertyValue('--sk-selected')).toBe('#2f9e44');
    expect(document.documentElement.dataset.iconColors).toBe('classic');
    applyColorScheme({ ...DEFAULT_PREFS });
    expect(document.documentElement.style.getPropertyValue('--sk-selected')).toBe('');
    expect(document.documentElement.dataset.iconColors).toBe('default');
  });
});

describe('Assemblies', () => {
  const part = () => ({ ...createDocument('Block', 'part'), id: 'p' + Math.random() });
  it('doc.mateAlignment, doc.mateShowPopup, doc.mateShowPreview, doc.mateUseForPositioning: a new mate', () => {
    st().newDocument('assembly');
    st().startMate();
    expect(st().mateEdit?.draft.aligned).toBe(false);
    expect(st().mateOpts).toMatchObject({ popup: true, preview: true, positionOnly: false });
    st().cancelMate();
    use({ 'doc.mateAlignment': 'Aligned', 'doc.mateShowPopup': false, 'doc.mateShowPreview': false, 'doc.mateUseForPositioning': true });
    st().startMate();
    expect(st().mateEdit?.draft.aligned).toBe(true);
    expect(st().mateOpts).toMatchObject({ popup: false, preview: false, positionOnly: true });
    st().cancelMate();
  });
  it('doc.mateMakeFirstFixed: the first component is fixed, or floats', () => {
    st().newDocument('assembly');
    st().insertComponent(part(), { fixMode: 'first' });
    expect(st().doc.components![0].fixed).toBe(true);
    use({ 'doc.mateMakeFirstFixed': false });
    st().newDocument('assembly');
    st().insertComponent(part(), { fixMode: 'first' });
    expect(st().doc.components![0].fixed).toBe(false);
  });
  it('asm.largeAssembly, asm.largeThreshold, asm.largeNoEdges, asm.largeHideAll: past the threshold the mode comes on', () => {
    use({ 'asm.largeThreshold': 2 });
    st().newDocument('assembly');
    useStore.setState({ largeAssembly: false, displayStyle: 'shadedEdges', show: { ...st().show, planes: true } });
    st().insertComponent(part());
    st().insertComponent(part());
    expect(st().largeAssembly).toBe(false);
    st().insertComponent(part());
    expect(st().largeAssembly).toBe(true);
    expect(st().displayStyle).toBe('shaded');
    expect(st().show.planes).toBe(false);
    st().setLargeAssembly(false);
    use({ 'asm.largeThreshold': 2, 'asm.largeNoEdges': false, 'asm.largeHideAll': false });
    useStore.setState({ displayStyle: 'shadedEdges', show: { ...st().show, planes: true } });
    st().setLargeAssembly(true);
    expect(st().displayStyle).toBe('shadedEdges');
    expect(st().show.planes).toBe(true);
    st().setLargeAssembly(false);
  });
  it('fm.commentTimestamp: a comment carries the time it was written, or none', () => {
    st().newDocument('part');
    addComment('first');
    expect(st().doc.comments?.at(-1)?.date).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d$/);
    use({ 'fm.commentTimestamp': false });
    addComment('second');
    expect(st().doc.comments?.at(-1)?.date).toBe('');
  });
});

describe('Drawings', () => {
  it('drawings.displayStyle: the display style of a new view', () => {
    st().newDocument('drawing');
    st().startModelView();
    expect(st().drawingEdit?.displayStyle).toBe('hiddenRemoved');
    use({ 'drawings.displayStyle': 'Shaded with edges' });
    st().startModelView();
    expect(st().drawingEdit?.displayStyle).toBe('shadedEdges');
    st().cancelDrawingEdit();
  });
});

describe('Performance', () => {
  it('perf.brepKernel: the exact (B-rep) kernel refines a part, or not', () => {
    localStorage.setItem('phlippo.kernel', 'brep');
    expect(brepEnabled()).toBe(true);
    use({ 'perf.brepKernel': false });
    expect(brepEnabled()).toBe(false);
    localStorage.removeItem('phlippo.kernel');
  });
  it('perf.rebuildWorker: heavy rebuilds in the background worker, or not', () => {
    vi.stubGlobal('Worker', class {});
    localStorage.setItem('phlippo.rebuild', 'worker');
    expect(rebuildWorkerEnabled()).toBe(true);
    use({ 'perf.rebuildWorker': false });
    expect(rebuildWorkerEnabled()).toBe(false);
    localStorage.removeItem('phlippo.rebuild');
    vi.unstubAllGlobals();
  });
  it('perf.softwareOpenGL: the choice goes to the desktop shell', async () => {
    const setSoftwareGL = vi.fn(async () => {});
    (window as unknown as { phlippoDesktop: unknown }).phlippoDesktop = { gpuStatus: async () => ({ software: false, source: '', next: false }), setSoftwareGL };
    await applySoftwareGL(DEFAULT_PREFS['perf.softwareOpenGL'] === true);
    expect(setSoftwareGL).not.toHaveBeenCalled();
    await applySoftwareGL(true);
    expect(setSoftwareGL).toHaveBeenCalledWith(true);
    delete (window as unknown as { phlippoDesktop?: unknown }).phlippoDesktop;
  });
});
