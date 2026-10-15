from pathlib import Path
import base64,json,sys
root=Path(__file__).resolve().parent
src=root/'src'
workflow=src/'workflow'
template=(src/'workbench.html').read_text()
scene_files={'people':'people.webp','inspection':'vision-inspection.webp','document':'document.webp','points':'points.webp','gimbaltrack':'gimbal-tracking.webp','depthscene':'depthscene.webp','obstacle':'warehouse-depth.webp','maskscene':'maskscene.webp','semantic':'semantic.webp','checkout':'checkout.webp','security':'security.webp','pose':'pose.webp','voiceagent':'local-voice-agent.webp','ragagent':'ragagent.webp','uavtrack':'uavtrack.webp','uavmap':'uavmap.webp','uavavoid':'uavavoid.webp','mobilerobot':'mobilerobot.webp','vehicle':'vehicle.webp'}
def uri(p):
 raw=p.read_bytes()
 mime='image/png' if raw.startswith(b'\x89PNG') else 'image/jpeg' if raw.startswith(b'\xff\xd8') else 'image/webp' if raw[8:12]==b'WEBP' else 'image/avif' if raw[8:12]==b'avif' else 'image/svg+xml'
 return 'data:'+mime+';base64,'+base64.b64encode(raw).decode()
import context_reference
manifest=json.loads((root/'assets/hardware/sources.json').read_text())
for standalone in ([False,True] if '--standalone' in sys.argv else [False]):
 images={k:uri(root/'assets/generated'/f) if standalone else 'assets/generated/'+f for k,f in scene_files.items()}
 devices={p.stem:uri(p) if standalone else 'assets/hardware/'+p.name for p in (root/'assets/hardware').glob('*.img')}
 captions={x['id']:x['caption'] for x in manifest}
 app=(src/'app.js').read_text().replace('/*IMAGES*/{}',json.dumps(images,ensure_ascii=False)).replace('/*DEVICEIMAGES*/{}',json.dumps(devices,ensure_ascii=False)).replace('/*DEVICECAPTIONS*/{}',json.dumps(captions,ensure_ascii=False))
 i18n=(src/'i18n.js').read_text()
 for marker,f in [('ENCARDS','locales/cards-en.json'),('REFLINKS','reference-links.json'),('TRANSLATIONS','locales/ui-en.json'),('FIELDNAMES','locales/fields-en.json'),('FIELDTIPS','locales/tips-en.json'),('SELECTNAMES','locales/selects-en.json'),('OPTIONNAMES','locales/options-en.json')]:i18n=i18n.replace('/*'+marker+'*/{}',(src/f).read_text())
 html=template.replace('/*STYLES*/',(src/'styles.css').read_text()+'\n'+(workflow/'workflow.css').read_text()).replace('/*ENGINE*/',(src/'engine.js').read_text()).replace('/*APP*/',app).replace('/*I18N*/',i18n).replace('/*WORKFLOWENGINE*/',(workflow/'workflow-engine.js').read_text()).replace('/*WORKFLOWUI*/',(workflow/'workflow-ui.js').read_text()).replace('/*WORKFLOWBRIDGE*/',(src/'workflow-bridge.js').read_text())
 name='standalone.html' if standalone else 'index.html'
 (root/name).write_text(html)
 print('Built',name,len(html.encode()),'bytes')
ref=root/'reference.html'
s=ref.read_text().replace('演演算法','演算法')
if '回到評估工作台' not in s:s=s.replace('<div class="rail-bottom">','<div class="rail-bottom"><a href="index.html">← 回到評估工作台</a>')
ref.write_text(s)
