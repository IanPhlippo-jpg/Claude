"""Read-only source-model counterchecks. Run python -B reproduce_model_checks.py /path/to/src-v4."""
import runpy,sys,json,math
from pathlib import Path
src=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/afzuiging/src-v4');out=Path(__file__).parent;n=runpy.run_path(str(src/'docs/berekeningen.py'));s=n['filter_dp'](n['FILTERS']['CU']);full=n['filter_dp'](n['FILTERS']['CU'],True);upper=n['plenum']()[4];wp=n['werkpunt'];sp=n['sensor_dp'];pl=lambda q:upper*(q/250)**2
f=[dict(rpm=r,full_filter_Q_worst=wp(lambda q:full(q)+pl(q),r,1.5)) for r in [.75,.8,1]]
old=json.loads((out/'full-filter-contract.json').read_text());assert all(math.isclose(a['full_filter_Q_worst'],b['full_filter_Q_worst']) for a,b in zip(f,old['full_filter_Q']))
rows=[]
for extra in [0,upper]:
 for r in [.75,.8,1]:
  for k in [.7,1,1.5]:
   p=lambda q:extra*(q/250)**2;q0=wp(lambda q:s(q)+p(q),r,k);qn=wp(p,r,k);rows.append(dict(rpm=r,k=k,plenum_extra_Pa_at_250=extra,ratio_without_filter=sp(qn,0,k)/sp(q0,1,k)))
(out/'absent-filter-model-extended.json').write_text(json.dumps(dict(scope='No filter media;with/without existing source upper-plenum scenario;nominal source pressure observation;not a physical filter detector validation.',rows=rows),indent=2)+'\n')
print('full-filter source results verified;',len(rows),'absent-filter scenarios;ratio range',min(r['ratio_without_filter'] for r in rows),max(r['ratio_without_filter'] for r in rows));assert min(r['ratio_without_filter'] for r in rows)>.25
