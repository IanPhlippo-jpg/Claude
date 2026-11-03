import { useStore, solveAll } from './store';
import { downloadText } from './assemblyCommands';
import { exportDesignTable, importDesignTable } from '../core/document/designTable';

/**
 * Design Table commands of the Configurations panel (loaded on first use): Export Design Table… saves the
 * configurations as a CSV table; Insert Design Table… reads one and creates / updates the configurations.
 */
export function exportDesignTableFile(): void {
  const st = useStore.getState();
  downloadText(`${st.doc.name} - Design Table.csv`, '﻿' + exportDesignTable(st.doc), 'text/csv');
  st.pushMessage('Design Table exported.');
}

/** apply design table text to the open document as one undoable step; returns the messages shown */
export function applyDesignTableText(text: string, fileName = 'the design table'): string[] {
  const st = useStore.getState();
  const r = importDesignTable(st.doc, text);
  if (r.errors.length) {
    const more = r.errors.length > 1 ? ` (${r.errors.length - 1} more problem${r.errors.length > 2 ? 's' : ''})` : '';
    st.pushMessage(`Design Table not applied: ${r.errors[0]}${more}`, 'error');
    for (const e of r.errors.slice(1, 4)) st.pushMessage(e, 'warn');
    return r.errors;
  }
  const solved = solveAll(r.doc, st.solve);
  st.applyDocument('Insert Design Table', solved.doc);
  useStore.setState({ solve: solved.solve });
  const added = r.configurations.filter((c) => c.added).length;
  const msg = `Design Table read from ${fileName}: ${r.configurations.length} configuration${r.configurations.length === 1 ? '' : 's'} (${added} added).`;
  st.pushMessage(msg);
  return [msg];
}

export function insertDesignTableFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.txt,text/csv,text/plain';
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) void f.text().then((t) => applyDesignTableText(t, f.name));
  };
  input.click();
}
