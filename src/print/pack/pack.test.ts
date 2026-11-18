import { describe, expect, it } from 'vitest';
import { md5 } from './md5';
import { encodePng, pngSize } from './png';
import { colpicBytes, colpicText, decodeColpic, pngThumbnailBlock } from './colpic';
import { listZip, readZip } from '../../core/document/zip';
import { modelXml, projectThreeMf } from './packages';
import { fmt, fillTemplate, ascii } from '../gcode/format';
import { FIXTURE_MATERIALS, FIXTURE_PRINTERS, processProfile } from '../database';
import { runSlice, printerFile } from '../run';
import { slotFor } from '../build';
import { calibrationCube, box } from '../shapes';
import { translation } from '../mesh';

const enc = new TextEncoder(), dec = new TextDecoder();

describe('MD5 (RFC 1321 test suite)', () => {
  it('matches the reference digests', () => {
    expect(md5(enc.encode(''))).toBe('D41D8CD98F00B204E9800998ECF8427E');
    expect(md5(enc.encode('a'))).toBe('0CC175B9C0F1B6A831C399E269772661');
    expect(md5(enc.encode('abc'))).toBe('900150983CD24FB0D6963F7D28E17F72');
    expect(md5(enc.encode('message digest'))).toBe('F96B697D7CB7938D525A2F31AAF161D0');
    expect(md5(enc.encode('abcdefghijklmnopqrstuvwxyz'))).toBe('C3FCD3D76192E4007DFB496CCA67E13B');
    expect(md5(enc.encode('12345678901234567890123456789012345678901234567890123456789012345678901234567890'))).toBe('57EDF4A22BE3C955AC49DA2E2107B67A');
    // in chunks: the same digest
    expect(md5([enc.encode('message '), enc.encode('digest')])).toBe('F96B697D7CB7938D525A2F31AAF161D0');
  });
});

describe('G-code numbers and text', () => {
  it('one formatter: no exponent, no -0, no comma; NaN is refused', () => {
    expect(fmt(1e-7, 5)).toBe('0');
    expect(fmt(-0.00001, 3)).toBe('0');
    expect(fmt(123456789.5, 3)).toBe('123456789.5');
    expect(fmt(0.1 + 0.2, 3)).toBe('0.3');
    expect(() => fmt(NaN, 3)).toThrow();
    expect(() => fmt(Infinity, 3)).toThrow();
    expect(ascii('Deurkruk één')).toBe('Deurkruk een');
  });
  it('an unknown template variable is an error', () => {
    expect(fillTemplate('M104 S{nozzle_temp}', { nozzle_temp: 215 })).toBe('M104 S215');
    expect(() => fillTemplate('M104 S{nozzle_tmp}', { nozzle_temp: 215 })).toThrow(/Unknown variable/);
  });
});

describe('PNG and thumbnails', () => {
  it('writes a valid PNG and a decodable ColPic block', async () => {
    const w = 16, h = 8, rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) rgba.set(i < 40 ? [255, 0, 0, 255] : i < 90 ? [0, 255, 0, 255] : [0, 0, 255, 255], i * 4);
    const png = await encodePng(rgba, w, h);
    expect(pngSize(png)).toEqual({ width: 16, height: 8 });
    const block = pngThumbnailBlock(png, w, h);
    expect(block).toMatch(/^;\n; thumbnail begin 16x8 \d+\n/);
    const back = decodeColpic(colpicText(colpicBytes(rgba, w, h)));
    expect([back.width, back.height]).toEqual([16, 8]);
    expect(back.pixels[0]).toBe(0xf800);
    expect(back.pixels[50]).toBe(0x07e0);
    expect(back.pixels[127]).toBe(0x001f);
  });
});

