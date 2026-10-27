/** The state of the Property Panel that the feature families share (split from PropertyPanel.tsx, QA F103). */
import { bridge } from '../../viewport/bridge';
import { getPref } from '../../prefs';
import { type ThreadFeature } from '../../../core/document/types';
import { useEffect, useState } from 'react';
import { useActiveSketch, useActiveSolve, useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { type Constraint } from '../../../core/sketch/types';

/** what a family returns when its Property Panel is not the one shown: the next one is tried */
export const NEXT = Symbol('next');

export function usePMContext(editDimensionId: string | null, onEditDone: () => void) {
  const st = useStore(useShallow((s) => ({ selectedConstraint: s.selectedConstraint, featureEdit: s.featureEdit, rebuild: s.rebuild, commitFeature: s.commitFeature, cancelFeature: s.cancelFeature, updateFeatureDraft: s.updateFeatureDraft, doc: s.doc, detailedPreview: s.detailedPreview, toggleDetailedPreview: s.toggleDetailedPreview, shellPick: s.shellPick, sheetMetalEdit: s.sheetMetalEdit, setSheetMetal: s.setSheetMetal, setSheetMetalEdit: s.setSheetMetalEdit, pushMessage: s.pushMessage, setAnalysis: s.setAnalysis, setDraftFocus: s.setDraftFocus, draftFocus: s.draftFocus, flangePick: s.flangePick, threadFacePick: s.threadFacePick, selectedFace: s.selectedFace, trimFocus: s.trimFocus, setTrimFocus: s.setTrimFocus, mirrorPick: s.mirrorPick, togglePatternSkip: s.togglePatternSkip, collectAllCorners: s.collectAllCorners, startRound: s.startRound, selectedFaces: s.selectedFaces, fullRoundPick: s.fullRoundPick, selectionToolbar: s.selectionToolbar, show: s.show, toggleShow: s.toggleShow, editSketch: s.editSketch, dir2Pick: s.dir2Pick, planePick: s.planePick, cancelPlanePick: s.cancelPlanePick, renameDocument: s.renameDocument, unitSystem: s.unitSystem, setUnitSystem: s.setUnitSystem, newSketch: s.newSketch, selection: s.selection, updateDimension: s.updateDimension, tool: s.tool, exitSketch: s.exitSketch, addEquationCurve: s.addEquationCurve, setTool: s.setTool, fullyDefine: s.fullyDefine, applySketchTool: s.applySketchTool, discardSketch: s.discardSketch, setAsk: s.setAsk, renameDimension: s.renameDimension, modify: s.modify, removeRelation: s.removeRelation, selectConstraint: s.selectConstraint, addRelation: s.addRelation, commit: s.commit, toggleConstructionSelection: s.toggleConstructionSelection, deleteSelection: s.deleteSelection, addPierce: s.addPierce, sketchTool: s.sketchTool, setSketchTool: s.setSketchTool })));
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const [value, setValue] = useState(0);
  const [sides, setSides] = useState(6);
  // Polygon > Inscribed circle (default of the intended design) / Circumscribed circle
  const [polyInscribed, setPolyInscribed] = useState(true);
  useEffect(() => {
    bridge.sketchOptions.polygonInscribed = polyInscribed;
  }, [polyInscribed]);
  // Equation Driven Curve and Fully Define Sketch options
  const [eqc, setEqc] = useState({ expr: '10*sin(x/10)', x1: 0, x2: 60, param: false, xt: '20*cos(t)', yt: '20*sin(t)' });
  const [fdef, setFdef] = useState<{ relations: boolean; dimensions: boolean; selected: boolean; hScheme: 'baseline' | 'chain' | 'ordinate'; vScheme: 'baseline' | 'chain' | 'ordinate' }>({ relations: true, dimensions: true, selected: false, hScheme: 'baseline', vScheme: 'baseline' });
  const [multiT, setMultiT0] = useState(2);
  const setMultiT = (v: number) => { setMultiT0(Math.max(0.01, v)); useStore.setState({ shellMultiThickness: Math.max(0.01, v) }); };
  const [threadFavs, setThreadFavs] = useState<Record<string, Partial<ThreadFeature>>>(() => { try { return JSON.parse(String(getPref('thread.favorites') || '{}')); } catch { return {}; } });
  const [threadFav, setThreadFav] = useState('');
  // Rectangle ▸ Add construction lines (the option reaches the sketch tool through the viewport bridge, as the polygon sides do)
  const [rectCons, setRectCons] = useState<{ on: boolean; mode: 'corners' | 'midpoints' }>({ on: false, mode: 'corners' });
  useEffect(() => {
    bridge.sketchOptions.rectConstruction = rectCons;
  }, [rectCons]);
  useEffect(() => {
    bridge.sketchOptions.polygonSides = sides;
  }, [sides]);
  // Sketch Text Property Panel (Text, Font: height, bold; width factor, spacing, rotation)
  const [sketchText, setSketchText] = useState({ text: 'PHLIPPO', height: 10, bold: false, widthFactor: 100, spacing: 100, angle: 0 });
  useEffect(() => {
    bridge.sketchOptions.textOptions = sketchText;
  }, [sketchText]);
  // Hole Tool: standard sizes (ISO 273 clearance holes) with the default counterbore / countersink of the intended design
  const [holeStd, setHoleStd] = useState('ISO');
  const [holeSize, setHoleSize] = useState('M6');
  const [holeFit, setHoleFit] = useState<'Close' | 'Normal' | 'Loose'>('Normal');
  const [filletXpert, setFilletXpert] = useState(false);
  const [autoFixDraft, setAutoFixDraft] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [dimTab, setDimTab] = useState<'value' | 'leaders' | 'other'>('value');
  const [dimFav, setDimFav] = useState('');
  const [customSizing, setCustomSizing] = useState(false);
  const [holeTab, setHoleTab] = useState<'type' | 'positions'>('type');
  const [segment, setSegment] = useState<{ n: number; mode: 'points' | 'segments' }>({ n: 4, mode: 'points' });
  const selected = st.selectedConstraint ?? editDimensionId;
  const c: Constraint | null = sketch && selected ? sketch.constraints[selected] ?? null : null;

  // the edited value belongs to one dimension; a newly selected dimension shows its own value at once
  const [valueOf, setValueOf] = useState<string | null>(null);
  useEffect(() => {
    if (c?.value !== undefined) { setValue(c.value); setValueOf(c.id); }
  }, [c?.id, c?.value]);

  return { st, sketch, solve, value, setValue, sides, setSides, polyInscribed, setPolyInscribed, eqc, setEqc, fdef, setFdef, multiT, setMultiT0, setMultiT, threadFavs, setThreadFavs, threadFav, setThreadFav, rectCons, setRectCons, sketchText, setSketchText, holeStd, setHoleStd, holeSize, setHoleSize, holeFit, setHoleFit, filletXpert, setFilletXpert, autoFixDraft, setAutoFixDraft, profileEdit, setProfileEdit, dimTab, setDimTab, dimFav, setDimFav, customSizing, setCustomSizing, holeTab, setHoleTab, segment, setSegment, selected, c, valueOf, setValueOf, editDimensionId, onEditDone };
}

export type PMContext = ReturnType<typeof usePMContext>;
