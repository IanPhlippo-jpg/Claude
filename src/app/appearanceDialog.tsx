import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';

const SWATCHES = ['#c9cbcf', '#d94b3d', '#e38b2a', '#e8c547', '#59a84b', '#2f8f9d', '#3b6fd0', '#7b4fc4', '#d26aa6', '#8c6a4a', '#5b5b5b', '#f2f2f2'];

/**
 * Edit Appearance (Render Tools ▸ Edit Appearance, or a body's Appearance…): a colour for the part
 * or one body, laid out like the intended Color Property Panel (swatches + RGB picker, Remove).
 */
export function AppearanceDialog() {
  const st = useStore(useShallow((s) => ({ materialTarget: s.materialTarget, selectedFace: s.selectedFace, rebuild: s.rebuild, doc: s.doc, setFaceAppearance: s.setFaceAppearance, setAppearance: s.setAppearance, setDialog: s.setDialog })));
  const target = st.materialTarget;
  // a face selected in the graphics area is the target (Selected Geometry: Face<n>), by design
  const [face] = useState(() => (!target ? st.selectedFace : null));
  const faceObj = face ? st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.find((f) => f.id === face.faceId) : undefined;
  const faceIndex = face && faceObj ? (st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.indexOf(faceObj) ?? 0) + 1 : 0;
  const faceCurrent = faceObj ? (st.doc.faceAppearances ?? []).find((a) => Math.hypot(a.point[0] - faceObj.centroid[0], a.point[1] - faceObj.centroid[1], a.point[2] - faceObj.centroid[2]) < 1e-3)?.color : undefined;
  const current = faceCurrent ?? (target ? st.doc.bodyAppearances?.[target] : st.doc.appearance) ?? st.doc.material?.color ?? '#c9cbcf';
  const [color, setColor] = useState(current);
  const apply = (c: string) => { setColor(c); if (face) st.setFaceAppearance(face, c); else st.setAppearance(c, target); };
  const bodyName = target ? (() => { const b = st.rebuild.bodies.find((x) => x.id === target); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? target : target; })() : null;
  return (
    <div className="k-float-dialog k-appearance-dialog" data-testid="appearance-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Appearance /> <span>Color{face ? ` - Face<${faceIndex}>` : bodyName ? ` - ${bodyName}` : ''}</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width: 260 }}>
          <p className="k-muted" style={{ margin: '0 0 6px' }} data-testid="appearance-target">Selected Geometry: {face ? `Face<${faceIndex}>` : bodyName ?? st.doc.name}</p>
          <div className="k-swatches">
            {SWATCHES.map((c) => (
              <button key={c} className={`k-swatch ${color.toLowerCase() === c ? 'active' : ''}`} style={{ background: c }} title={c} onClick={() => apply(c)} />
            ))}
          </div>
          <div className="k-field" style={{ marginTop: 8 }}>
            <label>RGB</label>
            <input type="color" value={color} onChange={(e) => apply(e.target.value)} data-testid="appearance-color" />
          </div>
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn" onClick={() => { if (face) st.setFaceAppearance(face, null); else st.setAppearance(null, target); st.setDialog(null); }}>Remove Appearance</button>
          <button className="k-btn primary" onClick={() => st.setDialog(null)}>OK</button>
        </div>
      </div>
    </div>
  );
}
