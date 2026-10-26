import { fitActive } from './viewport/bridge';
import { getPref } from './prefs';
import { useEffect } from 'react';
import { useStore } from './store';
import { withUnsavedCheck } from './MenuBar';
import { getCamera } from './viewport/Viewport';
import { commandById, DEFAULT_KEYS, keyBindings, keyCombo } from './commands';

export interface Shortcut {
  keys: string;
  label: string;
  group: string;
}

/**
 * Keyboard shortcuts as in the desktop original (help: "Selected Keyboard Shortcuts" and
 * the commonly-used list). Sketch tools have no single-letter keys except L (Line); use
 * the S shortcut bar or the Command Ribbon for the others.
 */
export const SHORTCUTS: Shortcut[] = [
  { keys: 'L', label: 'Line', group: 'Sketch' },
  { keys: 'S', label: 'Shortcut bar (sketch tools)', group: 'Sketch' },
  { keys: 'Ctrl (while sketching)', label: 'Turns off automatic sketch relations', group: 'Sketch' },
  { keys: 'Ctrl+click', label: 'Select multiple entities', group: 'Sketch' },
  { keys: 'Esc', label: 'Cancel / Select', group: 'Sketch' },
  { keys: 'Enter', label: 'Repeat last command', group: 'Sketch' },
  { keys: 'D', label: 'Move OK/Cancel (Confirmation Corner) to the pointer', group: 'Sketch' },
  { keys: 'Delete', label: 'Delete', group: 'Sketch' },
  { keys: 'Ctrl+Z / Ctrl+Y', label: 'Undo / Redo', group: 'Edit' },
  { keys: 'Ctrl+B', label: 'Rebuild', group: 'Edit' },
  { keys: 'Ctrl+Q', label: 'Force rebuild', group: 'Edit' },
  { keys: 'Ctrl+N / Ctrl+O / Ctrl+S / Ctrl+P', label: 'New / Open / Save / Print', group: 'File' },
  { keys: 'R', label: 'Recent documents', group: 'File' },
  { keys: 'Arrow keys', label: 'Rotate the model 15°', group: 'View' },
  { keys: 'Shift+arrow keys', label: 'Rotate the model 90°', group: 'View' },
  { keys: 'Alt+arrow keys', label: 'Rotate parallel to the screen (roll)', group: 'View' },
  { keys: 'Ctrl+arrow keys', label: 'Pan', group: 'View' },
  { keys: 'F', label: 'Zoom to Fit', group: 'View' },
  { keys: 'Z / Shift+Z', label: 'Zoom Out / Zoom In', group: 'View' },
  { keys: 'Ctrl+1 … 6', label: 'Front / Back / Left / Right / Top / Bottom', group: 'View' },
  { keys: 'Ctrl+7', label: 'Isometric', group: 'View' },
  { keys: 'Ctrl+8', label: 'Normal To', group: 'View' },
  { keys: 'Space', label: 'View Selector and Orientation dialog', group: 'View' },
  { keys: 'Ctrl+Space', label: 'View Selector', group: 'View' },
  { keys: 'Ctrl+Shift+Z', label: 'Previous View', group: 'View' },
  { keys: 'Shift+C', label: 'Collapse Feature Tree', group: 'View' },
  { keys: 'F9', label: 'Hide/show Feature Tree area', group: 'View' },
  { keys: 'F11', label: 'Full screen', group: 'View' },
  { keys: 'Ctrl+R', label: 'Redraw', group: 'View' },
  { keys: '?', label: 'Keyboard shortcuts / Help', group: 'Help' },
  { keys: 'Middle mouse drag', label: 'Rotate', group: 'Mouse' },
  { keys: 'Ctrl+middle drag', label: 'Pan', group: 'Mouse' },
  { keys: 'Shift+middle drag', label: 'Zoom about the screen centre', group: 'Mouse' },
  { keys: 'Alt+middle drag', label: 'Rotate parallel to the screen (roll)', group: 'Mouse' },
  { keys: 'Middle double-click', label: 'Zoom to Fit', group: 'Mouse' },
  { keys: 'Wheel', label: 'Zoom at the pointer (towards you = zoom in, reversible in Options)', group: 'Mouse' },
  { keys: 'Right mouse', label: 'Context toolbar and shortcut menu', group: 'Mouse' },
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
      // Customize ▸ Keyboard: when the user changed the bindings they decide; a default key that was moved does nothing
      const custom = getPref<string>('customize.keys');
      if (custom && !st.dialog) {
        const combo = keyCombo(e);
        const bind = keyBindings(custom);
        const id = Object.keys(bind).find((k) => bind[k] === combo);
        const cmd = id ? commandById(id) : undefined;
        if (cmd) {
          e.preventDefault();
          cmd.run(st, cam);
          return;
        }
        if (combo && Object.values(DEFAULT_KEYS).includes(combo) && !e.key.startsWith('Arrow')) return;
      }

      // ---- view rotation / pan with the arrow keys (15°, Shift 90°, Alt roll, Ctrl pan)
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 90 : Number(getPref('view.arrowKeys')) || 15;
        const panPx = Math.max(20, cam.width / 20);
        switch (e.key) {
          case 'ArrowLeft':
            if (ctrl) cam.pan(-panPx, 0);
            else if (e.altKey) cam.rotateStep('z', step);
            else cam.rotateStep('y', step);
            break;
          case 'ArrowRight':
            if (ctrl) cam.pan(panPx, 0);
            else if (e.altKey) cam.rotateStep('z', -step);
            else cam.rotateStep('y', -step);
            break;
          case 'ArrowUp':
            if (ctrl) cam.pan(0, -panPx);
            else if (e.altKey) cam.rotateStep('z', step);
            else cam.rotateStep('x', step);
            break;
          case 'ArrowDown':
            if (ctrl) cam.pan(0, panPx);
            else if (e.altKey) cam.rotateStep('z', -step);
            else cam.rotateStep('x', -step);
            break;
        }
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        st.setPanel('manager', { visible: !st.panels.manager.visible });
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        return;
      }
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
        withUnsavedCheck(() => useStore.getState().setDialog('new'));
        return;
      }
      // Enter outside a sketch / command / dialog: the last Command Ribbon command runs again, by design
      if (e.key === 'Enter' && !ctrl && !e.shiftKey && !e.altKey && st.hasDocument && !st.activeSketchId && !st.featureEdit && !st.dialog && !st.ask && !st.modify && !st.confirmDelete && st.lastCommand) {
        e.preventDefault();
        st.lastCommand.run();
        return;
      }
      if (ctrl && key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }
      if (ctrl && (key === 'b' || key === 'q')) {
        e.preventDefault();
        st.rebuildAll();
        return;
      }
      if (ctrl && key === 'r') {
        e.preventDefault();
        cam.update(); // redraw
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
          cam.normalTo(sk?.plane ?? st.selectedPlane ?? 'front');
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
        case 'l': st.setTool('line'); break;
        case 'r': st.setDialog('welcome'); break;
        case 'z': cam.zoomStep(1.25); break;
        case 'f': fitActive(); break;
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
