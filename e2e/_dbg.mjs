import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); });
await page.reload(); await page.waitForSelector('.k-viewport'); await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => { const K = window.__phlippoKit; let sk = K.createSketch('s1','Sketch1','top'); sk = K.addLine(sk,{x:-30,y:-20},{x:30,y:-20})[0]; sk = K.addLine(sk,{x:30,y:-20},{x:30,y:20})[0]; sk = K.addLine(sk,{x:30,y:20},{x:-30,y:20})[0]; sk = K.addLine(sk,{x:-30,y:20},{x:-30,y:-20})[0]; let p2 = K.createSketch('s3','Profile2','top'); p2 = K.addLine(p2,{x:20,y:-10},{x:40,y:-10})[0]; p2 = K.addLine(p2,{x:40,y:-10},{x:40,y:10})[0]; p2 = K.addLine(p2,{x:40,y:10},{x:20,y:10})[0]; p2 = K.addLine(p2,{x:20,y:10},{x:20,y:-10})[0]; const d = K.createDocument('P'); d.sketches={s1:sk, s3:p2}; d.features=[{id:'k1',type:'sketch',name:'Sketch1',sketchId:'s1',suppressed:false},{id:'k3',type:'sketch',name:'Profile2',sketchId:'s3',suppressed:false}]; window.__phlippoStore.getState().openDocument(d); });
await page.waitForTimeout(600);
await page.evaluate(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k1' }); window.__phlippoStore.getState().startFeature('loft', 'boss'); });
await page.waitForTimeout(500);
const r = await page.evaluate(() => {
  const q = (t) => document.querySelectorAll(`[data-testid="${t}"]`).length;
  const txt = document.body.innerText.replace(/\s+/g, ' ');
  const i = txt.indexOf('Loft1');
  return { cl: q('loft-centerline'), start: q('loft-start'), guides: q('loft-guides'), drag: q('loft-dragsketch'), txt: txt.slice(Math.max(0, i), i + 600) };
});
console.log(JSON.stringify(r));
await browser.close();
