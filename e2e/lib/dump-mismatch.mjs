// Diagnosis aid (QA 0.5.11 F172/F179): with `node --import ./e2e/lib/dump-mismatch.mjs e2e/<script>.mjs`, every
// document on which the kernel cross-check speaks is written to e2e-out/mismatch/<script>-<n>.kcad, so it can be built
// again on both kernels in a unit test (src/qa/qaMismatch.test.ts reads that folder when it exists).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const dir = join('e2e-out', 'mismatch');
const script = basename(process.argv[1] ?? 'script', '.mjs');
let n = 0;
const launch = chromium.launch.bind(chromium);
chromium.launch = async (options) => {
  const browser = await launch(options);
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args);
    await page.exposeFunction('__phlippoOnMismatch', (kcad, features) => {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${script}-${++n}.kcad`), kcad);
      writeFileSync(join(dir, `${script}-${n}.txt`), `features ${features}\n`);
    });
    return page;
  };
  return browser;
};
