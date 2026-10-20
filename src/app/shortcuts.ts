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
  { keys: 'M', label: 'Smart Dimension', group: 'Schets' },
  { keys: 'X', label: 'Constructie-geometrie', group: 'Schets' },
  { keys: 'Esc', label: 'Annuleren / selecteren', group: 'Schets' },
  { keys: 'Enter', label: 'Laatste commando herhalen', group: 'Schets' },
  { keys: 'D', label: 'OK/Annuleren (Confirmation Corner) naar de cursor', group: 'Schets' },
  { keys: 'Delete', label: 'Verwijderen', group: 'Schets' },
  { keys: 'Ctrl+Z / Ctrl+Y', label: 'Ongedaan maken / opnieuw', group: 'Bewerken' },
  { keys: 'Ctrl+B', label: 'Rebuild', group: 'Bewerken' },
  { keys: 'Ctrl+N / Ctrl+O / Ctrl+S', label: 'Nieuw / openen / opslaan', group: 'Bestand' },
  { keys: 'Ctrl+Shift+S', label: 'Schets (vlak kiezen)', group: 'Bestand' },
  { keys: 'F', label: 'Zoom to fit', group: 'Weergave' },
  { keys: 'Z / Shift+Z', label: 'Uitzoomen / inzoomen', group: 'Weergave' },
  { keys: 'Ctrl+1 … 6', label: 'Voor/Achter/Links/Rechts/Boven/Onder', group: 'Weergave' },
  { keys: 'Ctrl+7', label: 'Isometrisch', group: 'Weergave' },
  { keys: 'Ctrl+8', label: 'Normal to', group: 'Weergave' },
  { keys: 'Spatie', label: 'Oriëntatie-dialoog', group: 'Weergave' },
  { keys: 'Ctrl+Spatie', label: 'View Selector', group: 'Weergave' },
  { keys: 'Shift+Ctrl+Z', label: 'Vorige weergave', group: 'Weergave' },
  { keys: 'S', label: 'Shortcutbalk', group: 'Weergave' },
  { keys: 'Shift+C', label: 'FeatureManager inklappen', group: 'Weergave' },
  { keys: 'Ctrl+Shift+D', label: 'Licht/donker', group: 'Weergave' },
  { keys: '?', label: 'Sneltoetsen / help', group: 'Help' },
  { keys: 'Middelmuis', label: 'Roteren', group: 'Muis' },
  { keys: 'Ctrl+middelmuis', label: 'Pannen', group: 'Muis' },
  { keys: 'Shift+middelmuis', label: 'Zoomen', group: 'Muis' },
  { keys: 'Wiel', label: 'Zoomen op cursor (naar je toe = inzoomen, instelbaar)', group: 'Muis' },
  { keys: 'Rechtermuis', label: 'Contextmenu met context-toolbar', group: 'Muis' },
];

export function useShortcuts(handlers: { save: () => void; open: () => void; shortcutBar: () => void }) {
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
        if (!st.activeSketchId) st.startPlanePick();
        return;
      }
      if (ctrl && e.shiftKey && key === 'd') {
        e.preventDefault();
        st.setTheme(st.theme === 'dark' ? 'light' : 'dark');
        return;
      }
      if (ctrl && e.shiftKey && key === 'z') {
        e.preventDefault();
        cam.previousView();
        return;
      }
      if (ctrl && key === 'z') {
        e.preventDefault();
        st.undo();
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
      if (ctrl && key === 'n') {
        e.preventDefault();
        st.setDialog('new');
        return;
      }
      if (ctrl && key === 'b') {
        e.preventDefault();
        st.openDocument(st.doc);
        return;
      }
      if (ctrl && key === ' ') {
        e.preventDefault();
        st.toggleShow('viewSelector');
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
      if (e.shiftKey && key === 'c') {
        st.setManagerCollapsed(!st.managerCollapsed);
        return;
      }
      if (e.shiftKey && key === 'z') {
        cam.zoomStep(1 / 1.25);
        return;
      }
      switch (key) {
        case 'l': setTool('line'); break;
        case 'r': setTool('rectangle'); break;
        case 'c': setTool('circle'); break;
        case 'a': setTool('arc3'); break;
        case 'n': setTool('spline'); break;
        case 'p': setTool('point'); break;
        case 'm': setTool('dimension'); break;
        case 'x': st.toggleConstructionSelection(); break;
        case 'z': cam.zoomStep(1.25); break;
        case 'f': (window as unknown as { __phlippoZoomFit?: () => void }).__phlippoZoomFit?.(); break;
        case 's': handlers.shortcutBar(); break;
        case ' ': e.preventDefault(); st.setDialog(st.dialog === 'orientation' ? null : 'orientation'); break;
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
