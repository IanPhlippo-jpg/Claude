/**
 * Options (Tools ▸ Options) laid out by design: System Options (stored per user in
 * localStorage) and Document Properties. The schema drives the dialog; the values that the
 * app really uses are read with getPref() from the viewport, scene and shortcuts.
 */
export type PrefValue = boolean | number | string;

export const DEFAULT_PREFS: Record<string, PrefValue> = {
  'general.recentMax': 50, 'general.includeOpenedFromOthers': false, 'general.openLastAtStartup': 'Never', 'general.inputDimensionValue': true, 'general.singleCommandPerPick': true, 'general.thumbnails': true,
  'general.systemSeparator': true, 'general.separator': '.', 'general.englishMenus': false, 'general.englishNames': false, 'general.confirmationCorner': true, 'general.autoShowPM': true, 'general.autoSizePM': true, 'general.editMacro': false,
  'general.stopDebugger': true, 'general.autoFixFillets': true, 'general.freezeBar': false, 'general.rebuildError': 'Prompt', 'general.componentDescription': 'Description', 'general.technicalAlerts': true,
  'general.checkSolutions': true, 'general.sounds': false, 'general.cosmeticThreads': false, 'general.sendLogs': false,
  'mbd.autoShow': true, 'mbd.hideWhenRotating': false,
  'drawings.eliminateDuplicate': true, 'drawings.eliminateDuplicateNotes': true, 'drawings.markDimsForDrawing': true, 'drawings.autoScale': true, 'drawings.showContentsWhileDragging': true, 'drawings.smoothDynamicMotion': true, 'drawings.printOutOfSync': true, 'drawings.showRefGeomNames': false, 'drawings.autoHideComponents': false, 'drawings.showSketchArcCenterpoints': true, 'drawings.showSketchEntityPoints': true, 'drawings.disableNoteTextWrap': false,
  'drawings.displayStyle': 'Hidden lines removed', 'drawings.tangentEdges': 'Visible', 'drawings.quality': 'High quality', 'drawings.hatch': 'Hatch', 'drawings.hatchPattern': 'ISO (Steel)', 'drawings.hatchScale': 1, 'drawings.hatchAngle': 0, 'drawings.perf.detailedPreview': true, 'drawings.perf.includeHidden': false,
  'colors.iconColors': 'Default', 'colors.background': 'Light', 'colors.scheme': 'Blue', 'colors.defaultAppearance': 'color', 'colors.defaultScene': '3 point faded', 'colors.backgroundAppearance': 'Use document scene background', 'colors.drawingsPaper': false, 'colors.shadedWithEdges': false, 'colors.editParts': true, 'colors.changedDims': false, 'colors.envelopes': 'Semi Transparent',
  'sketch.autoRotate': true, 'sketch.fullyDefined': false, 'sketch.arcCenterpoints': true, 'sketch.entityPoints': true, 'sketch.promptClose': true, 'sketch.sketchOnNewPart': false, 'sketch.overrideDims': false, 'sketch.displayPlaneShaded': true, 'sketch.virtualSharps': true, 'sketch.splineHandles': true, 'sketch.splinePolygon': false, 'sketch.ghostImage': true, 'sketch.curvatureComb': true, 'sketch.numericInput': false, 'sketch.numericInputOnlyValue': false, 'sketch.previewDim': true, 'sketch.promptDriven': true, 'sketch.setDrivenDefault': true, 'sketch.autoSolveThreshold': 2000,
  'snaps.enableSnapping': true, 'snaps.modelGeometry': true, 'snaps.automaticRelations': true, 'snaps.endPoints': true, 'snaps.centerPoints': true, 'snaps.midPoints': true, 'snaps.quadrantPoints': true, 'snaps.intersections': true, 'snaps.nearest': true, 'snaps.tangent': true, 'snaps.perpendicular': true, 'snaps.parallel': true, 'snaps.hv': true, 'snaps.hvPoints': true, 'snaps.length': true, 'snaps.grid': false, 'snaps.gridOnlyWhenDisplayed': true, 'snaps.angle': true, 'snaps.snapAngle': 45,
  'display.hiddenEdges': 'Solid', 'display.tangentEdges': 'As visible', 'display.edgeMode': 'HLR', 'display.optimizeThin': false, 'display.assemblyTransparency': 'Opaque assembly', 'display.transparencyLevel': 75, 'display.antialias': 'Anti-alias edges/sketches', 'display.shadedFaceHighlighting': true, 'display.highlightAllEdges': false, 'display.dynamicHighlight': true, 'display.tempAxes': true, 'display.openEdges': false, 'display.shadedPlanes': true, 'display.dimsFlat': true, 'display.autoToleranceOnTop': true, 'display.notesFlat': true, 'display.refTriad': true, 'display.scrollbars': false, 'display.draftQualityHLR': false, 'display.patternPreview': true, 'display.breadcrumbs': true, 'display.breadcrumbsAtCursor': false, 'display.projection': 'Third angle',
  'selection.bulk': 'Box', 'selection.wireframeHLV': true, 'selection.hlrShaded': false, 'selection.throughTransparency': true, 'selection.smallFace': false,
  'perf.brepKernel': true, 'perf.rebuildWorker': true, 'perf.verification': false, 'perf.ignoreSelfIntersect': false, 'perf.hqNormal': true, 'perf.hqDynamic': false, 'perf.curvature': 'Only on demand', 'perf.levelOfDetail': 50, 'perf.assemblyLoading': 'Automatically optimize resolved mode, hide lightweight mode', 'perf.loadLightweight': false, 'perf.resolveSub': true, 'perf.checkOutOfDate': "Don't Check", 'perf.resolveLightweight': 'Prompt', 'perf.rebuildOnLoad': 'Prompt', 'perf.mateAnimation': 50, 'perf.smartMate': 50, 'perf.magnifiedSelection': true, 'perf.purgeUnused': false, 'perf.updateMass': false, 'perf.shadedPreview': true, 'perf.softwareOpenGL': false, 'perf.noPreviewHidden': false,
  'asm.moveByDragging': true, 'asm.promptNewComponent': true, 'asm.optimizeImage': false, 'asm.saveNewComponents': false, 'asm.updateModelGraphics': true, 'asm.allowSaveReferenced': true, 'asm.largeAssembly': true, 'asm.largeThreshold': 500, 'asm.largeHideAll': true, 'asm.largeNoEdges': true, 'asm.largeSuspendRebuild': true, 'asm.largeDisableVerification': true, 'asm.envelopeAutomatic': true,
  'ext.openReadOnly': false, 'ext.dontPrompt': false, 'ext.allowMultiple': false, 'ext.loadDocs': 'Prompt', 'ext.searchLocations': true, 'ext.updateOutOfDate': false, 'ext.automaticallyGenerate': true, 'ext.updateComponentNames': true, 'ext.includeDrawings': false,
  'templates.part': 'Part.prtdot', 'templates.assembly': 'Assembly.asmdot', 'templates.drawing': 'Drawing.drwdot', 'templates.mode': 'Always use these default document templates',
  'files.showFoldersFor': 'Document Templates', 'files.folder': 'C:\\ProgramData\\PhlippoCAD\\templates',
  'fm.scrollIntoView': true, 'fm.nameOnCreation': false, 'fm.arrowKeyNav': false, 'fm.dynamicHighlight': true, 'fm.transparentFlyout': true, 'fm.treeFilter': true, 'fm.renameComponents': false, 'fm.previewHidden': true, 'fm.slowDoubleClick': true, 'fm.translatedNames': false, 'fm.commentTimestamp': true, 'fm.commentsInPM': true,
  'spin.lengthEnglish': 0.1, 'spin.lengthMetric': 10, 'spin.angle': 1, 'spin.time': 0.1,
  'view.reverseWheel': false, 'view.zoomFitStandard': false, 'view.arrowKeys': 15, 'view.mouseSpeed': 50, 'view.transitionView': 50, 'view.transitionHide': 50, 'view.transitionIsolate': 50, 'view.transitionSelector': 50,
  'backup.autoRecover': true, 'backup.autoRecoverMinutes': 10, 'backup.autoRecoverFolder': '', 'backup.enabled': false, 'backup.copies': 1, 'backup.folder': '%LOCALAPPDATA%\\PhlippoCAD\\backup', 'backup.sameLocation': false, 'backup.removeOld': true, 'backup.removeDays': 7, 'backup.saveNotify': false, 'backup.saveNotifyMinutes': 20, 'backup.saveNotifySeconds': 5,
  'touch.enable': false, 'touch.hand': 'Right-handed',
  'hw.folder': 'C:\\PhlippoCAD Data', 'hw.makeReadOnly': true, 'hw.favorites': true,
  'fe.recent': true, 'fe.hidden': true, 'fe.samples': true, 'fe.restoreTree': true,
  'search.indexing': true, 'search.webSearch': 'Google', 'search.3dContent': true, 'search.showMissing': false,
  'collab.multiUser': false, 'collab.addShortcut': false, 'collab.checkWrite': false, 'collab.checkInterval': 10, 'collab.commentIndicator': false,
  'msg.showErrors': true, 'msg.treatMissingAsError': true, 'msg.warnRebuild': true, 'msg.displayOverDefined': true, 'msg.treeWarnings': 'Always', 'msg.showStandardParts': true,
  'import.format': 'General', 'import.stlAs': 'Solid Body', 'import.units': 'Millimeters', 'import.runDiagnostics': false,
  'export.format': 'STL', 'export.stlFormat': 'Binary', 'export.units': 'Millimeters', 'export.resolution': 'Fine', 'export.showPreview': true, 'export.singleFile': true,
  // document properties
  'doc.standard': 'ISO', 'doc.upperNotes': false, 'doc.upperTables': false, 'doc.upperDims': false, 'doc.exclusionList': '',
  'doc.annotationFont': 'Century Gothic', 'doc.attachEdge': 'Filled arrow', 'doc.attachFace': 'Filled dot', 'doc.attachUnattached': 'None', 'doc.bentLeaders': true, 'doc.bentLeaderLength': 6.35, 'doc.leadingZeroes': true, 'doc.trailingZeroes': true,
  'doc.dimFont': 'Century Gothic', 'doc.dualDims': false, 'doc.dualUnitsInPlace': false, 'doc.dualPosition': 'Bottom', 'doc.lengthDecimals': '.12', 'doc.toleranceDecimals': 'Same as nominal', 'doc.fractionStyle': 'Style: Stack (1/2)', 'doc.arrowStyle': 'Filled', 'doc.arrowHeight': 1, 'doc.arrowWidth': 3, 'doc.arrowLength': 6, 'doc.breakDimLines': false, 'doc.extensionGap': true, 'doc.gap': 1, 'doc.beyond': 2, 'doc.radialLeader': '15', 'doc.showUnits': false, 'doc.addParentheses': true, 'doc.centerBetweenExt': false, 'doc.includePrefix': true, 'doc.autoJog': true, 'doc.showDimsAsFlat': false,
  'doc.virtualSharp': 'Plus', 'doc.tableFont': 'Century Gothic', 'doc.tableBorder': '0.18mm', 'doc.tableGrid': '0.18mm', 'doc.tableSplitDirection': false,
  'doc.autoToleranceMethod': 'Block tolerance', 'doc.blockLength1': 0.5, 'doc.blockLength2': 0.25, 'doc.blockLength3': 0.1, 'doc.blockAngle': 0.5,
  'doc.detCosmeticThreads': true, 'doc.detDatums': true, 'doc.detDatumTargets': true, 'doc.detFeatureDims': true, 'doc.detRefDims': true, 'doc.detAutoTolerance': true, 'doc.detGtol': true, 'doc.detNotes': true, 'doc.detSurfaceFinish': true, 'doc.detWelds': true, 'doc.detDisplayAll': false, 'doc.textScale': '1:1', 'doc.textSameSize': true, 'doc.displayItemsOnlyInView': true, 'doc.displayAnnotations': true, 'doc.useAssemblySetting': false, 'doc.hideDanglingDims': false, 'doc.useModelColor': false, 'doc.autoCenterMarks': true, 'doc.autoCenterMarksFillets': false, 'doc.autoCenterlines': false, 'doc.autoBalloons': false,
  'doc.displayGrid': false, 'doc.gridDash': false, 'doc.gridAutoScale': true, 'doc.gridMajor': 10, 'doc.gridMinor': 4, 'doc.gridSnapPoints': 1,
  'doc.unitSystem': 'MMGS (millimeter, gram, second)', 'doc.lengthUnit': 'millimeters', 'doc.dualLengthUnit': 'inches', 'doc.angleUnit': 'degrees', 'doc.angleDecimals': '.12', 'doc.massLengthUnit': 'millimeters', 'doc.massUnit': 'grams', 'doc.volumeUnit': 'millimeters^3', 'doc.timeUnit': 'second', 'doc.forceUnit': 'newton', 'doc.powerUnit': 'watt', 'doc.energyUnit': 'joule', 'doc.rounding': 'Round half away from zero', 'doc.roundingOnlyDims': false,
  'doc.sameColorAllModes': false, 'doc.ignoreFeatureColors': false, 'doc.storeAppearance': false, 'doc.autoScaleTextures': true, 'doc.cartoonThickness': 1,
  'doc.density': 0.001, 'doc.hatchKind': 'Hatch', 'doc.hatchPattern': 'ISO (Steel)', 'doc.hatchScale': 1, 'doc.hatchAngle': 0,
  'doc.shadedQuality': 60, 'doc.deviation': 0.02, 'doc.optimizeEdgeLength': false, 'doc.applyToAll': false, 'doc.saveTessellation': true, 'doc.wireframeQuality': 50, 'doc.preciselyRenderOverlapping': false, 'doc.improveCurveQuality': false, 'doc.isometricPreview': false, 'doc.previewLightweight': false,
  'doc.smSimplifyBends': true, 'doc.smCornerTreatment': true, 'doc.smMergeFaces': true, 'doc.smShowFixedFace': false, 'doc.smShowGrainDirection': false,
  'doc.weldCreateCutLists': true, 'doc.weldUpdateCutLists': true, 'doc.weldRenameCutLists': false, 'doc.weldCollectIdentical': true, 'doc.weldBoundingBox': true, 'doc.weldSort': 'Order of creation',
  'doc.planeTransparency': 75, 'doc.planeIntersections': true,
  'doc.configRebuildOnActivate': true, 'doc.configAddRebuild': false, 'doc.configPurge': false,
  'doc.mateAlignment': 'Closest', 'doc.mateShowPopup': true, 'doc.mateShowPreview': true, 'doc.mateUseForPositioning': false, 'doc.mateMakeFirstFixed': true,
  'doc.perfVerification': false, 'doc.perfImageQuality': 60, 'doc.perfUseLightweight': false,
  'customize.largeButtons': true, 'customize.tooltips': true, 'customize.largeTooltips': true, 'customize.lock': false, 'customize.gestures.enabled': true, 'customize.tabs.hidden': '', 'customize.qat.hidden': '', 'customize.qat.extra': '', 'customize.menus.hidden': '', 'customize.shortcutbar.hidden': '', 'customize.keys': '', 'customize.gestures': '', 'customize.iconSize': 'Medium', 'customize.cmDescriptions': false, 'customize.showMenus': true,
  'view.upAxis': 'Y', 'view.tangentEdges': 'visible',
};

