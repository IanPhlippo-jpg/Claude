import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';

// the "standard" palette of the intended Color section: six rows from light to dark
const PALETTE = [
  '#ffffff', '#ffcccc', '#ffe5cc', '#ffffcc', '#ccffcc', '#ccffff', '#cce5ff', '#e5ccff',
  '#c9cbcf', '#ff6666', '#ffb366', '#ffff66', '#66ff66', '#66ffff', '#66b3ff', '#b366ff',
  '#969696', '#e60000', '#e67300', '#e6e600', '#00cc00', '#00cccc', '#0066cc', '#7300e6',
  '#5b5b5b', '#990000', '#994d00', '#999900', '#008000', '#008080', '#003d99', '#4d0099',
  '#000000', '#4d0000', '#4d2600', '#4d4d00', '#004000', '#004040', '#001f4d', '#26004d',
];

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * Edit Appearance (Render Tools ▸ Edit Appearance, or a body's Appearance…), laid out like the intended Appearance
 * Property Panel: the appearance name with OK / Cancel, Selected Geometry with Remove Appearance, and the Color section
 * (the standard palette, a colour field and the red / green / blue values). Cancel puts the colour back.
 */
export function AppearanceDialog() {
  const st = useStore(useShallow((s) => ({ materialTarget: s.materialTarget, selectedFace: s.selectedFace, rebuild: s.rebuild, doc: s.doc, setFaceAppearance: s.setFaceAppearance, setAppearance: s.setAppearance, setDialog: s.setDialog })));
  const target = st.materialTarget;
  // a face selected in the graphics area is the target (Selected Geometry: Face<n>), by design
  const [face] = useState(() => (!target ? st.selectedFace : null));
  const faceObj = face ? st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.find((f) => f.id === face.faceId) : undefined;
  const faceIndex = face && faceObj ? (st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.indexOf(faceObj) ?? 0) + 1 : 0;
  const faceCurrent = faceObj ? (st.doc.faceAppearances ?? []).find((a) => Math.hypot(a.point[0] - faceObj.centroid[0], a.point[1] - faceObj.centroid[1], a.point[2] - faceObj.centroid[2]) < 1e-3)?.color : undefined;
  const own = faceCurrent ?? (target ? st.doc.bodyAppearances?.[target] : st.doc.appearance);
  const current = own ?? st.doc.material?.color ?? '#c9cbcf';
  const [original] = useState(own ?? null);
  const [color, setColor] = useState(current);
  const apply = (c: string) => { setColor(c); if (face) st.setFaceAppearance(face, c); else st.setAppearance(c, target); };
  const bodyName = target ? (() => { const b = st.rebuild.bodies.find((x) => x.id === target); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? target : target; })() : null;
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) || 0);
  const setChannel = (k: number, v: number) => { const c = [...rgb]; c[k] = v; apply(`#${c.map(hex2).join('')}`); };
  const cancel = () => { if (face) st.setFaceAppearance(face, original); else st.setAppearance(original, target); st.setDialog(null); };
  return (
    <div className="k-float-dialog k-appearance-dialog" data-testid="appearance-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Appearance /> <span>color</span>
          <span className="grow" />
          <button className="k-btn ghost icon k-tip" data-tip="OK" data-testid="appearance-ok" onClick={() => st.setDialog(null)}><Icon.Check size={13} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="Cancel" data-testid="appearance-cancel" onClick={cancel}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width: 270 }}>
          <div className="k-pm-label">Selected Geometry</div>
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="appearance-target">
            <div className="k-selbox-row">{face ? <><Icon.Sheet size={12} /> Face&lt;{faceIndex}&gt;</> : bodyName ? <><Icon.Part size={12} /> {bodyName}</> : <><Icon.Part size={12} /> {st.doc.name}</>}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 10px' }}>
            <button className="k-btn" data-testid="appearance-remove" onClick={() => { if (face) st.setFaceAppearance(face, null); else st.setAppearance(null, target); st.setDialog(null); }}>Remove Appearance</button>
          </div>
          <div className="k-pm-label">Color</div>
          <div className="k-appearance-palette" data-testid="appearance-palette">
            {PALETTE.map((c) => (
              <button key={c} className={`k-swatch ${color.toLowerCase() === c ? 'active' : ''}`} style={{ background: c }} title={c} onClick={() => apply(c)} />
            ))}
          </div>
          <div className="k-field" style={{ marginTop: 8 }}>
            <label>Color</label>
            <input type="color" value={color} onChange={(e) => apply(e.target.value)} data-testid="appearance-color" />
          </div>
          {(['Red', 'Green', 'Blue'] as const).map((name, k) => (
            <div key={name} className="k-field">
              <label><span className="k-appearance-chip" style={{ background: ['#d33', '#3b3', '#36d'][k] }} /> {name}</label>
              <input className="k-input" type="number" min={0} max={255} step={1} value={rgb[k]} data-testid={`appearance-${name.toLowerCase()}`} onChange={(e) => setChannel(k, Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
