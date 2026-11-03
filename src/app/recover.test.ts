import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { recoveredName } from './recovered';

// the Auto-Recover part of the desktop shell (electron/recover.cjs) has no Electron dependency of its own
const require = createRequire(import.meta.url);
const rec = require('../../electron/recover.cjs') as {
  recoverKey(id: string, file: string): string;
  recoverFileName(name: string, key: string): string;
  recoverLabel(name: string): string;
  isRecoverFile(name: unknown): boolean;
  recoverDir(userData: string): string;
  writeSynced(file: string, data: ArrayBuffer | Uint8Array): Promise<void>;
  adoptLegacyCopies(userData: string, dir: string): Promise<number>;
};

describe('Auto-Recover copies are kept per document (QA F153)', () => {
  it('two documents with the same name get two copies', () => {
    const a = rec.recoverFileName('Part1', rec.recoverKey('docA', ''));
    const b = rec.recoverFileName('Part1', rec.recoverKey('docB', ''));
    expect(a).not.toBe(b);
    expect(rec.recoverLabel(a)).toBe('Part1');
    expect(rec.recoverLabel(b)).toBe('Part1');
  });
  it('the same document at another file (a copied .kcad) gets a copy of its own', () => {
    expect(rec.recoverKey('docA', 'C:/x/Part1.kcad')).not.toBe(rec.recoverKey('docA', 'C:/y/Part1.kcad'));
    expect(rec.recoverKey('docA', '')).not.toBe(rec.recoverKey('docA', 'C:/x/Part1.kcad'));
    expect(rec.recoverKey('docA', 'C:/x/Part1.kcad')).toBe(rec.recoverKey('docA', 'C:/x/Part1.kcad'));
  });
  it('a document name cannot leave the folder or fake a key', () => {
    const n = rec.recoverFileName('..\\..\\evil~0123456789abcdef', rec.recoverKey('d', ''));
    expect(n).toBe(path.basename(n));
    expect(n).not.toMatch(/[\\/]/);
    expect(rec.isRecoverFile(n)).toBe(true);
    expect(rec.recoverLabel(n)).not.toContain('~');
    expect(rec.isRecoverFile('../a~0123456789abcdef.autorecover.kcad')).toBe(false);
    expect(rec.isRecoverFile('Part1.autorecover.kcad')).toBe(false);
    expect(rec.isRecoverFile(42)).toBe(false);
  });
});

describe('the auto-recover folder is decided by the shell (QA F156)', () => {
  it('defaults to <profile>/autorecover and follows only an absolute folder chosen in the dialog', () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-rec-'));
    expect(rec.recoverDir(profile)).toBe(path.join(profile, 'autorecover'));
    fs.writeFileSync(path.join(profile, 'autorecover.json'), JSON.stringify({ folder: '%TEMP%\\x' }));
    expect(rec.recoverDir(profile)).toBe(path.join(profile, 'autorecover'));
    const chosen = path.join(profile, 'chosen');
    fs.writeFileSync(path.join(profile, 'autorecover.json'), JSON.stringify({ folder: chosen }));
    expect(rec.recoverDir(profile)).toBe(path.normalize(chosen));
  });
});

describe('copies are flushed before they replace the previous one (QA F154)', () => {
  it('writes through a temp file and leaves none behind', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-rec-'));
    const file = path.join(dir, 'a~0123456789abcdef.autorecover.kcad');
    await rec.writeSynced(file, new TextEncoder().encode('one'));
    await rec.writeSynced(file, new TextEncoder().encode('two'));
    expect(fs.readFileSync(file, 'utf8')).toBe('two');
    expect(fs.readdirSync(dir)).toEqual([path.basename(file)]);
  });
});

describe('a recovered document is named "(Recovered)" (QA F154)', () => {
  it('adds the suffix once', () => {
    expect(recoveredName('Part1')).toBe('Part1 (Recovered)');
    expect(recoveredName('Part1 (Recovered)')).toBe('Part1 (Recovered)');
    expect(recoveredName('')).toBe('Document (Recovered)');
  });
});

describe('copies of 0.5.10 appear in Document Recovery (QA 0.5.11 F188)', () => {
  it('a keyless copy in <profile>/backup or in the folder is given a key and moved into the folder', async () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-legacy-'));
    const dir = rec.recoverDir(userData);
    fs.mkdirSync(path.join(userData, 'backup'), { recursive: true });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(userData, 'backup', 'Part1.autorecover.kcad'), '{"old":1}');
    fs.writeFileSync(path.join(dir, 'Bracket.autorecover.kcad'), '{"old":2}');
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a copy');
    expect(await rec.adoptLegacyCopies(userData, dir)).toBe(2);
    const names = fs.readdirSync(dir).filter((n) => rec.isRecoverFile(n));
    expect(names.map((n) => rec.recoverLabel(n)).sort()).toEqual(['Bracket', 'Part1']);
    expect(fs.readFileSync(path.join(dir, names.find((n) => rec.recoverLabel(n) === 'Part1')!), 'utf8')).toBe('{"old":1}');
    expect(fs.existsSync(path.join(dir, 'notes.txt'))).toBe(true);
    // a second start takes nothing over again
    expect(await rec.adoptLegacyCopies(userData, dir)).toBe(0);
    fs.rmSync(userData, { recursive: true, force: true });
  });
});
