/**
 * The files the 3D Print tab writes (docs/34 2.8, 2.9):
 *   - a plain .3mf project (3MF core: content types, relationships, the model with one object per part and a build item
 *     with its transform, a thumbnail, and our settings in Metadata/phlippo_print.json)
 *   - the Bambu Lab .gcode.3mf: the G-code with its MD5, plate images, slice_info.config, model_settings.config and
 *     project_settings.config, in the structure Bambu Studio writes (entry names and keys from public descriptions of
 *     the format; to be compared with a reference file from Ian, and nog te printen)
 * Both are written with the one ZIP writer (deflate), [Content_Types].xml first.
 */
import { writeZipDeflate } from '../../core/document/zip';
import { md5 } from './md5';
import type { Printer, ProcessSettings, SliceStats } from '../types';
import type { SlotInfo } from '../build';

const enc = new TextEncoder();
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v: number) => (Math.abs(v) < 1e-12 ? '0' : String(Math.round(v * 1e6) / 1e6));

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const REL_MODEL = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel';
const REL_THUMB = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail';

export interface PackPart { name: string; positions: Float32Array; matrix: number[] }

/** the 3MF model XML: one object per part (welded vertices), a build item per part with its 3 x 4 transform */
export function modelXml(parts: PackPart[]): string {
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}">`, ' <resources>'];
  parts.forEach((p, i) => {
    const ids = new Map<string, number>();
    const verts: string[] = [], tris: string[] = [];
    const vid = (k: number) => {
      const key = `${p.positions[k]},${p.positions[k + 1]},${p.positions[k + 2]}`;
      let v = ids.get(key);
      if (v === undefined) { v = ids.size; ids.set(key, v); verts.push(`    <vertex x="${num(p.positions[k])}" y="${num(p.positions[k + 1])}" z="${num(p.positions[k + 2])}"/>`); }
      return v;
    };
    for (let k = 0; k + 8 < p.positions.length; k += 9) {
      const a = vid(k), b = vid(k + 3), c = vid(k + 6);
      if (a !== b && b !== c && a !== c) tris.push(`    <triangle v1="${a}" v2="${b}" v3="${c}"/>`);
    }
    out.push(`  <object id="${i + 1}" name="${xml(p.name)}" type="model">`, '   <mesh>', '    <vertices>', ...verts, '    </vertices>', '    <triangles>', ...tris, '    </triangles>',
      '   </mesh>', '  </object>');
  });
  out.push(' </resources>', ' <build>');
  parts.forEach((p, i) => {
    const m = p.matrix;
    // 3MF: row vectors, "m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32" = the columns of our column-major matrix
    const t = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10], m[12], m[13], m[14]].map(num).join(' ');
    out.push(`  <item objectid="${i + 1}" transform="${t}"/>`);
  });
  out.push(' </build>', '</model>', '');
  return out.join('\n');
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';
const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const rel = (target: string, id: string, type: string) => `<Relationship Target="${target}" Id="${id}" Type="${type}"/>`;
const relsXml = (...r: string[]) => `${XML_HEAD}<Relationships xmlns="${RELS_NS}">${r.join('')}</Relationships>`;
const contentTypes = (extra = '') => `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
  + `<Default Extension="png" ContentType="image/png"/>${extra}</Types>`;

/** the plain .3mf project (no G-code) */
export async function projectThreeMf(parts: PackPart[], settings: unknown, thumbnail: Uint8Array): Promise<Uint8Array> {
  const rels = relsXml(rel('/3D/3dmodel.model', 'rel0', REL_MODEL), rel('/Metadata/thumbnail.png', 'rel1', REL_THUMB));
  return writeZipDeflate([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes('<Default Extension="json" ContentType="application/json"/>')) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: '3D/3dmodel.model', data: enc.encode(modelXml(parts)) },
    { name: 'Metadata/thumbnail.png', data: thumbnail },
    { name: 'Metadata/phlippo_print.json', data: enc.encode(JSON.stringify(settings, null, 1)) },
  ]);
}

/**
 * Bambu printer model ids as Bambu Studio writes them in slice_info.config (community knowledge, AANNAME: to be checked
 * against a reference file per printer).
 */
const BAMBU_MODEL_ID: Record<string, string> = { 'X1 Carbon': 'BL-P001', X1: 'BL-P002', X1E: 'C13', P1P: 'C11', P1S: 'C12', 'A1 mini': 'N1', A1: 'N2S', H2D: 'O1D' };
export const bambuModelId = (p: Printer) => BAMBU_MODEL_ID[p.model.replace(/^Bambu Lab /, '')] ?? '';

export interface BambuPack {
  gcode: Uint8Array[];
  printer: Printer;
  nozzle: number;
  process: ProcessSettings;
  slots: SlotInfo[];
  stats: SliceStats;
  plateImage: Uint8Array;
  plateSmall: Uint8Array;
  appVersion: string;
  objects: string[];
}

export async function bambuGcode3mf(p: BambuPack): Promise<Uint8Array> {
  const gcode = new Uint8Array(p.gcode.reduce((s, c) => s + c.length, 0));
  let o = 0;
  for (const c of p.gcode) { gcode.set(c, o); o += c.length; }
  const sum = md5(gcode);
  const meta = (k: string, v: string | number) => `    <metadata key="${k}" value="${xml(String(v))}"/>`;
  const used = p.stats.filament;
  const sliceInfo = [
    '<?xml version="1.0" encoding="UTF-8"?>', '<config>', '  <header>',
    '    <header_item key="X-BBL-Client-Type" value="slicer"/>', `    <header_item key="X-BBL-Client-Version" value="${xml(p.appVersion || '0.0.0')}"/>`,
    '  </header>', '  <plate>',
    meta('index', 1), meta('extruder_type', 0), meta('nozzle_volume_type', 0), meta('printer_model_id', bambuModelId(p.printer)),
    meta('nozzle_diameters', p.nozzle.toFixed(1)), meta('timelapse_type', 0), meta('prediction', Math.round(p.stats.totalTime)),
    meta('weight', used.reduce((s, f) => s + f.grams, 0).toFixed(2)), meta('pause_count', 0), meta('first_layer_time', 0), meta('outside', 'false'),
    meta('support_used', p.process.support !== 'none' ? 'true' : 'false'), meta('label_object_enabled', 'false'),
    ...p.objects.map((n, i) => `    <object identify_id="${i + 1}" name="${xml(n)}" skipped="false" />`),
    // the AMS filament list: one entry per slot used (multi-material data model, docs/34 M3)
    ...used.map((f) => {
      const s = p.slots[f.slot] ?? p.slots[0];
      return `    <filament id="${f.slot + 1}" tray_info_idx="" type="${xml(s.material.type ?? s.material.name)}" color="${xml(s.color.toUpperCase())}"`
        + ` used_m="${(f.length / 1000).toFixed(2)}" used_g="${f.grams.toFixed(2)}" />`;
    }),
    '  </plate>', '</config>', '',
  ].join('\n');
  const modelSettings = ['<?xml version="1.0" encoding="UTF-8"?>', '<config>', '  <plate>', meta('plater_id', 1), meta('plater_name', ''), meta('locked', 'false'),
    meta('gcode_file', 'Metadata/plate_1.gcode'), meta('thumbnail_file', 'Metadata/plate_1.png'), meta('top_file', ''), meta('pick_file', ''), '  </plate>', '</config>', ''].join('\n');
  const project = {
    printer_model: `${p.printer.brand} ${p.printer.model}`, printer_settings_id: `${p.printer.brand} ${p.printer.model} ${p.nozzle} nozzle`, nozzle_diameter: [String(p.nozzle)],
    layer_height: String(p.process.layerHeight), initial_layer_print_height: String(p.process.firstLayerHeight), wall_loops: String(p.process.wallCount),
    sparse_infill_density: `${Math.round(p.process.infillDensity * 100)}%`, filament_type: p.slots.map((s) => s.material.type ?? s.material.name),
    filament_colour: p.slots.map((s) => s.color), nozzle_temperature: p.slots.map((s) => String(s.nozzleTemp)), curr_bed_type: 'Textured PEI Plate',
    enable_support: p.process.support !== 'none' ? '1' : '0', printable_area: ['0x0', `${p.printer.buildVolume[0]}x0`, `${p.printer.buildVolume[0]}x${p.printer.buildVolume[1]}`,
      `0x${p.printer.buildVolume[1]}`],
    printable_height: String(p.printer.buildVolume[2]), from: 'Phlippo CAD', version: p.appVersion, note: 'nog te printen: kalibratiekubus 20 mm per printer',
  };
  const BBL = 'http://schemas.bambulab.com/package/2021/';
  const rels = relsXml(rel('/3D/3dmodel.model', 'rel-1', REL_MODEL), rel('/Metadata/plate_1.png', 'rel-2', REL_THUMB),
    rel('/Metadata/plate_1.png', 'rel-4', `${BBL}cover-thumbnail-middle`), rel('/Metadata/plate_1_small.png', 'rel-5', `${BBL}cover-thumbnail-small`));
  const modelRels = relsXml(rel('/Metadata/plate_1.gcode', 'rel-1', `${BBL}gcode`));
  const emptyModel = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}">\n <resources/>\n <build/>\n</model>\n`;
  return writeZipDeflate([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes('<Default Extension="gcode" ContentType="text/x.gcode"/>')) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: '3D/3dmodel.model', data: enc.encode(emptyModel) },
    { name: 'Metadata/plate_1.gcode', data: gcode },
    { name: 'Metadata/plate_1.gcode.md5', data: enc.encode(sum) },
    { name: 'Metadata/plate_1.png', data: p.plateImage },
    { name: 'Metadata/plate_1_small.png', data: p.plateSmall },
    { name: 'Metadata/slice_info.config', data: enc.encode(sliceInfo) },
    { name: 'Metadata/model_settings.config', data: enc.encode(modelSettings) },
    { name: 'Metadata/_rels/model_settings.config.rels', data: enc.encode(modelRels) },
    { name: 'Metadata/project_settings.config', data: enc.encode(JSON.stringify(project, null, 4)) },
  ]);
}
