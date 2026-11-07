import json,zipfile,pathlib,hashlib,collections,xml.etree.ElementTree as ET
import ezdxf
from PIL import Image
from fontTools.ttLib import TTFont
R=pathlib.Path('/workspace/afzuiging/src-v3');O=pathlib.Path('/workspace/afzuiging/report/v3-evidence');z=zipfile.ZipFile('/workspace/afzuiging/bronmomentopname-v3.zip');res=[]
for name in z.namelist():
 p=R/name.replace('\\','/');data=p.read_bytes();entry={'file':str(p.relative_to(R)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 try:
  if p.suffix in ['.kcad','.json','.loops']:
   d=json.loads(data);entry['result']='JSON parse OK'
   if p.suffix=='.kcad':
    bad=[]
    for f in d.get('features',[]):
     if f.get('sketchId') and f['sketchId'] not in d.get('sketches',{}):bad.append('missing sketch '+f['sketchId'])
    for s in d.get('sketches',{}).values():
     if s['plane'] not in ['top','front','right'] and s['plane'] not in d.get('planes',{}):bad.append('missing plane '+s['plane'])
     for e in s.get('entities',{}).values():
      for k in ['p1','p2','center','start','end']:
       if k in e and e[k] not in s['points']:bad.append('missing point '+e[k])
      if 'r' in e and isinstance(e['r'],str) and e['r'] not in s['scalars']:bad.append('missing radius')
    entry.update(features=len(d.get('features',[])),sketches=len(d.get('sketches',{})),reference_errors=bad)
  elif p.suffix=='.svg': ET.parse(p);entry['result']='SVG XML parse OK'
  elif p.suffix=='.png':
   im=Image.open(p);entry['dimensions']=im.size;im.verify();entry['result']='PNG decode OK'
  elif p.suffix=='.dxf':
   doc=ezdxf.readfile(p);aud=doc.audit();entry.update(result='DXF parse/audit',errors=len(aud.errors),fixes=len(aud.fixes),units=doc.units,entities=len(doc.modelspace()))
  elif p.suffix=='.woff2':TTFont(p);entry['result']='Font parse OK'
  elif p.suffix=='.pdf':entry['result']='PDF text extracted via pdftotext; see derived txt'
  elif p.suffix=='.stl':entry['result']='Mesh audited separately'
  else:data.decode('utf-8-sig');entry['result']='UTF-8 read OK'
 except Exception as e:entry['result']='ERROR '+repr(e)
 res.append(entry)
(O/'file-audit.json').write_text(json.dumps(res,indent=2));print('files',len(res),'status',collections.Counter(x['result'] for x in res));print('reference errors',[(x['file'],x['reference_errors']) for x in res if x.get('reference_errors')])
a=json.load(open(R/'Afzuiging.kcad'));diff=[]
for c in a['components']:
 p=c['part'];stand=next((json.load(open(f)) for f in R.glob('*.kcad') if json.load(open(f)).get('name')==p.get('name')),None)
 if stand:
  clean=lambda d:{k:v for k,v in d.items() if k not in ['format','kind']}
  if clean(p)!=clean(stand):diff.append(c['name'])
print('semantic assembly differences',diff)
(O/'cad-semantic-consistency.json').write_text(json.dumps({'components':len(a['components']),'standalone_semantic_mismatches':diff,'mates':len(a['mates'])},indent=2))
# actual supplied DXF grille
from shapely.geometry import Polygon,box
ld=json.load(open(R/'laser/rooster.loops'));plate=Polygon(ld['outer'],ld['holes']);holes=[Polygon(v) for v in ld['holes']];print('grille',ld.get('rapport'),'valid',plate.is_valid,'open cassette cm2',sum(p.intersection(box(-85.5,-85.5,85.5,85.5)).area for p in holes)/100)
