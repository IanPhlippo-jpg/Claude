// De deur in een 3D-kamer (browser): een muur met het deurgat (breedte, hoogte en dikte van de muur), een vloer, een
// kamer achter de deur, en de deur uit deuren.ontwerp() in 3D: kozijn, kader, roeden, bogen, glas, panelen en de greep,
// in de gekozen RAL-kleur en afwerking, met het gekozen glas (kleur en structuur, enkel of dubbel). Een pivot draait om
// zijn taatsas, een deur met verdekte scharnieren om de scharnierkant. Three.js: 'three' en 'three/addons/' (importmap
// op de pagina, of gebundeld).
import { veelhoek, MATEN } from './deuren.mjs';
import { band } from './teken.mjs';
import { RAL, AFWERKINGEN, GLAS } from './opties.mjs';

export const MUREN = { wit: ['Wit', '#e6e3dc'], grijs: ['Warm grijs', '#cbc4b9'], groen: ['Groen', '#5c6b5c'], terracotta: ['Terracotta', '#b47358'], blauw: ['Blauwgrijs', '#7d8a94'], donker: ['Antraciet', '#4a4d50'] };
export const VLOEREN = { eik: ['Eik licht', '#c9a77c'], noot: ['Eik donker', '#7b5a3e'], beton: ['Beton', '#a7a5a0'], tegels: ['Tegels zwart-wit', '#ddd'] };

const doek = (n = 512) => { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; };
const rnd0 = (s) => { let r = s; return () => ((r = (r * 16807) % 2147483647) / 2147483647); };

/** procedurele vloer: planken, beton of cementtegels (canvas) */
function vloerTextuur(THREE, soort) {
  const [c, g] = doek(1024), r = rnd0(7);
  if (soort === 'tegels') {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#e9e6df' : '#2a2a2a'; g.fillRect(i * 128, j * 128, 128, 128); }
    g.strokeStyle = 'rgba(120,120,120,.5)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 1024); g.moveTo(0, i * 128); g.lineTo(1024, i * 128); g.stroke(); }
  } else if (soort === 'beton') {
    g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, 1024, 1024);
    for (let n = 0; n < 26000; n++) { const v = 140 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},${0.08 + r() * 0.12})`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 6, 2 + r() * 6); }
  } else {
    const basis = soort === 'noot' ? [118, 86, 58] : [201, 165, 122], bw = 128;
    for (let x = 0; x < 1024; x += bw) {
      let y = -r() * 600;
      while (y < 1024) {
        const l = 500 + r() * 700, f = 0.88 + r() * 0.2;
        g.fillStyle = `rgb(${basis.map((b) => Math.min(255, b * f) | 0).join(',')})`; g.fillRect(x, y, bw, l);
        for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(60,40,20,${0.04 + r() * 0.06})`; g.beginPath(); const xx = x + r() * bw; g.moveTo(xx, y); g.bezierCurveTo(xx + 6, y + l / 3, xx - 6, y + (2 * l) / 3, xx, y + l); g.stroke(); }
        g.fillStyle = 'rgba(40,25,10,.35)'; g.fillRect(x, y, bw, 2); y += l;
      }
      g.fillStyle = 'rgba(40,25,10,.35)'; g.fillRect(x, 0, 2, 1024);
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const n = soort === 'tegels' ? 4.4 : soort === 'beton' ? 2 : 5; t.repeat.set(n, n);
  return t;
}

