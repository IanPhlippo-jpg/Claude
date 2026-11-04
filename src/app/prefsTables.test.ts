import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DEFAULT_PREFS, savePrefs, type PrefValue } from './prefs';
import { bomTableGrid, cutListsOn, frameCutList } from './prefsTables';
import { createDocument, type DrawingSheet } from '../core/document/types';

// QA v0.5.11 F112: the options behind a Bill of Materials, the cut list of a frame part and the backup copies of a
// saved document (electron/backups.cjs, the part of the desktop shell that keeps them).
const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, ...o });
afterEach(() => use());

describe('Bill of Materials', () => {
  it('general.componentDescription: the custom property in the DESCRIPTION column', () => {
    const model = { ...createDocument('Plate', 'part'), properties: { Description: 'Base plate', PartNo: 'P-100', Revision: 'B' } };
    const sheet = { ...createDocument('Draw1', 'drawing').sheets![0], views: [{ id: 'v1', model }] } as unknown as DrawingSheet;
    const t = { id: 't', kind: 'bom', viewId: 'v1' } as unknown as NonNullable<DrawingSheet['tables']>[number];
    expect(bomTableGrid(sheet, t)!.rows[1][2]).toBe('Base plate');
    use({ 'general.componentDescription': 'PartNo' });
    expect(bomTableGrid(sheet, t)!.rows[1][2]).toBe('P-100');
    use({ 'general.componentDescription': 'Revision' });
    expect(bomTableGrid(sheet, t)!.rows[1][2]).toBe('B');
  });
});

describe('Frames: cut list', () => {
  const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z).toNonIndexed();
  const bodies = [
    { id: 'a', geometry: box(10, 10, 300), description: 'TUBE 40', length: 300 },
    { id: 'b', geometry: box(10, 10, 500), description: 'ANGLE 30', length: 500 },
    { id: 'c', geometry: box(10, 10, 300), description: 'TUBE 40', length: 300 },
  ];
  it('doc.weldCollectIdentical: identical bodies in one item', () => {
    expect(frameCutList(bodies).map((i) => i.quantity)).toEqual([2, 1]);
    use({ 'doc.weldCollectIdentical': false });
    expect(frameCutList(bodies).map((i) => i.quantity)).toEqual([1, 1, 1]);
  });
  it('doc.weldSort: the order of the cut list', () => {
    expect(frameCutList(bodies).map((i) => i.description)).toEqual(['TUBE 40', 'ANGLE 30']);
    use({ 'doc.weldSort': 'Description' });
    expect(frameCutList(bodies).map((i) => i.description)).toEqual(['ANGLE 30', 'TUBE 40']);
    use({ 'doc.weldSort': 'Length' });
    expect(frameCutList(bodies).map((i) => i.length)).toEqual([500, 300]);
    expect(frameCutList(bodies).map((i) => i.name)).toEqual(['Cut-List-Item1', 'Cut-List-Item2']);
  });
  it('doc.weldCreateCutLists: the cut list folders in the tree', () => {
    expect(cutListsOn()).toBe(true);
    use({ 'doc.weldCreateCutLists': false });
    expect(cutListsOn()).toBe(false);
  });
});

describe('Backup copies (Options ▸ Backup/Recover, desktop shell)', () => {
  const require = createRequire(import.meta.url);
  const { rotateBackups, bakName } = require('../../electron/backups.cjs') as { rotateBackups(file: string, copies?: number, removeDays?: number): Promise<void>; bakName(file: string, i: number): string };
  const save = async (file: string, text: string, copies?: number, removeDays?: number) => {
    if (fs.existsSync(file)) await rotateBackups(file, copies, removeDays);
    fs.writeFileSync(file, text);
  };
  it('backup.copies: as many previous versions as the option says (two by default)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-bak-'));
    const file = path.join(dir, 'Part1.kcad');
    for (const v of ['v1', 'v2', 'v3', 'v4', 'v5']) await save(file, v);
    expect(fs.readFileSync(bakName(file, 1), 'utf8')).toBe('v4');
    expect(fs.readFileSync(bakName(file, 2), 'utf8')).toBe('v3');
    expect(fs.existsSync(bakName(file, 3))).toBe(false);
    await save(file, 'v6', 4);
    await save(file, 'v7', 4);
    expect([1, 2, 3, 4].map((i) => fs.readFileSync(bakName(file, i), 'utf8'))).toEqual(['v6', 'v5', 'v4', 'v3']);
    await save(file, 'v8', 1);
    expect(fs.readFileSync(bakName(file, 1), 'utf8')).toBe('v7');
    expect(fs.existsSync(bakName(file, 2))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('backup.removeDays: older copies past that age go, the newest stays', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-bak-'));
    const file = path.join(dir, 'Part1.kcad');
    for (const v of ['v1', 'v2', 'v3']) await save(file, v, 3);
    const old = new Date(Date.now() - 10 * 86_400_000);
    fs.utimesSync(bakName(file, 1), old, old);
    fs.utimesSync(bakName(file, 2), old, old);
    await save(file, 'v4', 3, 7);
    // v3 is the new .bak (always kept); v2 and v1, older than 7 days, are gone
    expect(fs.readFileSync(bakName(file, 1), 'utf8')).toBe('v3');
    expect(fs.existsSync(bakName(file, 2))).toBe(false);
    expect(fs.existsSync(bakName(file, 3))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
