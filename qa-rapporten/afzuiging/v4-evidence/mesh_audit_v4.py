import pathlib,json,trimesh,numpy as np
R=pathlib.Path('/workspace/afzuiging/src-v4');O=pathlib.Path('/workspace/afzuiging/report/v4-evidence');rows=[]
for p in sorted((R/'print').glob('*.stl')):
 m=trimesh.load_mesh(p); comps=m.split(only_watertight=False)
 rows.append(dict(file=str(p.relative_to(R)),dimensions=m.extents.tolist(),bounds=m.bounds.tolist(),faces=len(m.faces),watertight=bool(m.is_watertight),winding_consistent=bool(m.is_winding_consistent),positive_volume=bool(m.volume>0),volume_mm3=float(m.volume),components=len(comps),component_volumes=[float(t.volume) for t in comps]))
(O/'mesh-audit.json').write_text(json.dumps(rows,indent=2))
for r in rows: print(r['file'],np.round(r['dimensions'],3),'closed',r['watertight'],'winding',r['winding_consistent'],'components',r['components'])
