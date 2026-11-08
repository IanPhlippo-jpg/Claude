"""Independent tessellated reconstruction of supplied Phlippo CAD extrudes; not official kernel."""
import json,pathlib,math,traceback,numpy as np,manifold3d as md,trimesh
from scipy.spatial.transform import Rotation
R=pathlib.Path('/workspace/afzuiging/src-v4');O=pathlib.Path('/workspace/afzuiging/report/v4-evidence');(O/'reconstructed').mkdir(exist_ok=True)
def point(s,k):return np.array([s['points'][k]['x'],s['points'][k]['y']],float)
def sketch_loops(s):
 loops=[];chain=[];start=None;last=None
 for eid in s['entityOrder']:
  e=s['entities'][eid]
  if e.get('construction'):continue
  k=e['kind']
  if k=='circle':
   c=point(s,e['center']);r=s['scalars'][e['r']];n=max(32,int(math.ceil(2*math.pi*r/0.5)));loops.append([c+r*np.array([math.cos(t),math.sin(t)]) for t in np.linspace(0,2*math.pi,n,endpoint=False)]);continue
  if k=='line':pts=[point(s,e['p1']),point(s,e['p2'])]
  elif k=='arc':
   c=point(s,e['center']);a=point(s,e['start']);b=point(s,e['end']);r=s['scalars'][e['r']];ta=math.atan2(*(a-c)[::-1]);tb=math.atan2(*(b-c)[::-1]);dt=(tb-ta)%(2*math.pi) if e.get('ccw',True) else -((ta-tb)%(2*math.pi));n=max(4,int(abs(dt)*r/.3));pts=[c+r*np.array([math.cos(t),math.sin(t)]) for t in np.linspace(ta,ta+dt,n+1)];pts[0]=a;pts[-1]=b
  else:raise ValueError('unsupported '+k)
  if not chain:chain=list(pts);start=pts[0]
  else:
   if np.linalg.norm(chain[-1]-pts[0])>1e-4:raise ValueError('unordered/unjoined entities')
   chain.extend(pts[1:])
  if np.linalg.norm(chain[-1]-start)<1e-5:
   loops.append(chain[:-1]);chain=[]
 if chain:raise ValueError('open sketch')
 return loops
TOP={'origin':[0,0,0],'u':[1,0,0],'v':[0,0,-1],'n':[0,1,0]}
def build(d):
 obj=md.Manifold();notes=[]
 for f in d['features']:
  if f['type']!='extrude' or f.get('suppressed'):continue
  s=d['sketches'][f['sketchId']];pl=TOP if s['plane']=='top' else d['planes'][s['plane']];cs=md.CrossSection(sketch_loops(s),md.FillRule.EvenOdd)
  n=np.array(pl['n'],float);u=np.array(pl['u'],float);v=np.array(pl['v'],float);origin=np.array(pl['origin'],float);sgn=-1 if f.get('reverse') else 1
  # keep positive determinant for coordinates; reflect 2d section if reverse
  if sgn<0:cs=cs.mirror([1,0]) # mirror across line with normal x => X neg
  xx=u*sgn;yy=v;zz=n*sgn
  M=np.column_stack([xx,yy,zz,origin]);height=f['depth'];extra=f.get('direction2',{}).get('depth',0)
  if 'draft' in f:
   entities=[e for e in s['entities'].values() if not e.get('construction')]
   if all(e['kind']=='circle' for e in entities):
    tool=md.Manifold()
    for e in entities:
     c=point(s,e['center']);rr=s['scalars'][e['r']];rt=rr+height*math.tan(math.radians(f['draft']['angle']))*(1 if f['draft'].get('outward') else -1)
     cone=md.Manifold.cylinder(height,rr,max(rt,0),max(64,int(2*math.pi*rr/.3))).translate([c[0]*sgn,c[1],0]);tool=tool+cone
   else:
    # Only current non-circular draft: convex rounded-rectangle flange of Voedingsbox.
    # Its linear offset loft is a convex hull; this does not generalise to concave drafts.
    from shapely.geometry import Polygon
    loops=cs.to_polygons();assert len(loops)==1
    poly=Polygon(loops[0]);assert abs(poly.area-poly.convex_hull.area)<1e-3
    delta=height*math.tan(math.radians(f['draft']['angle']))*(1 if f['draft'].get('outward') else -1)
    ends=cs.offset(delta,md.JoinType.Miter).to_polygons();assert len(ends)==1
    pts=np.vstack([np.column_stack([loops[0],np.zeros(len(loops[0]))]),np.column_stack([ends[0],np.full(len(ends[0]),height)])])
    tool=md.Manifold.hull_points(pts)
  else:tool=md.Manifold.extrude(cs,height)
  if extra:tool=tool+md.Manifold.extrude(cs,extra).mirror([0,0,1])
  tool=tool.transform(M.tolist());obj=obj+tool if f['op']=='boss' else obj-tool
  if obj.status()!=md.Error.NoError:notes.append((f['id'],str(obj.status())))
 return obj,notes
if __name__=='__main__':
 a=json.load(open(R/'Afzuiging.kcad'));parts={};out=[]
 for c in a['components']:
  try:
   key=json.dumps(c['part'],sort_keys=True)
   if key not in parts:parts[key]=build(c['part'])
   solid,notes=parts[key];rot=Rotation.from_quat(c['rotation']).as_matrix();M=np.column_stack([rot,np.array(c['position'])]);s=solid.transform(M.tolist());mesh=s.to_mesh();tm=trimesh.Trimesh(np.array(mesh.vert_properties)[:,:3],np.array(mesh.tri_verts),process=False)
   p=O/'reconstructed'/f'{c["id"]}.stl';tm.export(p)
   out.append({'id':c['id'],'name':c['name'],'part':c['part']['name'],'volume_mm3':s.volume(),'bounds':list(s.bounding_box()),'bodies':len(s.decompose()),'status':str(s.status()),'notes':notes,'file':str(p)})
   print(c['name'],round(s.volume(),3),s.bounding_box(),flush=True)
  except Exception as e:out.append({'id':c['id'],'name':c['name'],'error':repr(e)});print('ERROR',c['name'],repr(e),flush=True)
 (O/'cad-reconstruction.json').write_text(json.dumps(out,indent=2))
