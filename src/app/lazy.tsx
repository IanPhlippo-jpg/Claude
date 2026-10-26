import { lazy, Suspense, type ComponentType } from 'react';

/**
 * Code splitting (QA F34): a component that lives in a module of its own chunk, loaded when it is first shown. Modules
 * are fetched right after start-up (preload, the default), so the first command or dialog does not wait for them;
 * the first paint does not need them.
 */
const preloads: (() => Promise<unknown>)[] = [];

// the props are those of the loaded component; they are not known here, so any props pass through
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyNamed<P extends object = Record<string, any>>(load: () => Promise<Record<string, unknown>>, name: string, preload = true): ComponentType<P> {
  // once the module is loaded the component renders directly: going through Suspense again would hide it for
  // React's reveal throttle (about 300 ms) every time it mounts
  let Real: ComponentType<P> | null = null;
  const loadReal = () => load().then((m) => { Real = m[name] as ComponentType<P>; return { default: Real }; });
  const L = lazy(loadReal);
  if (preload) preloads.push(loadReal);
  const C = (props: P) => {
    const R = Real;
    if (R) return <R {...props} />;
    return (
      <Suspense fallback={null}>
        <L {...props} />
      </Suspense>
    );
  };
  C.displayName = `Lazy(${name})`;
  return C;
}

/** fetches the chunks marked for preloading (call once after the app has painted) */
export function preloadLazy(): void {
  for (const p of preloads.splice(0)) p().catch(() => { /* loaded on first use instead */ });
}
