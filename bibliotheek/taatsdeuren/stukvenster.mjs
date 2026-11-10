// Venster om op één onderdeel in te zoomen (browser): het detailblad A4 (scroll of knijp om te zoomen, slepen om te
// verschuiven, dubbelklik = 2x) en de 3D-vorm van het stuk (draaien, zoomen naar de muis, naar een uiteinde springen).
// Vorige/volgende met de knoppen of de pijltjes. three.js wordt pas geladen als je de 3D opent (importmap 'three').
import { vorm3d, W4, H4 } from './detail.mjs';

const CSS = `
.sv { width: min(1200px, calc(100vw - 16px)); height: min(860px, calc(100dvh - 16px)); max-width: none; max-height: none; padding: 0; border: 1px solid var(--lijn, #ccc); background: var(--vlak, #fff); color: var(--inkt, #111); overflow: hidden }
.sv::backdrop { background: rgba(10, 12, 14, .55) }
.sv[open] { display: grid; grid-template-rows: auto 1fr auto }
.sv-kop { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding: 8px 10px; border-bottom: 1px solid var(--lijn, #ccc) }
.sv-kop h3 { flex: 1 1 260px; min-width: 0; font-size: 18px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.sv-kop h3 small { font: 13px var(--tekst, sans-serif); color: var(--zacht, #666); margin-left: 6px }
.sv button { font: 600 13.5px var(--tekst, sans-serif); min-height: 36px; padding: 6px 11px; border: 1px solid var(--inkt, #111); background: transparent; color: var(--inkt, #111); cursor: pointer }
.sv button:hover { background: var(--inkt, #111); color: var(--bg, #fff) } .sv button[aria-pressed="true"] { background: var(--inkt, #111); color: var(--bg, #fff) }
.sv button:disabled { opacity: .4; cursor: default; background: transparent; color: var(--inkt, #111) }
.sv-groep { display: inline-flex } .sv-groep button + button { border-left: 0 }
.sv-vlak { position: relative; overflow: hidden; touch-action: none; background: #e9ebea; cursor: grab; user-select: none }
.sv-vlak:active { cursor: grabbing }
.sv-vlak > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; background: transparent }
.sv-3d { position: relative; background: linear-gradient(#f4f5f4, #dfe2e1) } .sv-3d canvas { display: block; width: 100%; height: 100% }
.sv-3d .sv-info { position: absolute; left: 10px; top: 8px; font: 12.5px var(--mono, monospace); color: #333; background: rgba(255,255,255,.8); padding: 3px 7px; pointer-events: none }
.sv-3d .sv-laden { position: absolute; inset: 0; display: grid; place-items: center; color: #555 }
.sv-voet { padding: 6px 10px; font-size: 12.5px; color: var(--zacht, #666); border-top: 1px solid var(--lijn, #ccc) }
@media (max-width: 640px) { .sv { width: 100vw; height: 100dvh; border: 0 } .sv-kop h3 { flex-basis: 100% } .sv-verberg { display: none } }
@media print { html.druk-stuk body > :not(#stuk-afdruk) { display: none !important } #stuk-afdruk svg { display: block; width: 297mm; height: 210mm } }
#stuk-afdruk { display: none } @media print { html.druk-stuk #stuk-afdruk { display: block } }`;

