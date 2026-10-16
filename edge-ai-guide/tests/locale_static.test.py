"""English artifacts must not leak Chinese source labels into presentation."""
from pathlib import Path
import json,re,xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]
cjk=re.compile(r'[\u3400-\u9fff]')
def audit(value,path):
 if isinstance(value,str):assert value=='繁體中文' or not cjk.search(value),(path,value) # Native language name in the language picker.
 elif isinstance(value,dict):
  for key,item in value.items():audit(item,f'{path}.{key}')
 elif isinstance(value,list):
  for i,item in enumerate(value):audit(item,f'{path}[{i}]')
for path in (root/'src/locales').glob('*-en.json'):audit(json.loads(path.read_text()),str(path))
data=json.loads((root/'src/aiot-data.json').read_text())
for key,pair in data['copy'].items():audit(pair[1],'AIoT '+key)
audit(data['cardsEn'],'AIoT cards')
for name in ('accept','ops'):
 for key,pair in data[name].items():audit(pair[1],'AIoT '+name+' '+key)
soup=BeautifulSoup((root/'reference-en.html').read_text(),'html.parser')
for node in soup(['script','style']):node.decompose()
for node in soup.select('option[value=zh]'):
 assert node.get_text()=='繁體中文'
 node.decompose()
audit(soup.get_text(),'English reference chapters')
for node in soup.find_all():
 for attr in ['title','alt','placeholder','aria-label']:audit(node.get(attr,''),'reference '+attr)
zh=ET.parse(root/'edge-ai-decision.drawio');en=ET.parse(root/'edge-ai-decision-en.drawio')
assert len(list(zh.iter()))==len(list(en.iter()))
for a,b in zip(zh.iter(),en.iter()):
 assert a.tag==b.tag
 for key,value in b.attrib.items():
  if key in ('name','value'):audit(value,'English draw.io '+key)
  else:assert value==a.get(key),(key,'Diagram geometry changed during translation')
for path in [root.parent/'README.md',root/'README.md',root.parent/'docs/hosting.md',root.parent/'docs/aiot-evidence.md']:audit(path.read_text(),str(path))
print('PASS English dictionaries, all reference chapters/attributes, static diagram labels/geometry, and public documentation')
