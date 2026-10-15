"""Generate a real-browser regression fixture for actionable validation."""
from pathlib import Path
root = Path(__file__).resolve().parents[2]
html = (root/'edge-ai-guide/index.html').read_text().replace('<head>', '<head><base href="'+(root/'edge-ai-guide').as_uri()+'/">')
qa = r'''
<script>
window.addEventListener('load',()=>setTimeout(()=>{
const passed=[],failures=[];const check=(v,t)=>(v?passed:failures).push(t);
try{
 const reset=()=>{pool=new Set(presets.people.ids);params={...DEFAULTS,...presets.people.p};render();};
 reset();params.objectWidth=2000;params.sensorWidth=1280;refreshEvaluation();
 const index=evaluation.issues.findIndex(i=>i.code==='geometry');
 check(index>=0,'geometry conflict generated');
 check($('p-objectWidth').classList.contains('condition-conflict'),'target box marked');
 check($('p-sensorWidth').classList.contains('condition-conflict'),'source width marked');
 check(!$('p-objectHeight').classList.contains('condition-conflict'),'valid height unmarked');
 const inner=$('p-sensorWidth').closest('details');
 check(!inner.open&&inner.classList.contains('conflict-section'),'collapsed advanced heading marked');
 const outer=inner.parentElement.closest('details');outer.open=false;
 check(outer.classList.contains('conflict-section'),'collapsed outer heading marked');
 document.querySelector(`[data-fix-conflict="${index}"]`).click();
 check(inner.open&&outer.open,'fix expands all related ancestors');
 check(document.activeElement===$('p-objectWidth'),'fix focuses editable target');
 params.objectWidth=100;refreshEvaluation();
 check(!document.querySelector('[data-conflict-mark]'),'resolved conflict clears all markers');
 params.pixelMode='geometry';params.objectMeters=100;params.viewDistance=1;render();
 const geometry=evaluation.issues.find(i=>i.code==='geometry');
 check(geometry&&conflictControls(geometry).includes($('p-viewDistance')),'geometry mode targets physical inputs');
 reset();params.modelBudgets={yolo:{weightGB:-1}};render();
 const resource=evaluation.issues.findIndex(i=>i.code==='resourceinput');
 const budget=document.querySelector('[data-budget="yolo"]');
 check(resource>=0&&budget.classList.contains('condition-conflict'),'invalid model budget marked');
 check(budget.closest('.domain-block').classList.contains('conflict-section'),'resource section marked');
 focusConflict(resource);check(document.activeElement===budget,'resource action focuses budget');
 reset();params.costOverrides={nano:'invalid'};render();
 const cost=evaluation.issues.find(i=>i.code==='costinput');
 check(cost&&conflictControls(cost)[0]===document.querySelector('[data-cost="nano"]'),'procurement targets exact device');
 reset();pool.add('batch');render();const timing=evaluation.issues.findIndex(i=>i.code==='timing');focusConflict(timing);
 check(document.activeElement===$('pool'),'card-only conflicts focus pool');
 setLocale('en');check(localizedHTML($('result').innerHTML).includes('Go to fix'),'English action available');
}catch(e){failures.push(e.stack);}
document.body.innerHTML='<pre>'+JSON.stringify({checks:passed.length,failures})+'</pre>';
},100));
</script>'''
Path('/tmp/edge-conflict-qa.html').write_text(html.replace('</body>',qa+'</body>'))
