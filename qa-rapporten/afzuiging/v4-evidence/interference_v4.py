import json,pathlib,numpy as np,trimesh,manifold3d as md
O=pathlib.Path('/workspace/afzuiging/report/v4-evidence');rs=json.load(open(O/'cad-reconstruction.json'));objs=[]
for r in rs:
 if 'error'in r:continue
 t=trimesh.load_mesh(r['file']);s=md.Manifold(md.Mesh(np.array(t.vertices,dtype=np.float32),np.array(t.faces,dtype=np.uint32)));objs.append((r,s,t.bounds))
ans=[]
for i,(a,sa,ba) in enumerate(objs):
 for b,sb,bb in objs[i+1:]:
  if np.any(np.minimum(ba[1],bb[1])-np.maximum(ba[0],bb[0])<1e-4):continue
  v=(sa^sb).volume()
  if v>.02:ans.append({'a':a['name'],'b':b['name'],'intersection_mm3':v,'a_id':a['id'],'b_id':b['id']})
ans.sort(key=lambda r:-r['intersection_mm3']);(O/'interferences.json').write_text(json.dumps(ans,indent=2));print('\n'.join(str(r) for r in ans))