/** structuur van het glas als reliëf (bumpMap) en lichtere/donkere plekken (map); de UV van de ruiten is in mm */
function glasTextuur(THREE, patroon) {
  const [c, g] = doek(256), [b, h] = doek(256), r = rnd0(11);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); h.fillStyle = '#808080'; h.fillRect(0, 0, 256, 256);
  let tegel = 100;
  if (patroon === 'ribbel') {
    // verticale ribbels van 16 mm: een ronde rug per ribbel
    tegel = 128;
    for (let x = 0; x < 256; x++) { const fase = (x % 32) / 32, v = Math.sin(fase * Math.PI); h.fillStyle = `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`; h.fillRect(x, 0, 1, 256); g.fillStyle = `rgba(200,210,214,${0.25 + 0.5 * (1 - v)})`; g.fillRect(x, 0, 1, 256); }
  } else if (patroon === 'kathedraal') {
    tegel = 220;
    for (let n = 0; n < 70; n++) { const x = r() * 256, y = r() * 256, rr = 10 + r() * 26, gr = h.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); h.fillStyle = gr; h.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
    for (let n = 0; n < 40; n++) { g.fillStyle = `rgba(190,200,204,${0.15 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 20, 6 + r() * 16, r() * 3, 0, 7); g.fill(); }
  } else if (patroon === 'chinchilla') {
    tegel = 60;
    for (let n = 0; n < 900; n++) { const v = r() * 255 | 0; h.fillStyle = `rgb(${v},${v},${v})`; h.fillRect(r() * 256, r() * 256, 3 + r() * 5, 3 + r() * 5); g.fillStyle = `rgba(185,195,200,${0.15 + r() * 0.3})`; g.fillRect(r() * 256, r() * 256, 2 + r() * 4, 2 + r() * 4); }
  } else return null;
  const kaart = new THREE.CanvasTexture(c), reliëf = new THREE.CanvasTexture(b);
  for (const t of [kaart, reliëf]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tegel, 1 / tegel); t.anisotropy = 8; }
  kaart.colorSpace = THREE.SRGBColorSpace;
  return { kaart, reliëf };
}

/** fijnstructuur van de poedercoat als fijn reliëf */
function korrelTextuur(THREE) {
  const [c, g] = doek(256), r = rnd0(3);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let n = 0; n < 9000; n++) { const v = 90 + r() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 40, 1 / 40);
  return t;
}

/** maakt de kamer in 'houder'; geeft { toon(o, keuzes), zet({ open, muur, vloer }), herstel(), beeld() } */
export async function kamer(houder) {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
  houder.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d9d6cf');
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.6; controls.maxDistance = 7.5; controls.maxPolarAngle = Math.PI * 0.53; controls.enablePan = true;
  const teken = () => renderer.render(scene, camera);
  controls.addEventListener('change', teken);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7f70', 0.35));
  const zon = new THREE.DirectionalLight('#fff6e8', 2.6); zon.position.set(3.2, 4.2, 4.5); zon.castShadow = true;
  Object.assign(zon.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1, near: 0.5, far: 14 }); zon.shadow.mapSize.set(2048, 2048); zon.shadow.bias = -0.0004; zon.shadow.normalBias = 0.02;
  scene.add(zon);
  const achterLicht = new THREE.PointLight('#fff1dc', 6, 9, 1.6); achterLicht.position.set(-1, 2.4, -2.6); scene.add(achterLicht);

  const stand = { open: 0, muur: 'wit', vloer: 'eik' };
  const korrel = korrelTextuur(THREE), glasTex = {};
  const mat = {
    staal: new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.8, metalness: 0.3 }),
    glas: new THREE.MeshPhysicalMaterial({ color: '#e6f1f3', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 1.4, side: THREE.DoubleSide }),
    muur: new THREE.MeshStandardMaterial({ color: MUREN.wit[1], roughness: 0.92 }),
    muurAchter: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 }),
    vloer: new THREE.MeshStandardMaterial({ map: vloerTextuur(THREE, 'eik'), roughness: 0.7 }),
    plint: new THREE.MeshStandardMaterial({ color: '#f6f5f2', roughness: 0.8 }),
  };
  let kamerGroep = null, deurGroep = null, draaiers = [], huidig = null, kamerSleutel = '';

  const vorm = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const plaat = (pts, d, m, z = 0) => { const g = new THREE.ExtrudeGeometry(vorm(pts), { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, z - d / 2); const me = new THREE.Mesh(g, m); me.castShadow = m !== mat.glas; me.receiveShadow = true; return me; };

  function bouwKamer(o, dikMm) {
    if (kamerGroep) { scene.remove(kamerGroep); kamerGroep.traverse((x) => x.geometry?.dispose()); }
    const G = new THREE.Group(), B = o.B / 1000, H = o.H / 1000, W = Math.max(7, B + 4), MH = Math.max(3, H + 0.5), dik = dikMm / 1000, voor = 7, achter = 4;
    // de muur als één omtrek met het deurgat als inkeping (het gat staat op de vloer); bij een volle boog rond bovenaan
    const top = o.stijl.vorm === 'volleBoog'
      ? Array.from({ length: 49 }, (_, i) => { const a = Math.PI - (Math.PI * i) / 48; return [(B / 2) * Math.cos(a), H - B / 2 + (B / 2) * Math.sin(a)]; })
      : [[-B / 2, H], [B / 2, H]];
    const muur = vorm([[-W / 2, 0], [-B / 2, 0], ...top, [B / 2, 0], [W / 2, 0], [W / 2, MH], [-W / 2, MH]]);
    const mg = new THREE.ExtrudeGeometry(muur, { depth: dik, bevelEnabled: false, curveSegments: 24 }); mg.translate(0, 0, -dik / 2);
    const mm = new THREE.Mesh(mg, mat.muur); mm.receiveShadow = true; mm.castShadow = true; G.add(mm);
    const vak = (w, h, d, x, y, z, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.receiveShadow = true; G.add(me); return me; };
    const vl = new THREE.Mesh(new THREE.PlaneGeometry(W, voor + achter), mat.vloer); vl.rotation.x = -Math.PI / 2; vl.position.set(0, 0, (voor - achter) / 2); vl.receiveShadow = true; G.add(vl);
    vak(0.1, MH, voor, -W / 2 - 0.05, MH / 2, voor / 2, mat.muur); vak(0.1, MH, voor, W / 2 + 0.05, MH / 2, voor / 2, mat.muur);
    vak(W, MH, 0.1, 0, MH / 2, -achter - 0.05, mat.muurAchter); vak(0.1, MH, achter, -W / 2 - 0.05, MH / 2, -achter / 2, mat.muurAchter); vak(0.1, MH, achter, W / 2 + 0.05, MH / 2, -achter / 2, mat.muurAchter);
    for (const s of [-1, 1]) vak(W / 2 - B / 2, 0.07, 0.012, s * (B / 2 + (W / 2 - B / 2) / 2), 0.035, dik / 2 + 0.006, mat.plint);
    kamerGroep = G; scene.add(G);
  }

  function zetUiterlijk(k = {}) {
    const kleur = RAL.find((c) => c.code === k.ral) ?? RAL[0], af = AFWERKINGEN[k.lak] ?? AFWERKINGEN.fijnstructuur;
    mat.staal.color.set(kleur.hex); mat.staal.roughness = kleur.metallic ? Math.min(af.ruw, 0.45) : af.ruw; mat.staal.metalness = kleur.metallic ? 0.75 : 0.3;
    mat.staal.bumpMap = af.korrel ? korrel : null; mat.staal.bumpScale = 0.6; mat.staal.needsUpdate = true;
    const g = GLAS[k.glas] ?? GLAS.helder;
    if (g.patroon && !glasTex[g.patroon]) glasTex[g.patroon] = glasTextuur(THREE, g.patroon);
    const t = g.patroon ? glasTex[g.patroon] : null;
    mat.glas.color.set(g.tint); mat.glas.opacity = Math.min(0.92, g.dekking + (k.opbouw === 'dubbel' ? 0.06 : 0)); mat.glas.roughness = g.ruw;
    mat.glas.map = t?.kaart ?? null; mat.glas.bumpMap = t?.reliëf ?? null; mat.glas.bumpScale = 2; mat.glas.needsUpdate = true;
  }

  function bouwDeur(o) {
    if (deurGroep) { scene.remove(deurGroep); deurGroep.traverse((x) => x.geometry?.dispose()); }
    const sys = o.sys, D = new THREE.Group(); draaiers = [];
    const zicht = (s) => (s === 'roede' || s === 'boog' ? sys.roede.zicht : s === 'kozijn' || s === 'boogkozijn' ? sys.kozijn.zicht : sys.kader.zicht);
    const diepte = (s) => (s === 'roede' || s === 'boog' ? sys.roede.diepte : s === 'kozijn' || s === 'boogkozijn' ? sys.kozijn.diepte : sys.kader.diepte);
    const deel = (d, Bv, Hv) => plaat(d.a ? veelhoek(d, zicht(d.soort), Bv, Hv) : band(d, zicht(d.soort)), diepte(d.soort), mat.staal);
    for (const d of o.kozijn.delen) D.add(deel(d, o.kozijn.B, o.kozijn.H));
    const vul = (g, v) => {
      for (const d of v.delen) g.add(deel(d, v.B, v.H));
      for (const p of v.ruiten) g.add(plaat(p, o.glasDikte ?? 8.8, mat.glas));
      for (const p of v.panelen ?? []) g.add(plaat(p, 3, mat.staal));
    };
    for (const v of o.vast) { const g = new THREE.Group(); g.position.set(v.x, v.y, 0); vul(g, v); D.add(g); }
    const Gr = MATEN.greep, kd = sys.kader.diepte / 2, verdekt = o.scharnier === 'verdekt';
    for (const v of o.vleugels) {
      // pivot: om de taatsas (100 uit de rand, midden van de diepte); verdekt: om de scharnierkant aan de voorkant
      const links = v.taats === 'links', xa = verdekt ? (links ? v.x : v.x + v.B) : links ? v.x + MATEN.taats : v.x + v.B - MATEN.taats, za = verdekt ? kd : 0;
      const piv = new THREE.Group(); piv.position.set(xa, 0, za); piv.userData.zin = verdekt ? (links ? -1 : 1) : links ? 1 : -1;
      const g = new THREE.Group(); g.position.set(v.x - xa, v.y, -za); vul(g, v);
      const xg = links ? v.B - Gr.afstand : Gr.afstand, y0 = Gr.hoogte - Gr.lengte / 2 - v.y;
      for (const s of [1, -1]) {
        const zc = s * (kd + Gr.voet + Gr.d / 2), c = new THREE.Mesh(new THREE.CylinderGeometry(Gr.d / 2, Gr.d / 2, Gr.lengte, 24), mat.staal);
        c.position.set(xg, y0 + Gr.lengte / 2, zc); c.castShadow = true; g.add(c);
        for (const y of [y0 + 80, y0 + Gr.lengte - 80]) { const b = new THREE.Mesh(new THREE.BoxGeometry(16, 16, Gr.voet + 2), mat.staal); b.position.set(xg, y, s * (kd + (Gr.voet + 2) / 2)); g.add(b); }
      }
      piv.add(g); D.add(piv); draaiers.push(piv);
    }
    D.scale.setScalar(0.001); D.position.set((-o.B / 2 + MATEN.montage) / 1000, 0, 0);
    deurGroep = D; scene.add(D);
    zetOpen();
  }
  const zetOpen = () => { for (const p of draaiers) p.rotation.y = p.userData.zin * (stand.open * Math.PI) / 180; };

  function camStd(o) {
    // op ooghoogte in de kamer, iets opzij, zodat de deur met wat muur en vloer errond in beeld staat
    const H = o.H / 1000, B = o.B / 1000, d = Math.max(H * 1.3, B * 1.8) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.position.set(0.25 * B + 0.45, 1.6, Math.min(6.5, d)); controls.target.set(0, H * 0.46, 0); controls.update();
  }
  const maat = () => { const w = houder.clientWidth || 600, h = houder.clientHeight || 450; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); teken(); };
  new ResizeObserver(maat).observe(houder);

  return {
    /** keuzes: { ral, lak, glas, opbouw, muurdikte } */
    toon(o, keuzes = {}) {
      const sleutel = `${o.B}|${o.H}|${o.stijl.vorm}|${keuzes.muurdikte ?? 200}`;
      if (sleutel !== kamerSleutel) { bouwKamer(o, keuzes.muurdikte ?? 200); kamerSleutel = sleutel; }
      zetUiterlijk(keuzes); bouwDeur(o);
      if (!huidig || huidig.B !== o.B || huidig.H !== o.H) camStd(o);
      huidig = o; maat();
    },
    zet(z) {
      Object.assign(stand, z);
      mat.muur.color.set(MUREN[stand.muur]?.[1] ?? MUREN.wit[1]);
      if (z.vloer) { mat.vloer.map?.dispose(); mat.vloer.map = vloerTextuur(THREE, stand.vloer); mat.vloer.roughness = stand.vloer === 'tegels' ? 0.35 : stand.vloer === 'beton' ? 0.85 : 0.7; mat.vloer.needsUpdate = true; }
      zetOpen(); teken();
    },
    uiterlijk(k) { zetUiterlijk(k); teken(); },
    herstel() { if (huidig) camStd(huidig); teken(); },
    beeld: () => { teken(); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  };
}
