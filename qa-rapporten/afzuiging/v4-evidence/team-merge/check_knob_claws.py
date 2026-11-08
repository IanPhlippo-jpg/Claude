from pathlib import Path
import importlib.util,json
r=Path('/workspace/afzuiging');o=r/'report/v4-evidence/team-merge';spec=importlib.util.spec_from_file_location('cad',r/'report/v4-evidence/reconstruct_v4.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);a=json.loads((r/'src-v4/Afzuiging.kcad').read_text());body=m.build(next(c['part'] for c in a['components'] if c['name']=='Knophouder<1>'))[0];claw=m.build(next(c['part'] for c in a['components'] if c['name']=='Knopklauw<1>'))[0];res=[]
for x in [16.5,-16.5]:
 base=0 if x>0 else 180
 poses=[('swing',deg,-60,claw.rotate([0,base+deg,0]).translate([x,-60,0])) for deg in range(91)]+[('slide',0,y,claw.rotate([0,base,0]).translate([x,y,0])) for y in range(-60,-14)]
 hits=[];maximum=0
 for mode,deg,y,c in poses:
  v=(body^c).volume();maximum=max(maximum,v)
  if v>.02:hits.append(dict(mode=mode,deg=deg,y=y,intersection_mm3=v))
 res.append(dict(x=x,poses=len(poses),maximum_intersection_mm3=maximum,hits=hits))
(o/'knob-claw-sweep.json').write_text(json.dumps(dict(scope='Nominal knob claw against holder only;1deg swing atbottomY-60 then1mm deployed translation to-15. No thread/tolerance/full-table path certification.',results=res),indent=2));print(res)
