import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, savePrefs, type PrefValue } from './prefs';
import { annotationFont, arrowSize, decimalSeparator, defaultArrowStyle, defaultDensity, dimFontFamily, docVolumeUnit, formatAngle, formatNumber, hatchSpec, massDocUnits, noteText, roundValue, tableFont, tableLine, tableText, uppercaseDims, withDual } from './prefsFormat';
import { dimensionDrawing } from './viewport/annotations';
import { addCircle, addConstraint, addLine, createSketch } from '../core/sketch/model';
import { dimensionText } from '../core/drawing/dimtext';
import type { DrawingDimension } from '../core/document/types';

// QA v0.5.11 F112: every option of Units / Dimensions / Annotations that the program reads changes the dimension
// text or the number format. Each test sets the option and compares with the default.
const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, ...o });
afterEach(() => use());

/** a line of 80 mm with a length dimension, a circle of R15 with a diameter dimension */
function sketch(extra: Record<string, unknown> = {}) {
  let s = createSketch('s', 'S');
  let l, c;
  [s, l] = addLine(s, { x: 0, y: 0 }, { x: 80, y: 0 });
  [s, c] = addCircle(s, { x: 0, y: 40 }, 15);
  let d1, d2;
  [s, d1] = addConstraint(s, 'length', [l.id], { value: 80, ...extra });
  [s, d2] = addConstraint(s, 'diameter', [c.id], { value: 30 });
  return { s, d1, d2 };
}
const text = (o: Record<string, PrefValue> = {}, extra: Record<string, unknown> = {}, driven = false) => {
  use(o);
  const { s, d1 } = sketch(extra);
  return dimensionDrawing(s, d1, 'mm', driven)!.text;
};

describe('number format of dimensions', () => {
  it('doc.lengthDecimals: the decimals of a length', () => {
    expect(text()).toBe('80.00');
    expect(text({ 'doc.lengthDecimals': '.1234' })).toBe('80.0000');
    expect(text({ 'doc.lengthDecimals': 'None' })).toBe('80');
  });
  it('doc.trailingZeroes: off drops the zeros after the point', () => {
    expect(text({ 'doc.trailingZeroes': false })).toBe('80');
    use();
    expect(formatNumber(12.5, 2)).toBe('12.50');
    use({ 'doc.trailingZeroes': false });
    expect(formatNumber(12.5, 2)).toBe('12.5');
  });
  it('doc.leadingZeroes: off drops the zero before the point', () => {
    expect(formatNumber(0.5, 2)).toBe('0.50');
    use({ 'doc.leadingZeroes': false });
    expect(formatNumber(0.5, 2)).toBe('.50');
    expect(formatNumber(-0.5, 2)).toBe('-.50');
  });
  it('general.systemSeparator and general.separator: the decimal separator', () => {
    use({ 'general.separator': ',' });
    expect(decimalSeparator()).toBe('.');
    expect(text({ 'general.systemSeparator': false, 'general.separator': ',' })).toBe('80,00');
    expect(text({ 'general.systemSeparator': false, 'general.separator': '.' })).toBe('80.00');
  });
  it('doc.rounding: the four rounding methods', () => {
    expect(roundValue(2.345, 2)).toBeCloseTo(2.35);
    use({ 'doc.rounding': 'Round half towards zero' });
    expect(roundValue(2.345, 2)).toBeCloseTo(2.34);
    use({ 'doc.rounding': 'Round half to even' });
    expect(roundValue(2.345, 2)).toBeCloseTo(2.34);
    expect(roundValue(2.355, 2)).toBeCloseTo(2.36);
    use({ 'doc.rounding': 'Truncate without rounding' });
    expect(roundValue(2.349, 2)).toBeCloseTo(2.34);
    expect(formatNumber(2.349, 2)).toBe('2.34');
  });
  it('doc.roundingOnlyDims: on, values outside dimensions (Mass Properties) round half away from zero', () => {
    use({ 'doc.rounding': 'Truncate without rounding' });
    expect(formatNumber(2.349, 2, false)).toBe('2.34');
    use({ 'doc.rounding': 'Truncate without rounding', 'doc.roundingOnlyDims': true });
    expect(formatNumber(2.349, 2, false)).toBe('2.35');
    expect(formatNumber(2.349, 2, true)).toBe('2.34');
  });
  it('doc.angleUnit and doc.angleDecimals: the angle text', () => {
    expect(formatAngle(30.25)).toBe('30.25°');
    use({ 'doc.angleDecimals': '.1' });
    expect(formatAngle(30.25)).toBe('30.3°');
    use({ 'doc.angleUnit': 'deg/min' });
    expect(formatAngle(30.25)).toBe("30°15'");
    use({ 'doc.angleUnit': 'deg/min/sec' });
    expect(formatAngle(30.2525)).toBe('30°15\'9"');
    use({ 'doc.angleUnit': 'radians' });
    expect(formatAngle(90)).toBe('1.57rad');
  });
});

