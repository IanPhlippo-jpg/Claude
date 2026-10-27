/**
 * Every feature type a document may contain (the `type` field of the Feature union in types.ts). A file with any
 * other type is refused on opening (QA v0.3.4 F80); `featureTypes.test.ts` keeps this list in step with the union.
 */
export const FEATURE_TYPES: ReadonlySet<string> = new Set([
  'baseFlange', 'belt', 'chamfer', 'circularPattern', 'closedCorner', 'combine', 'convertSheet', 'cornerRelief', 'crossBreak',
  'curvePattern', 'deform', 'deleteBody', 'deleteFace', 'draft', 'edgeFlange', 'endCap', 'extrude', 'fillPattern', 'fillet',
  'flatPattern', 'fold', 'formTool', 'gusset', 'helix', 'hem', 'hole', 'imported', 'intersect', 'jog', 'linearPattern', 'loft',
  'loftedBend', 'mirror', 'miterFlange', 'moveBody', 'projectedCurve', 'revolve', 'rib', 'rip', 'shell', 'sketch', 'sketch3d',
  'sketchPattern', 'sketchedBend', 'splitLine', 'structuralMember', 'stud', 'surface', 'sweep', 'sweptFlange', 'tabSlot',
  'tablePattern', 'thread', 'trimExtend', 'unfold', 'variablePattern', 'vent', 'weldBead', 'weldGusset', 'weldment', 'wrap',
]);

/** the point-id fields of each sketch entity kind (a missing point makes the entity unbuildable) */
export const ENTITY_POINT_FIELDS: Record<string, readonly string[]> = {
  point: ['p'],
  line: ['p1', 'p2'],
  circle: ['center'],
  arc: ['center', 'start', 'end'],
  ellipse: ['center', 'major'],
  ellipseArc: ['center', 'major', 'start', 'end'],
  conic: ['start', 'end', 'control'],
  text: ['anchor'],
  spline: [],
};

/** the scalar-id fields (radii) of each sketch entity kind */
export const ENTITY_SCALAR_FIELDS: Record<string, readonly string[]> = { circle: ['r'], arc: ['r'], ellipse: ['r2'], ellipseArc: ['r2'] };
