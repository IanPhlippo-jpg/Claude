// De deur in een 3D-kamer (configurator, browser): een muur met de opening, een vloer, een kamer achter de deur, en de
// deur uit deuren.ontwerp() in 3D: kozijn, kader, roeden, bogen, glas, panelen en de greep. De vleugels draaien om hun
// taatsas (open 0..90°). Three.js komt uit de importmap van de pagina ('three', 'three/addons/').
import { veelhoek, MATEN } from './deuren.mjs';
import { band } from './teken.mjs';

export const MUREN = { wit: ['Wit', '#e6e3dc'], grijs: ['Warm grijs', '#cbc4b9'], groen: ['Groen', '#5c6b5c'], terracotta: ['Terracotta', '#b47358'], donker: ['Antraciet', '#4a4d50'] };
export const VLOEREN = { eik: ['Eik licht', '#c9a77c'], noot: ['Eik donker', '#7b5a3e'], beton: ['Beton', '#a7a5a0'], tegels: ['Tegels zwart-wit', '#ddd'] };
export const KLEUREN = { zwart: ['Zwart (RAL 9005)', '#1b1c1e'], antraciet: ['Antraciet (RAL 7016)', '#3a4045'] };

/** procedurele vloer: planken, beton of cementtegels (canvas) */
function vloerTextuur(THREE, soort) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  let rnd = 7; const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
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
  t.repeat.set(soort === 'tegels' ? 4.4 : soort === 'beton' ? 2 : 5, soort === 'tegels' ? 4.4 : soort === 'beton' ? 2 : 5);
  return t;
}

