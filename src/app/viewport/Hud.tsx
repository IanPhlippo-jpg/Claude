import { useEffect, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useStore, type DisplayStyle } from '../store';
import { Icon } from '../../ui/icons';
import { Menu, type MenuItem } from '../../ui/components';
import type { CadCamera, StandardView } from './camera';

const VIEW_LABEL: Record<string, string> = {
  front: 'Voor',
  back: 'Achter',
  left: 'Links',
  right: 'Rechts',
  top: 'Boven',
  bottom: 'Onder',
  isometric: 'Isometrisch',
  dimetric: 'Dimetrisch',
  trimetric: 'Trimetrisch',
  normalTo: 'Normal To',
};
export const viewDisplayName = (v: string) => (v ? `*${VIEW_LABEL[v] ?? v}` : '');

function HudButton({ icon, tip, onClick, active, disabled, menu }: { icon: ReactNode; tip: string; onClick?: () => void; active?: boolean; disabled?: boolean; menu?: MenuItem[] | (() => ReactNode) }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="k-hud-item" style={{ position: 'relative' }}>
      <button className={`k-hud-btn k-tip ${active ? 'active' : ''}`} data-tip={tip} disabled={disabled} onClick={() => (menu ? setOpen((o) => !o) : onClick?.())}>
        {icon}
        {menu && <Icon.ChevronDown size={9} className="k-hud-caret" />}
      </button>
      {open && menu && (typeof menu === 'function' ? (
        <div className="k-menu" style={{ top: '100%', left: 0, marginTop: 4 }} onMouseLeave={() => setOpen(false)}>
          {menu()}
        </div>
      ) : (
        <Menu items={menu} onClose={() => setOpen(false)} style={{ top: '100%', left: 0, marginTop: 4 }} />
      ))}
    </div>
  );
}

/** Grid of standard-view buttons (shared by the orientation drop-down and the Orientation dialog). */
export function ViewGrid({ camera, onPick }: { camera: CadCamera; onPick?: () => void }) {
  const st = useStore();
  const views: { id: StandardView; label: string }[] = [
    { id: 'top', label: 'Boven' },
    { id: 'left', label: 'Links' },
    { id: 'front', label: 'Voor' },
    { id: 'right', label: 'Rechts' },
    { id: 'back', label: 'Achter' },
    { id: 'bottom', label: 'Onder' },
  ];
  const axo: { id: StandardView; label: string }[] = [
    { id: 'isometric', label: 'Isometrisch' },
    { id: 'dimetric', label: 'Dimetrisch' },
    { id: 'trimetric', label: 'Trimetrisch' },
  ];
  const plane = st.activeSketchId ? st.doc.sketches[st.activeSketchId]?.plane ?? 'front' : 'front';
  const pick = (fn: () => void) => () => {
    fn();
    onPick?.();
  };
  return (
    <div className="k-viewgrid">
      {views.map((v) => (
        <button key={v.id} className={`k-viewgrid-btn ${camera.viewName === v.id ? 'active' : ''}`} onClick={pick(() => camera.setView(v.id))}>
          <ViewIcon view={v.id} />
          <span>{v.label}</span>
        </button>
      ))}
      <button className={`k-viewgrid-btn ${camera.viewName === 'normalTo' ? 'active' : ''}`} onClick={pick(() => camera.normalTo(plane))}>
        <Icon.Plane size={18} />
        <span>Normal To</span>
      </button>
      {axo.map((v) => (
        <button key={v.id} className={`k-viewgrid-btn ${camera.viewName === v.id ? 'active' : ''}`} onClick={pick(() => camera.setView(v.id))}>
          <ViewIcon view={v.id} />
          <span>{v.label}</span>
        </button>
      ))}
      <div className="k-viewgrid-sep" />
      <button className={`k-viewgrid-btn ${st.show.viewSelector ? 'active' : ''}`} onClick={() => st.toggleShow('viewSelector')}>
        <Icon.Orientation size={18} />
        <span>View Selector</span>
      </button>
      <button className="k-viewgrid-btn" disabled>
        <Icon.Palette size={18} />
        <span>1 / 2 / 4 viewports</span>
      </button>
    </div>
  );
}

