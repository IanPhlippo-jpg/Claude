// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, savePrefs, type PrefValue } from './prefs';
import * as fx from './prefsEffects';

// QA v0.5.11 F112: what each option of Tools ▸ Options does outside the number format and the snaps. Every test sets
// the option away from its default and shows the function the program calls gives another result.
const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, ...o });
afterEach(() => use());

describe('View and Display', () => {
  it('view.mouseSpeed: the orbit speed', () => {
    expect(fx.orbitSpeed()).toBe(1);
    use({ 'view.mouseSpeed': 100 });
    expect(fx.orbitSpeed()).toBe(2);
    use({ 'view.mouseSpeed': 0 });
    expect(fx.orbitSpeed()).toBe(0.25);
  });
  it('view.transitionView: the time of a view change', () => {
    expect(fx.viewTransitionMs(260)).toBe(260);
    use({ 'view.transitionView': 0 });
    expect(fx.viewTransitionMs(260)).toBe(0);
    use({ 'view.transitionView': 100 });
    expect(fx.viewTransitionMs(260)).toBe(130);
  });
  it('view.zoomFitStandard: Zoom to Fit after a standard view', () => {
    expect(fx.zoomFitOnStandardView()).toBe(false);
    use({ 'view.zoomFitStandard': true });
    expect(fx.zoomFitOnStandardView()).toBe(true);
  });
  it('view.arrowKeys: the turn of an arrow key', () => {
    expect(fx.arrowKeyStep(false)).toBe(15);
    use({ 'view.arrowKeys': 30 });
    expect(fx.arrowKeyStep(false)).toBe(30);
    expect(fx.arrowKeyStep(true)).toBe(90);
  });
  it('display.refTriad: the reference triad', () => {
    expect(fx.showRefTriad()).toBe(true);
    use({ 'display.refTriad': false });
    expect(fx.showRefTriad()).toBe(false);
  });
  it('display.dynamicHighlight: the face under the pointer lights up', () => {
    const face = { bodyId: 'b', faceId: 'f' };
    expect(fx.hoverHighlight(face)).toBe(face);
    use({ 'display.dynamicHighlight': false });
    expect(fx.hoverHighlight(face)).toBe(null);
  });
  it('display.shadedPlanes and doc.planeTransparency: the fill of a reference plane', () => {
    expect(fx.planeFillOpacity(0.12)).toBeCloseTo(0.12);
    use({ 'doc.planeTransparency': 50 });
    expect(fx.planeFillOpacity(0.12)).toBeCloseTo(0.24);
    use({ 'doc.planeTransparency': 100 });
    expect(fx.planeFillOpacity(0.12)).toBe(0);
    use({ 'display.shadedPlanes': false });
    expect(fx.planeFillOpacity(0.12)).toBe(0);
  });
  it('display.tangentEdges: visible, phantom or removed', () => {
    expect(fx.tangentEdgeMode()).toBe('visible');
    use({ 'display.tangentEdges': 'As phantom' });
    expect(fx.tangentEdgeMode()).toBe('phantom');
    use({ 'display.tangentEdges': 'Removed' });
    expect(fx.tangentEdgeMode()).toBe('removed');
  });
  it('display.hiddenEdges: dashed hidden lines', () => {
    expect(fx.hiddenEdgesDashed()).toBe(false);
    use({ 'display.hiddenEdges': 'Dashed' });
    expect(fx.hiddenEdgesDashed()).toBe(true);
  });
  it('display.breadcrumbs: the breadcrumbs of a selection', () => {
    expect(fx.showBreadcrumbs()).toBe(true);
    use({ 'display.breadcrumbs': false });
    expect(fx.showBreadcrumbs()).toBe(false);
  });
  it('display.antialias: None makes the graphics area without anti-aliasing', () => {
    expect(fx.rendererAntialias()).toBe(true);
    use({ 'display.antialias': 'None' });
    expect(fx.rendererAntialias()).toBe(false);
  });
  it('colors.envelopes: envelope components see-through or opaque', () => {
    expect(fx.envelopeTransparent()).toBe(true);
    use({ 'colors.envelopes': 'Opaque' });
    expect(fx.envelopeTransparent()).toBe(false);
  });
  it('perf.shadedPreview: the feature preview shaded or as edges', () => {
    expect(fx.shadedPreview()).toBe(true);
    use({ 'perf.shadedPreview': false });
    expect(fx.shadedPreview()).toBe(false);
  });
  it('perf.magnifiedSelection: the G key magnifier', () => {
    expect(fx.magnifiedSelection()).toBe(true);
    use({ 'perf.magnifiedSelection': false });
    expect(fx.magnifiedSelection()).toBe(false);
  });
  it('selection.bulk: a drag in empty space draws a lasso', () => {
    expect(fx.defaultLasso()).toBe(false);
    use({ 'selection.bulk': 'Lasso' });
    expect(fx.defaultLasso()).toBe(true);
  });
});

