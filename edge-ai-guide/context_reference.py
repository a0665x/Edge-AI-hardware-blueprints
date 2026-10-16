from pathlib import Path
import json,subprocess,html
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent
chapters=[('principles','選題原則','Problem definition'),('flow','需求決策樹','Decision tree'),('scenarios','場景案例','Application scenarios'),('matrix','場景技術矩陣','Scenario / technology matrix'),('algorithms','演算法切分','Algorithm selection'),('depth-decision','深度與決策','Depth and decisions'),('pipeline','頻率與管線','Pipeline and timing'),('compatibility','算子與版本','Operators and versions'),('sizing','並存容量與算力','Concurrent resources'),('platforms','平台與採購分級','Platforms and procurement'),('validation','PoC 與驗收','PoC acceptance'),('revision','原稿觀點校正','Revisions and terminology'),('sources','官方資料來源','Primary sources')]
cat=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./src/engine.js").CATALOG))'],cwd=root))
en=json.loads((root/'src/locales/cards-en.json').read_text())
ops={
'yolo':('Conv / Resize / Concat / decode / NMS；固定 export、opset、shape、INT8 校正及 host NMS。','Conv, Resize, Concat, decode and NMS. Pin export, opset, shapes, calibration and host NMS.'),
'ocr':('文字偵測＋辨識兩張圖；Resize / recurrent 或 attention 依 checkpoint；裁切數與動態寬度須查。','Two graphs for text detection/recognition. Inspect Resize and recurrent/attention nodes, crop count and dynamic widths.'),
'tapir':('causal checkpoint、correlation / sampling、GridSample 類節點與外部 temporal state；實際圖為準。','Pin causal checkpoint, correlation/sampling nodes and external temporal state; inspect actual GridSample-like exports.'),
'cotracker':('online window / chunk、attention / Gather / sampling 與 state；window 等待時間加入 deadline。','Inspect online window/chunk, attention, Gather, sampling and state. Include window wait in deadline.'),
'sam':('image encoder / prompt decoder / memory attention 各自 compile 與 profile；確認 prompts 與 state shapes。','Compile/profile image encoder, prompt decoder and memory attention separately; pin prompt and state shapes.'),
'depth':('Resize 語意、normalization、attention 與輸出尺度；relative / metric checkpoint 分開。','Inspect Resize semantics, normalization, attention and output scale. Separate relative and metric checkpoints.'),
'vlm':('vision encoder / image tokens / LLM prefill / decode、KV cache；固定影像數、context 與量化。','Inspect vision encoder, image tokens, prefill/decode and KV cache; pin images, context and quantization.'),
'jev':('RLCD Qwen checkpoint 的 attention / decode / cache / structured output；本地 backend 支援依該模型版本驗證。','Validate attention, decode, cache and structured output in the exact RLCD Qwen checkpoint/backend.'),
'llm':('Strata 指定 commit / 量化／CPU 架構／GPU kernels；桌機 cache + host 分層與全駐留不同。','Pin Strata commit, quantization, CPU architecture and GPU kernels. Tiered cache/host is distinct from full residency.'),
'asr':('VAD / encoder / decoder、streaming chunk 與跨 chunk state；Riva / QNN 不可互換當成已部署。','Validate VAD/encoder/decoder, streaming chunks and inter-chunk state. Riva and QNN are separate deployment routes.'),
'tts':('decoder / vocoder、streaming chunk、音訊 buffer 與 AEC；測首音訊與完整播放。','Validate decoder/vocoder, chunks, audio buffers and AEC. Measure first audio and complete playback.'),
'rag':('embedding / reranker 與索引分別 profile；工具執行、JSON schema、權限和超時為 host 管線。','Profile embedding, reranker and index separately. Tools, schemas, permissions and timeout are host pipeline work.'),
'posemodel':('pose encoder / keypoint decode / 時序分類器；人物數、window 和後處理固定。','Pin pose encoder, keypoint decoding, temporal classifier, people count, window and postprocessing.'),
'stereo':('Stereo rectification / disparity 或 ToF driver；先驗證標定同步與低紋理，非所有路徑都用 NPU。','Validate stereo rectification/disparity or ToF driver, calibration and synchronization. Not every route uses an NPU.'),
'stabilize':('IMU / global motion / warp、rolling shutter 與時間戳；GPU warp 與 CPU fusion 分別測。','Inspect IMU/global motion/warp, rolling shutter and timestamps. Measure GPU warp and CPU fusion separately.'),
'slam':('feature / match / optimization／map state 與 sensor timestamps；CPU/GPU partition、地圖大小與追蹤失效測試。','Inspect features, matching, optimization, map state and sensor timestamps. Test CPU/GPU partition, map growth and lost tracking.')}
accept={
'people':('越線事件召回、每小時誤報、遮擋／交叉 ID、P95 與掉幀。','Line-crossing recall, false alerts/hour, occluded/crossing IDs, P95 and frame drops.'),
'inspection':('最小缺陷 px、漏檢與誤剔除率、打光變化、觸發至結果與產線節拍。','Minimum defect pixels, misses/false rejects, lighting shifts, trigger-to-result and takt.'),
'document':('各欄位正確率、字元 px、反光／斜角、格式失敗與重拍處置。','Per-field accuracy, character pixels, glare/angle, format rejection and recapture.'),
'points':('點誤差／可見性、特徵 px、幀間位移、遮擋恢復、state 峰值與 P95。','Point error/visibility, feature pixels, inter-frame motion, occlusion recovery, state peak and P95.'),
'gimbaltrack':('角速度、FOV、IMU timestamp 誤差、補償殘差、快門讀出與追蹤恢復。','Angular speed, FOV, timestamp error, compensation residuals, shutter readout and tracking recovery.'),
'uavtrack':('30–120m 等實際距離的目標框／紋理 px、長焦抖動、霧／熱擾動、失鎖恢復。','Target/texture pixels at real ranges such as 30–120m, telephoto shake, haze/heat shimmer and reacquisition.'),
'uavmap':('地面控制點／GNSS 對照、尺度與軌跡漂移、影像 overlap、定位失效及 map RAM。','Control-point/GNSS ground truth, scale/trajectory drift, image overlap, localization loss and map RAM.'),
'uavavoid':('近遠距公尺誤差、最小障礙物、flight latency、制動可用距離與故障處置。','Near/far metre errors, minimum obstacle, flight latency, stopping envelope and failure handling.'),
'mobilerobot':('近遠場誤差、最小障礙物、定位漂移、運動取像與感測器失效恢復。','Near/far error, minimum obstacle, localization drift, moving-camera quality and sensor recovery.'),
'vehicle':('80m 等遠距目標縮圖後 px、車體震動、快門／曝光、P95 及失效告警。','Resized target pixels at ranges such as 80m, vibration, shutter/exposure, P95 and failure alerts.'),
'obstacle':('分段公尺誤差、低矮物件、煞停範圍、反光／低紋理與控制故障處置。','Distance-band metre errors, low obstacles, stopping envelope, reflection/low texture and control failures.'),
'depthscene':('relative 排序與 metric 誤差分開；近遠距 ground truth、尺度漂移、透明反光失效。','Separate relative ordering and metric error; near/far ground truth, scale drift and reflective/transparent failures.'),
'maskscene':('IoU／邊界、遮擋、重新提示率、每片段時間與 memory state。','IoU/boundary accuracy, occlusion, reprompt rate, per-clip time and memory state.'),
'semantic':('事件召回、語意誤判、拒答、schema 正確率、突發事件排隊與 VLM P95。','Event recall, semantic errors, abstention, schema validity, burst queues and VLM P95.'),
'voiceagent':('WER、VAD endpoint、首音訊／完整回答 P95、AEC、barge-in、長 context 和並發峰值。','WER, VAD endpoint, first-audio/full-reply P95, AEC, barge-in, long-context and concurrency peaks.'),
'ragagent':('來源正確、檢索召回、無證據拒答、工具權限、逾時、prefill / decode 與索引容量。','Citation accuracy, retrieval recall, evidence refusal, tool permissions/timeouts, prefill/decode and index capacity.'),
'checkout':('SKU 與數量正確率、相似包裝／遮擋、未知 SKU、OCR 欄位與人工複核率。','SKU/count accuracy, similar packaging/occlusion, unknown SKU, OCR fields and review rate.'),
'security':('日夜事件召回、每小時誤報、廣角邊緣、編碼＋AI 並存、環溫及熱穩態。','Day/night recall, false alerts/hour, wide-angle edges, concurrent encoding/AI and thermal steady state.'),
'pose':('關節誤差、多人體遮擋、action window 延遲、隱私與失效處置。','Joint errors, multi-person occlusion, action-window delay, privacy and failure handling.')}
aiot=json.loads((root/'src/aiot-data.json').read_text())
accept.update(aiot['accept']);ops.update(aiot['ops'])
extras={
'joint-resources':('sizing','並存模型資源池','Concurrent model resource pool','預設全部技術同時運行。記憶體＝系統＋Σ（共用權重＋每路 state × 路数／請求並行）。獨顯分開 RAM / VRAM；統一記憶體用總量。Strata host 取文件最低門檻與規劃驻留加其他 host 的較大值。預設 GB 是可覆寫規劃包絡，非 benchmark。GPU 時間＝Σ ms × Hz × 路数 ÷1000，只篩指定 profile 裝置，未測模型仍未知。','All selected techniques run concurrently. Memory = system + shared weights + per-stream/request state. Check separate host RAM/VRAM for discrete GPUs and total memory for unified systems. Strata host uses the larger of its documented minimum and planned residence plus other host tasks. Editable GB defaults are planning envelopes, not benchmarks. Sum ms × Hz × copies /1000 only on the profiled device; missing measurements remain unknown.'),
'procurement-bands':('platforms','模組廠採購分級','Module procurement bands','僅使用低／中／高等級；不是零售市價或美元估價。各平台預設分級僅為展示起點，請按同一 BOM 範圍、量產數量與供應商報價覆寫。先排除硬性限制；可選技術優先或採購優先，同分以較低等級排序。chip、SoM、載板及整機不可直接比較成本。','Use only Low/Medium/High bands. These are not retail prices or dollar estimates. Defaults are illustrative; override against a consistent BOM scope, volume and supplier quotes. Hard exclusions precede technical-first or cost-first ordering. Do not compare a bare chip, SoM, carrier and finished computer as equivalent costs.'),
'jev-local-cloud':('revision','Jev 名詞與部署校正','Jev terminology and deployment correction','本工具遵循使用者定義：Jev 是本地 RLCD + Qwen 決策 checkpoint，不把公開同名服務當必要 API。確切權重／RLCD 訓練實作尚需產品方提供。雲端為可選部署；只移除該模型本地負載，其餘 ASR／TTS／視覺仍計入，完全離線不能依賴雲端。','This tool follows the user definition: Jev is a local RLCD + Qwen decision checkpoint, not a required public service API. The product owner must provide the exact checkpoint/training implementation. Cloud is optional and removes only that model’s local inference load; ASR/TTS/vision remain. Fully offline operation cannot depend on cloud.'),
'camera-geometry':('pipeline','遠距與移動取像','Long-range and moving-camera acquisition','中心 pinhole 粗估 fx＝W / (2 tan(FOV/2))；物件寬 px≈fx × 實體寬／距離；相機角速度換成 px/s，再加目標運動。縮圖後紋理、曝光模糊、FOV、IMU 同步及長焦抖動共同限制 tracking。DLSS／插幀不增加實拍資訊。','Central pinhole estimate: fx=W/(2 tan(FOV/2)); target width≈fx × physical width/range. Convert camera angular speed to pixels/s and add target motion. Resized texture, exposure blur, FOV, IMU alignment and telephoto shake constrain tracking. DLSS/interpolation does not add real observations.')}

