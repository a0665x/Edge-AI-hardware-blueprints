"""Audit real DOM text/attributes across selection and delivery states."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
html=(root/'edge-ai-guide/index.html').read_text().replace('<head>','<head><base href="'+(root/'edge-ai-guide').as_uri()+'/">')
qa=r'''
<script>
window.addEventListener('load',async()=>{
const leaks=[],errors=[];let checks=0;const cjk=/[\u3400-\u9fff]/;
function text(s,where){checks++;if(cjk.test(s))leaks.push({where,text:s.split('\n').filter(line=>cjk.test(line)).join('\n').slice(0,4000)});}
function scan(where){applyLocalization();const walk=document.createTreeWalker(document.body,4);let n;while(n=walk.nextNode())if(!n.parentElement.closest('script,style')&&n.parentElement.getClientRects().length)text(n.nodeValue,where);document.querySelectorAll('[aria-label],[title],[alt],[placeholder],[data-tip],[data-pw-help],[label]').forEach(n=>{if(n.closest('[hidden]'))return;for(const a of ['aria-label','title','alt','placeholder','data-tip','data-pw-help','label'])if(n.hasAttribute(a))text(n.getAttribute(a),where+' @'+a);});}
try{
setLocale('en');scan('initial');
for(const id of Object.keys(presets).concat(PLATFORM_CASES.map(c=>c.id))){const known=PLATFORM_CASES.find(c=>c.id===id),p=known?{ids:known.ids,p:known.params}:presets[id];pool=new Set(p.ids);params={...DEFAULTS,...p.p};render();scan(id);for(const d of DEVICES){showDevice(d.id);scan(id+' device '+d.id);}closeDrawer();text(translateText(report()),id+' report');text(localizedHTML(exportDrawio()),id+' drawio');switchWorkbenchTab('delivery');scan(id+' delivery');text(deliveryController.csv(),id+' CSV');switchWorkbenchTab('selection');}
for(const scene of CATALOG.filter(c=>c.group==='scene')){
 pool=new Set([scene.id,...scene.models,'camera','realtime','localstack','audio']);params={...DEFAULTS};render();
 for(const key of Object.keys(SELECT_FIELDS)){if(!document.querySelector(`[data-param="${key}"]`))continue;for(const [value] of SELECT_FIELDS[key].slice(1)){const saved=params[key];params[key]=value;render();scan(scene.id+' '+key+' '+value);params[key]=saved;}}
 for(const key of Object.keys(fields)){if(!document.querySelector(`[data-param="${key}"]`))continue;const saved=params[key];params[key]=-1;render();scan(scene.id+' invalid '+key);params[key]=saved;render();}
}
for(const c of CATALOG){showInfo(c.id);scan('card '+c.id);}closeDrawer();
for(const d of DEVICES){showDevice(d.id);scan('device '+d.id);}closeDrawer();
for(const id of ['conflicts','rules']){showInfo(id);scan(id);}method();scan('method');if(!document.querySelector('a[href="edge-ai-decision-en.drawio"]'))errors.push('English static diagram link missing');showRefs();scan('refs');exportPanel();scan('export');closeDrawer();
switchWorkbenchTab('delivery');
for(const role of ProductWorkflow.roles){document.getElementById('pw-role-'+role.id)?.click();scan('missing '+role.id);}
for(const t of ProductWorkflow.tasks){document.querySelector(`[data-pw-task="${t.id}"]`)?.click();scan('task '+t.id);document.getElementById('pw-close')?.click();}
const original=URL.createObjectURL;let blob;URL.createObjectURL=b=>{blob=b;return 'blob:audit'};HTMLAnchorElement.prototype.click=function(){};document.querySelector('[data-pw-action="svg"]').click();text(await blob.text(),'workflow SVG');URL.createObjectURL=original;
pool=new Set(presets.document.ids);params={...DEFAULTS,...presets.document.p};render();deliveryController.refreshContext();
const baseline=JSON.stringify(deliveryController.getState());setLocale('zh');if(!document.querySelector('.pw-context h2').textContent.includes('工業電腦'))errors.push('Chinese device label not restored');setLocale('en');if(!document.querySelector('.pw-context h2').textContent.includes('industrial PC'))errors.push('English device label not restored');if(JSON.stringify(deliveryController.getState())!==baseline)errors.push('Language changed workflow state');scan('round trip');
}catch(e){errors.push(e.stack);}
localizationObserver?.disconnect();document.head.innerHTML='';document.body.innerHTML='<pre id="audit"></pre>';document.getElementById('audit').textContent=JSON.stringify({checks,errors,leaks:[...new Map(leaks.map(x=>[x.text,x])).values()]});
});
</script>'''
Path('/tmp/edge-locale-qa.html').write_text(html.replace('</body>',qa+'</body>'))
