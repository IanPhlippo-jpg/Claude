import * as THREE from 'three';

/**
 * Publish to Phlippo Viewer: a single self-contained HTML file with the model's triangles and a small built-in
 * viewer (rotate, pan, zoom, shaded display with edges, body list, measure between two picked points), the
 * equivalent of the original's eDrawings file. It needs no network and no install: any browser opens it.
 */
export interface ViewerBody { name: string; geometry: THREE.BufferGeometry; color?: string }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** the triangle positions of a body, rounded to 3 decimals, as a flat array */
export function bodyTriangles(g: THREE.BufferGeometry): number[] {
  const pos = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  const out: number[] = [];
  for (let i = 0; i < pos.count; i++) out.push(Math.round(pos.getX(i) * 1000) / 1000, Math.round(pos.getY(i) * 1000) / 1000, Math.round(pos.getZ(i) * 1000) / 1000);
  return out;
}

export const VIEWER_SCRIPT = String.raw`
(function(){
var data=window.__PHLIPPO_MODEL__;var canvas=document.getElementById('v');var ctx=canvas.getContext('2d');var list=document.getElementById('bodies');var info=document.getElementById('info');
var bodies=data.bodies.map(function(b,i){var t=[];for(var k=0;k<b.tris.length;k+=9){t.push([b.tris.slice(k,k+3),b.tris.slice(k+3,k+6),b.tris.slice(k+6,k+9)]);}return{name:b.name,tris:t,color:b.color||'#cfd3d8',visible:true};});
var all=[];bodies.forEach(function(b){b.tris.forEach(function(t){all.push.apply(all,t);});});
var min=[1e9,1e9,1e9],max=[-1e9,-1e9,-1e9];all.forEach(function(p){for(var i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}});
var center=[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2];var size=Math.max(max[0]-min[0],max[1]-min[1],max[2]-min[2])||1;
var rotX=-0.4,rotY=0.65,zoom=1,pan=[0,0],shaded=true,edges=true,picks=[];
function rot(p){var x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2];var cy=Math.cos(rotY),sy=Math.sin(rotY);var x1=x*cy+z*sy,z1=-x*sy+z*cy;var cx=Math.cos(rotX),sx=Math.sin(rotX);var y2=y*cx-z1*sx,z2=y*sx+z1*cx;return[x1,y2,z2];}
function proj(p){var s=Math.min(canvas.width,canvas.height)/size*0.7*zoom;return[canvas.width/2+p[0]*s+pan[0],canvas.height/2-p[1]*s+pan[1]];}
function draw(){var w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.fillStyle='#fcfcfc';ctx.fillRect(0,0,w,h);var tris=[];
bodies.forEach(function(b){if(!b.visible)return;b.tris.forEach(function(t){var r=t.map(rot);var z=(r[0][2]+r[1][2]+r[2][2])/3;var ux=r[1][0]-r[0][0],uy=r[1][1]-r[0][1],uz=r[1][2]-r[0][2],vx=r[2][0]-r[0][0],vy=r[2][1]-r[0][1],vz=r[2][2]-r[0][2];var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;var l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;tris.push({z:z,p:r.map(proj),n:[nx/l,ny/l,nz/l],c:b.color});});});
tris.sort(function(a,b){return a.z-b.z;});
tris.forEach(function(t){if(t.n[2]<0)return;var k=0.55+0.45*Math.max(0,t.n[2]*0.8+t.n[1]*0.3+t.n[0]*0.2);var c=hex(t.c);ctx.beginPath();ctx.moveTo(t.p[0][0],t.p[0][1]);ctx.lineTo(t.p[1][0],t.p[1][1]);ctx.lineTo(t.p[2][0],t.p[2][1]);ctx.closePath();if(shaded){ctx.fillStyle='rgb('+Math.round(c[0]*k)+','+Math.round(c[1]*k)+','+Math.round(c[2]*k)+')';ctx.fill();}if(edges){ctx.strokeStyle=shaded?'rgba(0,0,0,0.08)':'#333';ctx.lineWidth=0.5;ctx.stroke();}});
if(edges){ctx.strokeStyle='#000';ctx.lineWidth=1.2;var seen={};bodies.forEach(function(b){if(!b.visible)return;b.tris.forEach(function(t){for(var i=0;i<3;i++){var a=t[i],c=t[(i+1)%3];var key=a.join(',')+'|'+c.join(',');var rk=c.join(',')+'|'+a.join(',');if(seen[rk]){seen[rk].second=t;}else seen[key]={first:t,a:a,b:c};}});});
Object.keys(seen).forEach(function(k){var e=seen[k];if(!e.second)return;var n1=normal(e.first),n2=normal(e.second);if(n1[0]*n2[0]+n1[1]*n2[1]+n1[2]*n2[2]>0.94)return;var ra=rot(e.a),rb=rot(e.b);if(n1[2]<0&&n2[2]<0)return;var a=proj(ra),b=proj(rb);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();});}
picks.forEach(function(p){var q=proj(rot(p));ctx.fillStyle='#d9342b';ctx.beginPath();ctx.arc(q[0],q[1],4,0,6.283);ctx.fill();});
if(picks.length===2){var d=Math.sqrt(Math.pow(picks[0][0]-picks[1][0],2)+Math.pow(picks[0][1]-picks[1][1],2)+Math.pow(picks[0][2]-picks[1][2],2));info.textContent='Distance: '+d.toFixed(2)+' mm';}}
function normal(t){var r=t.map(rot);var ux=r[1][0]-r[0][0],uy=r[1][1]-r[0][1],uz=r[1][2]-r[0][2],vx=r[2][0]-r[0][0],vy=r[2][1]-r[0][1],vz=r[2][2]-r[0][2];var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;var l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;return[nx/l,ny/l,nz/l];}
function hex(c){var m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[207,211,216];}
var drag=null;canvas.addEventListener('mousedown',function(e){drag={x:e.clientX,y:e.clientY,b:e.button,moved:false};});
window.addEventListener('mousemove',function(e){if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;if(drag.b===0){rotY+=dx*0.01;rotX+=dy*0.01;}else{pan[0]+=dx;pan[1]+=dy;}drag.x=e.clientX;drag.y=e.clientY;draw();});
window.addEventListener('mouseup',function(e){if(drag&&!drag.moved&&drag.b===0&&document.getElementById('measure').checked){var best=null,bd=12;all.forEach(function(p){var q=proj(rot(p));var d=Math.hypot(q[0]-(e.clientX-canvas.getBoundingClientRect().left),q[1]-(e.clientY-canvas.getBoundingClientRect().top));if(d<bd){bd=d;best=p;}});if(best){picks.push(best);if(picks.length>2)picks=[best];draw();}}drag=null;});
canvas.addEventListener('contextmenu',function(e){e.preventDefault();});
canvas.addEventListener('wheel',function(e){e.preventDefault();zoom*=e.deltaY<0?1.1:1/1.1;draw();},{passive:false});
document.getElementById('shaded').addEventListener('change',function(e){shaded=e.target.checked;draw();});
document.getElementById('edges').addEventListener('change',function(e){edges=e.target.checked;draw();});
document.getElementById('fit').addEventListener('click',function(){zoom=1;pan=[0,0];draw();});
document.getElementById('measure').addEventListener('change',function(){picks=[];info.textContent='';draw();});
['front','top','right','iso'].forEach(function(v){document.getElementById('v-'+v).addEventListener('click',function(){if(v==='front'){rotX=0;rotY=0;}if(v==='top'){rotX=-Math.PI/2;rotY=0;}if(v==='right'){rotX=0;rotY=Math.PI/2;}if(v==='iso'){rotX=-0.6;rotY=0.785;}draw();});});
bodies.forEach(function(b,i){var li=document.createElement('label');var cb=document.createElement('input');cb.type='checkbox';cb.checked=true;cb.addEventListener('change',function(){b.visible=cb.checked;draw();});li.appendChild(cb);li.appendChild(document.createTextNode(' '+b.name+' ('+b.tris.length+' triangles)'));list.appendChild(li);});
window.addEventListener('resize',draw);draw();
})();
`;

