/* Endpoint and host resources are separate budgets. Source examples are not product benchmarks. */
const EdgeAIoT=(()=>{
 const data=typeof module!=='undefined'?require('./aiot-data.json'):/*AIOTDATA*/{};
 const copy={...data.copy};
 const pair=(key,zh,en)=>(copy[key]=[zh,en],zh),T=key=>copy[key]?.[0]||key;
 pair('scope','AIoT：端點與主機分工','AIoT: endpoint and host responsibilities');
 pair('endpoint','ESP32 端點','ESP32 endpoint');pair('host','LLM／其他模型主機','LLM / other model host');pair('service','Muse 服務；無本地 LLM 主機','Muse service; no local LLM host');pair('standalone','MCU 單機；不需要 GPU 主機','MCU only; no GPU host required');
 pair('memory','端點 PSRAM 規劃 MB','Endpoint PSRAM plan MB');pair('frame','原始影格 buffer MB','Raw frame buffer MB');
 pair('lan','Wi-Fi LAN；BLE 用於配網','Wi-Fi LAN; BLE for provisioning');pair('ble','BLE 資料需另做 gateway／協定；此案例沒有已驗證音訊路徑。','BLE data needs a gateway/protocol; these examples do not validate a BLE audio route.');
 pair('p4radio','P4 沒有內建 Wi-Fi／BLE；無線需求須加 companion 晶片。','P4 has no integrated Wi-Fi/BLE; wireless operation needs a companion chip.');
 pair('csi','S3 沒有原生 MIPI CSI；請選 DVP／相容 UVC，或改 P4。','S3 has no native MIPI CSI; choose DVP/compatible UVC or P4.');
 pair('usb','S3 UVC 需 Full-Speed 相容 MJPEG 相機；等時資料 <4 Mbps，bulk <8.8 Mbps，並測解碼與 Wi-Fi 並存。','S3 UVC needs a Full-Speed-compatible MJPEG camera: under 4 Mbps isochronous or 8.8 Mbps bulk, plus decoding/Wi-Fi tests.');
 pair('usbFail','相機串流超出所選 S3 USB 傳輸模式的參考頻寬。','Camera stream exceeds the reference bandwidth for the selected S3 USB transfer mode.');
 pair('ramFail','端點工作集超過此候選 PSRAM 配置；降低 buffer／模型或換板卡。','Endpoint working set exceeds this candidate PSRAM configuration; reduce buffers/model or change board.');
 pair('unsupported','混入主機模型時，ESP32 僅是端點，不能取代 LLM／GPU 主機。','With host models selected, ESP32 is an endpoint, not a replacement for the LLM/GPU host.');
 pair('hostUnneeded','此路徑只評估 MCU 端點；未要求本地大型模型主機。','This route evaluates only MCU endpoints; no local large-model host is requested.');
 pair('offline','Muse 服務與完全離線衝突；改自建本地服務或移除離線限制。','Muse service conflicts with fully offline use; choose a custom local backend or remove the offline constraint.');
 pair('local','本地 AIoT 場景需本地 LLM；雲端部署不符合此需求。','The local AIoT scene requires a local LLM; cloud placement does not meet that requirement.');
 pair('missing','本地語音服務需同時加入 LLM、ASR 與 TTS 技術。','Local voice service requires LLM, ASR and TTS techniques together.');
 pair('tts','Muse 預設是文字回覆；語音選項需另外整合 TTS，不能假設 SDK 已提供語音回答。','Muse replies are text by default; spoken replies need a separate TTS integration, not an assumed SDK feature.');
 pair('outage','要求斷線後仍能完整對話，與遠端模型路徑衝突；改本地服務或接受明確降級。','Full conversation during a backend outage conflicts with remote inference; use local service or an explicit fallback.');
 pair('latency','網路與端點音訊預算已用完回應期限；尚未計入主機推論。','Network and endpoint audio budgets exhaust the response deadline before host inference.');
 pair('pico','ESPDet-Pico 224：官方單類案例約 >7 FPS（S3）、>18 FPS（P4）；不是自訂場景保證。','ESPDet-Pico 224: official single-class examples report >7 FPS (S3), >18 FPS (P4); not a custom-scene guarantee.');
 pair('yolo','完整 YOLO 的效能證據需分開；P4 YOLO26 512 範例約 2096 ms／張（含前後處理），不是影片即時保證。','Full YOLO evidence is separate: the P4 YOLO26 512 example is about 2096 ms/image including pre/postprocessing, not a live-video guarantee.');
 pair('yolo8','YOLOv8n 自訂匯出：本次未查到同配置的官方效能依據；先驗證量化圖與完整管線。','Custom YOLOv8n export: no matching official performance evidence verified here; validate the quantized graph and full pipeline first.');
 pair('profile','要求超出所選公開案例的保守起測值；需填該裝置／模型的完整管線實測 ms 才保留此候選。','Target exceeds the selected example screening value; enter full-pipeline measurements for this device/model to retain it.');
 pair('measured','實測管線時間無法滿足要求的更新率。','Measured pipeline time cannot meet the requested update rate.');
 pair('cameraFps','推論更新率不能高於相機實拍 FPS。','Inference update rate cannot exceed captured camera FPS.');
 pair('tiny','28.9M 範例是 TinyStories／PLE，作者回報 9.88 tok/s；不是 Qwen 助理，也不能據此推算問答能力。','The 28.9M example is TinyStories/PLE, reported at 9.88 tok/s by its author; it is not a Qwen assistant or a QA capability benchmark.');
 pair('validate','確認實際板卡、PSRAM／Flash、相機驅動、模型版本與整機延遲／功耗。','Verify the exact board, PSRAM/flash, camera driver, model version, full-system latency and power.');
 pair('cost','端點與主機的採購等級分開，不直接相加。','Endpoint and host procurement tiers are separate and are not added together.');
 pair('board','PSRAM 容量是此候選板卡的規劃配置，不是所有同名晶片的內建容量。','PSRAM is the selected board configuration, not intrinsic capacity of every chip with that name.');
 pair('power','端點功耗需含無線、相機、螢幕與音訊；本工具不以 MCU 資料表替代整機量測。','Endpoint power must include radio, camera, display and audio; a chip datasheet is not a system measurement.');
 pair('deadline','AIoT 端到端期限','AIoT end-to-end deadline');pair('invalid','AIoT 輸入超出有效範圍。','AIoT input is outside its valid range.');
 const defaults={iotMaxW:3,iotMeasuredW:0,companionBackend:'muse',iotReply:'text',iotTransport:'wifi',iotOffline:'fallback',iotRadio:'yes',iotRttMs:20,iotEndpointMs:40,iotDeadlineMs:1000,mcuVision:'pico',mcuCamera:'dvp',mcuUsbMode:'bulk',mcuMbps:3,mcuWidth:320,mcuHeight:240,mcuSensorFps:15,mcuFps:5,mcuBuffers:2,mcuPixelBytes:2,mcuModelMB:3,mcuUiMB:1,mcuReserveMB:1,mcuMeasuredS3:0,mcuMeasuredP4:0};
 const numbers={iotMaxW:[.01,100],iotMeasuredW:[0,100],iotRttMs:[0,60000],iotEndpointMs:[0,60000],iotDeadlineMs:[50,600000],mcuMbps:[.01,1000],mcuWidth:[16,4096],mcuHeight:[16,4096],mcuSensorFps:[.1,120],mcuFps:[.01,120],mcuBuffers:[1,8],mcuPixelBytes:[1,4],mcuModelMB:[0,128],mcuUiMB:[0,64],mcuReserveMB:[.1,64],mcuMeasuredS3:[0,600000],mcuMeasuredP4:[0,600000]};
 const selects={companionBackend:['muse','local'],iotReply:['text','speech'],iotTransport:['wifi','ble','none'],iotOffline:['fallback','full'],iotRadio:['yes','no'],mcuVision:['classical','pico','yolo11','yolo26','yolo8'],mcuCamera:['dvp','csi','usb'],mcuUsbMode:['bulk','iso']};
 const devices=[{id:'esp32s3',name:'ESP32-S3 / 8 MB PSRAM',vendor:'Espressif',family:'mcu',psramMB:8,route:'ESP-IDF / ESP-DL',source:'https://www.espressif.com/en/products/socs/esp32-s3'},{id:'esp32p4',name:'ESP32-P4 / 32 MB PSRAM',vendor:'Espressif',family:'mcu',psramMB:32,route:'ESP-IDF / ESP-DL + wireless companion',source:'https://www.espressif.com/en/products/socs/esp32-p4'}];
 function context(ids,p){const selected=new Set(ids);const active=['iotlocal','iotcv','iotcompanion'].some(id=>selected.has(id));const cv=selected.has('iotcv'),companion=selected.has('iotcompanion'),local=selected.has('iotlocal')||(companion&&p.companionBackend==='local');return {active,cv,companion,local,muse:companion&&p.companionBackend==='muse',link:selected.has('iotlink')};}
 function activeKeys(c,p){if(!c.active)return [];return ['iotMaxW','iotMeasuredW','mcuUiMB','mcuReserveMB','iotTransport',...(p.iotTransport!=='none'?['iotRadio']:[]),...(c.cv?['mcuVision','mcuCamera','mcuWidth','mcuHeight','mcuSensorFps','mcuFps','mcuBuffers','mcuPixelBytes','mcuModelMB','mcuMeasuredS3','mcuMeasuredP4',...(p.mcuCamera==='usb'?['mcuUsbMode','mcuMbps']:[])]:[]),...(c.link?['iotTransport','iotOffline','iotRttMs','iotEndpointMs','iotDeadlineMs']:[]),...(c.companion?['companionBackend','iotReply']:[])];}
 function assess(e){const p=e.params,c=context(e.ids,p);if(!c.active)return e;const add=(key,fields=[])=>e.issues.push({code:'aiot',text:T(key),fields});
  for(const key of activeKeys(c,p)){const range=numbers[key];if(range&&(!Number.isFinite(Number(p[key]))||p[key]<range[0]||p[key]>range[1]))add('invalid',[key]);else if(range)p[key]=Number(p[key]);if(selects[key]&&!selects[key].includes(p[key]))add('invalid',[key]);}
  for(const key of ['mcuWidth','mcuHeight','mcuBuffers','mcuPixelBytes'])if(c.cv&&!Number.isInteger(p[key]))add('invalid',[key]);
  if((c.local||c.companion)&&!c.link)add('AIoT 端點控制需要 ESP32 連網與裝置控制技術卡。');
  if(c.cv&&e.ids.includes('multi')&&p.streams>1)add('此 MCU 案例是單相機端點；多路請拆成端點數與主機並發評估。',['streams']);
  if(c.local&&(!e.models.includes('llm')||!e.models.includes('asr')||!e.models.includes('tts')))add('missing');
  if(c.local&&c.muse)add('Muse 與自建本地服務是替代路徑；請拆開評估或改為同一路徑。',['companionBackend']);
  if(c.local&&p.llmPlacement!=='local')add('local',['llmPlacement']);
  if(c.muse&&e.ids.includes('private'))add('offline',['companionBackend']);
  if(c.link&&p.iotTransport==='none')add('ble',['iotTransport']);
  if(c.link&&p.iotTransport==='ble')add('ble',['iotTransport']);
  if(c.link&&p.iotOffline==='full')add('outage',['iotOffline']);
  const endpointMs=c.link?p.iotRttMs+p.iotEndpointMs:0,hostBudgetMs=p.iotDeadlineMs-endpointMs;
  if(c.link&&e.speech&&e.speech.frontMs+e.speech.decodeMs+e.speech.playbackMs+endpointMs>=p.iotDeadlineMs)add('主機的語音前後處理加上網路／端點預算超過 AIoT 期限。',['iotDeadlineMs','iotRttMs','iotEndpointMs','vadMs','asrMs','ttsMs','toolMs']);
  if(p.iotMeasuredW>p.iotMaxW)add('端點實測功耗超過設定上限。',['iotMeasuredW','iotMaxW']);
  if(c.link&&e.speech)e.speech.remainingMs=Math.min(e.speech.remainingMs,hostBudgetMs-e.speech.frontMs-e.speech.decodeMs-e.speech.playbackMs);
  if(c.link&&hostBudgetMs<=0)add('latency',['iotDeadlineMs','iotRttMs','iotEndpointMs']);
  if(c.cv&&p.mcuFps>p.mcuSensorFps)add('cameraFps',['mcuFps','mcuSensorFps']);
  const frameMB=c.cv?p.mcuWidth*p.mcuHeight*p.mcuPixelBytes*p.mcuBuffers/1048576:0;
  const workingMB=frameMB+(c.cv?p.mcuModelMB:0)+p.mcuUiMB+p.mcuReserveMB;
  const hostModels=e.models.filter(id=>!['iotlink','mcuvision'].includes(id));const standalone=!hostModels.length;
  const endpoints=devices.map(d=>{const blocked=[],checks=[T('validate'),T('board'),T('power')],why=[],costBand=p.costOverrides[d.id]||'low',costRank=({low:1,mid:2,high:3})[costBand]||0;
   if(!costRank)add('invalid',[]);
   if(p.maxCostBand!=='any'&&costRank>({low:1,mid:2,high:3})[p.maxCostBand])blocked.push(T('cost'));
   if(e.ids.includes('power')&&standalone&&p.iotMeasuredW>p.watts)blocked.push(T('端點實測功耗超過設定上限。'));
   if(!p.iotMeasuredW)checks.push(T('端點功耗尚未量測；不能宣稱已符合預算。'));
   if(workingMB>d.psramMB)blocked.push(T('ramFail'));
   if(d.id==='esp32s3'&&c.cv&&p.mcuCamera==='csi')blocked.push(T('csi'));
   if(d.id==='esp32p4'&&p.iotTransport!=='none'&&p.iotRadio==='no')blocked.push(T('p4radio'));
   if(d.id==='esp32s3'&&c.cv&&p.mcuCamera==='usb'){checks.push(T('usb'));if(p.mcuMbps>=(p.mcuUsbMode==='iso'?4:8.8))blocked.push(T('usbFail'));}
   let score=d.id==='esp32s3'?6:4;
   if(c.cv){const measured=p[d.id==='esp32s3'?'mcuMeasuredS3':'mcuMeasuredP4'];const published=p.mcuVision==='pico'?(d.id==='esp32s3'?1000/7:1000/18):p.mcuVision==='yolo11'?(d.id==='esp32s3'?1364.7:331.1):p.mcuVision==='yolo26'&&d.id==='esp32p4'?2096:null;
    if(e.ids.includes('latency')&&(measured||published||0)>p.latency)blocked.push(T('MCU 管線時間超過指定延遲；請量測或放寬期限。'));
    if(measured>0&&measured*p.mcuFps>1000)blocked.push(T('measured'));else if(!measured&&published&&published*p.mcuFps>1000)blocked.push(T('profile'));
    checks.push(T(p.mcuVision==='pico'?'pico':p.mcuVision==='yolo8'?'yolo8':p.mcuVision==='classical'?'validate':'yolo'));
    if(!measured)checks.push(T('validate'));
    if(d.id==='esp32p4'&&(p.mcuCamera==='csi'||['yolo11','yolo26'].includes(p.mcuVision)||p.mcuFps>7)){score+=5;why.push(T('所選 MIPI／完整 YOLO／較高更新率提高 P4 起測優先權。'));}
   }
   if(c.muse){if(d.id==='esp32p4')blocked.push(T('Muse SDK 尚未核對 P4 板卡支援；需移植驗證。'));checks.push(T('tts'));}
   why.push(T(d.id==='esp32s3'?'S3：先測較小 PSRAM 配置，並提供內建 Wi-Fi／BLE。':'P4：較多 PSRAM 與 MIPI／USB HS；無線另加晶片。'));
   why.push(T(c.cv?'standalone':c.muse?'service':'endpoint'));
   return {...d,score,blocked,checks,why,costBand,costRank,note:T('board'),ram:null};
  }).sort((a,b)=>(!!a.blocked.length-!!b.blocked.length)||(p.costPriority==='cost'?a.costRank-b.costRank||b.score-a.score:b.score-a.score||a.costRank-b.costRank));
  const endpoint=endpoints.find(d=>!d.blocked.length)||null;
  if(!endpoint){const fieldMap={[T('MCU 管線時間超過指定延遲；請量測或放寬期限。')]:['latency','mcuMeasuredS3','mcuMeasuredP4'],[T('ramFail')]:['mcuModelMB','mcuWidth','mcuHeight','mcuUiMB','mcuReserveMB'],[T('csi')]:['mcuCamera'],[T('p4radio')]:['iotRadio','iotTransport'],[T('usbFail')]:['mcuMbps','mcuUsbMode'],[T('profile')]:['mcuFps','mcuVision','mcuMeasuredS3','mcuMeasuredP4'],[T('measured')]:['mcuFps','mcuMeasuredS3','mcuMeasuredP4'],[T('cost')]:['maxCostBand'],[T('Muse SDK 尚未核對 P4 板卡支援；需移植驗證。')]:['companionBackend']};add('沒有端點通過；請展開各候選查看具體排除原因。',[...new Set(endpoints.flatMap(d=>d.blocked.flatMap(b=>fieldMap[b]||[])))]);}
  if(standalone){e.requirements=e.requirements.filter(r=>r.name!=='並存模型資源');e.pending=e.pending.filter(t=>!t.startsWith('資源預設是'));e.candidates=[...endpoints,...e.candidates.map(d=>({...d,blocked:[T('hostUnneeded')],score:0}))];e.resources={...e.resources,totalGB:workingMB/1024,hostGB:workingMB/1024,acceleratorGB:0,tasks:[],allTimed:false};}
  e.aiot={...c,standalone,endpoints,endpoint,frameMB,workingMB,hostBudgetMs,endpointMs,hostModels,notes:[T('cost'),...(c.link?[T('lan'),T('tiny')]:[]),...(c.muse?[T('tts')]:[])]};
  e.requirements.push({name:T('scope'),state:endpoint?'wait':'bad',text:(endpoint?.name||'—')+' → '+T(standalone?(c.muse?'service':'standalone'):'host')},{name:T('memory'),state:endpoint?'wait':'bad',text:workingMB.toFixed(2)+' MB; '+T('frame')+': '+frameMB.toFixed(2)+' MB'});
  if(c.link)e.requirements.push({name:T('deadline'),state:hostBudgetMs>0?'wait':'bad',text:hostBudgetMs.toFixed(0)+' ms · '+T('host')});
  e.pending.push(...e.aiot.notes,T('validate'));
  e.winner=e.scenes.length&&e.models.length&&!e.issues.length?e.candidates.find(d=>!d.blocked.length)||null:null;
  if(standalone){e.stages[1]={...e.stages[1],value:c.cv?p.mcuFps+' Hz':T('service'),text:T('scope')};e.stages[2]={...e.stages[2],value:c.cv?p.mcuSensorFps+' FPS':T('endpoint'),text:T('validate')};e.stages[4]={...e.stages[4],value:workingMB.toFixed(2)+' MB',text:T('MCU 工作集 MB，與主機 GB 分開')};}
  e.stages[e.stages.length-1]={...e.stages.at(-1),value:e.winner?.name||'尚無可推薦組合',state:e.winner?'wait':'bad'};
  return e;
 }
 return {data,copy,T,defaults,numbers,selects,devices,context,activeKeys,assess};
})();
if(typeof module!=='undefined')module.exports=EdgeAIoT;
