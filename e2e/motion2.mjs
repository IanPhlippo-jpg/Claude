// Motion Study (Block D2): Basic Motion with gravity and contact, Animation Wizard, Autokey / Add Key, Loop playback,
// Linear motor with a Distance profile, Results and Plots, Motion Study Properties.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const pin = JSON.parse(readFileSync('voorbeelden/deurkruk/Vierkantstift.kcad', 'utf8')); delete pin.format;
const rozet = JSON.parse(readFileSync('voorbeelden/deurkruk/Rozet.kcad', 'utf8')); delete rozet.format;
// a rosette lying flat (fixed) and a pin 60 mm above it, no mates
await S(({ pin, rozet }) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Drop', 'assembly');
  const q = [Math.sin(-Math.PI / 4), 0, 0, Math.cos(-Math.PI / 4)];
  d.components = [{ id: 'g', name: 'Rozet<1>', part: rozet, position: [0, 0, 0], rotation: q, fixed: true, suppressed: false }, { id: 'p', name: 'Vierkantstift<1>', part: pin, position: [0, 60, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
}, { pin, rozet });
await page.waitForTimeout(1200);
await page.click('[data-testid="motion-tab"]');
await page.waitForTimeout(300);
await page.selectOption('[data-testid="motion-type"]', 'basic');
await page.click('[data-testid="motion-gravity"]');
await page.waitForTimeout(200);
await page.click('[data-testid="motion-edit-ok"]');
await page.click('[data-testid="motion-contact"]');
await page.waitForTimeout(200);
await page.click('[data-testid="motion-edit-ok"]');
await page.waitForTimeout(200);
check('Gravity and Contact1 in the MotionManager tree', (await page.locator('.k-motion-row:has-text("Gravity")').count()) === 1 && (await page.locator('.k-motion-row:has-text("Contact1")').count()) === 1);
await page.click('[data-testid="motion-calc"]');
await page.waitForTimeout(400);
const sim = await S(() => { const s = window.__phlippoStore.getState().motionSim; return s ? s.frames.p?.slice(-1)[0] : null; });
check('Basic Motion: the pin falls and stops on the rosette', sim && sim[1] < -5 && sim[1] > -70, JSON.stringify(sim));
await page.waitForTimeout(5500);
await page.screenshot({ path: `${OUT}/motion2-basic.png` });

// Animation Wizard: rotate the model once about Y
await page.selectOption('[data-testid="motion-type"]', 'animation');
await page.click('[data-testid="motion-wizard"]');
await page.waitForTimeout(200);
await page.click('[data-testid="motion-edit-ok"]');
await page.waitForTimeout(200);
const wz = await S(() => window.__phlippoStore.getState().doc.motionStudy.wizard);
check('Animation Wizard step stored', wz?.length === 1 && wz[0].kind === 'rotate', JSON.stringify(wz));
await S(() => window.__phlippoStore.getState().setMotionTime(2.5));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/motion2-wizard.png` });

// Add Key: the pin at t = 2 moved
await S(() => { const s = window.__phlippoStore.getState(); s.deleteMotionItem('wizard', '0'); s.setMotionTime(2); s.setMotionAutokey(true); });
await S(() => window.__phlippoStore.getState().moveComponent('p', [40, 0, 0]));
await page.waitForTimeout(200);
const keys = await S(() => window.__phlippoStore.getState().doc.motionStudy.keys);
const pos0 = await S(() => window.__phlippoStore.getState().doc.components.find((c) => c.id === 'p').position);
check('Autokey: the move became a key at 2 s, the assembly pose stayed', keys?.length === 1 && Math.abs(keys[0].position[0] - 40) < 1e-6 && pos0[0] === 0, JSON.stringify({ keys, pos0 }));
check('key point on the timeline', (await page.locator('[data-testid="motion-keypoint"]').count()) >= 1);

// Loop playback
await page.selectOption('[data-testid="motion-playback"]', 'loop');
check('Playback mode Loop', (await S(() => window.__phlippoStore.getState().doc.motionStudy.playback)) === 'loop');

// Linear motor, Distance profile
await page.click('[data-testid="motion-motor"]');
await page.waitForTimeout(200);
await page.click('[data-testid="motor-linear"]');
await page.selectOption('[data-testid="motor-motion"]', 'distance');
await page.click('[data-testid="motor-pm"] .k-pm-ok');
await page.waitForTimeout(200);
const motor = await S(() => window.__phlippoStore.getState().doc.motionStudy.motors[0]);
check('Linear motor with Distance profile', motor.kind === 'linear' && motor.motion === 'distance' && motor.name.startsWith('LinearMotor'), JSON.stringify(motor));

// Results and Plots
await page.click('[data-testid="motion-plot"]');
await page.waitForTimeout(300);
check('Results and Plots: a graph of the displacement', (await page.locator('[data-testid="plot-svg"] polyline').count()) === 1);
await page.screenshot({ path: `${OUT}/motion2-plot.png` });
await S(() => window.__phlippoStore.setState({ motionEdit: null }));

// Motion Study Properties: frames per second
await page.click('[data-testid="motion-props"]');
await page.waitForTimeout(200);
await page.locator('[data-testid="motion-edit-pm"] input.k-num').first().fill('30');
await page.locator('[data-testid="motion-edit-pm"] input.k-num').first().press('Tab');
await page.click('[data-testid="motion-edit-ok"]');
await page.waitForTimeout(200);
check('Motion Study Properties: 30 frames per second', (await S(() => window.__phlippoStore.getState().doc.motionStudy.fps)) === 30);

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
