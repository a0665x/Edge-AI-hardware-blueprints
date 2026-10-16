/* Local bilingual presentation. Selection and evaluation parameters are locale-independent. */
const EN_CARDS=/*ENCARDS*/{};
const REFERENCE_LINKS=/*REFLINKS*/{};
let locale='zh';
const TRANSLATIONS=/*TRANSLATIONS*/{};
let translationPairs=[],translationPattern;
function translateText(value,language=locale){const text=String(value);if(language!=='en')return text;if(TRANSLATIONS[text])return TRANSLATIONS[text];let output=translationPattern?text.replace(translationPattern,match=>TRANSLATIONS[match]):text;return output.replace(/[；。）（、]/g,c=>({'；':'; ','。':'.','）':')','（':' (','、':', '}[c])).replace(/(^|[\s·])([低中高])(?=[\s。.,;)]|$)/g,(_,prefix,band)=>prefix+({低:'Low',中:'Medium',高:'High'}[band]));}
function decodeLocalizedAttribute(s){return s.replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[key]));}
function localizedHTML(value){return String(value).split(/(<[^>]+>)/g).map(part=>part.startsWith('<')?part.replace(/\b(aria-label|title|alt|placeholder|data-tip|label|value|name)="([^"]*)"/g,(_,a,v)=>`${a}="${esc(translateText(decodeLocalizedAttribute(v)))}"`).replace(/href="reference(?:-en)?\.html#/g,`href="${locale==='en'?'reference-en.html':'reference.html'}#`):translateText(part)).join('');}
function referenceLinks(c){return `<div class="chapter-links"><strong>閱讀相關章節 ↗</strong>${(REFERENCE_LINKS[c.id]||[]).map(l=>`<a href="${locale==='en'?'reference-en.html':'reference.html'}#${l.anchor}" target="_blank" rel="noopener"><b>C${String(l.chapter).padStart(2,'0')} · ${esc(l.zh)} ↗</b><small>${esc(l.why)}</small></a>`).join('')}</div>`;}
const localizedNodes=new WeakMap(),localizedAttrs=new WeakMap();let localizationObserver;
function applyLocalization(){if(!document.createTreeWalker)return;const walker=document.createTreeWalker(document.body,4);let node;while(node=walker.nextNode()){
 if(node.parentElement?.closest('script,style,[data-own-locale]'))continue;const current=node.nodeValue;const old=localizedNodes.get(node);const source=old&&current===old.output?old.source:current;const output=translateText(source);localizedNodes.set(node,{source,output});if(current!==output)node.nodeValue=output;
 }
 document.querySelectorAll('[aria-label],[title],[alt],[placeholder],[data-tip],[label],a[href*="reference"],a[href*="edge-ai-decision"]').forEach(el=>{
 if(el.closest('[data-own-locale]'))return;let values=localizedAttrs.get(el)||{};for(const attr of ['aria-label','title','alt','placeholder','data-tip','label']){if(!el.hasAttribute(attr))continue;const current=el.getAttribute(attr),old=values[attr],source=old&&current===old.output?old.source:current,output=translateText(source);values[attr]={source,output};if(current!==output)el.setAttribute(attr,output);}localizedAttrs.set(el,values);
 const href=el.getAttribute('href');if(href&&/^edge-ai-decision(?:-en)?\.drawio$/.test(href))el.setAttribute('href',locale==='en'?'edge-ai-decision-en.drawio':'edge-ai-decision.drawio');if(href&&/^reference(?:-en)?\.html#/.test(href))el.setAttribute('href',href.replace(/^reference(?:-en)?\.html/,locale==='en'?'reference-en.html':'reference.html'));
 });
}
function setLocale(next){if(typeof hideTip==='function')hideTip();locale=next==='en'?'en':'zh';if(document.documentElement)document.documentElement.lang=locale==='en'?'en':'zh-Hant';document.title=locale==='en'?'Edge AI | Evaluation workbench':'Edge AI｜需求評估工作台';if($('language'))$('language').value=locale;try{localStorage.setItem('edge-ai-locale',locale);}catch{}applyLocalization();if(typeof deliveryController!=='undefined'&&deliveryController)deliveryController.setLanguage(locale);}
function initializeLocalization(){
 for(const [zh,en] of Object.values(AIOT.copy))TRANSLATIONS[zh]=en;
 for(const c of CATALOG){const data=EN_CARDS[c.id];if(!data)continue;TRANSLATIONS[c.name]=data[0];TRANSLATIONS[c.short]=data[1];TRANSLATIONS[c.detail]=data[2];if(c.story)TRANSLATIONS[c.story]=data[2];}
 for(const links of Object.values(REFERENCE_LINKS))for(const l of links){TRANSLATIONS[l.zh]=l.en;TRANSLATIONS[l.why]=l.whyEn;}
 const labelNames=/*FIELDNAMES*/{};
 for(const [key,f] of Object.entries(fields)){const n=labelNames[key];if(n){TRANSLATIONS[f[0]]=n;TRANSLATIONS[f[3]]=/*FIELDTIPS*/{}[key]||`Planning input for ${n}. Validate with the exact model, runtime and hardware.`;}}
 const selectNames=/*SELECTNAMES*/{};
 for(const [key,[name,...options]] of Object.entries(SELECT_FIELDS)){if(selectNames[key])TRANSLATIONS[name]=selectNames[key];for(const [v,label] of options){if(!TRANSLATIONS[label]&&/*OPTIONNAMES*/{}[label])TRANSLATIONS[label]=/*OPTIONNAMES*/{}[label]||null;}}
 translationPairs=Object.entries(TRANSLATIONS).filter(([k])=>k.length>1).sort((a,b)=>b[0].length-a[0].length);
 translationPattern=new RegExp(translationPairs.map(([k])=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 let preference='zh';try{preference=new URLSearchParams(window.location.search).get('lang')||localStorage.getItem('edge-ai-locale')||'zh';}catch{}
 if($('language'))$('language').addEventListener('change',e=>setLocale(e.target.value));setLocale(preference);
 if(typeof MutationObserver!=='undefined'){localizationObserver=new MutationObserver(()=>{localizationObserver.disconnect();applyLocalization();localizationObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt','placeholder','data-tip','label']});});localizationObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt','placeholder','data-tip','label']});}
}