extras['aiot-deployment']=('sizing','AIoT：端點與服務分工','AIoT: endpoint and backend budgets','ESP32 以 MB 規劃 PSRAM、raw buffer 與音訊／顯示；大型 Qwen、ASR、TTS 在另外的主機以 GB 評估。網路往返與端點處理同時計入回應期限。Muse 服務不能等同離線模型；BLE 配網不能等同已驗證的音訊傳輸。','Budget ESP32 PSRAM, raw buffers and audio/display in MB; evaluate Qwen, ASR and TTS on the separate host in GB. Network round trip and endpoint processing share the response deadline. Muse is not an offline model, and BLE provisioning is not a verified audio transport.')
refdata={};articles={k:[] for k,_,_ in chapters};articles_en={k:[] for k,_,_ in chapters}
def article(anchor,title,text,links=''):
 return f'<article class="context-article" id="{anchor}"><h3>{html.escape(title)}</h3><p>{html.escape(text)}</p>{links}</article>'
for aid,(ch,zh,eng,txt,etxt) in extras.items():
 articles[ch].append(article(aid,zh,txt));articles_en[ch].append(article(aid,eng,etxt))
for c in cat:
 cid=c['id'];group=c['group'];ch='scenarios' if group=='scene' else ('depth-decision' if cid in ['depth','jev','vlm','llm','stereo'] else 'algorithms') if group=='model' else c['ref'];anchor='guide-'+cid;number=next(i+1 for i,x in enumerate(chapters) if x[0]==ch)
 models=c.get('models',[]);t=c.get('story','')+' '+c['detail'];et=en[cid][2]
 if group=='scene':t+=' 技術起點：'+' → '.join(c.get('pipeline',[]))+'。驗收：'+accept[cid][0];et+=' Acceptance: '+accept[cid][1]
 articles[ch].append(article(anchor,c['name'],t));articles_en[ch].append(article(anchor,en[cid][0],et))
 links=[{'chapter':number,'anchor':anchor,'zh':c['name']+'：情境與切分','en':en[cid][0]+': scope and decisions','why':'直接對應這張卡片的用途、失效與驗收。','whyEn':'The scope, failure modes and acceptance for this exact card.'}]
 if group=='model':
  op='ops-'+cid;articles['compatibility'].append(article(op,c['name']+'：部署查核',ops[cid][0]+' 固定模型版本、export opset、SDK／driver，compile 後檢查 partition / fallback，量測完整管線。'));articles_en['compatibility'].append(article(op,en[cid][0]+': deployment checks',ops[cid][1]+' Pin model revision, export opset, SDK and driver; inspect partition/fallback after compilation and profile the full pipeline.'));links.append({'chapter':8,'anchor':op,'zh':'實際圖算子與版本','en':'Graph operators and versions','why':'由模型圖與 SDK 查核，不能以品牌支援 AI 代替。','whyEn':'Inspect the exact graph/backend; a brand-level AI claim is insufficient.'})
 if group=='scene':
  for mid in models[:2]:
   mc=next(x for x in cat if x['id']==mid);mch=6 if mid in ['depth','jev','vlm','llm','stereo'] else 5;links.append({'chapter':mch,'anchor':'guide-'+mid,'zh':mc['name']+'：技術路徑','en':en[mid][0]+': algorithm path','why':'這個場景實際帶入的技術，不是泛用演算法清單。','whyEn':'An algorithm actually selected by this scene.'})
  va='accept-'+cid;articles['validation'].append(article(va,c['name']+'：驗收',accept[cid][0]+' 固定資料集／場域、P95、峰值 RAM、整機功耗及熱穩態。'));articles_en['validation'].append(article(va,en[cid][0]+': acceptance',accept[cid][1]+' Pin field data, P95, peak memory, system power and thermal steady state.'));links.append({'chapter':11,'anchor':va,'zh':'此情境的 PoC 指標','en':'Scenario-specific PoC metrics','why':'讓選型回到可以真機量測的結果。','whyEn':'Tie selection to observable hardware acceptance.'})
 else:
  ex='aiot-deployment' if cid in ['iotlocal','iotcv','iotcompanion','iotlink','mcuvision'] else 'jev-local-cloud' if cid=='jev' else 'joint-resources' if cid in ['multi','memory','llm','localstack','asr','tts','rag'] else 'camera-geometry' if cid in ['camera','motion','optics','longrange','stabilize','tapir','cotracker'] else 'procurement-bands' if cid in ['power','fanless'] else 'joint-resources';ech,ezh,een,*_=extras[ex];links.append({'chapter':next(i+1 for i,x in enumerate(chapters) if x[0]==ech),'anchor':ex,'zh':ezh,'en':een,'why':'延伸到這張卡片會影響的實體條件／部署資源。','whyEn':'Follow the physical or deployment resources affected by this card.'})
 refdata[cid]=links
(root/'src/reference-links.json').write_text(json.dumps(refdata,ensure_ascii=False,indent=2))
links={c.get('source') for c in cat if c.get('source')}
links.update(['https://github.com/slvDev/esp32-ai','https://github.com/espressif/esp-dl/tree/master/examples/yolo26_detect','https://docs.espressif.com/projects/esp-techpedia/en/latest/esp-friends/solution-introduction/camera/usb-camera-solution.html','https://www.espressif.com/en/products/socs/esp32-p4','https://github.com/Niko1221/Strata','https://github.com/Niko1221/Strata/blob/main/docs/STRIX_HALO.md','https://www.lantronix.com/products/open-q-8550cs-som/','https://developer.nvidia.com/embedded/jetson-modules','https://doc.kneron.com/docs/toolchain/appendix/operators/','https://onnx.ai/onnx/operators/onnx__GridSample.html','https://onnx.ai/onnx/operators/onnx__LayerNormalization.html','https://onnx.ai/onnx/operators/onnx__NonMaxSuppression.html'])
from reference_view import write_views
write_views(root,chapters,articles,articles_en,links)
