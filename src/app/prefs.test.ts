import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SYSTEM_CATEGORIES } from './prefsSchema';
import { renameOldKeys } from './prefs';

describe('options: renamed keys (F50)', () => {
  it('keeps a value saved under an old key', () => {
    expect(renameOldKeys({ 'doc.dimxpertMethod': 'General tolerance', 'general.featureXpert': false, 'sketch.autoRotate': true })).toEqual({ 'doc.autoToleranceMethod': 'General tolerance', 'general.autoFixFillets': false, 'sketch.autoRotate': true });
  });
  it('prefers a value under the new key', () => {
    expect(renameOldKeys({ 'addin.toolbox': true, 'addin.standardParts': false })).toEqual({ 'addin.standardParts': false });
  });
});

describe('Options ▸ Import/Export list only formats that exist (QA v0.5.11 F171)', () => {
  const menu = readFileSync('src/app/MenuBar.tsx', 'utf8');
  const options = (cat: string, key: string) => {
    const c = SYSTEM_CATEGORIES.find((x) => x.id === cat)!.sections.flatMap((s) => s.controls).find((x) => 'key' in x && x.key === key);
    return (c as { options: string[] }).options;
  };
  it('every export format has a Save As entry in the File menu', () => {
    for (const f of options('export', 'export.format')) expect(menu).toMatch(new RegExp(`Save As ▸ [^']*\\b${f}\\b`));
    // IGES 5.3 has a writer of its own since QA F114/F199 (src/core/occt/iges.ts), so it is listed and has its entry
    expect(options('export', 'export.format')).toContain('IGES');
    expect(menu).toContain("exportFormat: 'iges'");
  });
  it('every import format can be opened', () => {
    for (const f of options('import', 'import.format').filter((x) => x !== 'General')) expect(menu).toContain(`'${f.toLowerCase()}'`);
  });
});
