import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyTriangles, safeColor, scriptJson, viewerHtml, VIEWER_SCRIPT } from './viewerExport';

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

  it('cannot be broken out of with a </script> in a document or body name (F62)', () => {
    const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const evil = '</script><script>alert(1)</script>';
    const html = viewerHtml(evil, [{ name: evil, geometry: g, color: 'red;background:url(x)' }], { app: 'Phlippo CAD', version: 'dev' });
    // the model block holds exactly two script blocks: the model and the viewer
    expect(html.match(/<script>/g)?.length).toBe(2);
    expect(html).not.toContain('alert(1)</script>');
    expect(scriptJson({ a: '</script>' })).toBe('{"a":"\\u003c/script\\u003e"}');
    expect(JSON.parse(scriptJson({ a: '</script>&\u2028' }))).toEqual({ a: '</script>&\u2028' });
    // only hex colours reach the page
    expect(html).toContain('"color":"#cfd3d8"');
    expect(safeColor('#ABC')).toBe('#abc');
    expect(safeColor('url(javascript:1)')).toBe('#cfd3d8');
    // the page itself refuses everything external
    expect(html).toContain('Content-Security-Policy');
  });
});