/** maakt de kamer in 'houder'; geeft { toon(o, keuzes), zet({ open, muur, vloer, kleur }), herstel() } */
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
  controls.minDistance = 0.8; controls.maxDistance = 7.5; controls.maxPolarAngle = Math.PI * 0.53; controls.enablePan = true;
  const teken = () => renderer.render(scene, camera);
  controls.addEventListener('change', teken);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7f70', 0.35));
  const zon = new THREE.DirectionalLight('#fff6e8', 2.6); zon.position.set(3.2, 4.2, 4.5); zon.castShadow = true;
  Object.assign(zon.shadow.camera, { left: -3, right: 3, top: 3.5, bottom: -1, near: 0.5, far: 14 }); zon.shadow.mapSize.set(2048, 2048); zon.shadow.bias = -0.0004; zon.shadow.normalBias = 0.02;
  scene.add(zon);
  const achterLicht = new THREE.PointLight('#fff1dc', 6, 9, 1.6); achterLicht.position.set(-1, 2.4, -2.6); scene.add(achterLicht);

  const stand = { open: 0, muur: 'wit', vloer: 'eik', kleur: 'zwart' };
  const mat = {
    staal: new THREE.MeshStandardMaterial({ color: KLEUREN.zwart[1], roughness: 0.62, metalness: 0.35 }),
    greep: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.4, metalness: 0.6 }),
    glas: new THREE.MeshPhysicalMaterial({ color: '#e6f1f3', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 1.4, side: THREE.DoubleSide }),
    muur: new THREE.MeshStandardMaterial({ color: MUREN.wit[1], roughness: 0.92 }),
    muurAchter: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 }),
    vloer: new THREE.MeshStandardMaterial({ map: vloerTextuur(THREE, 'eik'), roughness: 0.7 }),
    plint: new THREE.MeshStandardMaterial({ color: '#f6f5f2', roughness: 0.8 }),
  };
  let kamerGroep = null, deurGroep = null, pivots = [], huidig = null;

  const vorm = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const plaat = (pts, d, m) => { const g = new THREE.ExtrudeGeometry(vorm(pts), { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -d / 2); const me = new THREE.Mesh(g, m); me.castShadow = m !== mat.glas; me.receiveShadow = true; return me; };

  function bouwKamer(o) {
    if (kamerGroep) { scene.remove(kamerGroep); kamerGroep.traverse((x) => x.geometry?.dispose()); }
    const G = new THREE.Group(), B = o.B / 1000, H = o.H / 1000, W = 7, MH = Math.max(3, H + 0.5), dik = 0.2, voor = 7, achter = 4;
    // muur met de opening (rond bovenaan bij een volle boog)
    // de muur als één omtrek met de opening als inkeping (de opening staat op de vloer)
    // bovenkant van de opening van links naar rechts (bij een volle boog over de halve cirkel)
    const top = o.stijl.vorm === 'volleBoog'
      ? Array.from({ length: 49 }, (_, i) => { const a = Math.PI - (Math.PI * i) / 48; return [(B / 2) * Math.cos(a), H - B / 2 + (B / 2) * Math.sin(a)]; })
      : [[-B / 2, H], [B / 2, H]];
    const muur = vorm([[-W / 2, 0], [-B / 2, 0], ...top, [B / 2, 0], [W / 2, 0], [W / 2, MH], [-W / 2, MH]]);
    const mg = new THREE.ExtrudeGeometry(muur, { depth: dik, bevelEnabled: false, curveSegments: 24 }); mg.translate(0, 0, -dik / 2);
    const mm = new THREE.Mesh(mg, mat.muur); mm.receiveShadow = true; mm.castShadow = true; G.add(mm);
    const vak = (w, h, d, x, y, z, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.receiveShadow = true; G.add(me); return me; };
    // vloer voor en achter de deur, zijmuren, achterwand van de kamer achter de deur
    const vl = new THREE.Mesh(new THREE.PlaneGeometry(W, voor + achter), mat.vloer); vl.rotation.x = -Math.PI / 2; vl.position.set(0, 0, (voor - achter) / 2); vl.receiveShadow = true; G.add(vl);
    vak(0.1, MH, voor, -W / 2 - 0.05, MH / 2, voor / 2, mat.muur); vak(0.1, MH, voor, W / 2 + 0.05, MH / 2, voor / 2, mat.muur);
    vak(W, MH, 0.1, 0, MH / 2, -achter - 0.05, mat.muurAchter); vak(0.1, MH, achter, -W / 2 - 0.05, MH / 2, -achter / 2, mat.muurAchter); vak(0.1, MH, achter, W / 2 + 0.05, MH / 2, -achter / 2, mat.muurAchter);
    // plinten naast de opening
    for (const s of [-1, 1]) vak(W / 2 - B / 2, 0.07, 0.012, s * (B / 2 + (W / 2 - B / 2) / 2), 0.035, dik / 2 + 0.006, mat.plint);
    kamerGroep = G; scene.add(G);
  }

  function bouwDeur(o, keuzes = {}) {
    if (deurGroep) { scene.remove(deurGroep); deurGroep.traverse((x) => x.geometry?.dispose()); }
    const sys = o.sys, D = new THREE.Group(); pivots = [];
    const zicht = (s) => (s === 'roede' || s === 'boog' ? sys.roede.zicht : s === 'kozijn' || s === 'boogkozijn' ? sys.kozijn.zicht : sys.kader.zicht);
    const diepte = (s) => (s === 'roede' || s === 'boog' ? sys.roede.diepte + (sys.roede.lat ? 6 : 0) : s === 'kozijn' || s === 'boogkozijn' ? sys.kozijn.diepte : sys.kader.diepte);
    const deel = (d, Bv, Hv) => plaat(d.a ? veelhoek(d, zicht(d.soort), Bv, Hv) : band(d, zicht(d.soort)), diepte(d.soort), mat.staal);
    for (const d of o.kozijn.delen) D.add(deel(d, o.kozijn.B, o.kozijn.H));
    const vul = (g, v) => {
      for (const d of v.delen) g.add(deel(d, v.B, v.H));
      for (const p of v.ruiten) g.add(plaat(p, 8.8, mat.glas));
      for (const p of v.panelen ?? []) g.add(plaat(p, 3, mat.staal));
    };
    for (const v of o.vast) { const g = new THREE.Group(); g.position.set(v.x, v.y, 0); vul(g, v); D.add(g); }
    const Gr = MATEN.greep, kd = sys.kader.diepte / 2;
    for (const v of o.vleugels) {
      const xa = v.taats === 'links' ? v.x + MATEN.taats : v.x + v.B - MATEN.taats;
      const piv = new THREE.Group(); piv.position.set(xa, 0, 0); piv.userData.zin = v.taats === 'links' ? 1 : -1;
      const g = new THREE.Group(); g.position.set(v.x - xa, v.y, 0); vul(g, v);
      const xg = v.taats === 'links' ? v.B - Gr.afstand : Gr.afstand, y0 = Gr.hoogte - Gr.lengte / 2 - v.y;
      for (const s of [1, -1]) {
        const zc = s * (kd + Gr.voet + Gr.d / 2), c = new THREE.Mesh(new THREE.CylinderGeometry(Gr.d / 2, Gr.d / 2, Gr.lengte, 24), mat.greep);
        c.position.set(xg, y0 + Gr.lengte / 2, zc); c.castShadow = true; g.add(c);
        for (const y of [y0 + 80, y0 + Gr.lengte - 80]) { const b = new THREE.Mesh(new THREE.BoxGeometry(16, 16, Gr.voet + 2), mat.greep); b.position.set(xg, y, s * (kd + (Gr.voet + 2) / 2)); g.add(b); }
      }
      piv.add(g); D.add(piv); pivots.push(piv);
    }
    D.scale.setScalar(0.001); D.position.set((-o.B / 2 + MATEN.montage) / 1000, 0, 0);
    deurGroep = D; scene.add(D);
    mat.glas.color.set(keuzes.glas === 'grijs' ? '#8d9599' : '#e6f1f3'); mat.glas.opacity = keuzes.glas === 'grijs' ? 0.42 : 0.2;
    zetOpen();
  }
  const zetOpen = () => { for (const p of pivots) p.rotation.y = p.userData.zin * (stand.open * Math.PI) / 180; };

  function camStd(o) {
    // op ooghoogte in de kamer, iets opzij, zodat de deur met wat muur en vloer errond in beeld staat
    const H = o.H / 1000, B = o.B / 1000, d = Math.max(H * 1.3, B * 1.8) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.position.set(0.25 * B + 0.45, 1.6, Math.min(6.5, d)); controls.target.set(0, H * 0.46, 0); controls.update();
  }
  const maat = () => { const w = houder.clientWidth || 600, h = houder.clientHeight || 450; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); teken(); };
  new ResizeObserver(maat).observe(houder);

  return {
    toon(o, keuzes) {
      const nieuw = !huidig || huidig.B !== o.B || huidig.H !== o.H || huidig.stijl.vorm !== o.stijl.vorm;
      if (nieuw) bouwKamer(o);
      bouwDeur(o, keuzes);
      if (!huidig || huidig.B !== o.B || huidig.H !== o.H) camStd(o);
      huidig = o; maat();
    },
    zet(z) {
      Object.assign(stand, z);
      mat.muur.color.set(MUREN[stand.muur]?.[1] ?? MUREN.wit[1]);
      if (z.vloer) { mat.vloer.map?.dispose(); mat.vloer.map = vloerTextuur(THREE, stand.vloer); mat.vloer.roughness = stand.vloer === 'tegels' ? 0.35 : stand.vloer === 'beton' ? 0.85 : 0.7; mat.vloer.needsUpdate = true; }
      mat.staal.color.set(KLEUREN[stand.kleur]?.[1] ?? KLEUREN.zwart[1]);
      zetOpen(); teken();
    },
    herstel() { if (huidig) camStd(huidig); teken(); },
    beeld: () => { teken(); return renderer.domElement.toDataURL('image/jpeg', 0.9); },
  };
}
