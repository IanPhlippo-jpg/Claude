// QA 0.5.14 advice P3-2: a shortcut shown in a menu or on a ribbon button belongs to one command only, and the
// Ctrl+Shift keys the menus show are the ones the keyboard handler runs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const menu = src('./MenuBar.tsx');
const ribbon = src('./ribbon/Ribbon.tsx');
const keys = src('./shortcuts.ts');

function shown(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (k: string, label: string) => out.set(k, (out.get(k) ?? new Set()).add(label.replace(/[…]$/, '')));
  for (const m of menu.matchAll(/label: '([^']+)'[^{}]*?shortcut: '([^']+)'/g)) add(m[2], m[1]);
  for (const m of ribbon.matchAll(/label="([^"]+)"[^>]*?shortcut="([^"]+)"/g)) add(m[2], m[1]);
  return out;
}

describe('shortcuts in menus and on buttons', () => {
  it('no key is shown for two different commands', () => {
    const twice = [...shown()].filter(([, labels]) => labels.size > 1).map(([k, l]) => `${k}: ${[...l].join(' / ')}`);
    expect(twice).toEqual([]);
  });
  it('every Ctrl+Shift key the menus show is handled by the keyboard handler', () => {
    const handled = new Set([...keys.matchAll(/ctrl && e\.shiftKey && key === '(.)'/g)].map((m) => `Ctrl+Shift+${m[1].toUpperCase()}`));
    const missing = [...shown().keys()].filter((k) => /^Ctrl\+Shift\+.$/.test(k) && !handled.has(k));
    expect(missing).toEqual([]);
  });
});
