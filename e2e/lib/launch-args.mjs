// Extra browser switches for every e2e script without touching each one: `node --import ./e2e/lib/launch-args.mjs`
// (NODE_OPTIONS) with E2E_BROWSER_ARGS set. Used on the Windows CI runner, which has no graphics card: Edge then needs
// SwiftShader for WebGL, as the Linux runs get through their own launch options.
import { chromium } from 'playwright';

const extra = (process.env.E2E_BROWSER_ARGS ?? '').split(' ').filter(Boolean);
if (extra.length) {
  const launch = chromium.launch.bind(chromium);
  chromium.launch = (options = {}) => launch({ ...options, args: [...(options.args ?? []), ...extra] });
}
