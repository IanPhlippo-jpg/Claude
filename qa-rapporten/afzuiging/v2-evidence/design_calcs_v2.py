import numpy as np,json,pathlib
from scipy.optimize import brentq
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
O=pathlib.Path('/workspace/afzuiging/report');Q=np.array([0,60,120,180,240,300,360,420,480,540,600,660,696]);P=np.array([609,530,497,469,430,386,340,286,225,160,103,40,0]);Q50=np.arange(0,481,60);P50=np.array([290,246,225,200,170,132,85,45,0]);res=[]
for power in [1,2]:
 for dpother500 in [60,200]:
  for pwm in [100,50]:
   fq,fp=(Q,P) if pwm==100 else(Q50,P50)
   pressure=lambda q:47*(q/(.170*.190*3600*.5))**power+dpother500*(q/500)**2
   q=brentq(lambda q:np.interp(q,fq,fp)-pressure(q),0,float(fq[-1]));res.append({'filter_reference':'V400S 20mm:47Pa at0.5m/s','filter_extrapolation_exponent':power,'other_loss_Pa_at_500m3h':dpother500,'PWM_percent':pwm,'estimated_Q_m3h':round(q,1),'dp_Pa':round(pressure(q),1)})
(O/'v2-evidence/airflow-sensitivity.json').write_text(json.dumps({'curve':'manual graphical read; approx ±15-25Pa, not numeric manufacturer points','Q100_m3h':Q.tolist(),'P100_Pa':P.tolist(),'Q50_m3h':Q50.tolist(),'P50_Pa':P50.tolist(),'scenarios':res},indent=2));print(json.dumps(res,indent=2))
fig,ax=plt.subplots(figsize=(9,6));ax.plot(Q,P,'k-',label='S01 100% PWM, grafisch');ax.plot(Q50,P50,'k--',label='S01 50% PWM, grafisch');q=np.linspace(0,550,300)
for n,color in [(1,'#1d8c9f'),(2,'#d67b28')]:
 for loss,ls in [(60,'-'),(200,':')]:ax.plot(q,47*(q/58.14)**n+loss*(q/500)**2,color=color,ls=ls,label=f'M5-referentie n={n}, overige {loss}Pa@500')
ax.set(xlim=(0,710),ylim=(0,800),xlabel='Volumestroom m³/h',ylabel='Statische druk / verlies Pa',title='Ontwerpgevoeligheid — geen voorspelling van gebouwd toestel');ax.legend(fontsize=8);ax.grid(alpha=.25);fig.tight_layout();fig.savefig(O/'img-v2/werkpunt-scenarios.png',dpi=140)
