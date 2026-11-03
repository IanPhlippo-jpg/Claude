// Design Table (Configurations panel): Insert Design Table… reads a CSV table (";" and decimal comma) into
// configurations with their own dimension values and $STATE suppression; an unknown parameter is reported and
// changes nothing; Export Design Table… writes the same table back.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const C = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const cfgs = s.doc.configurations ?? [];
  const ex = s.doc.features.find((f) => f.type === 'extrude');
  const size = s.rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map((v) => Math.round(v * 10) / 10).sort((a, b) => a - b); });
  return { names: cfgs.map((c) => c.name), active: cfgs.find((c) => c.id === s.doc.activeConfiguration)?.name ?? 'Default', depth: ex?.depth, suppressed: ex?.suppressed, bodies: s.rebuild.bodies.length, size, undo: s.undoLabel, messages: s.messages.map((m) => `${m.level}: ${m.text}`) };
});
const rightClickRoot = async (item) => {
  await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
  await page.click(`.k-menu-item:has-text("${item}")`);
};
const insertTable = async (name, text) => {
  const chooser = page.waitForEvent('filechooser');
  await rightClickRoot('Insert Design Table');
  await (await chooser).setFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(text, 'utf8') });
  await page.waitForTimeout(600);
};

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
// a plate: one side dimensioned 40 (D1@Sketch1), extruded 10 (D1@Boss-Extrude1)
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 200, cy - 200);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 100, cy);
await page.mouse.click(cx + 100, cy + 80);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('40');
await page.locator('.k-modify input.k-num').press('Enter');
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.locator('.k-pm-valuerow input.k-num').first().fill('10');
await page.locator('.k-pm-valuerow input.k-num').first().press('Tab');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
let c = await C();
check('plate built', c.bodies === 1 && c.depth === 10 && c.size[0]?.includes(40), JSON.stringify(c));
const base = c.size[0];

// ---- Insert Design Table…: the menu of the top node of the Configurations panel
await page.click('.k-manager-tab[data-tip="Configurations"]');
await page.waitForTimeout(200);
await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
const menu = (await page.locator('.k-menu').innerText()).replace(/\s+/g, ' ');
check('menu offers Insert Design Table… and Export Design Table…', /Insert Design Table/.test(menu) && /Export Design Table/.test(menu), menu);
await shot('dt1-menu');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const TABLE = ['Design Table for: Part1;;;', ';D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1', 'Short;40;12,5;U', 'Long;80;20;U', 'Empty;;;S', ''].join('\r\n');
await insertTable('plate.csv', TABLE);
c = await C();
check('three configurations added, Default stays shown', c.names.join(',') === 'Default,Short,Long,Empty' && c.active === 'Default' && c.depth === 10, JSON.stringify(c));
check('one undo step "Insert Design Table"', c.undo === 'Insert Design Table', c.undo);
check('status names the table', c.messages.some((m) => /Design Table read from plate\.csv: 3 configurations \(3 added\)/.test(m)), JSON.stringify(c.messages));
const tree = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('tree lists the configurations', /Short \[ Part1 \]/.test(tree) && /Long \[ Part1 \]/.test(tree) && /Empty \[ Part1 \]/.test(tree), tree);
await shot('dt2-configurations');

// each configuration rebuilds with its own values
await page.dblclick('.k-cfg-row:has-text("Long")');
await page.waitForTimeout(600);
c = await C();
check('Long: 80 wide and 20 thick, the other side as drawn', c.active === 'Long' && c.depth === 20 && c.size[0]?.includes(80) && c.size[0]?.includes(20) && c.size[0]?.includes((base ?? []).find((v) => v !== 40 && v !== 10) ?? 40), JSON.stringify({ ...c, base }));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('dt3-long');
await page.dblclick('.k-cfg-row:has-text("Short")');
await page.waitForTimeout(600);
c = await C();
check('Short: 12.5 thick (decimal comma)', c.active === 'Short' && c.depth === 12.5 && c.size[0]?.includes(40) && c.size[0]?.includes(12.5), JSON.stringify(c));
await page.dblclick('.k-cfg-row:has-text("Empty")');
await page.waitForTimeout(600);
c = await C();
check('Empty: $STATE S suppresses the extrude', c.active === 'Empty' && c.suppressed === true && c.bodies === 0, JSON.stringify(c));
await page.dblclick('.k-cfg-row:has-text("Default")');
await page.waitForTimeout(600);

// an unknown parameter is reported and changes nothing
await insertTable('bad.csv', ';D7@Sketch9;D1@Boss-Extrude1\nShort;1;abc\n');
c = await C();
check('unknown parameter reported', c.messages.some((m) => /^error: Design Table not applied: Unknown parameter "D7@Sketch9" \(column B\)/.test(m)) && c.messages.some((m) => /"abc" is not a number/.test(m)), JSON.stringify(c.messages));
check('a table with errors changes nothing', c.names.join(',') === 'Default,Short,Long,Empty' && c.undo === 'Show Configuration' && c.depth === 10, JSON.stringify(c));
await shot('dt4-error');

// ---- Export Design Table…: the same table back (";" and a decimal comma)
const download = page.waitForEvent('download');
await rightClickRoot('Export Design Table');
const dl = await download;
const path = await dl.path();
const { readFileSync } = await import('node:fs');
const csv = readFileSync(path, 'utf8').replace(/^﻿/, '');
const lines = csv.split(/\r\n/);
check('export file name', dl.suggestedFilename() === 'Part1 - Design Table.csv', dl.suggestedFilename());
check('export header', lines[0] === 'Design Table for: Part1' && lines[1] === ';D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1', lines.slice(0, 2).join(' | '));
check('export rows', lines[3] === 'Short;40;12,5;U' && lines[4] === 'Long;80;20;U' && lines[5] === 'Empty;40;10;S', lines.slice(2).join(' | '));
// reading the exported table back changes no value
await insertTable('roundtrip.csv', csv);
c = await C();
check('round trip keeps the configurations', c.names.join(',') === 'Default,Short,Long,Empty' && c.messages.some((m) => /4 configurations \(0 added\)/.test(m)), JSON.stringify(c));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
