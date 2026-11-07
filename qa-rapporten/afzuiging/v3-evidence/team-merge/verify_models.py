from pathlib import Path
import runpy,math,json
R=Path('/workspace/afzuiging'); d=runpy.run_path(str(R/'src-v3/docs/berekeningen.py'))
fan=d['fan_p']; clean=d['filter_dp'](d['FILTERS']['G4'])
# Sensor chamber: grille+filter+cassette floor. Remaining terms are downstream of tap.
upterms=d['VERLIEZEN'][:2];downterms=d['VERLIEZEN'][2:]
def dp(terms,q): return sum(z*.5*d['RHO']*(q/3600/a)**2 for _,z,a in terms)
rows=[]
for r in [.2,.4,.6,.7,.8]:
 qc=d['werkpunt'](clean,r);pref=clean(qc)+dp(upterms,qc);target=2*pref
 if fan(0,r)<target:qa=None
 else:
  lo,hi=0.,qc
  for _ in range(90):
   mid=(lo+hi)/2
   if fan(mid,r)-dp(downterms,mid)>target:lo=mid
   else:hi=mid
  qa=(lo+hi)/2
 qmin=d['q_voor_vang']();ratio=(fan(qmin,r)-dp(downterms,qmin))/pref if qc>=qmin else None
 rows.append(dict(rpm_fraction=r,clean_Q=qc,clean_sensor_Pa=pref,alarm_Q=qa,sensor_ratio_at_Qmin=ratio,Qmin=qmin,model_assumptions='Source fan/scenario-medium; RPM fraction NOT PWM; no measured appliance prediction'))
A=d['A_FILTER'];radius=.0665;gap=.003;outer=1-math.pi*radius**2/A;radial=(250/3600)*outer;ring=2*math.pi*radius*gap;v=radial/ring
h={'outer_fraction_if_uniform':outer,'radial_flow_m3_s':radial,'ring_area_m2':ring,'velocity_m_s':v,'dynamic_pressure_scale_Pa':.5*d['RHO']*v*v,'warning':'Uniform filter loading is conditional, not established. This is a velocity/pressure scale, NOT an added irreversible pressure loss or a proven delivered flow.'}
rmin=d['r_voor'](d['q_voor_vang'](),clean);noise={'n_for_Qmin_source_model':rmin,'model_dBA_at_0_5m':d['db'](rmin,.5),'target_dBA_at_ear':55,'warning':'Conditional free-field fan-law estimate. No measured absolute acoustic or impossibility claim.'}
# Correct only the location-specific local MCU/sensor dissipation.
p5=sum(d['P_5V'].values())/d['ETA_BUCK'];therm=[]
for r in [.8,1.]:
 pout=d['FAN_W']*r**3+p5;loss=pout*(1/d['ADAPTER']['eta']-1)+sum(d['P_5V'].values())*(1/d['ETA_BUCK']-1)+.3
 corrected=loss+d['P_5V']['module_esp32c3']+d['P_5V']['sdp810'];therm.append(dict(rpm_fraction=r,original_box_loss_W=loss,corrected_box_loss_W=corrected,original_ambient_C=[25+d['box_dt'](loss,x) for x in d['H_WAND']],corrected_ambient_C=[25+d['box_dt'](corrected,x) for x in d['H_WAND']]))
result={'alarm_scenarios':rows,'shallow_plenum':h,'noise_goal_conflict':noise,'corrected_thermal_scenarios':therm};(R/'report/v3-evidence/team-merge/verified-models.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
