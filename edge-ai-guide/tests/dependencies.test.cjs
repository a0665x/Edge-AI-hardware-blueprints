const assert=require('node:assert/strict');
const {CATALOG,DEFAULTS,dependencyRules,dependencyClosure,evaluate}=require('../src/engine.js');
const ids=new Set(CATALOG.map(c=>c.id));let pairs=0,combinations=0;
function check(input,p={}){
 const before=JSON.stringify(input),a=dependencyClosure(input,p),b=dependencyClosure(a.ids,p);
 assert.equal(JSON.stringify(input),before);assert.deepEqual(a.ids,b.ids);assert.equal(b.added.length,0);
 for(const id of input)assert(a.ids.includes(id));
 for(const rule of dependencyRules(a.ids,p)){assert(rule.choices.length);for(const id of rule.choices)assert(ids.has(id));if(rule.choices.length===1)assert(rule.met);}
 assert.equal(new Set(a.ids).size,a.ids.length);
 const e=evaluate(input,p);assert(!e.winner||!e.issues.length);if(e.dependencies.some(r=>!r.met))assert.equal(e.winner,null);
}
for(let i=0;i<CATALOG.length;i++)for(let j=i+1;j<CATALOG.length;j++){check([CATALOG[i].id,CATALOG[j].id]);pairs++;}
const group=g=>CATALOG.filter(c=>c.group===g).map(c=>c.id);
for(const s of group('scene'))for(const m of group('model'))for(const n of group('need'))for(const l of group('limit')){check([s,m,n,l]);combinations++;}
for(const p of [{companionBackend:'local'},{depthMode:'metricmono'},{depthMode:'stereo'},{depthMode:'tof'},{depthMode:'fusion'},{stabilization:'imu'},{stabilization:'visual'}])for(const c of CATALOG)check([c.id],p);
assert(!dependencyClosure(['points','cotracker']).ids.includes('tapir'));
assert.equal(dependencyClosure(['points']).choices[0].choices.length,2);
assert(dependencyClosure(['rag']).ids.includes('llm'));
assert(dependencyClosure(['metric']).choices.length);
assert(dependencyClosure(['iotcompanion'],{companionBackend:'local'}).ids.includes('tts'));
assert(evaluate(['ragagent','llm']).issues.some(i=>i.code==='dependency'));
assert.equal(evaluate(['people','yolo','batch','realtime']).winner,null);
assert.equal(evaluate(['iotcompanion','iotlink','private'],{companionBackend:'muse'}).winner,null);
console.log(JSON.stringify({cards:CATALOG.length,pairs,sceneTechnologyNeedLimitCombinations:combinations,parameterBranches:7*CATALOG.length,status:'passed'}));
