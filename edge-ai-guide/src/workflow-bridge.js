/* Bridge keeps a reviewable selection snapshot; later edits never silently replace its baseline. */
var deliveryController;
function deliverySnapshot(){
 const e=evaluation,p=e.params;
 return {key:JSON.stringify({ids:e.ids,params:p,winner:e.winner?.id}),created:new Date().toISOString(),deviceId:e.winner?.id||null,deviceName:e.winner?.name||'',deviceNameEn:translateText(e.winner?.name||'','en'),conditional:true,
 sceneNames:e.scenes.map(c=>c.name).join(' + '),sceneNamesEn:e.scenes.map(c=>EN_CARDS[c.id]?.[0]||c.name).join(' + '),modelNames:e.models.join(' + '),memoryGB:Number(e.resources.totalGB.toFixed(1)),openCount:e.issues.length+e.pending.length,
 flags:{aiot:!!e.aiot,vision:e.models.some(m=>['tapir','cotracker','depth','stereo','slam'].includes(m))||p.viewDistance>=30||p.cameraPlatform!=='fixed',speech:!!e.speech||!!e.aiot?.link,cloud:!!e.aiot?.muse||(e.models.includes('llm')&&p.llmPlacement==='cloud')||(e.models.includes('jev')&&p.decisionPlacement==='cloud'),mobile:p.cameraPlatform!=='fixed'||e.scenes.some(s=>['obstacle','mobilerobot','uavavoid','vehicle'].includes(s.id))},
 selectedIds:[...e.ids],params:JSON.parse(JSON.stringify(p)),issues:e.issues,pending:e.pending,candidates:e.candidates.map(d=>({id:d.id,name:d.name,nameEn:translateText(d.name,'en'),blocked:d.blocked,costBand:d.costBand,route:d.route}))};
}
function switchWorkbenchTab(tab,focus=false){
 const delivery=tab==='delivery';$('selectionPanel').hidden=delivery;$('deliveryPanel').hidden=!delivery;
 for(const id of ['selection','delivery']){const btn=$(id+'Tab');btn.setAttribute('aria-selected',String((id==='delivery')===delivery));btn.tabIndex=((id==='delivery')===delivery)?0:-1;}
 if(delivery){if(!deliveryController){deliveryController=ProductWorkflowUI.mount($('deliveryRoot'),{language:()=>locale,snapshot:deliverySnapshot,makeLocal(){remember();params={...params,llmPlacement:'local',decisionPlacement:'local'};pool.add('private');if(evaluation.aiot?.muse){params.companionBackend='local';Object.assign(params,AIOT.data.scenes.find(c=>c.id==='iotlocal').sceneDefaults);for(const id of ['llm','asr','tts','localstack','audio'])pool.add(id);}render();deliveryController.refreshContext();}});deliveryController.importSelection();}else deliveryController.refreshContext();}
 hideTip();closeDrawer();if(focus)$(delivery?'deliveryTab':'selectionTab').focus();
 try{window.history.replaceState(null,'',delivery?'#delivery':'#selection');}catch{}
}
function initializeDeliveryTabs(){
 $('selectionTab').addEventListener('click',()=>switchWorkbenchTab('selection'));
 $('deliveryTab').addEventListener('click',()=>switchWorkbenchTab('delivery'));
 $('workbenchTabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?'selection':event.key==='End'?'delivery':$('deliveryPanel').hidden?'delivery':'selection';switchWorkbenchTab(target,true);});
 try{if(window.location.hash==='#delivery')switchWorkbenchTab('delivery');}catch{}
}
initializeDeliveryTabs();