describe('dimension text options', () => {
  it('doc.showUnits: the length unit after the value', () => {
    expect(text({ 'doc.showUnits': true })).toBe('80.00mm');
    use({ 'doc.showUnits': true });
    const { s, d2 } = sketch();
    expect(dimensionDrawing(s, d2, 'mm', false)!.text).toBe('Ø30.00mm');
  });
  it('doc.addParentheses: a driven dimension in brackets, or not', () => {
    expect(text({}, {}, true)).toBe('(80.00)');
    expect(text({ 'doc.addParentheses': false }, {}, true)).toBe('80.00');
  });
  it('doc.toleranceDecimals: the precision of a tolerance', () => {
    const tol = { tol: { type: 'symmetric', plus: 0.05 } };
    expect(text({}, tol)).toBe('80.00 ±0.05');
    expect(text({ 'doc.toleranceDecimals': '.1' }, tol)).toBe('80.00 ±0.1');
    expect(text({ 'doc.toleranceDecimals': '.123' }, tol)).toBe('80.00 ±0.050');
  });
  it('doc.dualDims, doc.dualLengthUnit, doc.dualUnitsInPlace, doc.dualPosition: the second value', () => {
    expect(text()).toBe('80.00');
    expect(text({ 'doc.dualDims': true })).toBe('80.00\n[3.150]');
    expect(text({ 'doc.dualDims': true, 'doc.dualPosition': 'Right' })).toBe('80.00 [3.150]');
    expect(text({ 'doc.dualDims': true, 'doc.dualPosition': 'Left' })).toBe('[3.150] 80.00');
    expect(text({ 'doc.dualDims': true, 'doc.dualPosition': 'Top' })).toBe('[3.150]\n80.00');
    expect(text({ 'doc.dualDims': true, 'doc.dualPosition': 'Right', 'doc.dualLengthUnit': 'centimeters' })).toBe('80.00 [8.000]');
    expect(text({ 'doc.dualDims': true, 'doc.dualPosition': 'Right', 'doc.dualUnitsInPlace': true })).toBe('80.00 [3.150in]');
    use({ 'doc.dualPosition': 'Right' });
    expect(withDual('80.00', 80, 2, true)).toBe('80.00 [3.150]');
  });
  it('doc.upperDims and doc.exclusionList: capitals, the listed units kept', () => {
    expect(uppercaseDims('80 mm thru')).toBe('80 mm thru');
    use({ 'doc.upperDims': true });
    expect(uppercaseDims('80 mm thru')).toBe('80 mm THRU');
    use({ 'doc.upperDims': true, 'doc.exclusionList': 'thru' });
    expect(uppercaseDims('80 mm thru')).toBe('80 MM thru');
    expect(text({ 'doc.upperDims': true, 'doc.showUnits': true, 'doc.exclusionList': 'thru' })).toBe('80.00MM');
    expect(text({ 'doc.upperDims': true, 'doc.showUnits': true })).toBe('80.00mm');
  });
  it('doc.arrowStyle: the arrows of a dimension without a style of its own', () => {
    use();
    const { s, d1 } = sketch();
    expect(dimensionDrawing(s, d1, 'mm', false)!.arrowStyle).toBe('filled');
    use({ 'doc.arrowStyle': 'Open' });
    expect(dimensionDrawing(s, d1, 'mm', false)!.arrowStyle).toBe('open');
    expect(defaultArrowStyle()).toBe('open');
    use({ 'doc.arrowStyle': 'Slash' });
    expect(defaultArrowStyle()).toBe('slash');
  });
  it('doc.arrowHeight, doc.arrowWidth, doc.arrowLength: the arrow head and the outside stub', () => {
    expect(arrowSize(8)).toEqual({ length: 8, halfWidth: 8 * 0.35, stubScale: 1 });
    use({ 'doc.arrowHeight': 2, 'doc.arrowWidth': 6, 'doc.arrowLength': 12 });
    expect(arrowSize(8)).toEqual({ length: 16, halfWidth: 8 * 0.7, stubScale: 2 });
    // arrows outside: the stub grows with the Length option
    const stub = (o: Record<string, PrefValue>) => { use(o); const { s, d1 } = sketch({ arrows: 'outside' }); const l = dimensionDrawing(s, d1, 'mm', false)!.lines.find((x) => x.arrowA && !x.arrowB)!; return Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y); };
    expect(stub({ 'doc.arrowLength': 12 })).toBeCloseTo(2 * stub({}));
  });
  it('doc.dimFont: the font of the dimension text', () => {
    expect(dimFontFamily()).toContain("'Century Gothic'");
    use({ 'doc.dimFont': 'Arial' });
    expect(dimFontFamily()).toMatch(/^'Arial'/);
  });
});

