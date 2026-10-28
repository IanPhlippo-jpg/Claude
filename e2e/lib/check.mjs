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

/** for an optional step (a question that may not come, a section that may already be open): never silent */
// `.catch(skip('what'))` gives undefined, `.catch(skip('what', ''))` the given value (QA v0.5.1 F133: no silent catches)
export const skip = (what, value) => (e) => { console.log(`skip: ${what} (${String(e?.message ?? e).split('\n')[0].slice(0, 120)})`); return value; };
