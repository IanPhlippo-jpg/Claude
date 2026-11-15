// Het toestel in 3D voor de klant en de werkplaats (browser, three.js), in studio-weergave: gestructureerde poedercoat,
// chroom en leer als PBR-materialen, studiolicht (sleutel-, vul- en strijklicht) met omgevingsreflectie, zachte schaduwen
// en ambient occlusion (GTAO) op een lichte studiovloer. Kokers met afgeronde hoeken (EN 10219, ovaalbuis met halfronde
// zijden), kussens met afgeronde randen, katrol- en stapelkappen met kijkvenster, typeplaatje en instructieplaat als
// textuur. Slepen = draaien, scrollen of knijpen = zoomen. 'three' en 'three/addons/' komen uit de importmap van de
// pagina of worden gebundeld (presentatie).
import { RAL_FITNESS, BEKLEDING } from './onderdelen.mjs';

const v3 = (p) => [p[0], p[2], -p[1]]; // model (z omhoog) -> three (y omhoog)
/** rechthoek b x h met afgeronde hoeken r, gecentreerd (three Shape) */
function rondRechthoek(THREE, b, h, r) {
  const s = new THREE.Shape(), x = -b / 2, y = -h / 2; r = Math.min(r, b / 2 - 0.01, h / 2 - 0.01);
  s.moveTo(x + r, y); s.lineTo(x + b - r, y); s.quadraticCurveTo(x + b, y, x + b, y + r); s.lineTo(x + b, y + h - r); s.quadraticCurveTo(x + b, y + h, x + b - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
/** het typeplaatje (EN ISO 20957-1: fabrikant, type, klasse, max. gebruiker, waarschuwingen) */
function plaatTextuur(THREE, o) {
  if (typeof document === 'undefined') return null;
  const [c, x] = canvas(284, 200);
  x.fillStyle = '#d4d8dc'; x.fillRect(0, 0, 284, 200); x.fillStyle = '#16181b'; x.fillRect(0, 0, 284, 34);
  x.fillStyle = '#fff'; x.font = 'bold 20px sans-serif'; x.fillText(`${o.id} ${(o.uitvoering ?? o.versie).toUpperCase()}`, 10, 24);
  x.fillStyle = '#16181b'; x.font = 'bold 15px sans-serif'; x.fillText(`ontworpen volgens EN ISO 20957 · ${o.V.klasse}`, 10, 58);
  x.font = '14px sans-serif'; x.fillText(`Max. gebruiker ${o.V.gebruiker} kg`, 10, 82); x.fillText(o.maxLast ? `Max. last ${o.maxLast} kg` : 'Last: zie handleiding', 10, 104);
  x.fillStyle = '#b42318'; x.font = 'bold 12px sans-serif'; x.fillText('PROTOTYPE: proeflast nodig', 150, 104);
  x.fillStyle = '#c2410c'; x.beginPath(); x.moveTo(30, 122); x.lineTo(52, 160); x.lineTo(8, 160); x.closePath(); x.fill();
  x.fillStyle = '#16181b'; x.font = '12px sans-serif'; x.fillText('Lees de handleiding.', 62, 136); x.fillText('Vrije zone 0,6 m rondom.', 62, 154); x.fillText('Kinderen weghouden.', 62, 172);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2; return t;
}
/** een gatnummer (transparant, cijfers in de kleur k) */
function nummerTextuur(THREE, nr, k) {
  if (typeof document === 'undefined') return null;
  const [c, x] = canvas(64, 64);
  x.fillStyle = k; x.font = `bold ${nr > 9 ? 34 : 44}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(nr), 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2; return t;
}
/** de instructieplaat: naam van het toestel, de oefeningen en de spieren */
function instructieTextuur(THREE, o) {
  if (typeof document === 'undefined') return null;
  const [c, x] = canvas(300, 420), oef = (o.def?.oefeningen ?? []).slice(0, 4);
  x.fillStyle = '#1b1d20'; x.fillRect(0, 0, 300, 420); x.fillStyle = '#e8590c'; x.fillRect(0, 0, 300, 10);
  x.fillStyle = '#fff'; x.font = 'bold 26px sans-serif'; x.fillText(o.id, 18, 50); x.font = 'bold 19px sans-serif';
  const woorden = (o.naam ?? '').split(' '); let r = '', y = 82; for (const w of woorden) { if (x.measureText(`${r} ${w}`).width > 260) { x.fillText(r, 18, y); y += 24; r = w; } else r = `${r} ${w}`.trim(); } x.fillText(r, 18, y);
  x.fillStyle = '#9aa3aa'; x.font = '14px sans-serif'; x.fillText('OEFENINGEN', 18, y + 40);
  x.fillStyle = '#fff'; x.font = '16px sans-serif'; oef.forEach((t, i) => x.fillText(`${i + 1}. ${t}`.slice(0, 30), 18, y + 66 + i * 26));
  x.fillStyle = '#9aa3aa'; x.font = '14px sans-serif'; x.fillText('SPIEREN', 18, 360); x.fillStyle = '#fff'; x.font = '13px sans-serif'; x.fillText(String(o.def?.spieren ?? '').slice(0, 38), 18, 382);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2; return t;
}
/** de logoplaat: plaats voor het merk (placeholder tot de zaak een naam heeft) */
function logoTextuur(THREE) {
  if (typeof document === 'undefined') return null;
  const [c, x] = canvas(512, 128);
  x.fillStyle = '#121315'; x.fillRect(0, 0, 512, 128); x.strokeStyle = '#3a3d41'; x.lineWidth = 6; x.strokeRect(10, 10, 492, 108);
  x.fillStyle = '#d9dcdf'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.fillText('LOGO', 256, 84);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** fijne korrel van poedercoat of leer als normal map (ruis, herhaald) */
function korrel(THREE, n, sterkte) {
  if (typeof document === 'undefined') return null;
  const [c, x] = canvas(n, n), img = x.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const a = (Math.random() - 0.5) * sterkte, b = (Math.random() - 0.5) * sterkte; img.data[i * 4] = 128 + a; img.data[i * 4 + 1] = 128 + b; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}
/** studioachtergrond: zachte verloop van licht naar wit */
function studio(THREE) {
  if (typeof document === 'undefined') return new THREE.Color('#e4e2de');
  const [c, x] = canvas(16, 512), gr = x.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#f6f5f2'); gr.addColorStop(0.55, '#e7e5e1'); gr.addColorStop(1, '#d6d3cd'); x.fillStyle = gr; x.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** maakt de 3D in 'houder'; geeft { toon(o, { ral, leer, accent }), herstel(), kijkNaar(pos, doel), beeld() } */
export async function scene3d(houder) {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  houder.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), STUDIO = '#e4e1dc'; scene.background = new THREE.Color(STUDIO); void studio; // de vloer loopt in mist over in de achtergrond (hoekloze studio)
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
  // studiolicht: sleutellicht met zachte schaduw, vullicht en strijklicht van achter
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9b4ab', 0.35));
  const zon = new THREE.DirectionalLight('#fff8ef', 2.4); zon.castShadow = true; zon.shadow.mapSize.set(4096, 4096); zon.shadow.bias = -0.0002; zon.shadow.normalBias = 1.5; scene.add(zon, zon.target);
  const vul = new THREE.DirectionalLight('#e8f0ff', 0.55), strijk = new THREE.DirectionalLight('#ffffff', 1.3); scene.add(vul, strijk);
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 100000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.maxPolarAngle = Math.PI * 0.495;
  houder.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }, { capture: true });
  // ambient occlusion (GTAO) als nabewerking; lukt het niet (oude GPU), dan gewoon zonder
  let composer = null;
  try {
    const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/GTAOPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 800, 600); ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 0.85; ao.updateGtaoMaterial({ radius: 0.25, distanceExponent: 1, thickness: 1, scale: 1 }); composer.addPass(ao); composer.addPass(new OutputPass());
    composer.ao = ao;
  } catch { composer = null; }
  renderer.domElement.dataset.ao = composer ? 'gtao' : 'geen';
  let groep = null, kijk = null, bewogen = false;
  const teken = () => (composer ? composer.render() : renderer.render(scene, camera));
  controls.addEventListener('change', teken); controls.addEventListener('start', () => { bewogen = true; });
  const maat = () => { const w = houder.clientWidth || 600, h = houder.clientHeight || 400; renderer.setSize(w, h, false); composer?.setSize(w, h); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); if (!bewogen && kijk) herstel(); else teken(); };
  new ResizeObserver(maat).observe(houder);
  function herstel() { if (!kijk) return; camera.position.copy(kijk.pos); controls.target.copy(kijk.doel); controls.update(); teken(); }
  const ruis = { coat: korrel(THREE, 256, 60), leer: korrel(THREE, 256, 120) };

  /** een balk uit het model als mesh */
  const mesh = (g, mat) => {
    const A = new THREE.Vector3(...v3(g.a)), B = new THREE.Vector3(...v3(g.b)), L = A.distanceTo(B);
    if (L < 0.3) return null;
    const x = new THREE.Vector3(...v3(g.u)), y = new THREE.Vector3(...v3(g.v)), z = new THREE.Vector3(...v3(g.w));
    let geo;
    if (g.rond || g.zes) { geo = new THREE.CylinderGeometry(g.bw / 2, g.bh / 2, L, g.zes ? 6 : g.bw > 200 ? 48 : g.gat || g.kleur === 'gatrand' ? 24 : 28); geo.rotateZ(-Math.PI / 2); }
    else if (g.kussen && L > 60 && g.bw > 60) {
      const e = 12, sh = rondRechthoek(THREE, L - 2 * e, g.bw - 2 * e, 30);
      geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(1, g.bh - 2 * e), bevelEnabled: true, bevelThickness: e, bevelSize: e, bevelSegments: 5, curveSegments: 8 }); geo.translate(0, 0, -(g.bh - 2 * e) / 2);
    } else if (g.r && L >= 1.5) {
      // koker met afgeronde hoeken (2t) of ovaalbuis (r = halve hoogte)
      geo = new THREE.ExtrudeGeometry(rondRechthoek(THREE, g.bw, g.bh, g.r), { depth: L, bevelEnabled: false, curveSegments: g.r > 10 ? 10 : 3 }); geo.translate(0, 0, -L / 2);
      geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    } else geo = new THREE.BoxGeometry(L, g.bw, g.bh);
    const m = new THREE.Mesh(geo, mat); m.castShadow = !mat.transparent; m.receiveShadow = true;
    m.matrix.makeBasis(x, y, z); m.matrix.setPosition(A.clone().add(B).multiplyScalar(0.5)); m.matrixAutoUpdate = false;
    return m;
  };
  function toon(o, keuzes = {}) {
    if (groep) { scene.remove(groep); groep.traverse((x) => { x.geometry?.dispose(); }); }
    groep = new THREE.Group();
    const ral = RAL_FITNESS.find((c) => c.code === (keuzes.ral ?? o.stijl?.ral)) ?? RAL_FITNESS[0], leer = BEKLEDING.find((c) => c.code === keuzes.leer) ?? BEKLEDING[0];
    const accent = keuzes.accent ?? o.stijl?.accent ?? '#d9a400';
    const std = (kleur, r, m, extra = {}) => new THREE.MeshStandardMaterial({ color: kleur, roughness: r, metalness: m, ...extra });
    const M = {
      // poedercoat: satijn met een lichte toplaag (glans op de randen), fijne korrel
      frame: new THREE.MeshPhysicalMaterial({ color: ral.hex, roughness: 0.5, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.32, normalMap: ruis.coat, normalScale: new THREE.Vector2(0.12, 0.12) }),
      leer: std(leer.hex, 0.72, 0, { normalMap: ruis.leer, normalScale: new THREE.Vector2(0.35, 0.35) }),
      bies: std(leer.hex, 0.5, 0), naad: std('#0e0f10', 0.8, 0),
      hout: std('#c8a878', 0.8, 0), zink: std('#c9ced3', 0.32, 0.85),
      chroom: std('#f2f4f6', 0.07, 1, { envMapIntensity: 1.3 }), kartel: std('#9aa1a7', 0.5, 0.95),
      rubber: std('#1c1d1f', 0.95, 0), eindkap: std('#141516', 0.6, 0.1), uhmw: std('#f0f0ee', 0.45, 0),
      kabel: std('#151515', 0.55, 0.2), katrol: std('#2e3135', 0.45, 0.2), stapel: std('#33373c', 0.4, 0.55),
      schijf: std('#1d1f22', 0.85, 0.05), ring: std('#7d838a', 0.35, 0.8),
      accent: std(accent, 0.45, 0.05), logo: std('#ffffff', 0.4, 0.2, { map: logoTextuur(THREE) }),
      kappaneel: std(o.stijl?.kap ?? ral.hex, 0.36, 0.55, { normalMap: ruis.coat, normalScale: new THREE.Vector2(0.1, 0.1), side: THREE.DoubleSide }),
      venster: std('#c9d6df', 0.05, 0, { transparent: true, opacity: 0.25, depthWrite: false }),
      instructie: std('#ffffff', 0.5, 0.1, { map: instructieTextuur(THREE, o) }),
      gat: new THREE.MeshBasicMaterial({ color: '#0a0a0a' }), gatrand: std('#3a3d41', 0.4, 0.6),
      typeplaat: std('#ffffff', 0.4, 0.3, { map: plaatTextuur(THREE, o) }),
      kap: std(ral.hex, 0.5, 0.2, { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
      context: std('#9a9a9a', 0.8, 0, { transparent: true, opacity: 0.35, depthWrite: false }),
    };
    const geo = [...o.delen.flatMap((d) => d.geo), ...o.kussens.flatMap((d) => d.geo), ...o.koop.flatMap((d) => d.geo), ...(o.detail ?? []), ...o.toon, ...(o.context ?? [])];
    // gatnummers: één doorzichtige textuur per cijfer, wit op een donker frame en zwart op een licht frame
    const licht = parseInt(ral.hex.slice(1, 3), 16) + parseInt(ral.hex.slice(3, 5), 16) + parseInt(ral.hex.slice(5, 7), 16) > 380, nrMat = new Map();
    const nummer = (nr) => { if (!nrMat.has(nr)) { const t = nummerTextuur(THREE, nr, licht ? '#16181b' : '#eceef0'); nrMat.set(nr, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); } return nrMat.get(nr); };
    for (const g of geo) { const m = mesh(g, g.kleur === 'nummer' ? nummer(g.nr) : M[g.kleur] ?? M.frame); if (m) { if (g.kleur === 'nummer') m.castShadow = false; groep.add(m); } }
    // studiovloer (vangt de schaduw) en muur
    const [mn, mx] = o.box, cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, R = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    const vloer = new THREE.Mesh(new THREE.CircleGeometry(R * 6, 64), new THREE.MeshStandardMaterial({ color: '#dedbd5', roughness: 0.9, metalness: 0 }));
    vloer.rotation.x = -Math.PI / 2; vloer.position.set(cx, -0.5, -cy); vloer.receiveShadow = true; groep.add(vloer);
    if (o.muur != null) { const muur = new THREE.Mesh(new THREE.BoxGeometry(R * 3, R * 1.6, 40), new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.95 })); muur.position.set(cx, R * 0.8, -(o.muur + 20)); muur.receiveShadow = true; groep.add(muur); }
    scene.add(groep); scene.fog = new THREE.Fog(STUDIO, R * 3, R * 7);
    zon.position.set(cx - R * 1.0, R * 2.6, -cy + R * 1.4); zon.target.position.set(cx, 0, -cy);
    vul.position.set(cx + R * 1.6, R * 0.8, -cy + R * 1.2); strijk.position.set(cx + R * 0.5, R * 1.5, -cy - R * 2.2);
    const s = zon.shadow.camera; s.left = -R * 1.4; s.right = R * 1.4; s.top = R * 1.4; s.bottom = -R * 1.4; s.near = 10; s.far = R * 8; s.updateProjectionMatrix();
    const rs = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2, c = new THREE.Vector3(cx, (mn[2] + mx[2]) / 2 * 0.95, -cy), afst = (rs / Math.sin((camera.fov * Math.PI) / 360)) * Math.max(0.8, Math.min(1, 1.25 / Math.max(1, camera.aspect)));
    const dir = new THREE.Vector3(-0.72, 0.36, 0.86).normalize();
    kijk = { pos: c.clone().add(dir.multiplyScalar(afst)), doel: c };
    camera.near = R / 50; camera.far = R * 30; camera.updateProjectionMatrix();
    if (composer?.ao) composer.ao.updateGtaoMaterial({ radius: R * 0.02, distanceExponent: 1, thickness: R * 0.01, scale: 1 });
    bewogen = false; herstel(); maat();
  }
  /** camera op een plek zetten (model-mm): pos = waar de camera staat, doel = waar hij naar kijkt */
  const kijkNaar = (pos, doel) => { camera.position.set(...v3(pos)); controls.target.set(...v3(doel)); controls.update(); bewogen = true; teken(); };
  return { toon, herstel, kijkNaar, beeld: () => { teken(); return renderer.domElement.toDataURL('image/jpeg', 0.9); } };
}