describe('Grid and Sketch', () => {
  it('doc.gridAutoScale, doc.gridMajor, doc.gridMinor: the grid spacing', () => {
    expect(fx.gridSpacing(1)).toEqual({ spacing: 50, minorPerMajor: 4 });
    use({ 'doc.gridAutoScale': false });
    expect(fx.gridSpacing(1)).toEqual({ spacing: 2.5, minorPerMajor: 4 });
    use({ 'doc.gridAutoScale': false, 'doc.gridMajor': 20, 'doc.gridMinor': 5 });
    expect(fx.gridSpacing(1)).toEqual({ spacing: 4, minorPerMajor: 5 });
  });
  it('doc.gridDash: the grid in dashed lines', () => {
    expect(fx.gridDashed()).toBe(false);
    use({ 'doc.gridDash': true });
    expect(fx.gridDashed()).toBe(true);
  });
  it('sketch.autoRotate: the view turns normal to a new sketch', () => {
    expect(fx.sketchAutoRotate()).toBe(true);
    use({ 'sketch.autoRotate': false });
    expect(fx.sketchAutoRotate()).toBe(false);
  });
  it('sketch.arcCenterpoints: the centre point of an arc is drawn', () => {
    const arc = { kind: 'arc', center: 'c' };
    expect(fx.showSketchPoint(arc, 'c')).toBe(true);
    use({ 'sketch.arcCenterpoints': false });
    expect(fx.showSketchPoint(arc, 'c')).toBe(false);
    expect(fx.showSketchPoint(arc, 'p1')).toBe(true);
    expect(fx.showSketchPoint({ kind: 'line' }, 'c')).toBe(true);
  });
  it('sketch.entityPoints: the end points of the entities', () => {
    expect(fx.showEntityPoints()).toBe(true);
    use({ 'sketch.entityPoints': false });
    expect(fx.showEntityPoints()).toBe(false);
  });
  it('sketch.numericInput: the on-screen numeric input', () => {
    expect(fx.numericInputOn()).toBe(false);
    use({ 'sketch.numericInput': true });
    expect(fx.numericInputOn()).toBe(true);
  });
  it('general.inputDimensionValue: a new dimension asks for its value', () => {
    expect(fx.promptDimensionValue()).toBe(true);
    use({ 'general.inputDimensionValue': false });
    expect(fx.promptDimensionValue()).toBe(false);
  });
  it('spin.angle, spin.lengthEnglish, spin.lengthMetric: the step of the Modify box', () => {
    const p = { ...DEFAULT_PREFS };
    expect(fx.spinIncrement(p, true, false)).toBe(1);
    expect(fx.spinIncrement({ ...p, 'spin.angle': 5 }, true, false)).toBe(5);
    expect(fx.spinIncrement({ ...p, 'spin.lengthMetric': 2 }, false, false)).toBe(2);
    expect(fx.spinIncrement({ ...p, 'spin.lengthEnglish': 0.5 }, false, true)).toBe(0.5);
  });
  it('spin.time: the step of the time boxes', () => {
    expect(fx.timeStep()).toBe(0.1);
    use({ 'spin.time': 0.25 });
    expect(fx.timeStep()).toBe(0.25);
  });
});

