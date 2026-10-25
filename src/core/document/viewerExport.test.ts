import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyTriangles, viewerHtml, VIEWER_SCRIPT } from './viewerExport';

describe('Publish to Phlippo Viewer', () => {
  it('embeds the triangles of every body and the viewer script in one HTML page', () => {
    const g = new THREE.BoxGeometry(10, 20, 30).toNonIndexed();
    const html = viewerHtml('Blok', [{ name: 'Boss-Extrude1', geometry: g, color: '#c8c8cc' }], { app: 'Phlippo CAD', version: '0.3.3' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Blok - Phlippo Viewer');
    expect(html).toContain('window.__PHLIPPO_MODEL__=');
    expect(html).toContain('"name":"Boss-Extrude1"');
    expect(html).toContain(VIEWER_SCRIPT.slice(0, 40));
    expect(html).toContain('12 triangles');
    // no external resources: the file works offline
    expect(html).not.toMatch(/https?:\/\//);
    expect(bodyTriangles(g).length).toBe(36 * 3);
  });

  it('escapes the document name', () => {
    const html = viewerHtml('<Plaat & Co>', [], { app: 'Phlippo CAD', version: 'dev' });
    expect(html).toContain('&lt;Plaat &amp; Co&gt;');
  });
});
