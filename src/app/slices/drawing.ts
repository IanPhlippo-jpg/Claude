/**
 * Store slice "drawing" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { type Document } from '../../core/document/types';
import { autosave } from '../../core/document/persistence';
import { freeSpot, tableGrid } from '../../core/drawing/tables';
import { newId } from '../../core/sketch/model';
import { activateConfiguration, activeConfiguration, documentForConfiguration, addConfiguration as addConfig, configurations, setConfigurationDimension as setCfgDim, setConfigurationSuppressed as setCfgSup } from '../../core/document/configurations';
import { getPref } from '../prefs';
import { isDrawing, type DrawingView as DrawingViewT, type DrawingDimension, type DrawingSheet, type DrawingView } from '../../core/document/types';
import { modelItems } from '../drawing/modelItems';
import { trueLength, viewDepth } from '../../core/drawing/sheet';
import { autoCenterMarks, newViewStyle } from '../../core/drawing/autoMarks';
import { sectionFlipFor, nextViewLabel, viewGeometry, dimensionValue, nextViewName, standardThreeViews as buildThreeViews, threeViewsCentre, autoSheetScale, viewToSheet as _viewToSheet } from '../../core/drawing/sheet';
import type { State, StoreSet, StoreGet } from '../store';
import { history, historyFlags, solveAll, rebuildFor } from '../store';

type DrawingKeys =
  | 'markupMode' | 'drawingTool' | 'drawingEdit' | 'selectedDrawingViewId' | 'selectedDrawingDimensionId' | 'setMarkupMode'
  | 'startModelView' | 'setModelViewSource' | 'setDrawingEdit' | 'cancelDrawingEdit' | 'placeView' | 'startDrawingSection'
  | 'setSectionLine' | 'placeSectionView' | 'startDetailView' | 'setDetailCircle' | 'placeDetailView' | 'startProjectedView'
  | 'placeProjectedView' | 'startStandardThreeViews' | 'updateDrawingView' | 'selectDrawingView' | 'moveDrawingView' | 'commitViewMove'
  | 'deleteDrawingView' | 'startDrawingDimension' | 'startDrawingDimensionOnLine' | 'startDrawingDimensionOnCircle' | 'placeDrawingDimension' | 'startViewTool'
  | 'startBrokenOut' | 'addBrokenOutPoint' | 'applyBrokenOut' | 'removeBrokenOut' | 'startModelItems' | 'startAuxView'
  | 'setAuxEdge' | 'placeAuxView' | 'setViewCrop' | 'setViewBreak' | 'setDrawingTool' | 'selectDrawingDimension'
  | 'updateDrawingDimension' | 'beginAnnotationMove' | 'moveAnnotation' | 'insertHoleTable' | 'insertGeneralTable' | 'setTableCell'
  | 'addSheet' | 'activateSheet' | 'insertBomTable' | 'addRevision' | 'startAltPosition' | 'applyAltPosition'
  | 'startTitleBlock' | 'startSymbol' | 'addSymbol' | 'startNote' | 'placeNote' | 'startCenterMark'
  | 'addCenterMark' | 'applyConfigurationTable' | 'setSheet';

/** Auto insert on view creation ▸ Center marks-holes (Document Properties ▸ Detailing, QA v0.5.1 F122) */
function withAutoMarks(d: Document, views: DrawingView[]): Document {
  const sheet = d.sheets?.[0];
  if (!sheet || getPref('doc.autoCenterMarks') === false) return d;
  const marks = autoCenterMarks(views, sheet.centerMarks, () => newId('cm'));
  return marks.length ? { ...d, sheets: [{ ...sheet, centerMarks: [...sheet.centerMarks, ...marks] }, ...(d.sheets ?? []).slice(1)] } : d;
}