function ViewIcon({ view }: { view: StandardView }) {
  // tiny cube glyph with the highlighted face
  const faces: Record<StandardView, string> = {
    front: 'M3 6h7v7H3z',
    back: 'M6 3h7v7H6z',
    top: 'M3 6l3-3h7l-3 3z',
    bottom: 'M3 13l3-3h7l-3 3z',
    left: 'M3 6l3-3v7l-3 3z',
    right: 'M10 6l3-3v7l-3 3z',
    isometric: 'M8 2l5 2.5v6L8 13l-5-2.5v-6z',
    dimetric: 'M8 2l5 2.5v6L8 13l-5-2.5v-6z',
    trimetric: 'M8 2l5 2.5v6L8 13l-5-2.5v-6z',
  };
  return (
    <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.2}>
      <path d="M3 6l3-3h7v7l-3 3H3z" />
      <path d="M3 6h7v7M10 6l3-3" />
      <path d={faces[view]} fill="currentColor" fillOpacity={0.45} />
    </svg>
  );
}

/** Heads-up View toolbar: transparent toolbar top-centre of the graphics area. */
export function Hud({ camera, zoomFit, onZoomArea, zoomAreaActive }: { camera: CadCamera; zoomFit: () => void; onZoomArea: () => void; zoomAreaActive: boolean }) {
  const st = useStore();
  const [, bump] = useState(0);
  useEffect(() => {
    const prev = camera.onViewName;
    camera.onViewName = (n) => {
      prev?.(n);
      bump((x) => x + 1);
    };
    return () => {
      camera.onViewName = prev;
    };
  }, [camera]);

  const styles: { id: DisplayStyle; label: string }[] = [
    { id: 'wireframe', label: 'Wireframe' },
    { id: 'hiddenVisible', label: 'Hidden Lines Visible' },
    { id: 'hiddenRemoved', label: 'Hidden Lines Removed' },
    { id: 'shaded', label: 'Shaded' },
    { id: 'shadedEdges', label: 'Shaded With Edges' },
  ];
  const chk = (b: boolean) => (b ? '✓ ' : '');
  return (
    <div className="k-hud">
      <HudButton icon={<Icon.Fit />} tip="Zoom to Fit (F)" onClick={zoomFit} />
      <HudButton icon={<Icon.ZoomArea />} tip="Zoom to Area" onClick={onZoomArea} active={zoomAreaActive} />
      <HudButton icon={<Icon.Previous />} tip="Previous View (Shift+Ctrl+Z)" onClick={() => camera.previousView()} />
      <HudButton icon={<Icon.Section />} tip="Section View (fase 2)" disabled />
      <span className="k-hud-sep" />
      <HudButton icon={<Icon.Orientation />} tip="View Orientation (Spatie)" menu={() => <ViewGrid camera={camera} />} />
      <HudButton
        icon={<Icon.DisplayStyle />}
        tip="Display Style"
        menu={styles.map((s) => ({ label: `${chk(st.displayStyle === s.id)}${s.label}`, onSelect: () => st.setDisplayStyle(s.id) }))}
      />
      <HudButton
        icon={<Icon.Eye />}
        tip="Hide/Show Items"
        menu={[
          { label: `${chk(st.show.planes)}Vlakken`, icon: <Icon.Plane />, onSelect: () => st.toggleShow('planes') },
          { label: `${chk(st.show.origin)}Oorsprong`, icon: <Icon.Origin />, onSelect: () => st.toggleShow('origin') },
          { label: `${chk(st.show.sketches)}Schetsen`, icon: <Icon.Sketch />, onSelect: () => st.toggleShow('sketches') },
          { label: `${chk(st.show.relations)}Schetsrelaties`, icon: <Icon.Lock />, onSelect: () => st.toggleShow('relations') },
          { label: `${chk(st.show.grid)}Raster`, icon: <Icon.Grid />, onSelect: () => st.toggleShow('grid') },
          { separator: true },
          { label: `${chk(st.show.viewSelector)}View Selector (Ctrl+Spatie)`, icon: <Icon.Orientation />, onSelect: () => st.toggleShow('viewSelector') },
        ]}
      />
      <span className="k-hud-sep" />
      <HudButton icon={<Icon.Appearance />} tip="Edit Appearance (fase 7)" disabled />
      <HudButton icon={<Icon.Scene />} tip="Apply Scene (fase 7)" disabled />
      <HudButton
        icon={<Icon.ViewSettings />}
        tip="View Settings"
        menu={[
          { label: 'RealView Graphics (fase 7)', disabled: true },
          { label: 'Shadows In Shaded Mode (fase 7)', disabled: true },
          { label: 'Ambient Occlusion (fase 7)', disabled: true },
          { label: 'Perspective (fase 2)', disabled: true },
          { separator: true },
          { label: `${chk(st.theme === 'dark')}Donker thema`, onSelect: () => st.setTheme(st.theme === 'dark' ? 'light' : 'dark') },
        ]}
      />
    </div>
  );
}

