"""Real-browser interactions for endpoint/host planning and workflow handoff."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
html=(root/'edge-ai-guide/index.html').read_text().replace('<head>','<head><base href="'+(root/'edge-ai-guide').as_uri()+'/">')
qa=r'''
<script>
window.addEventListener('load',async()=>{
const checks=[],failures=[];const check=(ok,s)=>(ok?checks:failures).push(s);
const preset=id=>{const n=$('preset');n.value=id;n.dispatchEvent(new Event('change',{bubbles:true}));};
const change=(key,v)=>{const n=$('p-'+key);if(!n)throw new Error('Missing '+key);n.value=v;n.dispatchEvent(new Event('change',{bubbles:true}));};
try{
setLocale('en');preset('iotpico');check(evaluation.winner.id==='esp32s3','Pico selects S3');check(!$('p-inferFps'),'no unrelated host FPS');check(!$('p-profileDevice'),'no host GPU budget');check(!!$('p-mcuFps'),'MCU controls rendered');
change('mcuCamera','csi');check(evaluation.winner.id==='esp32p4','MIPI selects P4');change('iotTransport','wifi');change('iotRadio','no');check(!evaluation.winner,'missing P4 radio blocks');
const ix=evaluation.issues.findIndex(i=>i.code==='aiot');document.querySelector(`[data-fix-conflict="${ix}"]`).click();check(document.activeElement?.dataset.param,'conflict focuses a related control');
preset('iotpico');change('mcuMeasuredS3',40);change('mcuVision','yolo26');check(params.mcuMeasuredS3===0,'model change clears stale measurement');check($('p-mcuMeasuredS3').value==='0','cleared measurement visible');
preset('iotmuse');check(evaluation.aiot.muse,'Muse service route');switchWorkbenchTab('delivery');check(deliveryController.getState().snapshot.flags.cloud,'Muse requires service function');check(deliveryController.getEvaluation().rows.some(r=>r.id==='iottransport'),'AIoT adds transport workflow');check(deliveryController.getEvaluation().rows.some(r=>r.id==='iotpairing'),'AIoT adds pairing acceptance');
const cloud=document.querySelector('[data-pw-applicability="cloud"]');cloud.value='na';cloud.dispatchEvent(new Event('change',{bubbles:true}));check(!!document.querySelector('.pw-conflict'),'Muse cannot silently remove required service role');document.querySelector('[data-pw-action="local"]').click();check(params.companionBackend==='local'&&pool.has('llm')&&pool.has('private'),'workflow conflict can switch companion to local requirements');check(!deliveryController.getState().snapshot.flags.cloud,'local conversion refreshes workflow service scope');
switchWorkbenchTab('selection');change('companionBackend','local');check(evaluation.models.includes('llm')&&evaluation.models.includes('asr')&&evaluation.models.includes('tts'),'local route adds host pipeline');check(!evaluation.aiot.standalone,'local route has separate host');switchWorkbenchTab('delivery');check(!deliveryController.getState().snapshot.flags.cloud,'local backend removes mandatory cloud scope');
switchWorkbenchTab('selection');change('companionBackend','muse');check(evaluation.aiot.standalone&&!evaluation.models.includes('llm'),'Muse switch removes alternative host pipeline');
preset('iotlan');check(evaluation.winner.id==='nx','local 8B planning starts at NX');const endpoint=evaluation.aiot.workingMB;change('kvGB',12);change('runtimeGB',8);check(evaluation.winner?.id!=='nx','shared host memory changes ranking');check(evaluation.aiot.workingMB===endpoint,'host memory not charged to endpoint');
preset('iotyolo26');check(evaluation.winner.id==='esp32p4','low-rate YOLO26 P4');change('mcuFps',10);check(!evaluation.winner,'YOLO26 video target requires measurements');
preset('iotpico');const before=JSON.stringify(params);setLocale('zh');setLocale('en');check(JSON.stringify(params)===before,'language leaves parameters unchanged');
for(const id of ['iotlan','iotpico','iotclassical','iotyolo26','iotmuse']){preset(id);applyLocalization();check(!/[\u3400-\u9fff]/.test($('result').innerText),id+' English results');check(document.querySelector('.scene-preview').getAttribute('src').includes('iot'),id+' distinct scenario asset');}
check(document.documentElement.scrollWidth<=innerWidth,'no horizontal page overflow');
preset('iotpico');if(location.search.includes('screenshot')){applyLocalization();window.scrollTo(0,0);return;}
}catch(e){failures.push(e.stack);}
localizationObserver?.disconnect();document.head.innerHTML='';document.body.innerHTML='<pre id="result"></pre>';$('result').textContent=JSON.stringify({checks:checks.length,failures});
});</script>'''
Path('/tmp/edge-aiot-qa.html').write_text(html.replace('</body>',qa+'</body>'))
