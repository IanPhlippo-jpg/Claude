/**
 * Options (Tools ▸ Options) laid out as the original: System Options (stored per user in
 * localStorage) and Document Properties. The schema drives the dialog; the values that the
 * app really uses are read with getPref() from the viewport, scene and shortcuts.
 */
export type PrefValue = boolean | number | string;

export type Control =
  | { kind: 'check'; key: string; label: string; indent?: number; note?: string; disabled?: boolean; textAfter?: string }
  | { kind: 'select'; key: string; label: string; options: string[]; inline?: boolean }
  | { kind: 'radio'; key: string; label?: string; options: string[] }
  | { kind: 'number'; key: string; label: string; unit?: string; min?: number; max?: number; step?: number; after?: string }
  | { kind: 'slider'; key: string; label: string; min: number; max: number; left?: string; right?: string }
  | { kind: 'text'; key: string; label: string; placeholder?: string; browse?: boolean }
  | { kind: 'button'; label: string; action?: string }
  | { kind: 'colors'; key: string }
  | { kind: 'note'; text: string }
  | { kind: 'treeItems'; key: string; items: string[] };

export interface Section {
  title?: string;
  controls: Control[];
}

export interface Category {
  id: string;
  label: string;
  /** indented under the previous category in the list, as the original */
  child?: boolean;
  sections: Section[];
}