const STORAGE_KEY = 'phlippo.prefs';

let current: Record<string, PrefValue> = { ...DEFAULT_PREFS };

/** option keys of 0.3.5 and older that were renamed in 0.3.6 (QA F50): a saved value keeps working */
const OLD_KEYS: Record<string, string> = {
  'general.featureXpert': 'general.autoFixFillets',
  'display.dimXpertOnTop': 'display.autoToleranceOnTop',
  'doc.dimxpertMethod': 'doc.autoToleranceMethod',
  'doc.detDimXpert': 'doc.detAutoTolerance',
  'msg.showToolbox': 'msg.showStandardParts',
  'addin.toolbox': 'addin.standardParts',
};
export function renameOldKeys(p: Record<string, PrefValue>): Record<string, PrefValue> {
  const out: Record<string, PrefValue> = {};
  for (const [k, v] of Object.entries(p)) {
    const n = OLD_KEYS[k];
    if (n) { if (!(n in p)) out[n] = v; } else out[k] = v;
  }
  return out;
}

export function loadPrefs(): Record<string, PrefValue> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) current = { ...DEFAULT_PREFS, ...renameOldKeys(JSON.parse(raw) as Record<string, PrefValue>) };
  } catch {
    /* storage unavailable */
  }
  return current;
}

