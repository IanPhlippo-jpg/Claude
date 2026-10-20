import { useEffect } from 'react';
import { useStore, type ToolId } from './store';
import { getCamera } from './viewport/Viewport';

export interface Shortcut {
  keys: string;
  label: string;
  group: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: 'L', label: 'Lijn', group: 'Schets' },
  { keys: 'R', label: 'Rechthoek', group: 'Schets' },
  { keys: 'C', label: 'Cirkel', group: 'Schets' },
  { keys: 'A', label: 'Boog (3 punten)', group: 'Schets' },
  { keys: 'N', label: 'Spline', group: 'Schets' },
  { keys: 'P', label: 'Punt', group: 'Schets' },
  { keys: 'D', label: 'Smart Dimension', group: 'Schets' },
  { keys: 'X', label: 'Constructie-geometrie', group: 'Schets' },
  { keys: 'Esc', label: 'Annuleren / selecteren', group: 'Schets' },
  { keys: 'Enter', label: 'Spline afsluiten / herhalen', group: 'Schets' },
  { keys: 'Delete', label: 'Verwijderen', group: 'Schets' },
  { keys: 'Ctrl+Z / Ctrl+Y', label: 'Ongedaan maken / opnieuw', group: 'Bewerken' },
  { keys: 'Ctrl+S', label: 'Opslaan (.kcad)', group: 'Bestand' },
  { keys: 'Ctrl+O', label: 'Openen', group: 'Bestand' },
  { keys: 'Ctrl+Shift+S', label: 'Nieuwe schets', group: 'Bestand' },
  { keys: 'F', label: 'Zoom to fit', group: 'Weergave' },
  { keys: 'Ctrl+1 … 6', label: 'Voor/Achter/Links/Rechts/Boven/Onder', group: 'Weergave' },
  { keys: 'Ctrl+7', label: 'Isometrisch', group: 'Weergave' },
  { keys: 'Ctrl+8', label: 'Normal to', group: 'Weergave' },
  { keys: 'Spatie', label: 'Oriëntatiemenu', group: 'Weergave' },
  { keys: 'S', label: 'Shortcutbalk', group: 'Weergave' },
  { keys: 'Ctrl+Shift+D', label: 'Licht/donker', group: 'Weergave' },
  { keys: '?', label: 'Sneltoetsen', group: 'Help' },
  { keys: 'Middelmuis', label: 'Pannen (in schets) / roteren', group: 'Muis' },
  { keys: 'Rechtermuis slepen', label: 'Pannen', group: 'Muis' },
  { keys: 'Wiel', label: 'Zoomen op cursor', group: 'Muis' },
];

export function useShortcuts(handlers: { save: () => void; open: () => void; orientation: () => void; shortcutBar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      const st = useStore.getState();
      const cam = getCamera();
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const setTool = (tool: ToolId) => st.activeSketchId && st.setTool(tool);
      if (ctrl && e.shiftKey && key === 's') {
        e.preventDefault();
        if (!st.activeSketchId) st.newSketch('front');
        return;
      }
      if (ctrl && e.shiftKey && key === 'd') {
        e.preventDefault();
        st.setTheme(st.theme === 'dark' ? 'light' : 'dark');
        return;
      }
      if (ctrl && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (ctrl && key === 'y') {
        e.preventDefault();
        st.redo();
        return;
      }
      if (ctrl && key === 's') {
        e.preventDefault();
        handlers.save();
        return;
      }
      if (ctrl && key === 'o') {
        e.preventDefault();
        handlers.open();
        return;
      }
      if (ctrl && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        const views = { '1': 'front', '2': 'back', '3': 'left', '4': 'right', '5': 'top', '6': 'bottom', '7': 'isometric' } as const;
        if (e.key === '8') {
          const sk = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null;
          cam.normalTo(sk?.plane ?? 'front');
        } else cam.setView(views[e.key as keyof typeof views]);
        return;
      }
      if (ctrl || e.altKey) return;
      switch (key) {
        case 'l': setTool('line'); break;
        case 'r': setTool('rectangle'); break;
        case 'c': setTool('circle'); break;
        case 'a': setTool('arc3'); break;
        case 'n': setTool('spline'); break;
        case 'p': setTool('point'); break;
        case 'd': setTool('dimension'); break;
        case 'x': st.toggleConstructionSelection(); break;
        case 'f': (window as unknown as { __kalibrZoomFit?: () => void }).__kalibrZoomFit?.(); break;
        case 's': handlers.shortcutBar(); break;
        case ' ': e.preventDefault(); handlers.orientation(); break;
        case '?': st.setPanel('shortcuts', { visible: !st.panels.shortcuts.visible }); break;
        case 'delete':
        case 'backspace': st.deleteSelection(); break;
        default: return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
