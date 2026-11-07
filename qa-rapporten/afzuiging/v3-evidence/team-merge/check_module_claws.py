import json,importlib.util,pathlib
R=pathlib.Path('/workspace/afzuiging');spec=importlib.util.spec_from_file_location('cad',R/'report/v3-evidence/reconstruct_v3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
a=json.loads((R/'src-v3/Afzuiging.kcad').read_text());body=m.build(next(c['part'] for c in a['components'] if c['name']=='Romp<1>'))[0];claw=m.build(next(c['part'] for c in a['components'] if c['name']=='Klauw<1>'))[0]
results=[]
for x in [96.5,-96.5]:
 for z in [72.,-72.]:
  base=0 if x>0 else 180;cases=[]
  # Swing only at the designed bottom window, then translate deployed arm upward.
  for deg in range(91):cases.append(('swing',deg,-61.0,claw.rotate([0,base+deg,0]).translate([x,-61,z])))
  for y in range(-61,-15):cases.append(('slide',0,y,claw.rotate([0,base,0]).translate([x,y,z])))
  bad=[];maximum=0.
  for mode,deg,y,c in cases:
   v=(body^c).volume();maximum=max(maximum,v)
   if v>.02:bad.append({'mode':mode,'deg':deg,'bottom_y':y,'intersection_mm3':v})
  results.append({'pivot_xz':[x,z],'poses':len(cases),'maximum_intersection_mm3':maximum,'hits_over_0_02':bad})
out={'scope':'Independent tessellated module-claw versus Romp only; 1deg swing at bottomY=-61 and 1mm vertical deployed slide to bottomY=-16. No knob-claw, screw threads, print tolerance, assembled whole-path or official kernel certification.','results':results};(R/'report/v3-evidence/team-merge/module-claw-sweep.json').write_text(json.dumps(out,indent=2));print([(x['pivot_xz'],x['poses'],x['maximum_intersection_mm3'],len(x['hits_over_0_02'])) for x in results])