describe('drawing dimensions and Mass Properties', () => {
  const dd = { id: 'd', viewId: 'v', kind: 'linear', a: [0, 0], b: [10, 0], label: [5, 5], value: 0.5 } as unknown as DrawingDimension;
  it('drawing dimensions follow the number format (zeros, separator)', () => {
    use({ 'doc.leadingZeroes': false, 'general.systemSeparator': false, 'general.separator': ',' });
    expect(dimensionText(dd, 2, formatNumber).main).toBe(',50');
    expect(dimensionText(dd, 2).main).toBe('0.50');
  });
  it('doc.density: the density of a part without a material', () => {
    expect(defaultDensity()).toBe(0.001);
    use({ 'doc.density': 0.00785 });
    expect(defaultDensity()).toBe(0.00785);
  });
  it('doc.volumeUnit: the volume unit of the density line', () => {
    expect(docVolumeUnit()).toBe('mm');
    use({ 'doc.volumeUnit': 'centimeters^3' });
    expect(docVolumeUnit()).toBe('cm');
  });
});

describe('drawing tables, notes and hatching', () => {
  it('doc.massLengthUnit and doc.massUnit: the units of Mass Properties', () => {
    use();
    expect(massDocUnits()).toEqual({ len: 'mm', mass: 'g' });
    use({ 'doc.massLengthUnit': 'meters', 'doc.massUnit': 'kilograms' });
    expect(massDocUnits()).toEqual({ len: 'm', mass: 'kg' });
  });
  it('doc.tableFont, doc.tableBorder, doc.tableGrid: the look of a table', () => {
    use();
    expect(tableFont()).toMatch(/^Century Gothic/);
    expect([tableLine(true), tableLine(false)]).toEqual([0.9, 0.5]);
    use({ 'doc.tableFont': 'Arial', 'doc.tableBorder': '0.35mm', 'doc.tableGrid': '0.25mm' });
    expect(tableFont()).toMatch(/^Arial/);
    expect(tableLine(true)).toBeCloseTo(1.75);
    expect(tableLine(false)).toBeCloseTo(0.694, 3);
  });
  it('doc.upperTables and doc.upperNotes: tables and notes in capitals', () => {
    use();
    expect([tableText('Plate'), noteText('deburr all edges')]).toEqual(['Plate', 'deburr all edges']);
    use({ 'doc.upperTables': true, 'doc.upperNotes': true });
    expect([tableText('Plate'), noteText('deburr all edges, 2 mm')]).toEqual(['PLATE', 'DEBURR ALL EDGES, 2 mm']);
  });
  it('doc.annotationFont: the font of notes and symbols', () => {
    use();
    expect(annotationFont()).toMatch(/^Century Gothic/);
    use({ 'doc.annotationFont': 'ISOCPEUR' });
    expect(annotationFont()).toMatch(/^ISOCPEUR/);
  });
  it('doc.hatchKind, doc.hatchPattern, doc.hatchScale, doc.hatchAngle: the hatch of a section', () => {
    use();
    expect(hatchSpec('section')).toEqual({ fill: 'hatch', spacing: 2.5, angle: 45, lines: [{ at: 0 }] });
    use({ 'doc.hatchKind': 'Solid' });
    expect(hatchSpec('section').fill).toBe('solid');
    use({ 'doc.hatchKind': 'None' });
    expect(hatchSpec('section').fill).toBe('none');
    use({ 'doc.hatchPattern': 'ANSI32 (Steel)', 'doc.hatchScale': 2, 'doc.hatchAngle': 30 });
    expect(hatchSpec('section')).toEqual({ fill: 'hatch', spacing: 5, angle: 75, lines: [{ at: 0 }, { at: 0.25 }] });
    expect(hatchSpec('area')).toEqual({ fill: 'hatch', spacing: 2.5, angle: 45, lines: [{ at: 0 }] });
  });
  it('drawings.hatch, drawings.hatchPattern, drawings.hatchScale, drawings.hatchAngle: the Area Hatch tool', () => {
    use({ 'drawings.hatch': 'Solid' });
    expect(hatchSpec('area').fill).toBe('solid');
    use({ 'drawings.hatchPattern': 'ANSI33 (Bronze Brass Copper)', 'drawings.hatchScale': 0.5, 'drawings.hatchAngle': 45 });
    expect(hatchSpec('area')).toEqual({ fill: 'hatch', spacing: 1.25, angle: 90, lines: [{ at: 0 }, { at: 0.5, dash: '3 1.5' }] });
    expect(hatchSpec('section').angle).toBe(45);
  });
});