/** a CSS colour for the viewer: only #rgb / #rrggbb pass; anything else becomes the default grey */
export function safeColor(c: string | undefined): string {
  return c && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c) ? c.toLowerCase() : '#cfd3d8';
}

/**
 * JSON for inside a <script> block: `<`, `>`, `&` and the line separators are written as \uXXXX escapes, so a
 * document or body name such as `</script><script>…` can never end the script block (stored XSS in the exported file).
 */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** the standalone viewer page for the bodies */
export function viewerHtml(docName: string, bodies: ViewerBody[], meta: { app: string; version: string; date?: string } = { app: 'Phlippo CAD', version: '' }): string {
  const model = { name: docName, bodies: bodies.map((b) => ({ name: b.name, color: safeColor(b.color), tris: bodyTriangles(b.geometry) })) };
  const tris = model.bodies.reduce((a, b) => a + b.tris.length / 9, 0);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:"><title>${esc(docName)} - Phlippo Viewer</title>
<style>
html,body{margin:0;height:100%;font:12px/1.4 "Segoe UI",system-ui,sans-serif;color:#1a1a1a;background:#f4f5f7}
#bar{display:flex;align-items:center;gap:10px;padding:6px 10px;background:#fff;border-bottom:1px solid #c9ced6}
#bar b{font-size:13px}#bar label{display:inline-flex;align-items:center;gap:4px}#bar button{padding:3px 8px;border:1px solid #9aa4b2;background:#fff;border-radius:3px;cursor:pointer}
#wrap{display:flex;height:calc(100% - 34px)}#side{width:220px;background:#fff;border-right:1px solid #c9ced6;padding:8px;overflow:auto}#side label{display:block;padding:2px 0}
#v{flex:1;display:block;width:100%;height:100%;cursor:grab}#info{margin-left:auto;color:#1f5fd0;font-weight:600}#foot{color:#666;font-size:11px;margin-top:10px}
</style></head><body>
<div id="bar"><b>${esc(docName)}</b><span style="color:#666">Phlippo Viewer</span>
<button id="v-front">Front</button><button id="v-top">Top</button><button id="v-right">Right</button><button id="v-iso">Isometric</button><button id="fit">Zoom to Fit</button>
<label><input type="checkbox" id="shaded" checked> Shaded</label><label><input type="checkbox" id="edges" checked> Edges</label><label><input type="checkbox" id="measure"> Measure (click two points)</label><span id="info"></span></div>
<div id="wrap"><div id="side"><b>Bodies</b><div id="bodies"></div><div id="foot">${tris} triangles · published by ${esc(meta.app)} ${esc(meta.version)}${meta.date ? ` · ${esc(meta.date)}` : ''}<br>Left drag: rotate · right drag: pan · wheel: zoom<br>Phlippo Viewer is part of Phlippo CAD, an independent product that is not affiliated with or endorsed by Dassault Systèmes SolidWorks Corp.</div></div><canvas id="v"></canvas></div>
<script>window.__PHLIPPO_MODEL__=${scriptJson(model)};</script>
<script>${VIEWER_SCRIPT}</script>
</body></html>`;
}