describe('Feature tree and messages', () => {
  it('fm.dynamicHighlight: pointing at a tree item lights up the model', () => {
    expect(fx.treeHoverHighlight()).toBe(true);
    use({ 'fm.dynamicHighlight': false });
    expect(fx.treeHoverHighlight()).toBe(false);
  });
  it('fm.scrollIntoView: the tree row of a selection is scrolled to', () => {
    document.body.innerHTML = '<div class="k-tree-row" data-id="f1"></div>';
    const row = document.querySelector('.k-tree-row') as HTMLElement;
    row.scrollIntoView = vi.fn();
    expect(fx.scrollTreeSelection('f1')).toBe(true);
    expect(row.scrollIntoView).toHaveBeenCalledTimes(1);
    use({ 'fm.scrollIntoView': false });
    expect(fx.scrollTreeSelection('f1')).toBe(false);
    expect(row.scrollIntoView).toHaveBeenCalledTimes(1);
  });
  it('fm.treeFilter: the filter box above the tree', () => {
    expect(fx.treeFilterShown({ ...DEFAULT_PREFS })).toBe(true);
    expect(fx.treeFilterShown({ ...DEFAULT_PREFS, 'fm.treeFilter': false })).toBe(false);
  });
  it('fm.commentTimestamp: a new comment carries the time', () => {
    const t = new Date('2026-11-03T10:20:00Z');
    expect(fx.commentStamp(t)).toBe('2026-11-03 10:20');
    use({ 'fm.commentTimestamp': false });
    expect(fx.commentStamp(t)).toBe('');
  });
  it('fm.nameOnCreation: OK in a PropertyManager opens the new feature name for typing (QA 0.5.12 F112)', () => {
    expect(fx.nameOnCreation(['a'], ['a', 'b'], true)).toBe(null);
    use({ 'fm.nameOnCreation': true });
    expect(fx.nameOnCreation(['a'], ['a', 'b'], true)).toBe('b');
    // a redo or undo (no feature being edited), an edit of an existing feature and a delete name nothing
    expect(fx.nameOnCreation(['a'], ['a', 'b'], false)).toBe(null);
    expect(fx.nameOnCreation(['a', 'b'], ['a', 'b'], true)).toBe(null);
    expect(fx.nameOnCreation(['a', 'b'], ['a'], true)).toBe(null);
  });
  it('msg.displayOverDefined and msg.treeWarnings: the warning marks in the tree', () => {
    expect(fx.showTreeWarning()).toBe(true);
    use({ 'msg.treeWarnings': 'Never' });
    expect(fx.showTreeWarning()).toBe(false);
    use({ 'msg.treeWarnings': 'All but top level' });
    expect(fx.showTreeWarning(false)).toBe(true);
    expect(fx.showTreeWarning(true)).toBe(false);
    use({ 'msg.displayOverDefined': false });
    expect(fx.showTreeWarning()).toBe(false);
  });
  it('msg.warnRebuild: saving a model with rebuild errors asks first', () => {
    expect(fx.warnSaveWithErrors()).toBe(true);
    use({ 'msg.warnRebuild': false });
    expect(fx.warnSaveWithErrors()).toBe(false);
  });
  it('general.confirmationCorner: the OK / Cancel corner', () => {
    expect(fx.confirmationCornerOn({ ...DEFAULT_PREFS })).toBe(true);
    expect(fx.confirmationCornerOn({ ...DEFAULT_PREFS, 'general.confirmationCorner': false })).toBe(false);
  });
});