export const drawingSlice = (set: StoreSet, get: StoreGet): Pick<State, DrawingKeys> => ({
  markupMode: null,
  drawingTool: null,
  drawingEdit: null,
  selectedDrawingViewId: null,
  selectedDrawingDimensionId: null,
  setMarkupMode(markupMode) {
    set({ markupMode });
  },
  startModelView() {
    if (!isDrawing(get().doc)) {
      get().pushMessage('Drawing views are placed in a drawing (File ▸ New ▸ Drawing).', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'modelView', orientation: 'front', multiple: false, displayStyle: newViewStyle(getPref('drawings.displayStyle')), useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'viewLayout' });
  },
  setModelViewSource(model) {
    const de = get().drawingEdit;
    const part: Document = { ...model, kind: model.kind ?? 'part' };
    // Automatic scaling of new drawing views: an empty sheet takes the scale at which the standard views fit
    const sheet = get().doc.sheets?.[0];
    if (sheet && !sheet.views.length && part.kind !== 'drawing') {
      const scale = autoSheetScale(part, sheet);
      if (scale[0] !== sheet.scale[0] || scale[1] !== sheet.scale[1]) set({ doc: { ...get().doc, sheets: [{ ...sheet, scale }, ...(get().doc.sheets ?? []).slice(1)] } });
    }
    set({ drawingEdit: { ...(de ?? { mode: 'modelView', orientation: 'front', multiple: false, displayStyle: newViewStyle(getPref('drawings.displayStyle')), useCustomScale: false, scale: [1, 1] }), mode: 'modelView', model: part } });
    get().pushMessage(`${model.name}: choose the orientation and click in the sheet to place the view.`);
  },
  setDrawingEdit(patch) {
    const de = get().drawingEdit;
    if (de) set({ drawingEdit: { ...de, ...patch } });
  },
  cancelDrawingEdit() {
    set({ drawingEdit: null });
  },
  placeView(position) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !drawingEdit?.model) return;
    history.push('Model View', doc);
    // Reference Configuration: the model as that configuration
    const model = drawingEdit.configuration ? documentForConfiguration(drawingEdit.model, drawingEdit.configuration) : drawingEdit.model;
    const view: DrawingView = { id: newId('dv'), name: nextViewName(sheet), type: drawingEdit.orientation, position, scale: drawingEdit.useCustomScale ? drawingEdit.scale : undefined, displayStyle: drawingEdit.displayStyle, model, modelName: `${drawingEdit.model.name}<1>`, relative: drawingEdit.relative, empty: drawingEdit.emptyView || undefined, predefined: drawingEdit.predefined || undefined, ...(drawingEdit.configuration ? { configuration: drawingEdit.configuration } : {}), ...(drawingEdit.draftQuality ? { draftQuality: true } : {}), ...(drawingEdit.trueDims ? { trueDims: true } : {}), ...(drawingEdit.threadDraft ? { threadDraft: true } : {}), ...(drawingEdit.bendLines !== false && drawingEdit.model.features.some((f) => f.type === 'flatPattern' && !f.suppressed) ? { bendLines: true } : {}), ...(drawingEdit.bendNotes ? { bendNotes: true } : {}) };
    let d: Document = withAutoMarks({ ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] }, [view]);
    // Import options ▸ Import annotations: the model dimensions come into the new view
    if (drawingEdit.importAnnotations && !drawingEdit.emptyView && !drawingEdit.predefined) {
      const dims = modelItems([view], { sketchDims: true, featureDims: true, holeDims: true, eliminateDuplicates: true }, sheet.dimensions);
      if (dims.length) d = { ...d, sheets: [{ ...d.sheets![0], dimensions: [...d.sheets![0].dimensions, ...dims] }] };
    }
    if (drawingEdit.emptyView || drawingEdit.predefined || drawingEdit.relative) {
      // these views stand alone: no projected views follow
      // a Predefined View opens its Property Panel (Insert Model)
      set({ doc: d, selectedDrawingViewId: view.id, drawingEdit: null, dirty: true, managerTab: drawingEdit.predefined ? 'properties' : get().managerTab, ...historyFlags() });
      autosave(d);
      return;
    }
    // by design: after placing the view the Projected View command continues from it (Auto-start projected view)
    const auto = getPref('drawing.autoProjected') !== false;
    set({ doc: d, selectedDrawingViewId: view.id, drawingEdit: auto ? { ...drawingEdit, mode: 'projected', parentId: view.id, useParentStyle: true, scaleMode: 'parent' } : null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDrawingSection(axis: 'h' | 'v' = 'v', removed = false) {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId && !v.section && !v.detail) ?? sheet?.views.find((v) => !v.section && !v.detail && !['isometric', 'trimetric', 'dimetric'].includes(v.type));
    if (!parent) {
      get().pushMessage('Insert a model view first; the section is cut through it.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'section', orientation: parent.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: parent.scale ?? [1, 1], parentId: parent.id, sectionAxis: axis, sectionFlip: false, sectionRemoved: removed }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  setSectionLine(parentId, at) {
    const de = get().drawingEdit;
    // Auto-start section view off: the section view is placed only after "Place section view"
    if (de && de.mode === 'section') set({ drawingEdit: { ...de, parentId, sectionAt: at, sectionHold: getPref('drawing.autoStartSection') === false } });
  },
  placeSectionView(position) {
    const { doc, drawingEdit: de } = get();
    if (de?.sectionHold) {
      get().pushMessage('Click "Place section view" in the Property Panel first.', 'warn');
      return;
    }
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === de?.parentId);
    if (!sheet || !parent || !de || de.sectionAt === undefined) return;
    history.push('Section View', doc);
    const label = nextViewLabel(sheet);
    const axis = de.sectionAxis ?? 'v';
    // the section stays aligned with its parent (beside it for a vertical line, above/below for a horizontal one)
    // a removed section is placed where it is clicked
    const pos: [number, number] = de.sectionRemoved ? position : axis === 'v' ? [position[0], parent.position[1]] : [parent.position[0], position[1]];
    const view: DrawingView = { id: newId('dv'), name: `Section View ${label}-${label}`, type: parent.type, position: pos, scale: de.useCustomScale ? de.scale : parent.scale, displayStyle: 'hiddenRemoved', model: parent.model, modelName: parent.modelName, section: { parentId: parent.id, parentType: parent.type, axis, at: de.sectionAt, flip: sectionFlipFor(axis, parent.position, pos, !!de.sectionFlip), label, ...(de.sectionRemoved ? { removed: true } : {}), ...(de.sectionSlice ? { slice: true } : {}), ...(de.sectionDepth ? { depth: de.sectionDepth } : {}), ...(de.sectionAutoHatch ? { autoHatch: true } : {}), ...(de.sectionHalf ? { half: de.sectionHalf } : {}) } };
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    set({ doc: d, drawingEdit: null, selectedDrawingViewId: view.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDetailView() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId && !v.section && !v.detail) ?? sheet?.views.find((v) => !v.section && !v.detail);
    if (!parent) {
      get().pushMessage('Insert a model view first; the detail circle is drawn in it.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'detail', orientation: parent.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: true, scale: [2, 1], parentId: parent.id }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  setDetailCircle(parentId, center, radius, rect) {
    const de = get().drawingEdit;
    if (de && de.mode === 'detail') set({ drawingEdit: { ...de, parentId, detailCenter: center, detailRadius: radius, detailRect: rect } });
  },
  placeDetailView(position) {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === de?.parentId);
    if (!sheet || !parent || !de || !de.detailCenter || !de.detailRadius) return;
    history.push('Detail View', doc);
    const label = nextViewLabel(sheet);
    const ps = parent.scale ?? sheet.scale;
    const scale: [number, number] = de.useCustomScale ? de.scale : [ps[0] * 2, ps[1]];
    const view: DrawingView = { id: newId('dv'), name: `Detail View ${label} (${scale[0]} : ${scale[1]})`, type: parent.type, position, scale, displayStyle: 'hiddenRemoved', model: parent.model, modelName: parent.modelName, detail: { parentId: parent.id, parentType: parent.type, center: de.detailCenter, radius: de.detailRadius, label, outline: de.detailOutline ?? 'none', pinned: de.detailPinned !== false, ...(de.detailStyle && de.detailStyle !== 'perStandard' ? { style: de.detailStyle } : {}), ...(de.detailProfile && de.detailRect ? { rect: de.detailRect } : {}) } };
    // a detail view gets its centre marks too (the holes it shows whole), QA 0.5.10 F122
    const d: Document = withAutoMarks({ ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] }, [view]);
    set({ doc: d, drawingEdit: null, selectedDrawingViewId: view.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startProjectedView() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId) ?? sheet?.views[0];
    if (!parent) {
      get().pushMessage('Select a drawing view to project from.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'projected', orientation: parent.type, multiple: false, displayStyle: parent.displayStyle, useCustomScale: !!parent.scale, scale: parent.scale ?? [1, 1], parentId: parent.id, useParentStyle: true, scaleMode: 'parent' }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  placeProjectedView(type, position, parentId) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === parentId);
    if (!sheet || !parent) return;
    history.push('Projected View', doc);
    const de = drawingEdit;
    // Scale: the parent's (default), the sheet's, or the custom one; Display Style: the parent's unless unchecked
    const scale = de?.scaleMode === 'sheet' ? undefined : de?.scaleMode === 'custom' ? de.scale : parent.scale;
    const usedLabels = new Set(sheet.views.map((v) => v.arrowLabel ?? v.section?.label ?? v.detail?.label ?? v.aux?.label).filter(Boolean));
    const arrowLabel = de?.projArrow ? 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('').find((c) => !usedLabels.has(c)) : undefined;
    const model = de?.configuration && de.configuration !== parent.configuration ? documentForConfiguration(parent.model, de.configuration) : parent.model;
    const view: DrawingView = { id: newId('dv'), name: nextViewName(sheet), type, position, scale, parentId, displayStyle: de?.useParentStyle === false ? de.displayStyle : parent.displayStyle, model, modelName: parent.modelName, ...(de?.configuration ?? parent.configuration ? { configuration: de?.configuration ?? parent.configuration } : {}), ...(parent.draftQuality ? { draftQuality: true } : {}), ...(parent.threadDraft ? { threadDraft: true } : {}), ...(arrowLabel ? { arrowLabel } : {}) };
    const d: Document = withAutoMarks({ ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] }, [view]);
    set({ doc: d, selectedDrawingViewId: parent.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startStandardThreeViews() {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const model = sheet.views[0]?.model;
    if (!model) {
      // no model yet: the Model View command asks for one first
      get().startModelView();
      get().pushMessage('Browse to a part first; Standard 3 View then places front, top and right views.');
      return;
    }
    history.push('Standard 3 View', doc);
    const firstAngle = get().prefs['doc.standard'] === 'ISO' || get().prefs['doc.standard'] === 'DIN';
    const style = newViewStyle(getPref('drawings.displayStyle'));
    const views: DrawingView[] = buildThreeViews(model, sheet, threeViewsCentre(model, sheet, firstAngle), firstAngle).map((v, i) => ({ ...v, displayStyle: style, id: newId('dv'), name: `Drawing View${sheet.views.length + i + 1}` }));
    views[1].parentId = views[0].id;
    views[2].parentId = views[0].id;
    const d: Document = withAutoMarks({ ...doc, sheets: [{ ...sheet, views: [...sheet.views, ...views] }] }, views);
    set({ doc: d, dirty: true, drawingEdit: null, ...historyFlags() });
    autosave(d);
  },
  updateDrawingView(id, patch) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Drawing View', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === id ? { ...v, ...patch } : v)) }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  selectDrawingView(id) {
    set({ selectedDrawingViewId: id, selectedDrawingDimensionId: null });
  },
  moveDrawingView(id, position) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const moved = sheet.views.find((v) => v.id === id);
    if (!moved) return;
    const dx = position[0] - moved.position[0], dy = position[1] - moved.position[1];
    // children keep their alignment with the parent
    const views = sheet.views.map((v) => (v.id === id ? { ...v, position } : v.detail?.parentId === id && v.detail.pinned === false ? { ...v, position: [v.position[0] + dx, v.position[1] + dy] as [number, number] } : v.parentId === id ? { ...v, position: [v.position[0] + (Math.abs(v.position[0] - moved.position[0]) < 1e-6 ? dx : 0), v.position[1] + (Math.abs(v.position[1] - moved.position[1]) < 1e-6 ? dy : 0)] as [number, number] } : v));
    // the balloons of the view move with it (leader ends stay on the geometry), and so do their magnetic lines
    const sh = (p: [number, number]): [number, number] => [p[0] + dx, p[1] + dy];
    const own = new Set((sheet.symbols ?? []).filter((s) => s.viewId === id && s.kind !== 'areaHatch').map((s) => s.id));
    const symbols = own.size ? (sheet.symbols ?? []).map((s) => (own.has(s.id) ? { ...s, position: sh(s.position), anchor: s.anchor && sh(s.anchor) } : s)) : sheet.symbols;
    const magneticLines = own.size ? (sheet.magneticLines ?? []).map((l) => (l.balloons.length && l.balloons.every((b) => own.has(b)) ? { ...l, a: sh(l.a), b: sh(l.b) } : l)) : sheet.magneticLines;
    set({ doc: { ...doc, sheets: [{ ...sheet, views, symbols, magneticLines }] }, dirty: true });
  },
  commitViewMove() {
    autosave(get().doc);
  },
  deleteDrawingView(id) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Delete view', doc);
    const gone = new Set([id, ...sheet.views.filter((v) => v.parentId === id).map((v) => v.id)]);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.filter((v) => !gone.has(v.id)), dimensions: sheet.dimensions.filter((x) => !gone.has(x.viewId)), centerMarks: sheet.centerMarks.filter((m) => !gone.has(m.viewId)) }] };
    set({ doc: d, selectedDrawingViewId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDrawingDimension() {
    set({ drawingEdit: { mode: 'dimension', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'annotation' });
  },
  startDrawingDimensionOnLine(viewId, line) {
    const de = get().drawingEdit;
    if (!de) return;
    let value = Math.hypot(line.b[0] - line.a[0], line.b[1] - line.a[1]);
    // Dimension Type ▸ True: a pictorial view measures the model edge, not its foreshortened projection
    const view = get().doc.sheets?.[0]?.views.find((v) => v.id === viewId);
    if (view?.trueDims && !view.section && !view.detail && !view.aux) value = trueLength(view.model, view.type, line.a, line.b) ?? value;
    set({ drawingEdit: { ...de, dimStart: { viewId, kind: 'linear', a: line.a, b: line.b, value } } });
  },
  startDrawingDimensionOnCircle(viewId, circle) {
    const de = get().drawingEdit;
    if (!de) return;
    set({ drawingEdit: { ...de, dimStart: { viewId, kind: 'diameter', a: circle.c, b: [circle.c[0] + circle.r, circle.c[1]], value: 2 * circle.r } } });
  },
  placeDrawingDimension(sheetPoint) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    const ds = drawingEdit?.dimStart;
    if (!sheet || !ds) return;
    const view = sheet.views.find((v) => v.id === ds.viewId);
    if (!view) return;
    const v2d = viewGeometry(view);
    const s = (view.scale ?? sheet.scale)[0] / (view.scale ?? sheet.scale)[1];
    const c: [number, number] = [(v2d.min[0] + v2d.max[0]) / 2, (v2d.min[1] + v2d.max[1]) / 2];
    const label: [number, number] = [c[0] + (sheetPoint[0] - view.position[0]) / s, c[1] + (sheetPoint[1] - view.position[1]) / s];
    let orientation: DrawingDimension['orientation'];
    if (ds.kind === 'linear') {
      const dx = Math.abs(ds.b[0] - ds.a[0]), dy = Math.abs(ds.b[1] - ds.a[1]);
      if (dx < 1e-6) orientation = 'v';
      else if (dy < 1e-6) orientation = 'h';
      else {
        const minx = Math.min(ds.a[0], ds.b[0]), maxx = Math.max(ds.a[0], ds.b[0]), miny = Math.min(ds.a[1], ds.b[1]), maxy = Math.max(ds.a[1], ds.b[1]);
        orientation = label[0] < minx || label[0] > maxx ? 'v' : label[1] < miny || label[1] > maxy ? 'h' : 'aligned';
      }
    }
    const dim: DrawingDimension = { id: newId('dd'), viewId: ds.viewId, kind: ds.kind, a: ds.a, b: ds.b, label, value: 0, orientation };
    dim.value = dimensionValue(dim);
    history.push('Dimension', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, dimensions: [...sheet.dimensions, dim] }] };
    set({ doc: d, drawingEdit: { ...drawingEdit!, dimStart: undefined }, selectedDrawingDimensionId: dim.id, dirty: true, ...historyFlags() });
    autosave(d);
    void _viewToSheet;
  },
  startViewTool(mode) {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId) ?? sheet?.views[0];
    if (!v) {
      get().pushMessage('Insert a drawing view first.', 'warn');
      return;
    }
    set({ drawingEdit: { mode, orientation: v.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], viewTool: { viewId: v.id, axis: 'x' } }, selectedDrawingViewId: v.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  startBrokenOut() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId && !x.section && !x.detail && !x.aux) ?? sheet?.views.find((x) => !x.section && !x.detail && !x.aux);
    if (!v) {
      get().pushMessage('Insert a model view first; the closed profile is drawn in it.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'brokenOut', orientation: v.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], brokenOut: { viewId: v.id, points: [], closed: false, depth: Math.round(viewDepth(v.model, v.type) / 2) } }, selectedDrawingViewId: v.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  addBrokenOutPoint(viewId, p, close) {
    const de = get().drawingEdit;
    if (!de || de.mode !== 'brokenOut' || !de.brokenOut || de.brokenOut.closed) return;
    const bo = de.brokenOut;
    if (bo.points.length && bo.viewId !== viewId) return;
    set({ drawingEdit: { ...de, brokenOut: close && bo.points.length >= 3 ? { ...bo, closed: true } : { ...bo, viewId, points: [...bo.points, p] } } });
  },
  applyBrokenOut() {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    const bo = de?.brokenOut;
    if (!sheet || !bo || !bo.closed || bo.points.length < 3) {
      set({ drawingEdit: null });
      return;
    }
    history.push('Broken-out Section', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === bo.viewId ? { ...v, brokenOut: { poly: bo.points, depth: Math.max(0.01, bo.depth) } } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  removeBrokenOut(viewId) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Delete Broken-out Section', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, brokenOut: undefined } : v)) }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startModelItems() {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !sheet.views.length) {
      get().pushMessage('Insert a drawing view of a part first.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'modelItems', orientation: sheet.views[0].type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], modelItems: { source: 'entire', sketchDims: true, featureDims: true, holeDims: true } }, managerTab: 'tree', tab: 'annotation' });
  },
  startAuxView() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId && !v.section && !v.detail) ?? sheet?.views.find((v) => !v.section && !v.detail);
    if (!sheet || !parent) {
      get().pushMessage('Insert a model view first; the auxiliary view looks perpendicular to one of its edges.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'aux', orientation: parent.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: parent.scale ?? sheet.scale, parentId: parent.id }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  setAuxEdge(viewId, a, b) {
    const de = get().drawingEdit;
    if (de && de.mode === 'aux') set({ drawingEdit: { ...de, parentId: viewId, auxEdge: { viewId, a, b } } });
  },
  placeAuxView(position) {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === de?.auxEdge?.viewId);
    if (!sheet || !parent || !de?.auxEdge) return;
    const { a, b } = de.auxEdge;
    const dir: [number, number] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dir[0], dir[1]) || 1;
    const n: [number, number] = [-dir[1] / L, dir[0] / L];
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ms = _viewToSheet(sheet, parent, viewGeometry(parent), mid);
    const off = (position[0] - ms[0]) * n[0] + (position[1] - ms[1]) * n[1];
    const side: 1 | -1 = off >= 0 ? 1 : -1;
    // aligned with the edge: the view centre lies on the normal through the edge midpoint
    const pos: [number, number] = [ms[0] + n[0] * off, ms[1] + n[1] * off];
    history.push('Auxiliary View', doc);
    const label = nextViewLabel(sheet);
    const view: DrawingViewT = { id: newId('dv'), name: `Drawing View${sheet.views.length + 1}`, type: parent.type, position: pos, scale: parent.scale, displayStyle: 'hiddenRemoved', model: parent.model, modelName: parent.modelName, aux: { parentId: parent.id, parentType: parent.type, dir, side, mid, label, ...(de.auxArrow === false ? { noArrow: true } : {}), ...(de.auxLabel === false ? { noLabel: true } : {}) } };
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    set({ doc: d, drawingEdit: null, selectedDrawingViewId: view.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setViewCrop(viewId, crop) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Crop View', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, crop } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setViewBreak(viewId, br) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Break', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, break: br } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setDrawingTool(drawingTool) {
    set({ drawingTool, drawingEdit: null });
  },
  selectDrawingDimension(id) {
    if (!id) {
      set({ selectedDrawingDimensionId: null, drawingEdit: null });
      return;
    }
    set({ selectedDrawingDimensionId: id, selectedDrawingViewId: null, drawingEdit: null, managerTab: 'properties' });
  },
  updateDrawingDimension(id, patch, undoable = true) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    if (undoable) history.push('Dimension', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, dimensions: sheet.dimensions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }, ...(doc.sheets ?? []).slice(1)] };
    set({ doc: d, dirty: true, ...(undoable ? historyFlags() : {}) });
    if (undoable) autosave(d);
  },
  beginAnnotationMove() {
    history.push('Move', get().doc);
    set({ ...historyFlags() });
  },
  moveAnnotation(target, position) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    let next: DrawingSheet = sheet;
    if (target.kind === 'note') next = { ...sheet, notes: sheet.notes.map((n) => (n.id === target.id ? { ...n, position } : n)) };
    else if (target.kind === 'table') next = { ...sheet, tables: (sheet.tables ?? []).map((t) => (t.id === target.id ? { ...t, position } : t)) };
    else {
      let pos = position;
      let lines = sheet.magneticLines;
      const ml = (sheet.magneticLines ?? []).find((l) => l.balloons.includes(target.id));
      if (ml) {
        // on the line: slide along it; pulled more than 8 mm away: it leaves the line
        const dx = ml.b[0] - ml.a[0], dy = ml.b[1] - ml.a[1], L2 = dx * dx + dy * dy || 1;
        const k = ((position[0] - ml.a[0]) * dx + (position[1] - ml.a[1]) * dy) / L2;
        const q: [number, number] = [ml.a[0] + k * dx, ml.a[1] + k * dy];
        if (Math.hypot(q[0] - position[0], q[1] - position[1]) < 8) pos = q;
        else lines = (sheet.magneticLines ?? []).map((l) => (l.id === ml.id ? { ...l, balloons: l.balloons.filter((b) => b !== target.id) } : l));
      }
      next = { ...sheet, symbols: (sheet.symbols ?? []).map((s) => (s.id === target.id ? { ...s, position: pos } : s)), magneticLines: lines };
    }
    set({ doc: { ...doc, sheets: [next, ...(doc.sheets ?? []).slice(1)] }, dirty: true });
  },
  insertHoleTable() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId) ?? sheet?.views.find((x) => x.type === 'front') ?? sheet?.views[0];
    if (!sheet || !v) {
      get().pushMessage('Insert a drawing view with holes first.', 'warn');
      return;
    }
    // placed on a free spot, then it follows the cursor until a click places it (by design)
    const t: NonNullable<DrawingSheet['tables']>[number] = { id: newId('tb'), kind: 'hole', viewId: v.id };
    const g = tableGrid(sheet, t);
    t.position = freeSpot(sheet, g?.w ?? 80, g?.h ?? 20);
    get().applyDocument('Hole Table', { ...doc, sheets: [{ ...sheet, tables: [...(sheet.tables ?? []), t] }] });
    set({ drawingTool: { kind: 'placeTable', id: t.id } });
  },
  insertGeneralTable(rows, cols) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 ? String.fromCharCode(65 + c) : '')));
    const t: NonNullable<DrawingSheet['tables']>[number] = { id: newId('tb'), kind: 'general', viewId: '', cells };
    const g = tableGrid(sheet, t);
    t.position = freeSpot(sheet, g?.w ?? 75, g?.h ?? 18);
    get().applyDocument('General Table', { ...doc, sheets: [{ ...sheet, tables: [...(sheet.tables ?? []), t] }] });
    set({ drawingTool: { kind: 'placeTable', id: t.id } });
  },
  setTableCell(tableId, r, c, text) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const tables = (sheet.tables ?? []).map((t) => (t.id === tableId && t.cells ? { ...t, cells: t.cells.map((row, i) => (i === r ? row.map((x, j) => (j === c ? text : x)) : row)) } : t));
    if (tables.every((t, i) => t === (sheet.tables ?? [])[i])) return;
    history.push('Edit table cell', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, tables }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  addSheet() {
    const { doc } = get();
    const cur = doc.sheets?.[0];
    if (!cur) return;
    const all = [cur, ...(doc.otherSheets ?? [])];
    const n = all.length + 1;
    const sheet: DrawingSheet = { id: newId('sh'), name: `Sheet${n}`, size: cur.size, landscape: cur.landscape, scale: cur.scale, showFormat: cur.showFormat, views: [], dimensions: [], notes: [], centerMarks: [], titleBlock: cur.titleBlock };
    get().applyDocument('Add Sheet', { ...doc, sheets: [sheet], otherSheets: all });
    set({ selectedDrawingViewId: null, drawingEdit: null });
  },
  activateSheet(id) {
    const { doc } = get();
    const cur = doc.sheets?.[0];
    const next = (doc.otherSheets ?? []).find((x) => x.id === id);
    if (!cur || !next) return;
    const d: Document = { ...doc, sheets: [next], otherSheets: [...(doc.otherSheets ?? []).filter((x) => x.id !== id), cur] };
    set({ doc: d, selectedDrawingViewId: null, drawingEdit: null, dirty: true });
    autosave(d);
  },
  insertBomTable() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId && x.model.kind === 'assembly') ?? sheet?.views.find((x) => x.model.kind === 'assembly') ?? sheet?.views[0];
    if (!sheet || !v) {
      get().pushMessage('Insert a drawing view of an assembly first.', 'warn');
      return;
    }
    history.push('Bill of Materials', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, tables: [...(sheet.tables ?? []).filter((t) => t.kind !== 'bom'), { id: newId('tb'), kind: 'bom', viewId: v.id }] }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  addRevision(description) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const revs = sheet.revisions ?? [];
    const letters = 'ABCDEFGHJKLMNPRTUVWY';
    const rev = letters[Math.min(revs.length, letters.length - 1)];
    const date = new Date().toISOString().slice(0, 10);
    history.push('Revision', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, revisions: [...revs, { rev, description: description || (revs.length ? 'CHANGE' : 'INITIAL RELEASE'), date, approved: '' }] }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startAltPosition() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId && x.model.kind === 'assembly') ?? sheet?.views.find((x) => x.model.kind === 'assembly');
    if (!v) {
      get().pushMessage('Alternate Position View needs a view of an assembly.', 'warn');
      return;
    }
    const motion = !!v.model.motionStudy?.motors.length;
    set({ drawingEdit: { mode: 'altPosition', orientation: v.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], altPosition: { source: motion ? 'motion' : 'exploded', time: motion ? 1 : 0, viewId: v.id } }, selectedDrawingViewId: v.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  applyAltPosition() {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !de?.altPosition) return;
    history.push('Alternate Position View', doc);
    const ap = de.altPosition;
    const name = de.altExisting ?? ((de.altName ?? '').trim() || 'AltPosition_Default_1');
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === ap.viewId ? { ...v, altPosition: { source: ap.source, time: ap.time, name } } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startTitleBlock() {
    const sheet = get().doc.sheets?.[0];
    if (!sheet) return;
    set({ drawingEdit: { mode: 'titleBlock', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'sheetFormat' });
  },
  startSymbol(kind) {
    const sheet = get().doc.sheets?.[0];
    const used = new Set((sheet?.symbols ?? []).filter((x) => x.kind === 'datum').map((x) => x.text));
    // Sheet Properties ▸ Next datum label, while it is free
    const letter = sheet?.nextDatumLabel && !used.has(sheet.nextDatumLabel) ? sheet.nextDatumLabel : 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('').find((c) => !used.has(c)) ?? 'A';
    set({ drawingEdit: { mode: 'symbol', symbolKind: kind, orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], gtolSymbol: '⏥', gtolTol: '0.05', gtolDatum: '', finish: '3.2', symbolText: kind === 'datum' ? letter : undefined }, managerTab: 'tree', tab: 'annotation' });
  },
  addSymbol(sym) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push(sym.kind === 'balloon' ? 'Balloon' : sym.kind === 'centerline' ? 'Centerline' : 'Annotation', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, symbols: [...(sheet.symbols ?? []), { ...sym, id: newId('sy') }] }] };
    // stays in the command for the next one (by design), the first pick is cleared
    set({ doc: d, drawingEdit: drawingEdit ? { ...drawingEdit, symbolAnchor: undefined, symbolLine: undefined, symbolText: sym.kind === 'datum' ? String.fromCharCode((sym.text ?? 'A').charCodeAt(0) + 1) : drawingEdit.symbolText } : null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startNote() {
    set({ drawingEdit: { mode: 'note', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], noteText: '' }, managerTab: 'tree', tab: 'annotation' });
  },
  placeNote(position) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !drawingEdit) return;
    const text = (drawingEdit.noteText ?? '').trim() || 'NOTE';
    // Leader: the first click is the point the arrow touches, the second places the text
    if (drawingEdit.noteLeader === 'leader' && !drawingEdit.noteAnchor) {
      set({ drawingEdit: { ...drawingEdit, noteAnchor: position } });
      return;
    }
    let anchor = drawingEdit.noteLeader === 'leader' ? drawingEdit.noteAnchor : undefined;
    // Auto Leader: to the nearest view, at its edge toward the note
    if (drawingEdit.noteLeader === 'auto' && sheet.views.length) {
      const v = [...sheet.views].sort((a, b) => Math.hypot(a.position[0] - position[0], a.position[1] - position[1]) - Math.hypot(b.position[0] - position[0], b.position[1] - position[1]))[0];
      anchor = [v.position[0] + (position[0] - v.position[0]) * 0.35, v.position[1] + (position[1] - v.position[1]) * 0.35];
    }
    history.push('Note', doc);
    const note = { id: newId('dn'), text, position, ...(drawingEdit.noteAlign && drawingEdit.noteAlign !== 'left' ? { align: drawingEdit.noteAlign } : {}), ...(drawingEdit.noteFont ? { fontSize: drawingEdit.noteFont } : {}), ...(anchor ? { anchor } : {}), ...(drawingEdit.noteBorder && drawingEdit.noteBorder !== 'none' ? { border: drawingEdit.noteBorder } : {}) };
    const d: Document = { ...doc, sheets: [{ ...sheet, notes: [...sheet.notes, note] }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startCenterMark() {
    set({ drawingEdit: { mode: 'centerMark', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'annotation' });
  },
  addCenterMark(viewId, circle) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    if (sheet.centerMarks.some((m) => m.viewId === viewId && Math.hypot(m.c[0] - circle.c[0], m.c[1] - circle.c[1]) < 1e-3)) return;
    history.push('Center Mark', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, centerMarks: [...sheet.centerMarks, { id: newId('cm'), viewId, c: circle.c, r: circle.r }] }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  applyConfigurationTable(edits, newNames) {
    const { doc } = get();
    history.push('Modify Configurations', doc);
    let d = doc;
    const active = activeConfiguration(doc).id;
    for (const name of newNames) d = addConfig(d, name);
    if (newNames.length) d = activateConfiguration(d, active);
    for (const e of edits) {
      const cfg = configurations(d).find((c) => c.name === e.name);
      if (!cfg) continue;
      for (const [n, v] of Object.entries(e.dims)) d = setCfgDim(d, cfg.id, n, v);
      for (const [f, sup] of Object.entries(e.suppressed)) d = setCfgSup(d, cfg.id, f, sup);
    }
    const r = solveAll(d, {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  setSheet(patch) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Sheet properties', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, ...patch }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
});
