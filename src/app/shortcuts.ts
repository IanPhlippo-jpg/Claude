import { useEffect } from 'react';
import { useStore, type ToolId } from './store';
import { getCamera } from './viewport/Viewport';

export interface Shortcut {
  keys: string;
  label: string;
  group: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: 'L', label: 'Line', group: 'Sketch' },
  { keys: 'R', label: 'Corner Rectangle', group: 'Sketch' },
  { keys: 'C', label: 'Circle', group: 'Sketch' },
  { keys: 'A', label: '3 Point Arc', group: 'Sketch' },
  { keys: 'N', label: 'Spline', group: 'Sketch' },
  { keys: 'P', label: 'Point', group: 'Sketch' },
  { keys: 'M', label: 'Smart Dimension', group: 'Sketch' },
  { keys: 'X', label: 'Construction Geometry', group: 'Sketch' },
  { keys: 'Esc', label: 'Cancel / Select', group: 'Sketch' },
  { keys: 'Enter', label: 'Repeat last command', group: 'Sketch' },
  { keys: 'D', label: 'Move OK/Cancel (Confirmation Corner) to the pointer', group: 'Sketch' },
  { keys: 'Delete', label: 'Delete', group: 'Sketch' },
  { keys: 'Ctrl+Z / Ctrl+Y', label: 'Undo / Redo', group: 'Edit' },
  { keys: 'Ctrl+B', label: 'Rebuild', group: 'Edit' },
  { keys: 'Ctrl+N / Ctrl+O / Ctrl+S', label: 'New / Open / Save', group: 'File' },
  { keys: 'Ctrl+Shift+S', label: 'Sketch (select a plane)', group: 'File' },
  { keys: 'F', label: 'Zoom to Fit', group: 'View' },
  { keys: 'Z / Shift+Z', label: 'Zoom Out / Zoom In', group: 'View' },
  { keys: 'Ctrl+1 … 6', label: 'Front / Back / Left / Right / Top / Bottom', group: 'View' },
  { keys: 'Ctrl+7', label: 'Isometric', group: 'View' },
  { keys: 'Ctrl+8', label: 'Normal To', group: 'View' },
  { keys: 'Space', label: 'Orientation dialog', group: 'View' },
  { keys: 'Ctrl+Space', label: 'View Selector', group: 'View' },
  { keys: 'Shift+Ctrl+Z', label: 'Previous View', group: 'View' },
  { keys: 'S', label: 'Shortcut bar', group: 'View' },
  { keys: 'Shift+C', label: 'Collapse FeatureManager', group: 'View' },
  { keys: 'Ctrl+Shift+D', label: 'Light / dark theme', group: 'View' },
  { keys: '?', label: 'Keyboard shortcuts / Help', group: 'Help' },
  { keys: 'Middle mouse', label: 'Rotate', group: 'Mouse' },
  { keys: 'Ctrl+middle mouse', label: 'Pan', group: 'Mouse' },
  { keys: 'Shift+middle mouse', label: 'Zoom', group: 'Mouse' },
  { keys: 'Wheel', label: 'Zoom at the cursor (towards you = zoom in, configurable)', group: 'Mouse' },
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
