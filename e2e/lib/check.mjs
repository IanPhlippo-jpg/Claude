// Shared e2e result handling (QA v0.3.4 F57): every failed check, every page error and every console error that is
// not on the allowlist makes the script exit 1. Scripts keep their own `check`/`results`/`errors`; they end with
// `process.exitCode = exitCode(results, errors)`.

/** console errors that are not faults of the app (the software renderer, a missing favicon) */
export const CONSOLE_ALLOW = [/favicon/i, /Failed to load resource/i, /WebGL|GL_|GPU stall|swiftshader/i, /ResizeObserver loop/i];

/** collects page errors and console errors of a page, in the format the scripts already use */
export function track(page, errors = []) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

/** a check function and its result list */
export function checks() {
  const results = [];
  const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
  return { results, check };
}

/** 0 when every check passed and no unexpected error occurred, else 1 (prints what failed) */
export function exitCode(results, errors = []) {
  const bad = errors.filter((e) => e.startsWith('pageerror') || (/^console/.test(e) && !CONSOLE_ALLOW.some((re) => re.test(e))));
  if (bad.length) console.log('FAIL page/console errors', [...new Set(bad)].slice(0, 5));
  const failed = results.filter((r) => !r.ok);
  if (!results.length) console.log('FAIL the script made no checks');
  return failed.length || bad.length || !results.length ? 1 : 0;
}

/** for an optional step: never silent. `.catch(skip('what'))` gives undefined, `.catch(skip('what', ''))` the given value
 * (QA v0.5.1 F133: no silent catches). run-regression.mjs counts the skips of a script, and more than its budget fails
 * the run (QA F155): 0 unless the script says `// skip-budget: N <reason>` in its first lines. A click that times out
 * is a failure, never an optional step: clicks are not caught with skip(). */
export const skip = (what, value) => (e) => { console.log(`skip: ${what} (${String(e?.message ?? e).split('\n')[0].slice(0, 120)})`); return value; };

/** "Save changes?" comes only when the open document has unsaved changes (opening through the test hook never asks):
 * Don't Save when it is there. A question that does not come is no failed step, so this is no skip. */
export async function dontSave(page, timeout = 300) {
  const ask = page.locator('[data-testid="ask-no"]');
  if (await ask.waitFor({ state: 'visible', timeout }).then(() => true, () => false)) await ask.click();
}

/**
 * Waits until the rebuild has settled: no rebuild pending, and when the page runs on the B-rep kernel (?kernel=brep or
 * localStorage phlippo.kernel), until the exact bodies have replaced the mesh ones (or nothing changed for a while).
 * A volume read before that mixes the mesh result (one tessellation) with the exact result (another): the release
 * pass of the regression showed hem, wrap and edge flange "wrong" by exactly that difference (QA 0.5.10 round).
 */
export async function waitSettled(page, timeout = 30000) {
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, undefined, { timeout }).catch(() => undefined);
  const brep = await page.evaluate(() => { try { return new URLSearchParams(location.search).get('kernel') === 'brep' || localStorage.getItem('phlippo.kernel') === 'brep'; } catch { return false; } });
  if (!brep) return;
  await page.waitForFunction(() => { const r = window.__phlippoStore.getState().rebuild; return !r.pending && (!r.bodies.length || r.bodies.every((b) => b.exact)); }, undefined, { timeout }).catch(() => undefined);
  // the exact result of one rebuild can be followed by the next rebuild's mesh result: wait until nothing changes
  await page.evaluate(() => new Promise((ok) => { let last = window.__phlippoStore.getState().rebuild, same = 0; const t = setInterval(() => { const now = window.__phlippoStore.getState().rebuild; same = now === last ? same + 1 : 0; last = now; if (same >= 3) { clearInterval(t); ok(); } }, 100); }));
}
