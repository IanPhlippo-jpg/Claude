// Options ▸ Backup/Recover ▸ Auto-recover folder (QA F156): the desktop shell decides the folder. The row shows it
// (read-only) and Browse… opens the shell's own folder dialog; the app never hands a path to the shell.
import { useEffect, useState } from 'react';
import { desktop, type RecoverFolder } from './desktop';

export function RecoverFolderRow({ label }: { label: string }) {
  const api = desktop();
  const [folder, setFolder] = useState<RecoverFolder | null>(null);
  useEffect(() => { void api?.recoverFolder?.().then(setFolder); }, [api]);
  const browse = async () => {
    const r = await api?.chooseRecoverFolder?.();
    if (r) setFolder(r);
  };
  const reset = async () => {
    const r = await api?.resetRecoverFolder?.();
    if (r) setFolder(r);
  };
  // 'backup.autoRecoverFolder': the option of this row (the folder itself is kept by the shell)
  return (
    <div className="k-opt-row" data-testid="opt-backup.autoRecoverFolder" data-pref="backup.autoRecoverFolder">
      <label>{label}</label>
      <div className="k-opt-text">
        <input className="k-input" readOnly data-testid="recover-folder" value={api ? folder?.folder ?? '' : 'The browser storage (the desktop app keeps a folder)'} title={folder?.folder} />
        <button className="k-btn" data-testid="recover-folder-browse" disabled={!api?.chooseRecoverFolder} onClick={() => void browse()}>Browse...</button>
        {folder?.custom && <button className="k-btn" data-testid="recover-folder-default" onClick={() => void reset()}>Default</button>}
      </div>
    </div>
  );
}