describe('General, File Explorer and saving', () => {
  it('general.recentMax: the number of recent documents', () => {
    const list = Array.from({ length: 60 }, (_, i) => i);
    expect(fx.recentDocuments(list)).toHaveLength(50);
    use({ 'general.recentMax': 3 });
    expect(fx.recentDocuments(list)).toEqual([0, 1, 2]);
  });
  it('general.openLastAtStartup: Always opens the last document', () => {
    expect(fx.openLastAtStartup(true)).toBe(false);
    use({ 'general.openLastAtStartup': 'Always' });
    expect(fx.openLastAtStartup(true)).toBe(true);
    expect(fx.openLastAtStartup(false)).toBe(false);
  });
  it('general.technicalAlerts: the Alerts tab of the Welcome dialog', () => {
    expect(fx.welcomeTabs()).toContain('alerts');
    use({ 'general.technicalAlerts': false });
    expect(fx.welcomeTabs()).not.toContain('alerts');
  });
  it('fe.recent: the recent documents in the File Explorer', () => {
    expect(fx.explorerRecent()).toBe(true);
    use({ 'fe.recent': false });
    expect(fx.explorerRecent()).toBe(false);
  });
  it('backup.enabled, backup.copies, backup.removeOld, backup.removeDays: the backups the shell keeps', () => {
    expect(fx.backupPolicy()).toEqual({ copies: 2, removeDays: 0 });
    use({ 'backup.enabled': true, 'backup.copies': 4 });
    expect(fx.backupPolicy()).toEqual({ copies: 4, removeDays: 7 });
    use({ 'backup.enabled': true, 'backup.copies': 4, 'backup.removeDays': 3 });
    expect(fx.backupPolicy().removeDays).toBe(3);
    use({ 'backup.enabled': true, 'backup.copies': 4, 'backup.removeOld': false });
    expect(fx.backupPolicy().removeDays).toBe(0);
  });
  it('backup.autoRecover, backup.autoRecoverMinutes, backup.saveNotify, backup.saveNotifyMinutes, backup.saveNotifySeconds: what is due', () => {
    const min = 60_000;
    expect(fx.recoverSchedule(10 * min, 0, 0, 0)).toEqual({ recover: true, remind: false, dismissMs: 5000 });
    expect(fx.recoverSchedule(9 * min, 0, 0, 0).recover).toBe(false);
    use({ 'backup.autoRecoverMinutes': 2 });
    expect(fx.recoverSchedule(2 * min, 0, 0, 0).recover).toBe(true);
    use({ 'backup.autoRecover': false });
    expect(fx.recoverSchedule(60 * min, 0, 0, 0).recover).toBe(false);
    use({ 'backup.saveNotify': true, 'backup.saveNotifyMinutes': 5, 'backup.saveNotifySeconds': 9 });
    expect(fx.recoverSchedule(5 * min, 0, 0, 0)).toMatchObject({ remind: true, dismissMs: 9000 });
    expect(fx.recoverSchedule(4 * min, 0, 0, 0).remind).toBe(false);
  });
});

