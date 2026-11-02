// Software OpenGL (Options ▸ Performance ▸ Use software OpenGL, QA v0.5.1 F115, F162). In the desktop app the choice is
// kept by the shell (only the choice, in gpu.json in the profile) and applied when Chromium starts: the 3D view is then
// drawn by SwiftShader on the CPU, for computers without a usable graphics driver. The browser has no such switch;
// there the option only shows. Options says what the current run uses and offers the way back to the graphics card.
import { useEffect, useState } from 'react';
import { desktop, type DesktopApi } from './desktop';
import { getPref } from './prefs';
import { useStore } from './store';

const RESTART_NOTE = 'Software OpenGL takes effect when Phlippo CAD starts again.';

/** Options ▸ OK: hands a changed choice to the shell and says when it takes effect */
export async function applySoftwareGL(on: boolean): Promise<void> {
  const api = desktop();
  if (!api?.gpuStatus || !api.setSoftwareGL) return;
  const status = await api.gpuStatus();
  if (!status || status.next === on) return;
  await api.setSoftwareGL(on);
  if (status.software !== on) useStore.getState().pushMessage(RESTART_NOTE, 'info');
}

/** at start: the option shows what the shell will use (the profile file is the truth, e.g. after --software-gl) */
async function syncSoftwareGL(): Promise<void> {
  const status = await desktop()?.gpuStatus?.();
  if (!status || status.next === (getPref('perf.softwareOpenGL') === true)) return;
  const st = useStore.getState();
  st.setPrefs({ ...st.prefs, 'perf.softwareOpenGL': status.next });
}
if (typeof window !== 'undefined') setTimeout(() => void syncSoftwareGL(), 0);

/** the message of a viewport without WebGL; in the desktop app with a button that restarts on software OpenGL */
export function NoWebGL() {
  const api = desktop();
  const canSwitch = !!api?.setSoftwareGL && !!api.restartApp;
  const restart = async () => {
    const st = useStore.getState();
    st.setPrefs({ ...st.prefs, 'perf.softwareOpenGL': true });
    await api!.setSoftwareGL!(true);
    await api!.restartApp!();
  };
  return (
    <div className="k-nogl" data-testid="no-webgl">
      This computer cannot show 3D graphics (WebGL is off or the graphics driver is missing).{' '}
      {canSwitch ? 'Update the graphics driver, or draw the 3D view in software (slower).' : 'Update the graphics driver, or turn on hardware acceleration in the browser.'}
      {canSwitch && <div style={{ marginTop: 10 }}><button className="k-btn" data-testid="use-software-gl" onClick={() => void restart()}>Use software OpenGL and restart</button></div>}
    </div>
  );
}

type GpuStatus = NonNullable<Awaited<ReturnType<NonNullable<DesktopApi['gpuStatus']>>>>;

/** Options ▸ Performance, under "Use software OpenGL": what this run uses, and a button back to the graphics card */
export function SoftwareGLNote() {
  const api = desktop();
  const [status, setStatus] = useState<GpuStatus | null>(null);
  useEffect(() => { void api?.gpuStatus?.().then((s) => setStatus(s ?? null)); }, [api]);
  if (!status || (!status.software && !status.next)) return null;
  const back = async () => {
    const st = useStore.getState();
    st.setPrefs({ ...st.prefs, 'perf.softwareOpenGL': false });
    await api!.setSoftwareGL!(false);
    await api!.restartApp!();
  };
  const why = status.source === 'argument' ? ' for this run (started with --software-gl)' : status.source === 'environment' ? ' for this run (PHLIPPO_SOFTWARE_GL)' : '';
  return (
    <div className="k-opt-note" data-testid="software-gl-note">
      {status.software
        ? `The 3D view is drawn in software (SwiftShader)${why}: slower than the graphics card, and Chromium runs its software renderer with a JIT it otherwise keeps off for web pages. This window only loads Phlippo CAD's own pages.`
        : 'Software OpenGL is chosen and takes effect when Phlippo CAD starts again.'}
      {status.next && api?.setSoftwareGL && api.restartApp && (
        <div style={{ marginTop: 6 }}><button className="k-btn" data-testid="software-gl-off" onClick={() => void back()}>Use the graphics card again and restart</button></div>
      )}
    </div>
  );
}
