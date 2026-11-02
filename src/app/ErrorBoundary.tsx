import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useStore } from './store';

/**
 * A crash in a panel must never leave a blank or frozen window: show the error, undo or reload. With `fallback` the
 * failure stays inside the wrapped part (a Two View / Four View pane): it shows that instead, the rest keeps working.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: (error: Error, retry: () => void) => ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Phlippo CAD error:', error, info.componentStack);
  }
  private retry = (undo: boolean) => {
    try {
      const st = useStore.getState();
      if (undo) st.undo();
      useStore.setState({ confirmDelete: null, featureEdit: null, modify: null, dialog: null });
    } catch {
      /* fall through to the retry */
    }
    this.setState({ error: null });
  };
  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, () => this.setState({ error: null }));
    return (
      <div className="k-crash" role="alert" data-testid="crash">
        <div className="k-dialog">
          <div className="k-dialog-title">Phlippo CAD</div>
          <div className="k-dialog-body">
            <p>An operation failed and was stopped. The last change may be incomplete: Undo and continue goes back one step, Reload starts again from the last autosave (unsaved changes after it are lost).</p>
            <pre className="k-crash-msg">{this.state.error.message}</pre>
          </div>
          <div className="k-dialog-actions">
            <button className="k-btn primary" onClick={() => this.retry(true)}>Undo and continue</button>
            <button className="k-btn" onClick={() => this.retry(false)}>Continue</button>
            <button className="k-btn" onClick={() => location.reload()}>Reload</button>
          </div>
        </div>
      </div>
    );
  }
}
