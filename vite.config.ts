/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

/** the built page carries a Content-Security-Policy (the dev server needs inline scripts for React Fast Refresh) */
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"; // frame-ancestors is header-only (the Electron shell sends it as a header)
const csp = (): Plugin => ({
  name: 'phlippo-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

/** the commit of the build (QA 0.5.11 F97): git, else what `git archive` wrote into e2e/lib/commit.txt, else unknown */
function buildCommit(): string {
  try {
    const head = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const dirty = execSync('git status --porcelain --untracked-files=no', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (head) return dirty ? `${head}+changes` : head;
  } catch { /* no git */ }
  try {
    const exported = readFileSync(new URL('./e2e/lib/commit.txt', import.meta.url), 'utf-8').trim().split(/\s+/)[0];
    if (exported && !exported.includes('$')) return exported;
  } catch { /* no file */ }
  return 'unknown';
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(buildCommit()) },
  plugins: [react(), csp()],
  worker: { format: 'es' },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // the big libraries load as their own chunks (cached between versions)
        manualChunks(id: string) {
          const p = id.split(String.fromCharCode(92)).join('/');
          if (/node_modules\/three\//.test(p)) return 'three';
          if (/node_modules\/(three-bvh-csg|three-mesh-bvh)\//.test(p)) return 'csg';
          if (/node_modules\/(react|react-dom|scheduler|zustand)\//.test(p)) return 'react';
          // the geometry and document kernel (features, sketch solver, drawing views): its own chunk (QA F34)
          if (/\/src\/core\//.test(p) && !/\.worker\./.test(p)) return 'kernel';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