describe('packages', () => {
  it('the .3mf project: content types first, a model with transforms, a thumbnail', async () => {
    const parts = [{ name: 'Cube <1>', positions: box(0, 0, 0, 10, 10, 10), matrix: translation(50, 60, 0) }];
    const data = await projectThreeMf(parts, { printer: 'x' }, await encodePng(new Uint8Array(4 * 4), 2, 2));
    const names = listZip(data).map((e) => e.name);
    expect(names[0]).toBe('[Content_Types].xml');
    expect(names).toEqual(expect.arrayContaining(['_rels/.rels', '3D/3dmodel.model', 'Metadata/thumbnail.png', 'Metadata/phlippo_print.json']));
    const files = await readZip(data);
    const model = dec.decode(files.get('3D/3dmodel.model')!);
    expect(model).toContain('transform="1 0 0 0 1 0 0 0 1 50 60 0"');
    expect(model).toContain('name="Cube &lt;1&gt;"');
    expect((model.match(/<triangle /g) ?? []).length).toBe(12);
    expect((model.match(/<vertex /g) ?? []).length).toBe(8);
    expect(modelXml(parts)).toContain('unit="millimeter"');
  });
  it('the Bambu .gcode.3mf: G-code with matching MD5, plate images, slice_info with the filament list', async () => {
    const P1S = FIXTURE_PRINTERS[0];
    const job = { meshes: [{ positions: calibrationCube(118, 118), name: 'Cube', filament: 0 }], printer: P1S, nozzle: 0.4, process: processProfile('standard', 0.4, P1S), slots: [slotFor(FIXTURE_MATERIALS[0])], name: 'Cube', appVersion: '0.5.16' };
    const out = await runSlice(job);
    const file = await printerFile(out, job);
    expect(file.name).toBe('Cube.gcode.3mf');
    const entries = listZip(file.data);
    expect(entries[0].name).toBe('[Content_Types].xml');
    expect(entries.find((e) => e.name === 'Metadata/plate_1.gcode')!.method).toBe(8);
    const files = await readZip(file.data);
    const gcode = files.get('Metadata/plate_1.gcode')!;
    expect(dec.decode(files.get('Metadata/plate_1.gcode.md5')!)).toBe(md5(gcode));
    expect(pngSize(files.get('Metadata/plate_1.png')!)).toEqual({ width: 512, height: 512 });
    expect(pngSize(files.get('Metadata/plate_1_small.png')!)).toEqual({ width: 128, height: 128 });
    const info = dec.decode(files.get('Metadata/slice_info.config')!);
    expect(info).toContain('<metadata key="printer_model_id" value="C12"/>');
    expect(info).toContain(`<metadata key="prediction" value="${Math.round(out.stats.totalTime)}"/>`);
    expect(info).toMatch(/<filament id="1" tray_info_idx="" type="PLA" color="#F2F2F2" used_m="[\d.]+" used_g="[\d.]+" \/>/);
    // every relationship points at an existing part
    for (const f of ['_rels/.rels', 'Metadata/_rels/model_settings.config.rels']) for (const m of dec.decode(files.get(f)!).matchAll(/Target="\/([^"]+)"/g)) expect(files.has(m[1]), m[1]).toBe(true);
    JSON.parse(dec.decode(files.get('Metadata/project_settings.config')!));
  });
  it('the Elegoo .gcode for a Centauri Carbon carries a 144 x 144 PNG thumbnail', async () => {
    const CC = FIXTURE_PRINTERS.find((p) => p.id === 'elegoo-centauri-carbon')!;
    const job = { meshes: [{ positions: calibrationCube(118, 118), name: 'Cube', filament: 0 }], printer: CC, nozzle: 0.4, process: processProfile('standard', 0.4, CC), slots: [slotFor(FIXTURE_MATERIALS[0])], name: 'Cube', appVersion: '0.5.16' };
    const file = await printerFile(await runSlice(job), job);
    expect(file.name).toBe('Cube.gcode');
    const text = dec.decode(file.data);
    expect(text).toContain('; thumbnail begin 144x144');
    expect(text.split('\n').every((l) => /^[\x20-\x7e]*$/.test(l))).toBe(true);
  });
});

describe('start G-code imported from Bambu Studio', async () => {
  const { fillBambuTemplate, readMachineProfile, bambuVars } = await import('../gcode/importTemplate');
  const vars = bambuVars({ nozzle_temp: 220, bed_temp: 65, first_layer_height: 0.2, max_z: 20, bed_x: 256, bed_y: 256, nozzle: 0.4, layer_height: 0.2, filament_type: 'PLA', printer_model: 'Bambu Lab P1S' });
  it('fills placeholders, arithmetic and conditional blocks', () => {
    const t = 'M140 S[bed_temperature_initial_layer_single]\nM104 S{nozzle_temperature_initial_layer[initial_extruder] - 20}\n{if curr_bed_type=="Textured PEI Plate"}G29.1 Z{-0.04}{else}G29.1 Z0{endif}\n{if bed_temperature_initial_layer_single >= 60}M106 P3 S0{endif}';
    expect(fillBambuTemplate(t, vars)).toBe('M140 S65\nM104 S200\nG29.1 Z-0.04\nM106 P3 S0');
  });
  it('refuses what it cannot fill, naming it', () => {
    expect(() => fillBambuTemplate('M104 S{unknown_thing}', vars)).toThrow(/unknown_thing/);
    expect(() => fillBambuTemplate('{if a}x', vars)).toThrow();
  });
  it('reads a machine profile', () => {
    expect(readMachineProfile(JSON.stringify({ name: 'X', machine_start_gcode: 'G28', machine_end_gcode: 'M84' }))).toEqual({ name: 'X', start: 'G28', end: 'M84' });
  });
});