describe('Assemblies, drawings, import and export', () => {
  it('doc.mateAlignment, doc.mateMakeFirstFixed, doc.mateShowPopup, doc.mateShowPreview, doc.mateUseForPositioning', () => {
    expect(fx.defaultMateAligned()).toBe(false);
    expect(fx.fixFirstComponent()).toBe(true);
    expect(fx.mateOptionDefaults()).toEqual({ popup: true, preview: true, positionOnly: false });
    use({ 'doc.mateAlignment': 'Aligned', 'doc.mateMakeFirstFixed': false, 'doc.mateShowPopup': false, 'doc.mateShowPreview': false, 'doc.mateUseForPositioning': true });
    expect(fx.defaultMateAligned()).toBe(true);
    expect(fx.fixFirstComponent()).toBe(false);
    expect(fx.mateOptionDefaults()).toEqual({ popup: false, preview: false, positionOnly: true });
  });
  it('asm.largeAssembly, asm.largeThreshold: when Large Assembly Settings come on', () => {
    expect(fx.largeAssemblyDue(501)).toBe(true);
    expect(fx.largeAssemblyDue(500)).toBe(false);
    use({ 'asm.largeThreshold': 10 });
    expect(fx.largeAssemblyDue(11)).toBe(true);
    use({ 'asm.largeAssembly': false, 'asm.largeThreshold': 10 });
    expect(fx.largeAssemblyDue(1000)).toBe(false);
  });
  it('asm.largeHideAll, asm.largeNoEdges: what Large Assembly Settings change', () => {
    const show = { planes: true, origin: true, sketches: true, shadows: true, realisticShading: true };
    expect(fx.largeAssemblyLook(show)).toEqual({ show: { planes: false, origin: false, sketches: false, shadows: false, realisticShading: false }, displayStyle: 'shaded' });
    use({ 'asm.largeHideAll': false, 'asm.largeNoEdges': false });
    expect(fx.largeAssemblyLook(show)).toEqual({ show: { planes: true, origin: true, sketches: true, shadows: false, realisticShading: false } });
  });
  it('drawings.quality, drawings.autoScale, drawings.eliminateDuplicate: new drawing views', () => {
    expect([fx.newViewDraft(), fx.autoScaleNewViews(), fx.eliminateDuplicateDims()]).toEqual([false, true, true]);
    use({ 'drawings.quality': 'Draft quality', 'drawings.autoScale': false, 'drawings.eliminateDuplicate': false });
    expect([fx.newViewDraft(), fx.autoScaleNewViews(), fx.eliminateDuplicateDims()]).toEqual([true, false, false]);
  });
  it('doc.autoCenterMarks: center marks on new views', () => {
    expect(fx.autoCenterMarksOn()).toBe(true);
    use({ 'doc.autoCenterMarks': false });
    expect(fx.autoCenterMarksOn()).toBe(false);
  });
  it('doc.standard: ISO and DIN in first angle', () => {
    expect(fx.firstAngleStandard(DEFAULT_PREFS['doc.standard'])).toBe(true);
    expect(fx.firstAngleStandard('ANSI')).toBe(false);
  });
  it('doc.blockLength1, doc.blockLength2, doc.blockLength3, doc.blockAngle: the block tolerances', () => {
    expect(fx.blockTolerances({ ...DEFAULT_PREFS })).toEqual({ length1: 0.5, length2: 0.25, length3: 0.1, angle: 0.5 });
    expect(fx.blockTolerances({ ...DEFAULT_PREFS, 'doc.blockLength1': 1, 'doc.blockLength2': 0.2, 'doc.blockLength3': 0.05, 'doc.blockAngle': 1 })).toEqual({ length1: 1, length2: 0.2, length3: 0.05, angle: 1 });
  });
  it('import.units: STL numbers read in the chosen unit', () => {
    expect(fx.importScale([1, 2])).toEqual([1, 2]);
    use({ 'import.units': 'Inches' });
    expect(fx.importScale([1, 2])).toEqual([25.4, 50.8]);
    use({ 'import.units': 'Centimeters' });
    expect(fx.importScale([1, 2])).toEqual([10, 20]);
  });
  it('export.stlFormat, export.units, export.resolution, export.showPreview, export.singleFile: the Export Options page', () => {
    expect(fx.exportDefaults()).toEqual({ ascii: false, unit: 'mm', resolution: 'fine', showInfo: true, single: true });
    use({ 'export.stlFormat': 'ASCII', 'export.units': 'Inches', 'export.resolution': 'Coarse', 'export.showPreview': false, 'export.singleFile': false });
    expect(fx.exportDefaults()).toEqual({ ascii: true, unit: 'in', resolution: 'coarse', showInfo: false, single: false });
    expect(fx.exportPrefs({ ascii: true, unit: 'cm', resolution: 'custom', showInfo: false })).toEqual({ 'export.stlFormat': 'ASCII', 'export.units': 'Centimeters', 'export.resolution': 'Custom', 'export.showPreview': false });
  });
});