/** maakt het venster in dlg (een leeg <dialog>); opts: { naar(richting), bewaar(svg, p) } -> { toon({ p, svg, o, i, n }) } */
export function stukVenster(dlg, opts = {}) {
  if (!document.getElementById('sv-css')) document.head.insertAdjacentHTML('beforeend', `<style id="sv-css">${CSS}</style>`);
  dlg.className = 'sv';
  dlg.innerHTML = `<div class="sv-kop"><span class="sv-groep"><button type="button" data-sv="vorige" aria-label="Vorige stuk">‹</button><button type="button" data-sv="volgende" aria-label="Volgende stuk">›</button></span>
<h3 id="sv-titel"></h3>
<span class="sv-groep" role="tablist" aria-label="Weergave"><button type="button" data-zicht="2d" aria-pressed="true">Tekening</button><button type="button" data-zicht="3d" aria-pressed="false">3D</button></span>
<span class="sv-groep" data-alleen="2d"><button type="button" data-sv="min" aria-label="Uitzoomen">−</button><button type="button" data-sv="pas">Passend</button><button type="button" data-sv="plus" aria-label="Inzoomen">+</button></span>
<span class="sv-groep" data-alleen="3d" hidden><button type="button" data-cam="links">Links</button><button type="button" data-cam="geheel">Geheel</button><button type="button" data-cam="rechts">Rechts</button></span>
<button type="button" data-sv="druk" class="sv-verberg">Afdrukken</button><button type="button" data-sv="svg" class="sv-verberg">SVG</button><button type="button" data-sv="sluit" aria-label="Sluiten">✕</button></div>
<div class="sv-vlak" data-paneel="2d"></div><div class="sv-3d" data-paneel="3d" hidden><div class="sv-info"></div><div class="sv-laden">3D laden…</div></div>
<p class="sv-voet" id="sv-voet">Scroll of knijp om te zoomen, sleep om te verschuiven, dubbelklik zoomt in. Pijltjes links en rechts: vorige en volgende stuk.</p>`;
  const $ = (s) => dlg.querySelector(s), vlak = $('.sv-vlak'), drieVak = $('.sv-3d');
  let nu = null, zicht = '2d', z = 1, tx = 0, ty = 0, svgEl = null, gepast = true;
  // ---- 2D: de SVG is altijd zo groot als het vlak; zoomen en verschuiven = het zichtvenster (viewBox) verzetten. Zo blijft
  // de tekening scherp en wordt het element nooit groter dan het scherm (een SVG van tienduizenden pixels tekent de
  // browser niet meer goed: stukken blijven leeg of flikkeren). z = pixels per 1/4 mm, tx/ty = waar de hoek van het blad staat.
  const zet = () => { if (!svgEl) return; const w = vlak.clientWidth, h = vlak.clientHeight; if (!w || !h) return; const k = 4 * z; svgEl.setAttribute('viewBox', `${-tx / k} ${-ty / k} ${w / k} ${h / k}`); };
  const pas = () => { const r = vlak.getBoundingClientRect(); if (!r.width) return; z = Math.min((r.width - 16) / (W4 * 4), (r.height - 16) / (H4 * 4)); tx = (r.width - W4 * 4 * z) / 2; ty = (r.height - H4 * 4 * z) / 2; gepast = true; zet(); };
  const zoom = (f, cx, cy) => { const nz = Math.min(40, Math.max(0.08, z * f)); tx = cx - ((cx - tx) * nz) / z; ty = cy - ((cy - ty) * nz) / z; z = nz; gepast = false; zet(); };
  const midden = () => { const r = vlak.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
  vlak.addEventListener('wheel', (e) => { e.preventDefault(); const r = vlak.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0018)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  vlak.addEventListener('dblclick', (e) => { const r = vlak.getBoundingClientRect(); zoom(2, e.clientX - r.left, e.clientY - r.top); });
  const wijzers = new Map();
  let knijp = null;
  vlak.addEventListener('pointerdown', (e) => { vlak.setPointerCapture(e.pointerId); wijzers.set(e.pointerId, [e.clientX, e.clientY]); knijp = null; });
  vlak.addEventListener('pointermove', (e) => {
    if (!wijzers.has(e.pointerId)) return;
    const oud = wijzers.get(e.pointerId); wijzers.set(e.pointerId, [e.clientX, e.clientY]);
    if (wijzers.size === 1) { tx += e.clientX - oud[0]; ty += e.clientY - oud[1]; gepast = false; zet(); return; }
    const [a, b] = [...wijzers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = vlak.getBoundingClientRect(), m = [(a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top];
    if (knijp) { tx += m[0] - knijp.m[0]; ty += m[1] - knijp.m[1]; zoom(d / knijp.d, m[0], m[1]); }
    knijp = { d, m };
  });
  const los = (e) => { wijzers.delete(e.pointerId); knijp = null; };
  vlak.addEventListener('pointerup', los); vlak.addEventListener('pointercancel', los);
  // ---- 3D
  let drie = null, laden = null;
  async function maak3d() {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.25;
    drieVak.append(r.domElement);
    const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(32, 1, 1, 1e6), ctl = new OrbitControls(cam, r.domElement);
    ctl.enableDamping = true; ctl.zoomToCursor = true; ctl.screenSpacePanning = true;
    const licht = new THREE.DirectionalLight(0xffffff, 1.4); licht.position.set(0.4, 1, 0.6); const vul = new THREE.DirectionalLight(0xffffff, 0.75); vul.position.set(-0.6, -0.8, 0.5); cam.add(licht, vul); scene.add(cam, new THREE.HemisphereLight(0xffffff, 0xc4c8cb, 0.9));
    const groep = new THREE.Group(); scene.add(groep);
    const maat = () => { const w = drieVak.clientWidth, h = drieVak.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    new ResizeObserver(maat).observe(drieVak); maat();
    // het dichtste en verste vlak van de camera schuiven mee met de afstand: anders snijdt de camera bij dicht inzoomen de
    // voorkant van het profiel weg (je kijkt dan door de wand)
    let vorige = 0;
    r.setAnimationLoop(() => {
      if (drieVak.hidden || !dlg.open) return;
      ctl.update();
      const d = cam.position.distanceTo(ctl.target);
      if (Math.abs(d - vorige) > vorige * 0.05) { vorige = d; cam.near = Math.max(0.05, d / 400); cam.far = d * 400 + 10000; cam.updateProjectionMatrix(); }
      r.render(scene, cam);
    });
    ctl.minDistance = 3;
    drieVak.querySelector('.sv-laden').remove();
    return { THREE, r, scene, cam, ctl, groep, maat, box: null };
  }
  function bouw(p, o) {
    const { THREE, groep, cam, ctl } = drie;
    for (const c of [...groep.children]) { c.geometry?.dispose(); groep.remove(c); }
    groep.position.set(0, 0, 0);
    const v = vorm3d(p, o), spiegel = p.soort === 'staaf' || !!p.vorm?.l;
    const staal = new THREE.MeshStandardMaterial({ color: 0xa9b0b6, metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide });
    const glas = new THREE.MeshPhysicalMaterial({ color: 0xd4e6eb, roughness: 0.04, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const kunststof = new THREE.MeshStandardMaterial({ color: 0xc9a64a, roughness: 0.7 }), lijn = new THREE.LineBasicMaterial({ color: 0x15181b }), donker = new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.6 });
    for (const d of v.delen) {
      if (d.pts.length < 3) continue;
      const Y = (y) => (spiegel ? -y : y), sh = new THREE.Shape(d.pts.map(([x, y]) => new THREE.Vector2(x, Y(y))));
      for (const [x, y, rr] of d.gaten) { const h = new THREE.Path(); h.absarc(x, Y(y), rr, 0, Math.PI * 2, true); sh.holes.push(h); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: d.z1 - d.z0, bevelEnabled: false, curveSegments: 40 });
      geo.translate(0, 0, d.z0);
      groep.add(new THREE.Mesh(geo, d.glas ? glas : d.iso ? kunststof : staal), new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lijn));
    }
    if (v.cilinder) {
      const { L, r, gaten } = v.cilinder, geo = new THREE.CylinderGeometry(r, r, L, 56, 1);
      geo.rotateZ(Math.PI / 2); geo.translate(L / 2, -r, r);
      groep.add(new THREE.Mesh(geo, staal), new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lijn));
      for (const u of gaten) { const gat = new THREE.CylinderGeometry(3.4, 3.4, 2 * r + 0.6, 24); gat.translate(u, -r, r); groep.add(new THREE.Mesh(gat, donker)); }
    }
    const box = new THREE.Box3().setFromObject(groep), c = box.getCenter(new THREE.Vector3());
    groep.position.sub(c); box.translate(c.clone().negate()); drie.box = box;
    // kijkrichting naar een uiteinde: loodrecht op de zaagsnede (zo zie je in de koker), wat van voren en van boven
    drie.einde = {};
    if (p.soort === 'staaf') {
      const s = [...p.vorm.pts].map(([x, y]) => [x, -y]).sort((a, b) => a[0] - b[0]);
      for (const [k, a, b, teken] of [['links', s[0], s[1], -1], ['rechts', s.at(-1), s.at(-2), 1]]) {
        let n = [-(b[1] - a[1]), b[0] - a[0]]; const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l];
        if (Math.sign(n[0]) !== teken) n = [-n[0], -n[1]];
        drie.einde[k] = new THREE.Vector3(n[0] * 0.9, n[1] * 0.9 + 0.3, 0.55).normalize();
      }
    }
    camNaar('geheel');
    const s = box.getSize(new THREE.Vector3());
    drieVak.querySelector('.sv-info').textContent = `${Math.round(s.x)} x ${Math.round(s.y)} x ${Math.round(s.z)} mm${v.profiel ? ` · ${v.profiel.naam}` : ''}`;
    dlg.querySelectorAll('[data-cam="links"], [data-cam="rechts"]').forEach((b) => { b.disabled = !(p.soort === 'staaf' && s.x > 6 * Math.max(s.y, s.z)); });
    ctl.update(); cam.updateProjectionMatrix();
  }
  function camNaar(waar) {
    const { THREE, cam, ctl, box } = drie, s = box.getSize(new THREE.Vector3()), dir = drie.einde?.[waar] ?? new THREE.Vector3(0.62, 0.55, 1).normalize();
    let doel = new THREE.Vector3(), r = s.length() / 2;
    if (waar !== 'geheel') { const k = Math.max(s.y, s.z); doel = new THREE.Vector3(waar === 'links' ? box.min.x + k * 1.2 : box.max.x - k * 1.2, 0, 0); r = k * 2.4; }
    const afstand = (r / Math.sin(((cam.fov / 2) * Math.PI) / 180)) * 1.05;
    cam.near = afstand / 200; cam.far = afstand * 200; cam.position.copy(doel).addScaledVector(dir, afstand); ctl.target.copy(doel); cam.updateProjectionMatrix(); ctl.update();
  }
  async function toon3d() {
    if (!drie) { laden ??= maak3d().catch((e) => { drieVak.querySelector('.sv-laden').textContent = '3D lukt niet in deze browser.'; console.warn(e); return null; }); drie = await laden; if (!drie) return; }
    drie.maat(); bouw(nu.p, nu.o);
  }
  // ---- weergave wisselen, knoppen
  const kies = (w) => { zicht = w; $('#sv-voet').textContent = w === '3d' ? 'Slepen = draaien, rechts slepen of twee vingers = verschuiven, scroll of knijp = zoomen naar de muis. Links / Rechts: naar een uiteinde.' : 'Scroll of knijp om te zoomen, sleep om te verschuiven, dubbelklik zoomt in. Pijltjes links en rechts: vorige en volgende stuk.'; dlg.querySelectorAll('[data-zicht]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.zicht === w)); dlg.querySelectorAll('[data-paneel]').forEach((x) => { x.hidden = x.dataset.paneel !== w; }); dlg.querySelectorAll('[data-alleen]').forEach((x) => { x.hidden = x.dataset.alleen !== w; }); if (w === '3d' && nu) toon3d(); else requestAnimationFrame(pas); };
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.zicht) kies(b.dataset.zicht);
    else if (b.dataset.cam && drie) camNaar(b.dataset.cam);
    else if (b.dataset.sv === 'sluit') dlg.close();
    else if (b.dataset.sv === 'vorige') opts.naar?.(-1);
    else if (b.dataset.sv === 'volgende') opts.naar?.(1);
    else if (b.dataset.sv === 'plus') zoom(1.6, ...midden());
    else if (b.dataset.sv === 'min') zoom(1 / 1.6, ...midden());
    else if (b.dataset.sv === 'pas') pas();
    else if (b.dataset.sv === 'druk') druk(nu.svg);
    else if (b.dataset.sv === 'svg') opts.bewaar?.(nu.svg, nu.p);
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); opts.naar?.(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); opts.naar?.(1); }
    else if (zicht === '2d' && (e.key === '+' || e.key === '=')) zoom(1.6, ...midden()); else if (zicht === '2d' && e.key === '-') zoom(1 / 1.6, ...midden()); else if (zicht === '2d' && e.key === '0') pas();
  });
  new ResizeObserver(() => { if (zicht === '2d' && dlg.open) { if (gepast) pas(); else zet(); } }).observe(vlak);
  function druk(svg) {
    let vak = document.getElementById('stuk-afdruk');
    if (!vak) { vak = document.createElement('div'); vak.id = 'stuk-afdruk'; document.body.append(vak); }
    vak.innerHTML = svg;
    const pg = document.createElement('style'); pg.textContent = '@page { size: 297mm 210mm; margin: 0 }'; document.head.append(pg);
    document.documentElement.classList.add('druk-stuk');
    const klaar = () => { document.documentElement.classList.remove('druk-stuk'); pg.remove(); vak.innerHTML = ''; removeEventListener('afterprint', klaar); };
    addEventListener('afterprint', klaar); print(); setTimeout(() => { if (document.documentElement.classList.contains('druk-stuk') && !matchMedia('print').matches) klaar(); }, 1500);
  }
  return {
    /** { p, svg, o, i, n }: positie, detailblad, ontwerp, volgnummer en aantal */
    toon(x) {
      const zelfde = nu && nu.p.pos === x.p.pos && nu.o === x.o;
      nu = x;
      $('#sv-titel').innerHTML = `${x.p.pos}. ${esc(x.p.naam)} <small>${x.p.n} st · ${esc(x.p.maat || x.p.mat)} · ${x.i + 1} van ${x.n}</small>`;
      vlak.innerHTML = x.svg; svgEl = vlak.querySelector('svg'); svgEl.removeAttribute('width'); svgEl.removeAttribute('height');
      dlg.querySelector('[data-sv="vorige"]').disabled = x.i === 0; dlg.querySelector('[data-sv="volgende"]').disabled = x.i === x.n - 1;
      if (!dlg.open) dlg.showModal();
      if (zicht === '3d') toon3d(); else if (!zelfde || gepast) { pas(); requestAnimationFrame(pas); } else zet();
    },
    sluit() { dlg.close(); },
  };
}
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