export function savePrefs(prefs: Record<string, PrefValue>): void {
  current = prefs;
  try {
    const changed: Record<string, PrefValue> = {};
    for (const [k, v] of Object.entries(prefs)) if (v !== DEFAULT_PREFS[k]) changed[k] = v;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(changed));
  } catch {
    /* ignore */
  }
}

/** Read an option from anywhere (viewport, scene, shortcuts). */
export function getPref<T extends PrefValue = PrefValue>(key: string): T {
  return (current[key] ?? DEFAULT_PREFS[key]) as T;
}

/** the favourite materials of the Material dialog (also listed in the tree's Material menu) */
export const materialFavorites = (): string[] => { try { return JSON.parse(String(getPref('material.favorites') || '[]')); } catch { return []; } };

/** Number of decimals for length dimensions from the Units page ('.12' → 2). */
export function lengthDecimals(): number {
  const v = String(getPref('doc.lengthDecimals'));
  return v === 'None' ? 0 : v.length - 1;
}

/** Entries of the color scheme list (System Options ▸ Colors), with the CSS token they map to. */
export const COLOR_SCHEME_ITEMS: { label: string; token: string }[] = [
  { label: 'Viewport Background', token: '--bg-viewport' },
  { label: 'Top Gradient Color', token: '--bg-viewport' },
  { label: 'Bottom Gradient Color', token: '--bg-viewport-2' },
  { label: 'Dynamic Highlight', token: '--sk-hover' },
  { label: 'Highlight', token: '--sk-hover' },
  { label: 'Selected Item 1', token: '--sk-selected' },
  { label: 'Selected Item 2', token: '--sk-selected' },
  { label: 'Selected Item 3', token: '--sk-selected' },
  { label: 'Selected Item 4', token: '--sk-selected' },
  { label: 'Selected Item Missing Reference', token: '--sk-over' },
  { label: 'Dimensions, Not Selected', token: '--sk-dimension' },
  { label: 'Sketch, Over Defined', token: '--sk-over' },
  { label: 'Sketch, Fully Defined', token: '--sk-full' },
  { label: 'Sketch, Under Defined', token: '--sk-under' },
  { label: 'Sketch, Invalid Geometry', token: '--sk-over' },
  { label: 'Sketch, Not Solved', token: '--sk-over' },
  { label: 'Sketch, Inactive', token: '--text-faint' },
  { label: 'Grid Lines, Minor', token: '--sk-grid' },
  { label: 'Grid Lines, Major', token: '--sk-grid-major' },
  { label: 'Construction Geometry', token: '--sk-construction' },
  { label: 'Annotations, Imported (Driving)', token: '--sk-dimension' },
  { label: 'Annotations, Non Imported (Driven)', token: '--sk-dimension' },
  { label: 'Assembly, Edit Part', token: '--sk-full' },
  { label: 'Assembly, Non-Edit Parts', token: '--text-faint' },
  { label: 'Assembly, Hidden Lines of Edit Part', token: '--text-faint' },
  { label: 'Inactive Entity', token: '--text-faint' },
  { label: 'Temporary Graphics', token: '--sk-under' },
  { label: 'Temporary Graphics, Shaded', token: '--sk-under' },
  { label: 'Reference Triad X Axis', token: '--sk-axis-x' },
  { label: 'Reference Triad Y Axis', token: '--sk-axis-y' },
  { label: 'Reference Triad Z Axis', token: '--sk-axis-z' },
  { label: 'Edges in Shaded With Edges Mode', token: '--text' },
  { label: 'Surfaces, Open Edges', token: '--sk-over' },
  { label: 'Feature Tree Text', token: '--text' },
  { label: 'Flyout Feature Tree Text', token: '--text' },
];

