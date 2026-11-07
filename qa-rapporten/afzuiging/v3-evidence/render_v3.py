import json,pathlib,trimesh,numpy as np
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
R=pathlib.Path('/workspace/afzuiging/report');rs=json.load(open(R/'v3-evidence/cad-reconstruction.json'))
sets=[('module-doorsnede','Module, X=0 — actuele KCAD onafhankelijk gereconstrueerd',[0,0,0],[1,0,0],['Romp','Bovenframe','Rooster LB','Filtercassette','Cassetterand','Filtermat Rittal SK 3171.100','Instroomplaat','Bodemplaat','San Ace C175 9TG24P0S01'],2,1),('box-doorsnede','Voedingsbox, Z=-195 — actuele KCAD reconstructie',[0,0,-195],[0,0,1],['Voedingsbox','Deksel voedingsbox','Mean Well GST90A24-P1M','Voedingsprint','Adapterklem'],0,1),('knop-doorsnede','Knophouder, X=247,1 — lokale details, actuele KCAD',[247.1,0,0],[1,0,0],['Knophouder','Knopdeksel','VIEWE-knop 1,5"','Adapterprint knop','USB-C-bus knophouder','M2,5 x 6 DIN 7991'],2,1)]
for fn,title,origin,normal,names,ia,ib in sets:
 fig,ax=plt.subplots(figsize=(11,7));colors=plt.cm.tab10(np.linspace(0,1,len(names)))
 for r in rs:
  if r.get('part') not in names:continue
  m=trimesh.load_mesh(r['file']);s=m.section(plane_origin=origin,plane_normal=normal)
  if s is None:continue
  for i,line in enumerate(s.discrete):ax.plot(line[:,ia],line[:,ib],color=colors[names.index(r['part'])],lw=1.3,label=r['part'] if i==0 else None)
 ax.set_aspect('equal');ax.grid(alpha=.3);ax.set(xlabel=['X','Y','Z'][ia]+' mm',ylabel=['X','Y','Z'][ib]+' mm',title=title);hs,ls=ax.get_legend_handles_labels();by=dict(zip(ls,hs));ax.legend(by.values(),by.keys(),fontsize=8,loc='upper left',bbox_to_anchor=(1,1));fig.tight_layout();fig.savefig(R/'img-v3'/f'{fn}.png',dpi=150);plt.close(fig)
