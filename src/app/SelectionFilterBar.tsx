import { useEffect, type ReactNode } from 'react';
import { useStore, type SelFilterKind } from './store';
import { Icon } from '../ui/icons';

/**
 * Selection Filter toolbar, as the intended design: beside the Model / Motion Study tabs; F5 shows or hides it, F6
 * turns the filters on and off. With filters checked, only those kinds of entity can be picked.
 */
const FILTERS: [SelFilterKind, string, ReactNode][] = [
  ['vertices', 'Filter Vertices', <Icon.Point key="v" size={14} />],
  ['edges', 'Filter Edges', <Icon.Line key="e" size={14} />],
  ['faces', 'Filter Faces', <Icon.Plane key="f" size={14} />],
  ['solidBodies', 'Filter Solid Bodies', <Icon.Part key="b" size={14} />],
  ['planes', 'Filter Planes', <Icon.TreePlane key="p" size={14} />],
  ['sketchPoints', 'Filter Sketch Points', <Icon.Point key="sp" size={14} />],
  ['sketchSegments', 'Filter Sketch Segments', <Icon.Sketch key="ss" size={14} />],
];

/** whether a kind of entity may be picked under the Selection Filter */
export function filterAllows(kind: SelFilterKind): boolean {
  const f = useStore.getState().selFilter;
  return !f.on || !f.types.length || f.types.includes(kind);
}

export function SelectionFilterBar() {
  const f = useStore((s) => s.selFilter);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as Element)?.closest?.('input, textarea, select')) return;
      const cur = useStore.getState().selFilter;
      if (e.key === 'F5') useStore.setState({ selFilter: { ...cur, bar: !cur.bar } });
      else if (e.key === 'F6') useStore.setState({ selFilter: { ...cur, on: !cur.on } });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  if (!f.bar) return null;
  const set = (types: SelFilterKind[]) => useStore.setState({ selFilter: { ...f, types } });
  return (
    <div className="k-selfilter" data-testid="selection-filter">
      <button className={`k-btn ghost icon k-tip ${f.on ? 'active' : ''}`} data-tip="Toggle Selection Filter (F6)" data-testid="selfilter-toggle" onClick={() => useStore.setState({ selFilter: { ...f, on: !f.on } })}><Icon.Filter size={14} /></button>
      <button className="k-btn ghost icon k-tip" data-tip="Clear All Filters" onClick={() => set([])}><Icon.Close size={12} /></button>
      <button className="k-btn ghost icon k-tip" data-tip="Select All Filters" onClick={() => set(FILTERS.map(([k]) => k))}><Icon.Check size={12} /></button>
      <span className="k-selfilter-sep" />
      {FILTERS.map(([k, tip, icon]) => (
        <button key={k} className={`k-btn ghost icon k-tip ${f.types.includes(k) ? 'active' : ''}`} data-tip={tip} data-testid={`selfilter-${k}`} onClick={() => set(f.types.includes(k) ? f.types.filter((x) => x !== k) : [...f.types, k])}>{icon}</button>
      ))}
    </div>
  );
}
