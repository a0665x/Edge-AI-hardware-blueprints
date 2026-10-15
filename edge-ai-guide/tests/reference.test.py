from pathlib import Path
from collections import Counter
from bs4 import BeautifulSoup
import json,re,subprocess,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
links=json.loads((root/'src/reference-links.json').read_text())
cat=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./src/engine.js").CATALOG))'],cwd=root))
assert set(links)=={c['id'] for c in cat}
for file in ['reference.html','reference-en.html']:
 soup=BeautifulSoup((root/file).read_text(),'html.parser');ids=[x['id'] for x in soup.select('[id]')]
 assert not [x for x,n in Counter(ids).items() if n>1],file
 for cid,targets in links.items():
  assert targets[0]['anchor']=='guide-'+cid
  for target in targets:
   assert target['anchor'] in ids,(file,cid,target)
   sec=soup.find(id=target['anchor']).find_parent('section')
   expected=['principles','flow','scenarios','matrix','algorithms','depth-decision','pipeline','compatibility','sizing','platforms','validation','revision','sources'][target['chapter']-1]
   assert sec and sec.get('id')==expected,(file,cid,target)
 print('PASS',file,'all card anchors exist under correct chapters')
for file in [f for f in ['index.html','standalone.html'] if (root/f).exists()]:
 soup=BeautifulSoup((root/file).read_text(),'html.parser');ids=[x['id'] for x in soup.select('[id]')]
 assert len(ids)==len(set(ids)),file
 assert soup.find(id='language')
 for el in soup.select('[src],[href]'):
  url=el.get('src') or el.get('href')
  if url.startswith(('https:','http:','data:','#')):continue
  path=url.split('#')[0].split('?')[0]
  assert (root/path).exists(),(file,path)
 print('PASS',file,'unique IDs and valid local files')
ET.parse(root/'edge-ai-decision.drawio')
export=Path('/tmp/edge-assessment-test.drawio')
if export.exists():ET.parse(export)
print('PASS original and exported draw.io XML')
print('PASS',len(cat),'cards have contextual links in both languages')