export const SYSTEM_CATEGORIES: Category[] = [
  {
    id: 'general',
    label: 'General',
    sections: [
      {
        title: 'Recent documents',
        controls: [
          { kind: 'number', key: 'general.recentMax', label: 'Maximum recent documents displayed', min: 1, max: 100 },
          { kind: 'check', key: 'general.includeOpenedFromOthers', label: 'Include documents opened from other documents' },
          { kind: 'select', key: 'general.openLastAtStartup', label: 'Open last used document(s) at startup', options: ['Never', 'Always'], inline: true },
        ],
      },
      {
        controls: [
          { kind: 'check', key: 'general.inputDimensionValue', label: 'Input dimension value' },
          { kind: 'check', key: 'general.singleCommandPerPick', label: 'Single command per pick' },
          { kind: 'check', key: 'general.thumbnails', label: 'Show thumbnail graphics in Windows Explorer' },
          { kind: 'button', label: 'Restore File Associations', action: 'fileAssociations' },
          { kind: 'check', key: 'general.systemSeparator', label: 'Use system separator for dimensions', textAfter: 'general.separator' },
          { kind: 'check', key: 'general.englishMenus', label: 'Use English language menus', disabled: true },
          { kind: 'check', key: 'general.englishNames', label: 'Use English language feature and file names', disabled: true },
          { kind: 'check', key: 'general.confirmationCorner', label: 'Enable Confirmation Corner' },
          { kind: 'check', key: 'general.autoShowPM', label: 'Auto-show Property Panel' },
          { kind: 'check', key: 'general.autoSizePM', label: 'Auto-size Property Panel when panels are split' },
          { kind: 'check', key: 'general.editMacro', label: 'Automatically edit macro after recording' },
          { kind: 'check', key: 'general.stopDebugger', label: 'Stop VSTA debugger on macro exit' },
          { kind: 'check', key: 'general.featureXpert', label: 'Enable Auto-Fix Fillets' },
          { kind: 'check', key: 'general.freezeBar', label: 'Enable Freeze bar' },
          { kind: 'select', key: 'general.rebuildError', label: 'When rebuild error occurs:', options: ['Prompt', 'Stop', 'Continue'], inline: true },
          { kind: 'select', key: 'general.componentDescription', label: 'Custom property used as component description:', options: ['Description', 'PartNo', 'Material', 'Revision'], inline: true },
          { kind: 'check', key: 'general.technicalAlerts', label: 'Show latest Technical Alerts and News in Welcome dialog' },
          { kind: 'check', key: 'general.checkSolutions', label: 'Check for solutions when Phlippo CAD crashes' },
          { kind: 'check', key: 'general.sounds', label: 'Enable sounds for Phlippo CAD events' },
          { kind: 'button', label: 'Configure Sounds', action: 'sounds' },
          { kind: 'check', key: 'general.cosmeticThreads', label: 'Allow cosmetic threads for upgrade' },
          { kind: 'check', key: 'general.sendLogs', label: 'Help make Phlippo CAD better by automatically sending your log files' },
        ],
      },
    ],
  },
  { id: 'mbd', label: 'MBD', sections: [{ controls: [{ kind: 'check', key: 'mbd.autoShow', label: 'Automatically show the Auto Tolerancing annotations when a model is opened' }, { kind: 'check', key: 'mbd.hideWhenRotating', label: 'Hide 3D views when rotating or panning' }] }] },
  {
    id: 'drawings',
    label: 'Drawings',
    sections: [
      {
        controls: [
          { kind: 'check', key: 'drawings.eliminateDuplicate', label: 'Eliminate duplicate model dimensions on insert' },
          { kind: 'check', key: 'drawings.eliminateDuplicateNotes', label: 'Eliminate duplicate model notes on insert' },
          { kind: 'check', key: 'drawings.markDimsForDrawing', label: 'Mark all part/assembly dimension for import into drawings by default' },
          { kind: 'check', key: 'drawings.autoScale', label: 'Automatically scale new drawing views' },
          { kind: 'check', key: 'drawings.showContentsWhileDragging', label: 'Show contents while dragging drawing view' },
          { kind: 'check', key: 'drawings.smoothDynamicMotion', label: 'Smooth dynamic motion of drawing views' },
          { kind: 'check', key: 'drawings.printOutOfSync', label: 'Print out-of-sync water mark' },
          { kind: 'check', key: 'drawings.showRefGeomNames', label: 'Show reference geometry names in drawings' },
          { kind: 'check', key: 'drawings.autoHideComponents', label: 'Automatically hide components on view creation' },
          { kind: 'check', key: 'drawings.showSketchArcCenterpoints', label: 'Show sketch arc centerpoints' },
          { kind: 'check', key: 'drawings.showSketchEntityPoints', label: 'Show sketch entity points' },
          { kind: 'check', key: 'drawings.disableNoteTextWrap', label: 'Disable note/dimension inference' },
        ],
      },
    ],
  },
  { id: 'drawings.displayStyle', label: 'Display Style', child: true, sections: [{ title: 'Display style for new views', controls: [{ kind: 'radio', key: 'drawings.displayStyle', options: ['Wireframe', 'Hidden lines visible', 'Hidden lines removed', 'Shaded with edges', 'Shaded'] }] }, { title: 'Tangent edges in new views', controls: [{ kind: 'radio', key: 'drawings.tangentEdges', options: ['Visible', 'Use font', 'Hide ends', 'Removed'] }] }, { title: 'Display quality for new views', controls: [{ kind: 'radio', key: 'drawings.quality', options: ['High quality', 'Draft quality'] }] }] },
  { id: 'drawings.areaHatch', label: 'Area Hatch/Fill', child: true, sections: [{ controls: [{ kind: 'radio', key: 'drawings.hatch', options: ['None', 'Solid', 'Hatch'] }, { kind: 'select', key: 'drawings.hatchPattern', label: 'Pattern:', options: ['ISO (Steel)', 'ANSI31 (Iron BrickStone)', 'ANSI32 (Steel)', 'ANSI33 (Bronze Brass Copper)'] }, { kind: 'number', key: 'drawings.hatchScale', label: 'Scale:', step: 0.5 }, { kind: 'number', key: 'drawings.hatchAngle', label: 'Angle:', unit: 'deg' }] }] },
  { id: 'drawings.performance', label: 'Performance', child: true, sections: [{ controls: [{ kind: 'check', key: 'drawings.perf.detailedPreview', label: 'Show model in detailed preview when inserting views' }, { kind: 'check', key: 'drawings.perf.includeHidden', label: 'Include hidden components when creating views' }] }] },
  {
    id: 'colors',
    label: 'Colors',
    sections: [
      {
        controls: [
          { kind: 'select', key: 'colors.iconColors', label: 'Icon Colors:', options: ['Default', 'Classic'], inline: true },
          { kind: 'select', key: 'colors.background', label: 'Background:', options: ['Light', 'Medium Light', 'Medium', 'Dark'], inline: true },
          { kind: 'select', key: 'colors.scheme', label: 'Current color scheme:', options: ['Blue', 'Green', 'Orange'], inline: true },
        ],
      },
      { title: 'Color scheme settings', controls: [{ kind: 'colors', key: 'colors.list' }] },
      {
        controls: [
          { kind: 'text', key: 'colors.defaultAppearance', label: 'Default appearance:', browse: true },
          { kind: 'text', key: 'colors.defaultScene', label: 'Default scene:', browse: true },
          { kind: 'select', key: 'colors.backgroundAppearance', label: 'Background appearance:', options: ['Use document scene background', 'Plain (Viewport Background color above)', 'Gradient (Top/Bottom Gradient Colors above)', 'Image file:'], inline: true },
          { kind: 'button', label: 'Reset Colors To Defaults', action: 'resetColors' },
          { kind: 'button', label: 'Save As Scheme...', action: 'saveScheme' },
        ],
      },
      {
        title: 'Additional options',
        controls: [
          { kind: 'check', key: 'colors.drawingsPaper', label: 'Use specified color for drawings paper color (disable image in sheet background)' },
          { kind: 'check', key: 'colors.shadedWithEdges', label: 'Use specified color for Shaded With Edges mode' },
          { kind: 'check', key: 'colors.editParts', label: 'Use specified colors when editing parts in assemblies' },
          { kind: 'check', key: 'colors.changedDims', label: 'Use specified color for changed drawing dimensions on open' },
          { kind: 'select', key: 'colors.envelopes', label: 'Envelopes:', options: ['Semi Transparent', 'Opaque', 'Do Not Change'], inline: true },
          { kind: 'button', label: 'Go To Document Colors', action: 'docColors' },
        ],
      },
    ],
  },
  {
    id: 'sketch',
    label: 'Sketch',
    sections: [
      {
        controls: [
          { kind: 'check', key: 'sketch.autoRotate', label: 'Auto-rotate view normal to sketch plane on sketch creation and sketch edit' },
          { kind: 'check', key: 'sketch.fullyDefined', label: 'Use fully defined sketches' },
          { kind: 'check', key: 'sketch.arcCenterpoints', label: 'Display arc centerpoints in part/assembly sketches' },
          { kind: 'check', key: 'sketch.entityPoints', label: 'Display entity points in part/assembly sketches' },
          { kind: 'check', key: 'sketch.promptClose', label: 'Prompt to close sketch' },
          { kind: 'check', key: 'sketch.sketchOnNewPart', label: 'Create sketch on new part' },
          { kind: 'check', key: 'sketch.overrideDims', label: 'Override dimensions on drag/move' },
          { kind: 'check', key: 'sketch.displayPlaneShaded', label: 'Display plane when shaded' },
          { kind: 'check', key: 'sketch.virtualSharps', label: 'Line length measured between virtual sharps in 3d' },
          { kind: 'check', key: 'sketch.splineHandles', label: 'Enable spline tangency and curvature handles' },
          { kind: 'check', key: 'sketch.splinePolygon', label: 'Show spline control polygon by default' },
          { kind: 'check', key: 'sketch.ghostImage', label: 'Ghost image on drag' },
          { kind: 'check', key: 'sketch.curvatureComb', label: 'Show curvature comb bounding curve' },
          { kind: 'check', key: 'sketch.numericInput', label: 'Enable on screen numeric input on entity creation' },
          { kind: 'check', key: 'sketch.numericInputOnlyValue', label: 'Create dimension only when value is entered', indent: 1 },
          { kind: 'check', key: 'sketch.previewDim', label: 'Preview sketch dimension when selected' },
        ],
      },
      { title: 'Over defining dimensions', controls: [{ kind: 'check', key: 'sketch.promptDriven', label: 'Prompt to set driven state' }, { kind: 'check', key: 'sketch.setDrivenDefault', label: 'Set driven by default' }] },
      { controls: [{ kind: 'number', key: 'sketch.autoSolveThreshold', label: 'Turn off Automatic Solve Mode and Undo when sketch contains more than this number of sketch entities:', min: 100, max: 10000 }] },
    ],
  },
  {
    id: 'sketch.relations',
    label: 'Relations/Snaps',
    child: true,
    sections: [
      {
        controls: [
          { kind: 'check', key: 'snaps.enableSnapping', label: 'Enable snapping' },
          { kind: 'check', key: 'snaps.modelGeometry', label: 'Snap to model geometry', indent: 1 },
          { kind: 'check', key: 'snaps.automaticRelations', label: 'Automatic relations', indent: 1 },
          { kind: 'note', text: 'Sketch snaps' },
          { kind: 'check', key: 'snaps.endPoints', label: 'End points and sketch points', indent: 1 },
          { kind: 'check', key: 'snaps.centerPoints', label: 'Center Points', indent: 1 },
          { kind: 'check', key: 'snaps.midPoints', label: 'Mid-points', indent: 1 },
          { kind: 'check', key: 'snaps.quadrantPoints', label: 'Quadrant Points', indent: 1 },
          { kind: 'check', key: 'snaps.intersections', label: 'Intersections', indent: 1 },
          { kind: 'check', key: 'snaps.nearest', label: 'Nearest', indent: 1 },
          { kind: 'check', key: 'snaps.tangent', label: 'Tangent', indent: 1 },
          { kind: 'check', key: 'snaps.perpendicular', label: 'Perpendicular', indent: 1 },
          { kind: 'check', key: 'snaps.parallel', label: 'Parallel', indent: 1 },
          { kind: 'check', key: 'snaps.hv', label: 'Horizontal/vertical lines', indent: 1 },
          { kind: 'check', key: 'snaps.hvPoints', label: 'Horizontal/vertical to points', indent: 1 },
          { kind: 'check', key: 'snaps.length', label: 'Length', indent: 1 },
          { kind: 'check', key: 'snaps.grid', label: 'Grid', indent: 1 },
          { kind: 'check', key: 'snaps.gridOnlyWhenDisplayed', label: 'Snap only when grid is displayed', indent: 2 },
          { kind: 'check', key: 'snaps.angle', label: 'Angle', indent: 1 },
          { kind: 'number', key: 'snaps.snapAngle', label: 'Snap angle:', unit: 'deg', indent: 2 } as Control,
        ],
      },
    ],
  },
  {
    id: 'display',
    label: 'Display',
    sections: [
      { title: 'Hidden edges displayed as', controls: [{ kind: 'radio', key: 'display.hiddenEdges', options: ['Solid', 'Dashed'] }] },
      { title: 'Part/Assembly tangent edge display', controls: [{ kind: 'radio', key: 'display.tangentEdges', options: ['As visible', 'As phantom', 'Removed'] }] },
      { title: 'Edge display in shaded with edges mode', controls: [{ kind: 'radio', key: 'display.edgeMode', options: ['HLR', 'Wireframe'] }, { kind: 'check', key: 'display.optimizeThin', label: 'Optimize for thin parts', indent: 1 }] },
      { title: 'Assembly transparency for in context edit', controls: [{ kind: 'radio', key: 'display.assemblyTransparency', options: ['Opaque assembly', 'Maintain assembly transparency', 'Force assembly transparency'] }, { kind: 'slider', key: 'display.transparencyLevel', label: '', min: 0, max: 100, left: 'Opaque', right: 'Transparent' }] },
      { title: 'Anti-aliasing', controls: [{ kind: 'radio', key: 'display.antialias', options: ['None', 'Anti-alias edges/sketches', 'Full scene anti-aliasing'] }] },
      {
        controls: [
          { kind: 'check', key: 'display.shadedFaceHighlighting', label: 'Use shaded face highlighting' },
          { kind: 'check', key: 'display.highlightAllEdges', label: 'Highlight all edges of features selected in graphics view' },
          { kind: 'check', key: 'display.dynamicHighlight', label: 'Dynamic highlight from graphics view' },
          { kind: 'check', key: 'display.tempAxes', label: 'Display temporary axes upon hover over cylindrical faces' },
          { kind: 'check', key: 'display.openEdges', label: 'Show open edges of surfaces in different color' },
          { kind: 'check', key: 'display.shadedPlanes', label: 'Display shaded planes' },
          { kind: 'check', key: 'display.dimsFlat', label: 'Display dimensions flat to screen' },
          { kind: 'check', key: 'display.dimXpertOnTop', label: 'Display Auto Tolerancing dimensions on top of model' },
          { kind: 'check', key: 'display.notesFlat', label: 'Display notes flat to screen' },
          { kind: 'check', key: 'display.refTriad', label: 'Display reference triad' },
          { kind: 'check', key: 'display.scrollbars', label: 'Display scrollbars in graphics view for parts and assemblies' },
          { kind: 'check', key: 'display.draftQualityHLR', label: 'Display draft quality HLR/HLV' },
          { kind: 'check', key: 'display.patternPreview', label: 'Display pattern information tooltips' },
          { kind: 'check', key: 'display.breadcrumbs', label: 'Show breadcrumbs on selection' },
          { kind: 'check', key: 'display.breadcrumbsAtCursor', label: 'Show breadcrumbs at mouse pointer', indent: 1 },
        ],
      },
      { title: 'Projection type for four view viewport', controls: [{ kind: 'radio', key: 'display.projection', options: ['First angle', 'Third angle'] }] },
    ],
  },
  {
    id: 'selection',
    label: 'Selection',
    sections: [
      { title: 'Default bulk selection method', controls: [{ kind: 'radio', key: 'selection.bulk', options: ['Lasso', 'Box'] }] },
      { title: 'Selection of hidden edges', controls: [{ kind: 'check', key: 'selection.wireframeHLV', label: 'Allow selection in wireframe and HLV modes' }, { kind: 'check', key: 'selection.hlrShaded', label: 'Allow selection in HLR and shaded modes' }] },
      { controls: [{ kind: 'check', key: 'selection.throughTransparency', label: 'Enable selection through transparency' }, { kind: 'check', key: 'selection.smallFace', label: 'Enhance small face selection precision' }] },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    sections: [
      { controls: [{ kind: 'check', key: 'perf.verification', label: 'Verification on rebuild (enable advanced body checking)' }, { kind: 'check', key: 'perf.ignoreSelfIntersect', label: 'Ignore self-intersection check for some sheet metal features' }] },
      { title: 'Transparency', controls: [{ kind: 'check', key: 'perf.hqNormal', label: 'High quality for normal view mode' }, { kind: 'check', key: 'perf.hqDynamic', label: 'High quality for dynamic view mode' }] },
      { title: 'Curvature generation', controls: [{ kind: 'radio', key: 'perf.curvature', options: ['Only on demand', 'Always (for every shaded model)'] }] },
      { title: 'Level of detail', controls: [{ kind: 'slider', key: 'perf.levelOfDetail', label: '', min: 0, max: 100, left: 'More (slower)', right: 'Less (faster)' }] },
      {
        title: 'Assembly Loading',
        controls: [
          { kind: 'radio', key: 'perf.assemblyLoading', options: ['Automatically optimize resolved mode, hide lightweight mode', 'Manually manage resolved and lightweight modes'] },
          { kind: 'check', key: 'perf.loadLightweight', label: 'Load component lightweight', indent: 1 },
          { kind: 'check', key: 'perf.resolveSub', label: 'Always resolve subassemblies', indent: 2 },
          { kind: 'select', key: 'perf.checkOutOfDate', label: 'Check out-of-date lightweight components:', options: ["Don't Check", 'Indicate', 'Always Resolve'], inline: true },
          { kind: 'select', key: 'perf.resolveLightweight', label: 'Resolve lightweight components:', options: ['Prompt', 'Always'], inline: true },
          { kind: 'select', key: 'perf.rebuildOnLoad', label: 'Rebuild assembly on load:', options: ['Prompt', 'Always', 'Never'], inline: true },
        ],
      },
      { title: 'Mate animation speed', controls: [{ kind: 'slider', key: 'perf.mateAnimation', label: '', min: 0, max: 100, left: 'Off', right: 'Fast' }] },
      { title: 'SmartMate sensitivity', controls: [{ kind: 'slider', key: 'perf.smartMate', label: '', min: 0, max: 100, left: 'Slow', right: 'Fast' }] },
      { controls: [{ kind: 'check', key: 'perf.magnifiedSelection', label: 'Magnified selection' }, { kind: 'check', key: 'perf.purgeUnused', label: 'Purge cached configuration data' }, { kind: 'check', key: 'perf.updateMass', label: 'Update mass properties while saving document' }, { kind: 'check', key: 'perf.shadedPreview', label: 'Use shaded preview' }, { kind: 'check', key: 'perf.softwareOpenGL', label: 'Use software OpenGL' }, { kind: 'check', key: 'perf.noPreviewHidden', label: 'No preview during open (faster)' }] },
    ],
  },
  {
    id: 'assemblies',
    label: 'Assemblies',
    sections: [
      { controls: [{ kind: 'check', key: 'asm.moveByDragging', label: 'Move components by dragging' }, { kind: 'check', key: 'asm.promptNewComponent', label: 'Prompt before changing mate alignments on edit' }, { kind: 'check', key: 'asm.optimizeImage', label: 'Optimize image quality for large assemblies' }, { kind: 'check', key: 'asm.saveNewComponents', label: 'Save new components to external files' }, { kind: 'check', key: 'asm.updateModelGraphics', label: 'Update model graphics when saving files' }, { kind: 'check', key: 'asm.allowSaveReferenced', label: 'Allow saving referenced documents when assembly is saved' }] },
      { title: 'Large Assembly Settings', controls: [{ kind: 'check', key: 'asm.largeAssembly', label: 'Use Large Assembly Settings to improve performance whenever working with an assembly containing more than this number of components:' }, { kind: 'number', key: 'asm.largeThreshold', label: '', min: 10, max: 100000 }, { kind: 'check', key: 'asm.largeHideAll', label: 'Hide all planes, axes, sketches, curves, annotations, etc.', indent: 1 }, { kind: 'check', key: 'asm.largeNoEdges', label: 'Do not display edges in shaded mode', indent: 1 }, { kind: 'check', key: 'asm.largeSuspendRebuild', label: 'Suspend automatic rebuild', indent: 1 }, { kind: 'check', key: 'asm.largeDisableVerification', label: 'Disable verification on rebuild', indent: 1 }] },
      { title: 'Envelope Components', controls: [{ kind: 'check', key: 'asm.envelopeAutomatic', label: 'Automatically load lightweight' }] },
    ],
  },
  { id: 'externalRefs', label: 'External References', sections: [{ controls: [{ kind: 'check', key: 'ext.openReadOnly', label: 'Open referenced documents with read-only access' }, { kind: 'check', key: 'ext.dontPrompt', label: "Don't prompt to save read-only referenced documents (discard changes)" }, { kind: 'check', key: 'ext.allowMultiple', label: 'Allow multiple contexts for parts when editing in assembly' }, { kind: 'select', key: 'ext.loadDocs', label: 'Load referenced documents:', options: ['Prompt', 'All', 'Changed only', 'None'], inline: true }, { kind: 'check', key: 'ext.searchLocations', label: 'Search file locations for external references' }, { kind: 'check', key: 'ext.updateOutOfDate', label: 'Update out-of-date linked design tables to:', indent: 0 }, { kind: 'check', key: 'ext.automaticallyGenerate', label: 'Automatically generate names for referenced geometry' }, { kind: 'check', key: 'ext.updateComponentNames', label: 'Update component names when documents are replaced' }, { kind: 'check', key: 'ext.includeDrawings', label: 'Do not create references external to the model' }] }] },
  { id: 'templates', label: 'Default Templates', sections: [{ controls: [{ kind: 'text', key: 'templates.part', label: 'Parts:', browse: true }, { kind: 'text', key: 'templates.assembly', label: 'Assemblies:', browse: true }, { kind: 'text', key: 'templates.drawing', label: 'Drawings:', browse: true }, { kind: 'radio', key: 'templates.mode', options: ['Always use these default document templates', 'Prompt user to select document template'] }] }] },
  { id: 'fileLocations', label: 'File Locations', sections: [{ controls: [{ kind: 'select', key: 'files.showFoldersFor', label: 'Show folders for:', options: ['Document Templates', 'Referenced Documents', 'Blocks', 'Color Swatches', 'Custom Property Files', 'Design Library', 'Hole Wizard Favorites Database', 'Macros', 'Material Databases', 'Sheet Formats', 'Textures', 'Weldment Profiles'], inline: true }, { kind: 'text', key: 'files.folder', label: 'Folders:', browse: true }, { kind: 'button', label: 'Add...', action: 'addFolder' }, { kind: 'button', label: 'Delete', action: 'deleteFolder' }, { kind: 'button', label: 'Move Up', action: 'moveUp' }, { kind: 'button', label: 'Move Down', action: 'moveDown' }] }] },
  {
    id: 'featureManager',
    label: 'Feature Tree',
    sections: [
      {
        controls: [
          { kind: 'check', key: 'fm.scrollIntoView', label: 'Scroll selected item into view' },
          { kind: 'check', key: 'fm.nameOnCreation', label: 'Name feature on creation' },
          { kind: 'check', key: 'fm.arrowKeyNav', label: 'Arrow key navigation' },
          { kind: 'check', key: 'fm.dynamicHighlight', label: 'Dynamic highlight' },
          { kind: 'check', key: 'fm.transparentFlyout', label: 'Use transparent flyout Feature Tree tree in parts/assemblies' },
          { kind: 'check', key: 'fm.treeFilter', label: 'Enable Feature Tree tree filter' },
          { kind: 'check', key: 'fm.renameComponents', label: 'Allow component files to be renamed from Feature Tree tree' },
          { kind: 'check', key: 'fm.previewHidden', label: 'Enable preview of hidden components' },
          { kind: 'check', key: 'fm.slowDoubleClick', label: 'Edit name with slow double click' },
          { kind: 'check', key: 'fm.translatedNames', label: 'Show translated feature names in Feature Tree tree' },
        ],
      },
      { title: 'Comments', controls: [{ kind: 'check', key: 'fm.commentTimestamp', label: 'Automatically add timestamp to comments' }, { kind: 'check', key: 'fm.commentsInPM', label: 'Show Comments in Property Panel' }] },
      { title: 'Hide/show tree items', controls: [{ kind: 'treeItems', key: 'fm.tree', items: ['Blocks', 'Design Binder', 'Annotations', 'Solid Bodies', 'Surface Bodies', 'Tables', 'Favorites', 'eDrawing Markups', 'Selection Sets', 'Markups', 'Equations', 'Material', 'Default Planes', 'Origin', 'Mate References', 'Design Table', 'Sensors', 'History', 'Graphic Bodies'] }] },
    ],
  },
  { id: 'spinBox', label: 'Spin Box Increments', sections: [{ title: 'Length increments', controls: [{ kind: 'number', key: 'spin.lengthEnglish', label: 'English units:', unit: 'in', step: 0.01 }, { kind: 'number', key: 'spin.lengthMetric', label: 'Metric units:', unit: 'mm', step: 1 }] }, { controls: [{ kind: 'number', key: 'spin.angle', label: 'Angle increments:', unit: 'deg', step: 1 }, { kind: 'number', key: 'spin.time', label: 'Time increments:', unit: 's', step: 0.1 }] }] },
  {
    id: 'view',
    label: 'View',
    sections: [
      { controls: [{ kind: 'check', key: 'view.reverseWheel', label: 'Reverse mouse wheel zoom direction' }, { kind: 'check', key: 'view.zoomFitStandard', label: 'Zoom to fit when changing to standard views' }] },
      { title: 'View rotation', controls: [{ kind: 'number', key: 'view.arrowKeys', label: 'Arrow keys:', unit: 'deg', min: 1, max: 90 }, { kind: 'slider', key: 'view.mouseSpeed', label: 'Mouse speed:', min: 0, max: 100, left: 'Slow', right: 'Fast' }] },
      { title: 'Transitions', controls: [{ kind: 'slider', key: 'view.transitionView', label: 'View transition:', min: 0, max: 100, left: 'Off', right: 'Fast' }, { kind: 'slider', key: 'view.transitionHide', label: 'Hide/show component:', min: 0, max: 100, left: 'Off', right: 'Fast' }, { kind: 'slider', key: 'view.transitionIsolate', label: 'Isolate:', min: 0, max: 100, left: 'Off', right: 'Fast' }, { kind: 'slider', key: 'view.transitionSelector', label: 'View selector:', min: 0, max: 100, left: 'Off', right: 'Fast' }] },
    ],
  },
  {
    id: 'backup',
    label: 'Backup/Recover',
    sections: [
      { title: 'Auto-Recover', controls: [{ kind: 'check', key: 'backup.autoRecover', label: 'Save auto-recover info every' }, { kind: 'number', key: 'backup.autoRecoverMinutes', label: '', min: 1, max: 120, after: 'minutes', step: 1 }, { kind: 'text', key: 'backup.autoRecoverFolder', label: 'Auto-recover folder:', browse: true }] },
      { title: 'Backup', controls: [{ kind: 'check', key: 'backup.enabled', label: 'Number of backup copies per document:' }, { kind: 'number', key: 'backup.copies', label: '', min: 1, max: 10 }, { kind: 'text', key: 'backup.folder', label: 'Backup folder:', browse: true }, { kind: 'check', key: 'backup.sameLocation', label: 'Save backup files in the same location as the original' }, { kind: 'check', key: 'backup.removeOld', label: 'Remove backups older than' }, { kind: 'number', key: 'backup.removeDays', label: '', min: 1, max: 365, after: 'days' }] },
      { title: 'Save notification', controls: [{ kind: 'check', key: 'backup.saveNotify', label: 'Show reminder if document has not been saved for' }, { kind: 'number', key: 'backup.saveNotifyMinutes', label: '', min: 1, max: 120, after: 'minutes' }, { kind: 'number', key: 'backup.saveNotifySeconds', label: 'Automatically dismiss after', min: 1, max: 60, after: 'seconds' }] },
    ],
  },
  { id: 'touch', label: 'Touch', sections: [{ controls: [{ kind: 'check', key: 'touch.enable', label: 'Enable touch mode' }, { kind: 'radio', key: 'touch.hand', options: ['Left-handed', 'Right-handed'] }] }] },
  { id: 'holeWizard', label: 'Hole Wizard/Toolbox', sections: [{ controls: [{ kind: 'text', key: 'hw.folder', label: 'Hole Wizard and Toolbox folder:', browse: true }, { kind: 'button', label: 'Configure...', action: 'configureToolbox' }, { kind: 'check', key: 'hw.makeReadOnly', label: 'Make this folder the default search location for Toolbox components' }, { kind: 'check', key: 'hw.favorites', label: 'Show Toolbox Favorites folder' }] }] },
  { id: 'fileExplorer', label: 'File Explorer', sections: [{ title: 'Show in File Explorer view', controls: [{ kind: 'check', key: 'fe.recent', label: 'Recent Documents' }, { kind: 'check', key: 'fe.hidden', label: 'Hidden referenced documents' }, { kind: 'check', key: 'fe.samples', label: 'Samples' }, { kind: 'check', key: 'fe.restoreTree', label: 'Restore File Explorer on startup' }] }] },
  { id: 'search', label: 'Search', sections: [{ controls: [{ kind: 'check', key: 'search.indexing', label: 'Enable indexing of document metadata' }, { kind: 'select', key: 'search.webSearch', label: 'Web search engine:', options: ['Google', 'Bing', 'DuckDuckGo'], inline: true }, { kind: 'check', key: 'search.3dContent', label: 'Search 3D ContentCentral' }, { kind: 'check', key: 'search.showMissing', label: 'Always show search results in Task Pane' }] }] },
  { id: 'collaboration', label: 'Collaboration', sections: [{ controls: [{ kind: 'check', key: 'collab.multiUser', label: 'Enable multi-user environment' }, { kind: 'check', key: 'collab.addShortcut', label: 'Add shortcut menu items for multi-user environment', indent: 1 }, { kind: 'check', key: 'collab.checkWrite', label: 'Check if files opened read-only have been modified by other users', indent: 1 }, { kind: 'number', key: 'collab.checkInterval', label: 'Check files every', after: 'minutes', min: 1, max: 60 }, { kind: 'check', key: 'collab.commentIndicator', label: 'Note: Lightweight components will not be checked' }] }] },
  { id: 'messages', label: 'Messages/Errors/Warnings', sections: [{ controls: [{ kind: 'check', key: 'msg.showErrors', label: 'Show errors every rebuild' }, { kind: 'check', key: 'msg.treatMissingAsError', label: 'Treat missing mate references as errors' }, { kind: 'check', key: 'msg.warnRebuild', label: 'Warn before saving documents with update errors' }, { kind: 'check', key: 'msg.displayOverDefined', label: 'Display Feature Tree tree warnings:' }, { kind: 'select', key: 'msg.treeWarnings', label: '', options: ['Always', 'Never', 'All but top level'], inline: true }, { kind: 'check', key: 'msg.showToolbox', label: 'Show Toolbox message when the folder is not valid' }] }, { title: 'Dismissed messages', controls: [{ kind: 'note', text: 'Messages that were dismissed with "Don\'t show again" can be restored here.' }, { kind: 'button', label: 'Restore all dismissed messages', action: 'restoreMessages' }] }] },
  { id: 'import', label: 'Import', sections: [{ controls: [{ kind: 'select', key: 'import.format', label: 'File Format:', options: ['General', 'STL/OBJ/OFF/PLY/PLY2', 'STEP/IGES/ACIS', 'DXF/DWG'], inline: true }, { kind: 'radio', key: 'import.stlAs', options: ['Solid Body', 'Surface Body', 'Graphics Body'] }, { kind: 'select', key: 'import.units', label: 'Unit:', options: ['Millimeters', 'Centimeters', 'Meters', 'Inches', 'Feet'], inline: true }, { kind: 'check', key: 'import.runDiagnostics', label: 'Run Import Diagnostics (Healing)' }] }] },
  { id: 'export', label: 'Export', sections: [{ controls: [{ kind: 'select', key: 'export.format', label: 'File Format:', options: ['STL', 'STEP', 'IGES', 'DXF/DWG', 'PDF', '3MF'], inline: true }, { kind: 'radio', key: 'export.stlFormat', options: ['Binary', 'ASCII'] }, { kind: 'select', key: 'export.units', label: 'Unit:', options: ['Millimeters', 'Centimeters', 'Meters', 'Inches'], inline: true }, { kind: 'radio', key: 'export.resolution', options: ['Coarse', 'Fine', 'Custom'] }, { kind: 'check', key: 'export.showPreview', label: 'Show STL info before file saving' }, { kind: 'check', key: 'export.singleFile', label: 'Save all components of an assembly in a single file' }] }] },
];

export const DOCUMENT_CATEGORIES: Category[] = [
  { id: 'draftingStandard', label: 'Drafting Standard', sections: [{ controls: [{ kind: 'select', key: 'doc.standard', label: 'Overall drafting standard', options: ['ANSI', 'ISO', 'DIN', 'JIS', 'BSI', 'GOST', 'GB'], inline: true }, { kind: 'button', label: 'Rename', action: 'renameStd' }, { kind: 'button', label: 'Copy', action: 'copyStd' }, { kind: 'button', label: 'Delete', action: 'deleteStd' }, { kind: 'button', label: 'Load From External File...', action: 'loadStd' }, { kind: 'button', label: 'Save to External File...', action: 'saveStd' }] }, { title: 'Uppercase', controls: [{ kind: 'check', key: 'doc.upperNotes', label: 'All uppercase for notes' }, { kind: 'check', key: 'doc.upperTables', label: 'All uppercase for tables' }, { kind: 'check', key: 'doc.upperDims', label: 'All uppercase for dimensions and hole callouts' }, { kind: 'text', key: 'doc.exclusionList', label: 'Exclusion list:', placeholder: 'm;mm;cm;km;um;μm;nm;s;Hz;Pa;kPa;MPa;GPa;N;kN;mN;rad;deg;' }] }] },
  { id: 'annotations', label: 'Annotations', child: false, sections: [{ title: 'Overall drafting standard', controls: [{ kind: 'note', text: 'ISO' }] }, { title: 'Text', controls: [{ kind: 'select', key: 'doc.annotationFont', label: 'Font:', options: ['Century Gothic', 'Arial', 'ISOCPEUR'], inline: true }] }, { title: 'Attachments', controls: [{ kind: 'select', key: 'doc.attachEdge', label: 'Edge/vertex:', options: ['Filled arrow', 'Open arrow', 'Dot', 'None'], inline: true }, { kind: 'select', key: 'doc.attachFace', label: 'Face/surface:', options: ['Filled dot', 'Open dot', 'Filled arrow', 'None'], inline: true }, { kind: 'select', key: 'doc.attachUnattached', label: 'Unattached:', options: ['None', 'Filled arrow', 'Open arrow'], inline: true }] }, { title: 'Bent leaders', controls: [{ kind: 'check', key: 'doc.bentLeaders', label: 'Use bent leaders' }, { kind: 'number', key: 'doc.bentLeaderLength', label: 'Leader length:', unit: 'mm', step: 0.5 }] }, { controls: [{ kind: 'check', key: 'doc.leadingZeroes', label: 'Leading zeroes' }, { kind: 'check', key: 'doc.trailingZeroes', label: 'Trailing zeroes' }] }] },
  { id: 'dimensions', label: 'Dimensions', sections: [{ title: 'Text', controls: [{ kind: 'select', key: 'doc.dimFont', label: 'Font:', options: ['Century Gothic', 'Arial', 'ISOCPEUR'], inline: true }] }, { title: 'Dual dimensions', controls: [{ kind: 'check', key: 'doc.dualDims', label: 'Dual dimensions display' }, { kind: 'check', key: 'doc.dualUnitsInPlace', label: 'Show units for dual display' }, { kind: 'radio', key: 'doc.dualPosition', options: ['Top', 'Bottom', 'Right', 'Left'] }] }, { title: 'Primary precision', controls: [{ kind: 'select', key: 'doc.lengthDecimals', label: 'Length:', options: ['None', '.1', '.12', '.123', '.1234', '.12345', '.123456', '.1234567', '.12345678'], inline: true }, { kind: 'select', key: 'doc.toleranceDecimals', label: 'Tolerance:', options: ['Same as nominal', 'None', '.1', '.12', '.123'], inline: true }] }, { title: 'Fractional display', controls: [{ kind: 'radio', key: 'doc.fractionStyle', options: ['Style: Stack (1/2)', 'Style: Diagonal', 'Style: Horizontal'] }] }, { controls: [{ kind: 'select', key: 'doc.arrowStyle', label: 'Arrows:', options: ['Filled', 'Open', 'Dot', 'Slash'], inline: true }, { kind: 'number', key: 'doc.arrowHeight', label: 'Height:', unit: 'mm', step: 0.1 }, { kind: 'number', key: 'doc.arrowWidth', label: 'Width:', unit: 'mm', step: 0.1 }, { kind: 'number', key: 'doc.arrowLength', label: 'Length:', unit: 'mm', step: 0.1 }, { kind: 'check', key: 'doc.breakDimLines', label: 'Break dimension extension/leader lines' }, { kind: 'check', key: 'doc.extensionGap', label: 'Extension lines gap/beyond as drawing standard' }, { kind: 'number', key: 'doc.gap', label: 'Gap:', unit: 'mm', step: 0.1 }, { kind: 'number', key: 'doc.beyond', label: 'Beyond dimension line:', unit: 'mm', step: 0.1 }, { kind: 'select', key: 'doc.radialLeader', label: 'Radial/Diameter leader snap angle:', options: ['15', '30', '45'], inline: true }, { kind: 'check', key: 'doc.showUnits', label: 'Show units for dimension' }, { kind: 'check', key: 'doc.addParentheses', label: 'Add parentheses by default' }, { kind: 'check', key: 'doc.centerBetweenExt', label: 'Center between extension lines' }, { kind: 'check', key: 'doc.includePrefix', label: 'Include prefix inside basic tolerance box' }, { kind: 'check', key: 'doc.autoJog', label: 'Automatically jog ordinates' }, { kind: 'check', key: 'doc.showDimsAsFlat', label: 'Show dimensions as broken in broken views' }] }] },
  { id: 'virtualSharps', label: 'Virtual Sharps', sections: [{ title: 'Virtual sharp display', controls: [{ kind: 'radio', key: 'doc.virtualSharp', options: ['Plus', 'Star', 'Witness', 'Dot', 'None'] }] }] },
  { id: 'tables', label: 'Tables', sections: [{ title: 'Text', controls: [{ kind: 'select', key: 'doc.tableFont', label: 'Font:', options: ['Century Gothic', 'Arial'], inline: true }] }, { controls: [{ kind: 'select', key: 'doc.tableBorder', label: 'Border:', options: ['0.18mm', '0.25mm', '0.35mm', '0.5mm'], inline: true }, { kind: 'select', key: 'doc.tableGrid', label: 'Grid:', options: ['0.18mm', '0.25mm', '0.35mm'], inline: true }, { kind: 'check', key: 'doc.tableSplitDirection', label: 'Automatic split of tables' }] }] },
  { id: 'dimxpert', label: 'Auto Tolerancing', sections: [{ title: 'Methods', controls: [{ kind: 'radio', key: 'doc.dimxpertMethod', options: ['Block tolerance', 'General tolerance', 'Geometric tolerance'] }] }, { title: 'Block tolerance', controls: [{ kind: 'number', key: 'doc.blockLength1', label: 'Length unit dimensions, 1 decimal: ±', unit: 'mm', step: 0.01 }, { kind: 'number', key: 'doc.blockLength2', label: '2 decimals: ±', unit: 'mm', step: 0.01 }, { kind: 'number', key: 'doc.blockLength3', label: '3 decimals: ±', unit: 'mm', step: 0.001 }, { kind: 'number', key: 'doc.blockAngle', label: 'Angular dimensions: ±', unit: 'deg', step: 0.1 }] }] },
  { id: 'detailing', label: 'Detailing', sections: [{ title: 'Display filter', controls: [{ kind: 'check', key: 'doc.detCosmeticThreads', label: 'Cosmetic threads' }, { kind: 'check', key: 'doc.detDatums', label: 'Datums' }, { kind: 'check', key: 'doc.detDatumTargets', label: 'Datum targets' }, { kind: 'check', key: 'doc.detFeatureDims', label: 'Feature dimensions' }, { kind: 'check', key: 'doc.detRefDims', label: 'Reference dimensions' }, { kind: 'check', key: 'doc.detDimXpert', label: 'Auto Tolerancing dimensions' }, { kind: 'check', key: 'doc.detGtol', label: 'Geometric tolerances' }, { kind: 'check', key: 'doc.detNotes', label: 'Notes' }, { kind: 'check', key: 'doc.detSurfaceFinish', label: 'Surface finish' }, { kind: 'check', key: 'doc.detWelds', label: 'Welds' }, { kind: 'check', key: 'doc.detDisplayAll', label: 'Display all types' }] }, { title: 'Text scale', controls: [{ kind: 'select', key: 'doc.textScale', label: '', options: ['1:1', '1:2', '2:1', '1:5', '5:1'], inline: true }, { kind: 'check', key: 'doc.textSameSize', label: 'Always display text at the same size' }, { kind: 'check', key: 'doc.displayItemsOnlyInView', label: 'Display items only in the view in which they are created' }, { kind: 'check', key: 'doc.displayAnnotations', label: 'Display annotations' }, { kind: 'check', key: 'doc.useAssemblySetting', label: 'Use assembly setting for all components' }, { kind: 'check', key: 'doc.hideDanglingDims', label: 'Hide dangling dimensions and annotations' }, { kind: 'check', key: 'doc.useModelColor', label: 'Use model color for HLR/HLV in drawings' }] }] },
  { id: 'gridSnap', label: 'Grid/Snap', sections: [{ title: 'Grid', controls: [{ kind: 'check', key: 'doc.displayGrid', label: 'Display grid' }, { kind: 'check', key: 'doc.gridDash', label: 'Dash' }, { kind: 'check', key: 'doc.gridAutoScale', label: 'Automatic scaling' }, { kind: 'number', key: 'doc.gridMajor', label: 'Major grid spacing:', unit: 'mm', step: 1, min: 0.1 }, { kind: 'number', key: 'doc.gridMinor', label: 'Minor-lines per major:', min: 1, max: 20 }, { kind: 'number', key: 'doc.gridSnapPoints', label: 'Snap points per minor:', min: 1, max: 10 }, { kind: 'button', label: 'Go To System Snaps', action: 'goSnaps' }] }] },
  { id: 'units', label: 'Units', sections: [{ title: 'Unit system', controls: [{ kind: 'radio', key: 'doc.unitSystem', options: ['MKS (meter, kilogram, second)', 'CGS (centimeter, gram, second)', 'MMGS (millimeter, gram, second)', 'IPS (inch, pound, second)', 'Custom'] }] }, { title: 'Basic Units', controls: [{ kind: 'select', key: 'doc.lengthUnit', label: 'Length:', options: ['millimeters', 'centimeters', 'meters', 'inches', 'feet', 'microns', 'nanometers'], inline: true }, { kind: 'select', key: 'doc.lengthDecimals', label: 'Decimals:', options: ['None', '.1', '.12', '.123', '.1234', '.12345', '.123456', '.1234567', '.12345678'], inline: true }, { kind: 'select', key: 'doc.dualLengthUnit', label: 'Dual Dimension Length:', options: ['inches', 'millimeters', 'centimeters', 'meters'], inline: true }, { kind: 'select', key: 'doc.angleUnit', label: 'Angle:', options: ['degrees', 'deg/min', 'deg/min/sec', 'radians'], inline: true }, { kind: 'select', key: 'doc.angleDecimals', label: 'Angle decimals:', options: ['None', '.1', '.12', '.123', '.1234'], inline: true }] }, { title: 'Mass/Section Properties', controls: [{ kind: 'select', key: 'doc.massLengthUnit', label: 'Length:', options: ['millimeters', 'centimeters', 'meters', 'inches'], inline: true }, { kind: 'select', key: 'doc.massUnit', label: 'Mass:', options: ['grams', 'kilograms', 'pounds'], inline: true }, { kind: 'select', key: 'doc.volumeUnit', label: 'Per Unit Volume:', options: ['millimeters^3', 'centimeters^3', 'meters^3', 'inches^3'], inline: true }] }, { title: 'Motion Units', controls: [{ kind: 'select', key: 'doc.timeUnit', label: 'Time:', options: ['second', 'minute'], inline: true }, { kind: 'select', key: 'doc.forceUnit', label: 'Force:', options: ['newton', 'kilonewton', 'pound-force'], inline: true }, { kind: 'select', key: 'doc.powerUnit', label: 'Power:', options: ['watt', 'kilowatt', 'horsepower'], inline: true }, { kind: 'select', key: 'doc.energyUnit', label: 'Energy:', options: ['joule', 'kilojoule', 'BTU'], inline: true }] }, { title: 'Decimal rounding', controls: [{ kind: 'radio', key: 'doc.rounding', options: ['Round half away from zero', 'Round half towards zero', 'Round half to even', 'Truncate without rounding'] }, { kind: 'check', key: 'doc.roundingOnlyDims', label: 'Only apply rounding method to dimensions' }] }] },
  { id: 'modelDisplay', label: 'Model Display', sections: [{ title: 'Model / feature colors', controls: [{ kind: 'colors', key: 'doc.modelColors' }, { kind: 'check', key: 'doc.sameColorAllModes', label: 'Apply same color to wireframe, HLR and shaded' }, { kind: 'check', key: 'doc.ignoreFeatureColors', label: 'Ignore feature colors' }, { kind: 'button', label: 'Go To System Colors', action: 'goSystemColors' }] }, { controls: [{ kind: 'check', key: 'doc.storeAppearance', label: 'Store appearance, decal and scene data in model file' }, { kind: 'check', key: 'doc.autoScaleTextures', label: 'Automatically scale appearance textures, surface finishes, and decals to the model size' }, { kind: 'number', key: 'doc.cartoonThickness', label: 'Cartoon edge thickness:', min: 1, max: 5 }] }] },
  { id: 'materialProperties', label: 'Material Properties', sections: [{ title: 'Material', controls: [{ kind: 'number', key: 'doc.density', label: 'Density:', unit: 'g/mm^3', step: 0.001 }] }, { title: 'Area hatch/fill', controls: [{ kind: 'radio', key: 'doc.hatchKind', options: ['None', 'Solid', 'Hatch'] }, { kind: 'select', key: 'doc.hatchPattern', label: 'Pattern:', options: ['ISO (Steel)', 'ANSI31 (Iron BrickStone)', 'ANSI32 (Steel)', 'ANSI33 (Bronze Brass Copper)', 'ANSI34 (Plastic Rubber)', 'ANSI35 (Fire Brick Refractory)'], inline: true }, { kind: 'number', key: 'doc.hatchScale', label: 'Scale:', step: 0.5 }, { kind: 'number', key: 'doc.hatchAngle', label: 'Angle:', unit: 'deg' }] }] },
  { id: 'imageQuality', label: 'Image Quality', sections: [{ title: 'Shaded and draft quality HLR/HLV resolution', controls: [{ kind: 'slider', key: 'doc.shadedQuality', label: '', min: 0, max: 100, left: 'Low (faster)', right: 'High (slower)' }, { kind: 'number', key: 'doc.deviation', label: 'Deviation:', unit: 'mm', step: 0.001 }, { kind: 'check', key: 'doc.optimizeEdgeLength', label: 'Optimize edge length (higher quality, but slower)' }, { kind: 'check', key: 'doc.applyToAll', label: 'Apply to all referenced part documents' }, { kind: 'check', key: 'doc.saveTessellation', label: 'Save tessellation with part document' }] }, { title: 'Wireframe and high quality HLR/HLV resolution', controls: [{ kind: 'slider', key: 'doc.wireframeQuality', label: '', min: 0, max: 100, left: 'Low (faster)', right: 'High (slower)' }] }, { controls: [{ kind: 'check', key: 'doc.preciselyRenderOverlapping', label: 'Precisely render overlapping geometry (higher quality, but slower)' }, { kind: 'check', key: 'doc.improveCurveQuality', label: 'Improve curve quality at higher settings' }, { kind: 'check', key: 'doc.isometricPreview', label: 'Use isometric, zoom to fit view for document preview' }, { kind: 'check', key: 'doc.previewLightweight', label: 'Use pre-2009 tangent edge definition' }] }] },
  { id: 'sheetMetal', label: 'Sheet Metal', sections: [{ title: 'Flat pattern options', controls: [{ kind: 'check', key: 'doc.smSimplifyBends', label: 'Simplify bends' }, { kind: 'check', key: 'doc.smCornerTreatment', label: 'Corner treatment' }, { kind: 'check', key: 'doc.smMergeFaces', label: 'Merge faces' }, { kind: 'check', key: 'doc.smShowFixedFace', label: 'Show fixed face' }, { kind: 'check', key: 'doc.smShowGrainDirection', label: 'Show grain direction' }] }, { title: 'Flat pattern colors', controls: [{ kind: 'colors', key: 'doc.smColors' }] }] },
  { id: 'weldments', label: 'Weldments', sections: [{ controls: [{ kind: 'check', key: 'doc.weldCreateCutLists', label: 'Create cut lists automatically' }, { kind: 'check', key: 'doc.weldUpdateCutLists', label: 'Automatically update cut lists (may be slow for complex models)' }, { kind: 'check', key: 'doc.weldRenameCutLists', label: 'Rename cut list folders with Description property value' }, { kind: 'check', key: 'doc.weldCollectIdentical', label: 'Collect identical bodies' }, { kind: 'check', key: 'doc.weldBoundingBox', label: 'Create bounding box cut list properties' }] }, { title: 'Cut list options', controls: [{ kind: 'select', key: 'doc.weldSort', label: 'Sort cut list by:', options: ['Order of creation', 'Description', 'Length'], inline: true }] }] },
  { id: 'planeDisplay', label: 'Plane Display', sections: [{ title: 'Faces', controls: [{ kind: 'colors', key: 'doc.planeColors' }, { kind: 'slider', key: 'doc.planeTransparency', label: 'Transparency:', min: 0, max: 100, left: '0%', right: '100%' }] }, { title: 'Intersections', controls: [{ kind: 'check', key: 'doc.planeIntersections', label: 'Show intersections' }, { kind: 'button', label: 'Line Color...', action: 'planeLineColor' }] }] },
  { id: 'configurations', label: 'Configurations', sections: [{ controls: [{ kind: 'check', key: 'doc.configRebuildOnActivate', label: 'Rebuild on activation of configuration' }, { kind: 'check', key: 'doc.configAddRebuild', label: 'Add Rebuild/Save Mark to new configurations' }, { kind: 'check', key: 'doc.configPurge', label: 'Automatically purge configuration data' }] }] },
  { id: 'mates', label: 'Mates', sections: [{ title: 'Default mate alignment', controls: [{ kind: 'radio', key: 'doc.mateAlignment', options: ['Aligned', 'Anti-Aligned', 'Closest'] }] }, { controls: [{ kind: 'check', key: 'doc.mateShowPopup', label: 'Show popup dialog' }, { kind: 'check', key: 'doc.mateShowPreview', label: 'Show preview' }, { kind: 'check', key: 'doc.mateUseForPositioning', label: 'Use for positioning only' }, { kind: 'check', key: 'doc.mateMakeFirstFixed', label: 'Make first component fixed' }] }] },
  { id: 'docPerformance', label: 'Performance', sections: [{ controls: [{ kind: 'check', key: 'doc.perfVerification', label: 'Verification on rebuild' }, { kind: 'slider', key: 'doc.perfImageQuality', label: 'Image quality:', min: 0, max: 100, left: 'Low', right: 'High' }, { kind: 'check', key: 'doc.perfUseLightweight', label: 'Use Large Design Review' }] }] },
];

/** Factory defaults (the originals where the help states them). */
export const DEFAULT_PREFS: Record<string, PrefValue> = {
  'general.recentMax': 50, 'general.includeOpenedFromOthers': false, 'general.openLastAtStartup': 'Never', 'general.inputDimensionValue': true, 'general.singleCommandPerPick': true, 'general.thumbnails': true,
  'general.systemSeparator': true, 'general.separator': '.', 'general.englishMenus': false, 'general.englishNames': false, 'general.confirmationCorner': true, 'general.autoShowPM': true, 'general.autoSizePM': true, 'general.editMacro': false,
  'general.stopDebugger': true, 'general.featureXpert': true, 'general.freezeBar': false, 'general.rebuildError': 'Prompt', 'general.componentDescription': 'Description', 'general.technicalAlerts': true,
  'general.checkSolutions': true, 'general.sounds': false, 'general.cosmeticThreads': false, 'general.sendLogs': false,
  'mbd.autoShow': true, 'mbd.hideWhenRotating': false,
  'drawings.eliminateDuplicate': true, 'drawings.eliminateDuplicateNotes': true, 'drawings.markDimsForDrawing': true, 'drawings.autoScale': true, 'drawings.showContentsWhileDragging': true, 'drawings.smoothDynamicMotion': true, 'drawings.printOutOfSync': true, 'drawings.showRefGeomNames': false, 'drawings.autoHideComponents': false, 'drawings.showSketchArcCenterpoints': true, 'drawings.showSketchEntityPoints': true, 'drawings.disableNoteTextWrap': false,
  'drawings.displayStyle': 'Hidden lines removed', 'drawings.tangentEdges': 'Visible', 'drawings.quality': 'High quality', 'drawings.hatch': 'Hatch', 'drawings.hatchPattern': 'ISO (Steel)', 'drawings.hatchScale': 1, 'drawings.hatchAngle': 0, 'drawings.perf.detailedPreview': true, 'drawings.perf.includeHidden': false,
  'colors.iconColors': 'Default', 'colors.background': 'Light', 'colors.scheme': 'Blue', 'colors.defaultAppearance': 'color', 'colors.defaultScene': '3 point faded', 'colors.backgroundAppearance': 'Use document scene background', 'colors.drawingsPaper': false, 'colors.shadedWithEdges': false, 'colors.editParts': true, 'colors.changedDims': false, 'colors.envelopes': 'Semi Transparent',
  'sketch.autoRotate': true, 'sketch.fullyDefined': false, 'sketch.arcCenterpoints': true, 'sketch.entityPoints': true, 'sketch.promptClose': true, 'sketch.sketchOnNewPart': false, 'sketch.overrideDims': false, 'sketch.displayPlaneShaded': true, 'sketch.virtualSharps': true, 'sketch.splineHandles': true, 'sketch.splinePolygon': false, 'sketch.ghostImage': true, 'sketch.curvatureComb': true, 'sketch.numericInput': false, 'sketch.numericInputOnlyValue': false, 'sketch.previewDim': true, 'sketch.promptDriven': true, 'sketch.setDrivenDefault': true, 'sketch.autoSolveThreshold': 2000,
  'snaps.enableSnapping': true, 'snaps.modelGeometry': true, 'snaps.automaticRelations': true, 'snaps.endPoints': true, 'snaps.centerPoints': true, 'snaps.midPoints': true, 'snaps.quadrantPoints': true, 'snaps.intersections': true, 'snaps.nearest': true, 'snaps.tangent': true, 'snaps.perpendicular': true, 'snaps.parallel': true, 'snaps.hv': true, 'snaps.hvPoints': true, 'snaps.length': true, 'snaps.grid': false, 'snaps.gridOnlyWhenDisplayed': true, 'snaps.angle': true, 'snaps.snapAngle': 45,
  'display.hiddenEdges': 'Solid', 'display.tangentEdges': 'As visible', 'display.edgeMode': 'HLR', 'display.optimizeThin': false, 'display.assemblyTransparency': 'Opaque assembly', 'display.transparencyLevel': 75, 'display.antialias': 'Anti-alias edges/sketches', 'display.shadedFaceHighlighting': true, 'display.highlightAllEdges': false, 'display.dynamicHighlight': true, 'display.tempAxes': true, 'display.openEdges': false, 'display.shadedPlanes': true, 'display.dimsFlat': true, 'display.dimXpertOnTop': true, 'display.notesFlat': true, 'display.refTriad': true, 'display.scrollbars': false, 'display.draftQualityHLR': false, 'display.patternPreview': true, 'display.breadcrumbs': true, 'display.breadcrumbsAtCursor': false, 'display.projection': 'Third angle',
  'selection.bulk': 'Box', 'selection.wireframeHLV': true, 'selection.hlrShaded': false, 'selection.throughTransparency': true, 'selection.smallFace': false,
  'perf.verification': false, 'perf.ignoreSelfIntersect': false, 'perf.hqNormal': true, 'perf.hqDynamic': false, 'perf.curvature': 'Only on demand', 'perf.levelOfDetail': 50, 'perf.assemblyLoading': 'Automatically optimize resolved mode, hide lightweight mode', 'perf.loadLightweight': false, 'perf.resolveSub': true, 'perf.checkOutOfDate': "Don't Check", 'perf.resolveLightweight': 'Prompt', 'perf.rebuildOnLoad': 'Prompt', 'perf.mateAnimation': 50, 'perf.smartMate': 50, 'perf.magnifiedSelection': true, 'perf.purgeUnused': false, 'perf.updateMass': false, 'perf.shadedPreview': true, 'perf.softwareOpenGL': false, 'perf.noPreviewHidden': false,
  'asm.moveByDragging': true, 'asm.promptNewComponent': true, 'asm.optimizeImage': false, 'asm.saveNewComponents': false, 'asm.updateModelGraphics': true, 'asm.allowSaveReferenced': true, 'asm.largeAssembly': true, 'asm.largeThreshold': 500, 'asm.largeHideAll': true, 'asm.largeNoEdges': true, 'asm.largeSuspendRebuild': true, 'asm.largeDisableVerification': true, 'asm.envelopeAutomatic': true,
  'ext.openReadOnly': false, 'ext.dontPrompt': false, 'ext.allowMultiple': false, 'ext.loadDocs': 'Prompt', 'ext.searchLocations': true, 'ext.updateOutOfDate': false, 'ext.automaticallyGenerate': true, 'ext.updateComponentNames': true, 'ext.includeDrawings': false,
  'templates.part': 'Part.prtdot', 'templates.assembly': 'Assembly.asmdot', 'templates.drawing': 'Drawing.drwdot', 'templates.mode': 'Always use these default document templates',
  'files.showFoldersFor': 'Document Templates', 'files.folder': 'C:\\ProgramData\\PhlippoCAD\\templates',
  'fm.scrollIntoView': true, 'fm.nameOnCreation': false, 'fm.arrowKeyNav': false, 'fm.dynamicHighlight': true, 'fm.transparentFlyout': true, 'fm.treeFilter': true, 'fm.renameComponents': false, 'fm.previewHidden': true, 'fm.slowDoubleClick': true, 'fm.translatedNames': false, 'fm.commentTimestamp': true, 'fm.commentsInPM': true,
  'spin.lengthEnglish': 0.1, 'spin.lengthMetric': 10, 'spin.angle': 1, 'spin.time': 0.1,
  'view.reverseWheel': false, 'view.zoomFitStandard': false, 'view.arrowKeys': 15, 'view.mouseSpeed': 50, 'view.transitionView': 50, 'view.transitionHide': 50, 'view.transitionIsolate': 50, 'view.transitionSelector': 50,
  'backup.autoRecover': true, 'backup.autoRecoverMinutes': 10, 'backup.autoRecoverFolder': '%LOCALAPPDATA%\\PhlippoCAD\\backup', 'backup.enabled': false, 'backup.copies': 1, 'backup.folder': '%LOCALAPPDATA%\\PhlippoCAD\\backup', 'backup.sameLocation': false, 'backup.removeOld': true, 'backup.removeDays': 7, 'backup.saveNotify': false, 'backup.saveNotifyMinutes': 20, 'backup.saveNotifySeconds': 5,
  'touch.enable': false, 'touch.hand': 'Right-handed',
  'hw.folder': 'C:\\PhlippoCAD Data', 'hw.makeReadOnly': true, 'hw.favorites': true,
  'fe.recent': true, 'fe.hidden': true, 'fe.samples': true, 'fe.restoreTree': true,
  'search.indexing': true, 'search.webSearch': 'Google', 'search.3dContent': true, 'search.showMissing': false,
  'collab.multiUser': false, 'collab.addShortcut': false, 'collab.checkWrite': false, 'collab.checkInterval': 10, 'collab.commentIndicator': false,
  'msg.showErrors': true, 'msg.treatMissingAsError': true, 'msg.warnRebuild': true, 'msg.displayOverDefined': true, 'msg.treeWarnings': 'Always', 'msg.showToolbox': true,
  'import.format': 'General', 'import.stlAs': 'Solid Body', 'import.units': 'Millimeters', 'import.runDiagnostics': false,
  'export.format': 'STL', 'export.stlFormat': 'Binary', 'export.units': 'Millimeters', 'export.resolution': 'Fine', 'export.showPreview': true, 'export.singleFile': true,
  // document properties
  'doc.standard': 'ISO', 'doc.upperNotes': false, 'doc.upperTables': false, 'doc.upperDims': false, 'doc.exclusionList': '',
  'doc.annotationFont': 'Century Gothic', 'doc.attachEdge': 'Filled arrow', 'doc.attachFace': 'Filled dot', 'doc.attachUnattached': 'None', 'doc.bentLeaders': true, 'doc.bentLeaderLength': 6.35, 'doc.leadingZeroes': true, 'doc.trailingZeroes': true,
  'doc.dimFont': 'Century Gothic', 'doc.dualDims': false, 'doc.dualUnitsInPlace': false, 'doc.dualPosition': 'Bottom', 'doc.lengthDecimals': '.12', 'doc.toleranceDecimals': 'Same as nominal', 'doc.fractionStyle': 'Style: Stack (1/2)', 'doc.arrowStyle': 'Filled', 'doc.arrowHeight': 1, 'doc.arrowWidth': 3, 'doc.arrowLength': 6, 'doc.breakDimLines': false, 'doc.extensionGap': true, 'doc.gap': 1, 'doc.beyond': 2, 'doc.radialLeader': '15', 'doc.showUnits': false, 'doc.addParentheses': true, 'doc.centerBetweenExt': false, 'doc.includePrefix': true, 'doc.autoJog': true, 'doc.showDimsAsFlat': false,
  'doc.virtualSharp': 'Plus', 'doc.tableFont': 'Century Gothic', 'doc.tableBorder': '0.18mm', 'doc.tableGrid': '0.18mm', 'doc.tableSplitDirection': false,
  'doc.dimxpertMethod': 'Block tolerance', 'doc.blockLength1': 0.5, 'doc.blockLength2': 0.25, 'doc.blockLength3': 0.1, 'doc.blockAngle': 0.5,
  'doc.detCosmeticThreads': true, 'doc.detDatums': true, 'doc.detDatumTargets': true, 'doc.detFeatureDims': true, 'doc.detRefDims': true, 'doc.detDimXpert': true, 'doc.detGtol': true, 'doc.detNotes': true, 'doc.detSurfaceFinish': true, 'doc.detWelds': true, 'doc.detDisplayAll': false, 'doc.textScale': '1:1', 'doc.textSameSize': true, 'doc.displayItemsOnlyInView': true, 'doc.displayAnnotations': true, 'doc.useAssemblySetting': false, 'doc.hideDanglingDims': false, 'doc.useModelColor': false,
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

export function loadPrefs(): Record<string, PrefValue> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) current = { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Record<string, PrefValue>) };
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
