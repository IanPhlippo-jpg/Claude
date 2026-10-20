import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { useStore } from './app/store';
(window as unknown as { __phlippoStore?: typeof useStore }).__phlippoStore = useStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
