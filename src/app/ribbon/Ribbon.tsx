import { useStore, type RibbonTab, type ToolId } from '../store';
import { Tabs, ToolButton, Button } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { PLANE_LABELS } from '../viewport/camera';

const TABS: { id: RibbonTab; label: string; disabled?: boolean }[] = [
  { id: 'sketch', label: 'Sketch' },
  { id: 'features', label: 'Features' },
  { id: 'assembly', label: 'Assembly', disabled: true },
  { id: 'drawing', label: 'Drawing', disabled: true },
  { id: 'evaluate', label: 'Evaluate', disabled: true },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="k-ribbon-group">
      <div className="k-ribbon-group-body">{children}</div>
      <div className="k-ribbon-group-title">{title}</div>
    </div>
  );
}

export function Ribbon() {
  const st = useStore();
  const inSketch = !!st.activeSketchId;
  const tool = (id: ToolId, label: string, icon: React.ReactNode, shortcut?: string) => (
    <ToolButton label={label} icon={icon} shortcut={shortcut} active={st.tool === id} disabled={!inSketch} onClick={() => st.setTool(id)} />
  );
  return (
    <div className="k-ribbon">
      <Tabs tabs={TABS} value={st.tab} onChange={st.setTab} />
      <div className="k-ribbon-body">
        {st.tab === 'sketch' && (
          <>
            <Group title="Schets">
              {inSketch ? (
                <ToolButton label="Afsluiten" icon={<Icon.Exit />} onClick={st.exitSketch} />
              ) : (
                <ToolButton label="Schets" icon={<Icon.Sketch />} shortcut="Ctrl+Shift+S" onClick={() => st.newSketch('front')} />
              )}
              <ToolButton label="Smart Dimension" icon={<Icon.Dimension />} shortcut="D" active={st.tool === 'dimension'} disabled={!inSketch} onClick={() => st.setTool('dimension')} />
            </Group>
            <Group title="Tekenen">
              {tool('select', 'Selecteer', <Icon.Select />, 'Esc')}
              {tool('line', 'Lijn', <Icon.Line />, 'L')}
              {tool('rectangle', 'Rechthoek', <Icon.Rect />, 'R')}
              {tool('centerRectangle', 'Centrum-rechthoek', <Icon.CenterRect />)}
              {tool('circle', 'Cirkel', <Icon.Circle />, 'C')}
              {tool('arc3', 'Boog 3 pt', <Icon.Arc />, 'A')}
              {tool('arcCenter', 'Boog centrum', <Icon.ArcCenter />)}
              {tool('spline', 'Spline', <Icon.Spline />, 'N')}
              {tool('point', 'Punt', <Icon.Point />, 'P')}
            </Group>
            <Group title="Wijzigen">
              <ToolButton label="Constructie" icon={<Icon.Construction />} shortcut="X" disabled={!inSketch || !st.selection.length} onClick={st.toggleConstructionSelection} />
              <ToolButton label="Verwijderen" icon={<Icon.Trash />} shortcut="Del" disabled={!inSketch || (!st.selection.length && !st.selectedConstraint)} onClick={st.deleteSelection} />
              <ToolButton label="Relaties" icon={<Icon.Lock />} disabled={!inSketch} active={st.panels.relations.visible} onClick={() => st.setPanel('relations', { visible: !st.panels.relations.visible })} />
            </Group>
          </>
        )}
        {st.tab === 'features' && (
          <>
            <Group title="Schets">
              {(['front', 'top', 'right'] as const).map((p) => (
                <ToolButton key={p} label={`Schets op ${PLANE_LABELS[p].toLowerCase()}`} icon={<Icon.Sketch />} onClick={() => st.newSketch(p)} />
              ))}
            </Group>
            <Group title="Features (fase 2)">
              <ToolButton label="Extrude" icon={<Icon.Extrude />} disabled />
              <ToolButton label="Revolve" icon={<Icon.ArcCenter />} disabled />
              <ToolButton label="Fillet" icon={<Icon.Arc />} disabled />
            </Group>
          </>
        )}
        <div className="k-ribbon-spacer" />
        <div className="k-ribbon-right">
          <Button variant="ghost" icon={<Icon.Undo />} disabled={!st.canUndo} tip={st.undoLabel ? `Ongedaan maken: ${st.undoLabel}` : 'Ongedaan maken'} onClick={st.undo} />
          <Button variant="ghost" icon={<Icon.Redo />} disabled={!st.canRedo} tip={st.redoLabel ? `Opnieuw: ${st.redoLabel}` : 'Opnieuw'} onClick={st.redo} />
        </div>
      </div>
    </div>
  );
}
