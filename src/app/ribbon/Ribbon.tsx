import { useState, type ReactNode } from 'react';
import { useStore, type RibbonTab, type ToolId } from '../store';
import { Menu, type MenuItem } from '../../ui/components';
import { Icon } from '../../ui/icons';

/**
 * CommandManager: large icon+text buttons, consolidated fly-out buttons and
 * the tab strip *below* the tools (Features · Sketch · Evaluate · …), with a
 * collapse pin — as in the desktop-CAD manual.
 */
const TABS: { id: RibbonTab; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'assembly', label: 'Assembly' },
  { id: 'drawing', label: 'Drawing' },
];

function Group({ children }: { children: ReactNode }) {
  return <div className="k-cm-group">{children}</div>;
}

interface BigProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
  /** consolidated fly-out variants */
  flyout?: { label: string; icon: ReactNode; onSelect: () => void; disabled?: boolean }[];
}

function Big({ label, icon, active, disabled, shortcut, onClick, flyout }: BigProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`k-cm-big ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}>
      <button className="k-cm-main k-tip" data-tip={shortcut ? `${label} (${shortcut})` : label} disabled={disabled} onClick={onClick}>
        <span className="k-cm-icon">{icon}</span>
        <span className="k-cm-label">{label}</span>
      </button>
      {flyout && (
        <>
          <button className="k-cm-arrow" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-label="Meer varianten">
            <Icon.ChevronDown size={10} />
          </button>
          {open && <Menu items={flyout as MenuItem[]} onClose={() => setOpen(false)} style={{ top: '100%', left: 0 }} />}
        </>
      )}
    </div>
  );
}

function Small({ label, icon, active, disabled, onClick, shortcut }: BigProps) {
  return (
    <button className={`k-cm-small k-tip ${active ? 'active' : ''}`} data-tip={shortcut ? `${label} (${shortcut})` : label} disabled={disabled} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function Ribbon() {
  const st = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const inSketch = !!st.activeSketchId;
  const T = (id: ToolId) => ({ active: st.tool === id && inSketch, disabled: !inSketch, onClick: () => st.setTool(id) });
  const hasSel = st.selection.length > 0;
  const mirrorable = inSketch && st.selection.filter((s) => s.kind === 'entity').length >= 2;

  const sketchTab = (
    <>
      <Group>
        {inSketch ? (
          <Big label="Schets afsluiten" icon={<Icon.Exit />} onClick={st.exitSketch} />
        ) : (
          <Big label="Schets" icon={<Icon.Sketch />} shortcut="Ctrl+Shift+S" active={st.planePick} onClick={st.startPlanePick} />
        )}
        <Big label="Smart Dimension" icon={<Icon.Dimension />} shortcut="M" {...T('dimension')} />
      </Group>
      <Group>
        <div className="k-cm-col">
          <Small label="Lijn" icon={<Icon.Line />} shortcut="L" {...T('line')} />
          <Small label="Centerline" icon={<Icon.Construction />} {...T('centerline')} />
        </div>
        <Big
          label="Rechthoek"
          icon={st.lastTool === 'centerRectangle' ? <Icon.CenterRect /> : <Icon.Rect />}
          shortcut="R"
          {...T(st.lastTool === 'centerRectangle' ? 'centerRectangle' : 'rectangle')}
          flyout={[
            { label: 'Hoek-rechthoek', icon: <Icon.Rect />, onSelect: () => st.setTool('rectangle') },
            { label: 'Centrum-rechthoek', icon: <Icon.CenterRect />, onSelect: () => st.setTool('centerRectangle') },
            { label: '3-punts hoek-rechthoek (fase 2)', icon: <Icon.Rect />, onSelect: () => {}, disabled: true },
            { label: 'Parallellogram (fase 2)', icon: <Icon.Rect />, onSelect: () => {}, disabled: true },
          ]}
        />
        <Big
          label="Cirkel"
          icon={<Icon.Circle />}
          shortcut="C"
          {...T('circle')}
          flyout={[
            { label: 'Cirkel (centrum)', icon: <Icon.Circle />, onSelect: () => st.setTool('circle') },
            { label: 'Omtrek-cirkel (fase 2)', icon: <Icon.Circle />, onSelect: () => {}, disabled: true },
          ]}
        />
        <Big
          label="Boog"
          icon={st.lastTool === 'arcCenter' ? <Icon.ArcCenter /> : <Icon.Arc />}
          shortcut="A"
          {...T(st.lastTool === 'arcCenter' ? 'arcCenter' : 'arc3')}
          flyout={[
            { label: 'Centrumpunt-boog', icon: <Icon.ArcCenter />, onSelect: () => st.setTool('arcCenter') },
            { label: '3-punts boog', icon: <Icon.Arc />, onSelect: () => st.setTool('arc3') },
            { label: 'Tangent-boog (fase 2)', icon: <Icon.Arc />, onSelect: () => {}, disabled: true },
          ]}
        />
        <Big label="Polygoon" icon={<Icon.Polygon />} {...T('polygon')} />
        <div className="k-cm-col">
          <Small label="Spline" icon={<Icon.Spline />} shortcut="N" {...T('spline')} />
          <Small label="Punt" icon={<Icon.Point />} shortcut="P" {...T('point')} />
        </div>
        <div className="k-cm-col">
          <Small label="Slot" icon={<Icon.Slot />} disabled />
          <Small label="Ellips" icon={<Icon.Ellipse />} disabled />
        </div>
        <div className="k-cm-col">
          <Small label="Schets-fillet" icon={<Icon.Fillet2D />} disabled />
          <Small label="Tekst" icon={<Icon.Text />} disabled />
        </div>
      </Group>
      <Group>
        <Big label="Trim" icon={<Icon.Trim />} disabled />
        <Big label="Convert" icon={<Icon.Convert />} disabled />
        <Big label="Offset" icon={<Icon.Offset />} disabled />
        <div className="k-cm-col">
          <Small label="Mirror" icon={<Icon.Mirror />} disabled={!mirrorable} onClick={() => st.mirrorSelection()} />
          <Small label="Constructie" icon={<Icon.Construction />} shortcut="X" disabled={!inSketch || !hasSel} onClick={st.toggleConstructionSelection} />
        </div>
      </Group>
      <Group>
        <Big label="Relaties weergeven/ verwijderen" icon={<Icon.Lock />} disabled={!inSketch} active={st.taskPane === 'relations'} onClick={() => st.setTaskPane('relations')} />
        <Big label="Verwijderen" icon={<Icon.Trash />} shortcut="Del" disabled={!inSketch || (!hasSel && !st.selectedConstraint)} onClick={st.deleteSelection} />
      </Group>
    </>
  );

  const featuresTab = (
    <>
      <Group>
        <Big label="Extruded Boss/Base" icon={<Icon.Extrude />} disabled />
        <Big label="Revolved Boss/Base" icon={<Icon.Revolve />} disabled />
        <div className="k-cm-col">
          <Small label="Swept Boss/Base" icon={<Icon.Sweep />} disabled />
          <Small label="Lofted Boss/Base" icon={<Icon.Loft />} disabled />
        </div>
      </Group>
      <Group>
        <Big label="Extruded Cut" icon={<Icon.Cut />} disabled />
        <Big label="Hole Wizard" icon={<Icon.Hole />} disabled />
        <Big label="Revolved Cut" icon={<Icon.Revolve />} disabled />
      </Group>
      <Group>
        <Big label="Fillet" icon={<Icon.Arc />} disabled />
        <Big label="Linear Pattern" icon={<Icon.Pattern />} disabled />
        <div className="k-cm-col">
          <Small label="Chamfer" icon={<Icon.Chamfer />} disabled />
          <Small label="Shell" icon={<Icon.Shell />} disabled />
          <Small label="Mirror" icon={<Icon.Mirror />} disabled />
        </div>
      </Group>
      <Group>
        <Big label="Schets" icon={<Icon.Sketch />} active={st.planePick} onClick={() => (inSketch ? st.exitSketch() : st.startPlanePick())} />
        <Big label="Referentie- geometrie" icon={<Icon.Plane />} disabled />
      </Group>
      <span className="k-cm-note">Feature-tools komen in fase 2</span>
    </>
  );

  const evaluateTab = (
    <>
      <Group>
        <Big label="Meten" icon={<Icon.Measure />} disabled />
        <Big label="Massa- eigenschappen" icon={<Icon.Mass />} disabled />
        <Big label="Interferentie- detectie" icon={<Icon.Interference />} disabled />
      </Group>
      <span className="k-cm-note">Evaluate-tools komen in fase 4 en 7</span>
    </>
  );
  const assemblyTab = (
    <Group>
      <Big label="Component invoegen" icon={<Icon.Component />} disabled />
      <Big label="Mate" icon={<Icon.Lock />} disabled />
      <span className="k-cm-note">Assemblies komen in fase 4</span>
    </Group>
  );
  const drawingTab = (
    <Group>
      <Big label="Modelweergave" icon={<Icon.Drawing />} disabled />
      <Big label="Blad" icon={<Icon.Sheet />} disabled />
      <span className="k-cm-note">Tekeningen komen in fase 5</span>
    </Group>
  );

  return (
    <div className={`k-cm ${collapsed ? 'collapsed' : ''}`}>
      {!collapsed && (
        <div className="k-cm-body">
          {st.tab === 'sketch' && sketchTab}
          {st.tab === 'features' && featuresTab}
          {st.tab === 'evaluate' && evaluateTab}
          {st.tab === 'assembly' && assemblyTab}
          {st.tab === 'drawing' && drawingTab}
        </div>
      )}
      <div className="k-cm-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className={`k-cm-tab ${t.id === st.tab ? 'active' : ''}`}
            onClick={() => {
              st.setTab(t.id);
              setCollapsed(false);
            }}
          >
            {t.label}
          </button>
        ))}
        <span className="grow" />
        <button className="k-btn ghost icon k-tip" data-tip={collapsed ? 'CommandManager uitklappen' : 'CommandManager inklappen'} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <Icon.ChevronDown size={12} /> : <Icon.Pin size={12} />}
        </button>
      </div>
    </div>
  );
}