/**
 * Confirmation Corner (upper-right of the graphics area): in a sketch it shows
 * the sketch symbol (exit & keep) and a red X (discard); for other commands a
 * green check and a red X. The D key moves it to the pointer.
 */
export function ConfirmationCorner({ onOk, onCancel, sketch }: { onOk: () => void; onCancel: () => void; sketch: boolean }) {
  const at = useStore((s) => s.confirmAtCursor);
  return (
    <div className={`k-confirm ${at ? 'at-cursor' : ''}`} style={at ? { left: at.x + 12, top: at.y + 12, right: 'auto' } : undefined}>
      <button className="k-confirm-ok k-tip" data-tip={sketch ? 'Schets afsluiten (wijzigingen bewaren)' : 'OK'} onClick={onOk}>
        {sketch ? <Icon.Sketch size={20} /> : <Icon.Check size={20} />}
      </button>
      <button className="k-confirm-cancel k-tip" data-tip={sketch ? 'Schets verlaten zonder wijzigingen' : 'Annuleren'} onClick={onCancel}>
        <Icon.Close size={20} />
      </button>
    </div>
  );
}

/** In-context View Selector: a translucent cube in the centre of the graphics area (Ctrl+Space). */
export function ViewSelector({ camera, onClose }: { camera: CadCamera; onClose: () => void }) {
  const [q, setQ] = useState(() => camera.rotation.clone());
  useEffect(() => {
    const prev = camera.onChange;
    camera.onChange = () => {
      prev?.();
      setQ(camera.rotation.clone());
    };
    return () => {
      camera.onChange = prev;
    };
  }, [camera]);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q.clone().invert());
  const e = m.elements;
  const css = `matrix3d(${e[0]},${-e[1]},${e[2]},0, ${-e[4]},${e[5]},${-e[6]},0, ${e[8]},${-e[9]},${e[10]},0, 0,0,0,1)`;
  const S = 150;
  const face = (view: StandardView, label: string, transform: string) => (
    <div key={view} className="k-vs-face" style={{ transform: `${transform} translateZ(${S / 2}px)` }} onClick={() => { camera.setView(view); onClose(); }}>
      {label}
    </div>
  );
  return (
    <div className="k-viewselector" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="k-vs-stage" style={{ width: S, height: S }}>
        <div className="k-vs-cube" style={{ transform: css, width: S, height: S }}>
          {face('front', 'VOOR', 'rotateY(0deg)')}
          {face('back', 'ACHTER', 'rotateY(180deg)')}
          {face('right', 'RECHTS', 'rotateY(90deg)')}
          {face('left', 'LINKS', 'rotateY(-90deg)')}
          {face('top', 'BOVEN', 'rotateX(90deg)')}
          {face('bottom', 'ONDER', 'rotateX(-90deg)')}
        </div>
      </div>
      <div className="k-vs-hint">Klik een vlak van de kubus · Esc sluit</div>
    </div>
  );
}
