from pathlib import Path
import json,importlib.util,trimesh,numpy as np
r=Path('/workspace/afzuiging');o=r/'report/v4-evidence';spec=importlib.util.spec_from_file_location('cad',o/'reconstruct_v4.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
a=json.loads((r/'src-v4/Afzuiging.kcad').read_text());records=json.loads((o/'cad-reconstruction.json').read_text());meshes=json.loads((o/'mesh-audit.json').read_text());comp=[];body=[]
for f in (r/'src-v4/print').glob('*.stl'):
 d=json.loads((r/'src-v4'/(f.stem+'.kcad')).read_text());solid,notes=m.build(d);tm=trimesh.load_mesh(f);v=solid.volume();comp.append({'file':f.name,'stl_volume':float(tm.volume),'cad_volume':v,'difference_percent':100*abs(float(tm.volume)-v)/v})
for n in ['Instroomplaat<1>','Voedingsbox<1>']:
 d=next(c['part'] for c in a['components'] if c['name']==n);s,_=m.build(d);vs=sorted((abs(x.volume()) for x in s.decompose()),reverse=True);body.append({'part':n,'raw_components':len(vs),'largest_volumes':vs[:5],'secondary_total_mm3':sum(vs[1:])})
from shapely.geometry import Polygon,box
ld=json.loads((r/'src-v4/laser/rooster.loops').read_text());area=sum(Polygon(h).intersection(box(-72.5,-97.5,72.5,97.5)).area for h in ld['holes'])
out={'cad_stl':comp,'max_difference_percent':max(x['difference_percent'] for x in comp),'reconstruction_microcomponents':body,'laser_open_over_new_filter_cm2':area/100,'module_bottom_y':-116,'underhang_below34mm_board':82,'bottom_floor_at734mm_tabletop':618,'filter_bottom_y':-28.5,'filter_top_y':1.5,'steel_bottom_y':2.5,'rest_top_gap_mm':1,'guard_to_rotor_gap_mm':2.05,'guard_slot_nominal_mm':10.4,'scope':'Independent tessellation; near-zero fragments may be numerical, not production STL disconnections.'};(o/'geometry-verification.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