/** Color scheme presets (System Options ▸ Colors ▸ Current color scheme): the tokens they change */
const SCHEME_PRESETS: Record<string, Record<string, string>> = {
  Blue: {},
  Green: { '--sk-selected': '#2f9e44', '--accent': '#2f9e44', '--bg-viewport-2': '#e9f2ea' },
  Orange: { '--sk-selected': '#e8590c', '--accent': '#e8590c', '--bg-viewport-2': '#f6eee6' },
};

/** the saved custom schemes: name → token colours */
export function savedSchemes(prefs: Record<string, PrefValue> = current): Record<string, Record<string, string>> {
  try { return JSON.parse(String(prefs['colors.schemes'] || '{}')); } catch { return {}; }
}

/** the single colours edited in the colour list (Edit…): token → colour */
export function customColors(prefs: Record<string, PrefValue> = current): Record<string, string> {
  try { return JSON.parse(String(prefs['colors.custom'] || '{}')); } catch { return {}; }
}

let appliedTokens: string[] = [];
/** put the scheme and the edited colours on the page (CSS tokens on :root) */
export function applyColorScheme(prefs: Record<string, PrefValue> = current): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const t of appliedTokens) root.style.removeProperty(t);
  const name = String(prefs['colors.scheme'] ?? 'Blue');
  const dark = prefs['colors.background'] === 'Dark';
  const tokens = { ...(dark ? {} : SCHEME_PRESETS[name] ?? savedSchemes(prefs)[name] ?? {}), ...customColors(prefs) };
  // the light presets only change the light theme; edited colours apply to both
  for (const [t, v] of Object.entries(tokens)) root.style.setProperty(t, v);
  appliedTokens = Object.keys(tokens);
}
