// Waiting on a state instead of the wall clock (QA 0.5.14 P2-12). A fixed `page.waitForTimeout(300)` after an action is
// too short on a loaded runner (software GL, the release pass) and wasted time on a fast one; these helpers wait until
// the app has done what the action started.
//
//   settle(page)          after a store action, an opened document, a click that rebuilds (OK of a Property Panel,
//                         Enter in the Modify box): no rebuild pending (the rebuild worker), no B-rep refinement queued
//                         (when the app exposes window.__phlippoRefine), no view transition running, and the rebuild and
//                         the camera unchanged for a quiet window (the delayed Zoom to Fit after an open, 60 ms, and
//                         after a sketch opens, 280 ms, start inside that window), then two drawn frames
//   frames(page, n)       n animation frames (React has committed and the viewport has drawn)
//   waitTestId(page, id)  the element with data-testid="id" is visible
//
// settle never throws on a slow rebuild: after `timeout` it says so in the log and the script goes on (its checks
// decide), as the fixed wait did.

/** two (or n) animation frames: the DOM is committed and the viewport has drawn */
export async function frames(page, n = 2) {
  await page.evaluate((k) => new Promise((ok) => { let i = 0; const f = () => (++i >= k ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
}

/**
 * Waits until the app is idle after an action (see above). `quiet` is how long (ms) the rebuild and the camera must
 * stay unchanged; `timeout` bounds the whole wait.
 */
export async function settle(page, { quiet = 200, timeout = 60000 } = {}) {
  const t0 = Date.now();
  const idle = await page.evaluate(({ quiet, timeout }) => new Promise((ok) => {
    const busy = () => {
      const st = window.__phlippoStore?.getState?.();
      if (st?.rebuild?.pending) return true;
      try { if (window.__phlippoRefine?.busy?.()) return true; } catch { /* hook not there */ }
      let cam = null;
      try { cam = window.__phlippoCamera; } catch { /* no viewport */ }
      return !!cam?.animating;
    };
    const pose = () => {
      let cam = null;
      try { cam = window.__phlippoCamera; } catch { /* no viewport */ }
      if (!cam?.rotation) return '';
      const q = cam.rotation, c = cam.target;
      return [q.x, q.y, q.z, q.w, c.x, c.y, c.z, cam.scale].map((v) => v.toFixed(6)).join(',');
    };
    const start = performance.now();
    let since = performance.now();
    let rebuild = window.__phlippoStore?.getState?.().rebuild;
    let view = pose();
    const tick = () => {
      const now = performance.now();
      const r = window.__phlippoStore?.getState?.().rebuild;
      const p = pose();
      if (busy() || r !== rebuild || p !== view) { since = now; rebuild = r; view = p; }
      if (now - since >= quiet) { ok(true); return; }
      if (now - start > timeout) { ok(false); return; }
      // a hidden or throttled page draws no frames: a timer keeps the wait going
      setTimeout(tick, 16);
    };
    tick();
  }), { quiet, timeout });
  if (!idle) console.log(`settle: the app was still busy after ${((Date.now() - t0) / 1000).toFixed(0)} s (rebuild pending, refinement or view transition); going on`);
  await frames(page, 2);
}

/** waits until the element with data-testid="id" is visible (or in the state given) */
export async function waitTestId(page, id, { state = 'visible', timeout = 30000 } = {}) {
  await page.locator(`[data-testid="${id}"]`).first().waitFor({ state, timeout });
}
