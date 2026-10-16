const AIOT=typeof module!=='undefined'?require('./aiot.js'):EdgeAIoT;
/* Pure, deterministic planning rules. Scores are not measured performance. */
const CATALOG = [
{id:'people',group:'scene',name:'人流與越線',short:'動態 · 持續推論',icon:'people',models:['yolo'],story:'商店入口：偵測行人、關聯 ID，依方向統計越線。',pipeline:['相機','YOLO','ByteTrack','越線事件'],detail:'以事件召回率與每小時誤報驗收；遮擋、逆光與交叉動線需要真實影片。追蹤 ID 不等於身分辨識。',ref:'scenarios'},
{id:'inspection',group:'scene',name:'定點外觀檢查',short:'靜態 · 觸發推論',icon:'inspect',models:['yolo'],story:'產線工件停止或觸發曝光後，找出缺陷位置並標記待複檢。',pipeline:['觸發曝光','ROI','偵測／分割','複檢'],detail:'靜態不代表不即時：節拍仍有 deadline。缺陷太小時，先改善光學、打光或分塊，不能只提高 TOPS。',ref:'scenarios'},
{id:'document',group:'scene',name:'文件與儀表',short:'靜態 · 按需推論',icon:'document',models:['ocr'],story:'設備旁的讀表終端：拍攝、校正、辨識數值，再驗證格式。',pipeline:['取像','透視校正','OCR','規則驗證'],detail:'OCR 作為預設起點；只有遇到開放語意或複雜版面才加 VLM。驗收單位是欄位正確率與錯誤處置。',ref:'scenarios'},
{id:'points',group:'scene',name:'表面特徵點追蹤',short:'動態 · 時序狀態',icon:'points',models:['tapir'],story:'工作台上的軟質物件：使用者點選表面特徵，追蹤位置與遮擋狀態。',pipeline:['曝光','特徵點','線上追蹤','軌跡'],detail:'TAPNet 是專案系列；此處起測選 causal TAPIR。高 FPS 有助降低幀間位移，但不是所有點追蹤的固定要求。須定義速度、特徵大小、遮擋與點數。',ref:'algorithms'},
{id:'depthscene',group:'scene',name:'空間與距離',short:'動態 · 幾何估計',icon:'depth',models:['depth'],story:'倉庫走道：估計前景與背景關係，提示可能的近距離障礙。',pipeline:['影像','Depth Anything','尺度校正','距離判斷'],detail:'相對深度不等於公尺。若要距離精度與避障驗收，需度量模型、標定及感測器對照；不可直接作安全認證。',ref:'depth-decision'},
{id:'maskscene',group:'scene',name:'影片物件遮罩',short:'動態 · 可離線',icon:'mask',models:['sam'],story:'錄影檢閱：圈選一個物件，傳播遮罩並讓人員修正。',pipeline:['影片','提示','SAM 2','遮罩修正'],detail:'離線可用時間換品質；直播需檢查串流記憶體、重初始化、遮擋與端到端延遲。',ref:'algorithms'},
{id:'semantic',group:'scene',name:'事件語意判讀',short:'動態 · 事件觸發',icon:'chat',models:['yolo','vlm'],story:'工廠巡檢：偵測候選事件後，抽取關鍵影格，判讀是否需要人工處置。',pipeline:['輕量偵測','事件取樣','VLM','人工／規則'],detail:'VLM 放在慢速語意路徑；快速告警走確定性規則。回答需限制格式、拒答機制與誤判驗收。',ref:'pipeline'},
{id:'yolo',group:'model',name:'YOLO + 物件追蹤',short:'框選物件 · 保留 ID',icon:'box',detail:'YOLOv8n/s/m 640 輸入作容量起測，接 ByteTrack 或其他 MOT。檢查 Conv、Resize、Concat、輸出解碼、NMS 與 INT8 校正。模型代際與 export 不可混用。',ref:'algorithms'},
{id:'ocr',group:'model',name:'OCR',short:'找文字 · 讀欄位',icon:'document',detail:'文字偵測與辨識是兩段工作；裁切數量決定額外負載。先驗證斜角、反光、字元尺寸與業務格式。',ref:'algorithms'},
{id:'tapir',group:'model',name:'TAPIR / TAPNet',short:'逐點追蹤 · causal 版本',icon:'points',detail:'先固定 causal checkpoint、點數、輸入尺寸與 state。注意採樣、相關性運算、時序狀態及 GridSample 類匯出節點；實際圖以 export 為準。GPU 起測仍不能保證 Edge 即時。',ref:'algorithms',source:'https://github.com/google-deepmind/tapnet'},
{id:'cotracker',group:'model',name:'CoTracker',short:'多點共同追蹤 · 視窗',icon:'points',detail:'online 以 chunk/window 處理，不等於零等待。點數、滑動視窗、attention 與狀態增加記憶體及延遲。加入此卡代表與既有模型並存；可移除 TAPIR 以比較替代。',ref:'algorithms',source:'https://github.com/facebookresearch/co-tracker'},
{id:'sam',group:'model',name:'SAM 2',short:'提示分割 · 影片記憶',icon:'mask',detail:'encoder、prompt decoder 和 memory attention 需分別測試。A100 論文數據不能直接轉成 NPU 或 Jetson FPS。',ref:'algorithms',source:'https://github.com/facebookresearch/sam2'},
{id:'depth',group:'model',name:'Depth Anything',short:'深度估計 · 先定尺度',icon:'depth',detail:'本頁 DAC 依使用者定義對應 Depth Anything 系列。相對深度與 metric depth 分開；檢查 Resize、normalization、attention、輸出尺度。',ref:'depth-decision',source:'https://github.com/DepthAnything/Depth-Anything-V2'},
{id:'vlm',group:'model',name:'VLM 分類器',short:'影像語意 · 事件觸發',icon:'chat',detail:'從小型 VLM 起測，固定影像 token、上下文、量化與輸出長度。記錄首 token、完整回答延遲及峰值 RAM；勿用 detector FPS 估計。',ref:'depth-decision'},
{id:'jev',group:'model',name:'Jev / RLCD Qwen 決策',short:'本地決策 · 可選雲端 API',icon:'branch',detail:'依本工具需求，Jev 是以 RLCD + Qwen checkpoint 在本地做結構化決策；請指定參數規模、量化、runtime 和狀態預算。也可改為雲端 API，移除這個決策模型的本地運算負載，另驗證連線與服務延遲。',ref:'depth-decision',source:'https://github.com/QwenLM/Qwen3.8-Flash-Next'},
{id:'realtime',group:'need',name:'持續即時',short:'逐幀預算 · 端到端',icon:'clock',detail:'同時驗收 FPS、P95 延遲、最舊影格年齡與丟幀率。串流可 pipeline，吞吐與延遲不互相等價。',ref:'sizing'},
{id:'batch',group:'need',name:'離線批次',short:'允許等待 · 排程處理',icon:'document',detail:'不需要直播結果，但仍有每批完成時間、儲存和成本要求。可用較慢設備或分時處理。與「持續即時」同時選擇時需拆成兩條管線。',ref:'principles'},
{id:'private',group:'need',name:'完全離線',short:'資料與推論留在本機',icon:'lock',detail:'所有必要推論須可本地部署；服務 API 不符合。離線批次與完全離線是不同概念。',ref:'platforms'},
{id:'power',group:'limit',name:'整機功耗上限',short:'W · 含相機與載板',icon:'power',detail:'在池中設定整機瓦數。模組 power mode 不能當整機實測功耗；未知板卡不能宣稱通過。',ref:'platforms'},
{id:'camera',group:'limit',name:'相機與動作',short:'FPS · 曝光 · 特徵',icon:'camera',detail:'用真實相機 FPS、影像平面速度、曝光、目標像素及模型縮放後尺寸評估。插幀不能補回未拍到的觀測。',ref:'pipeline'},
{id:'multi',group:'limit',name:'多路相機',short:'同時輸入 · 頻寬',icon:'camera',detail:'路數會提高解碼、ISP、記憶體搬移與推論負載；也要查 board CSI/USB/以太網、同步和驅動。',ref:'sizing'},
{id:'fanless',group:'limit',name:'無風扇',short:'熱穩態 · 降頻',icon:'power',detail:'無風扇是整機散熱設計，不是 SoC 勾選項。必須以環溫、機殼與長時間 workload 實測。',ref:'validation'},
{id:'memory',group:'limit',name:'RAM 限制',short:'模型 + 狀態 + 系統',icon:'chip',detail:'設定可接受的實體 RAM 上限；實際可用量更少。模型載入成功不代表多路/長時運行不會 OOM。',ref:'sizing'},
{id:'latency',group:'limit',name:'反應時間',short:'相機 → 結果 P95',icon:'clock',detail:'定義端到端期限，包含曝光、排隊、搬移、模型和後處理；不能只看單模型 benchmark。',ref:'validation'}
];
const DEVICES=[
{id:'nano',name:'Jetson Orin Nano 8GB',vendor:'NVIDIA',route:'CUDA / TensorRT',ram:8,minPower:7,family:'gpu',source:'https://developer.nvidia.com/embedded/jetson-modules',note:'官方系列電源模式 7–25 W；不是整機功耗。8 GB 的模型與時序記憶體仍需量測。'},
{id:'nx',name:'Jetson Orin NX 16GB',vendor:'NVIDIA',route:'CUDA / TensorRT',ram:16,minPower:null,family:'gpu',source:'https://developer.nvidia.com/embedded/jetson-modules',note:'適合先驗證多模型與客製算子路徑；仍需指定 JetPack、TensorRT、散熱與 power mode。'},
{id:'intel',name:'Core Ultra 工業電腦 / 64GB',vendor:'Intel',route:'OpenVINO · CPU / GPU / NPU',ram:64,minPower:null,family:'pc',source:'https://docs.openvino.ai/2026/openvino-workflow/running-inference/inference-devices-and-modes/npu-device.html',note:'64 GB 是本候選的規劃配置，產品族非固定 SKU。方便整合 x86 與多種 backend；NPU 相容性及 RAM／整機功耗須依機型查核。'},
{id:'qcs',name:'Open-Q QCS6490 SMARC 8GB',vendor:'Qualcomm',route:'QNN / Qualcomm AI Engine',ram:8,minPower:null,family:'soc',source:'https://www.qualcomm.com/internet-of-things/products/q6-series/qcs6490',note:'適合從相機整合與固定工作負載評估；板級 I/O、RAM、QNN 版本及 op partition 需要確認。'},
{id:'kl',name:'KL730 評估板',vendor:'耐能 Kneron',route:'Kneron toolchain / NPU',ram:null,minPower:null,family:'npu',source:'https://doc.kneron.com/docs/toolchain/appendix/operators/',note:'先編譯固定形狀偵測模型；官方 op 表的 GridSample、NMS 限制須檢查，NMS 可另行評估 host 後處理。'}
];
CATALOG.push(
{id:'obstacle',group:'scene',name:'移動機器人避障',short:'近距離精度 · 煞停距離',icon:'depth',models:['stereo'],story:'倉庫 AMR 遇到低矮物件，融合深度與里程資料，在可用距離內減速或停止。',pipeline:['Stereo / ToF','深度校正','障礙物','控制器'],detail:'要分段定義近／遠距誤差、最小障礙物、反光與低紋理失效模式；相對深度不能直接輸出可靠公尺。AI 與安全控制需分開驗收。',ref:'depth-decision'},
{id:'gimbaltrack',group:'scene',name:'雲台／移動相機追蹤',short:'FOV · 自身運動 · 同步',icon:'points',models:['tapir','stabilize'],story:'巡檢相機跟著目標轉動，先處理相機自轉與滾動快門，再追蹤表面特徵。',pipeline:['相機 + IMU','時間同步','穩定 / 補償','追蹤'],detail:'目標運動與相機運動須分開；gimbal 不代表完全無晃動。FOV、角速度、曝光與 timestamp 誤差都會改變輸入。',ref:'pipeline'},
{id:'voiceagent',group:'scene',name:'本地語音 Agent',short:'ASR → LLM → 工具 → TTS',icon:'chat',models:['llm','asr','tts'],story:'維修人員詢問設備故障；本機檢索手冊，Agent 準備工具操作並由人員確認。',pipeline:['VAD / ASR','本地 LLM + RAG','工具確認','串流 TTS'],detail:'500 ms 先定義成首個音訊還是完整回覆。模型、量化、context、prefill、endpointing、噪音與回音消除都需指定。預設參考 Strata 的 Qwen3.8 路徑。',ref:'pipeline'},
{id:'ragagent',group:'scene',name:'文件知識／工具 Agent',short:'本地 RAG · 工具白名單',icon:'branch',models:['llm','rag'],story:'工業終端回答維修問題，檢索本地文件並提出可核對的操作步驟。',pipeline:['檢索','LLM','結構化工具','確認 / 日誌'],detail:'回覆需有來源、無資料時拒答、工具權限與超時。模型推論只是延遲的一段；索引和文件也占用 RAM 與 SSD。',ref:'depth-decision'},
{id:'checkout',group:'scene',name:'結帳／訂單核對',short:'SKU · 遮擋 · OCR',icon:'box',models:['yolo','ocr'],story:'檢查餐盤或包裹中的物品，與訂單資料比對，將差異交由人員確認。',pipeline:['多角取像','偵測 + OCR','訂單比對','人工複核'],detail:'參考 Intel 零售 order-accuracy 管線；相似包裝、反光、重疊與未知 SKU 是主要限制。',ref:'scenarios'},
{id:'security',group:'scene',name:'智慧安防攝影機',short:'夜間 · 廣角 · 告警',icon:'camera',models:['yolo'],story:'低功耗廣角攝影機先做影像校正，再產生區域入侵或人車事件。',pipeline:['ISP / 廣角校正','物件偵測','事件規則','告警'],detail:'參考 Kneron IP camera 與 Ambarella security 產品方向；需查低照度、魚眼變形、編碼及全天候溫度。',ref:'platforms'},
{id:'pose',group:'scene',name:'姿態／動作分析',short:'關節點 · 遮擋 · 隱私',icon:'people',models:['posemodel'],story:'工作站以骨架關節評估動作，避免持續保存可辨識人臉的原始影片。',pipeline:['人員偵測','姿態估計','時間序列','動作事件'],detail:'先定義關節誤差、遮擋和多人體相互影響；骨架不代表沒有個資風險。',ref:'scenarios'},
{id:'stereo',group:'model',name:'Stereo / ToF 深度',short:'度量距離 · 需校正',icon:'depth',detail:'選雙目／ToF／RGB-D 感測路徑；焦距、baseline、同步與深度不確定性決定公尺精度。影像處理負載與裝置接入分別驗證。',ref:'depth-decision'},
{id:'stabilize',group:'model',name:'運動補償／IMU 融合',short:'相機自身運動 · 同步',icon:'camera',detail:'用標定、IMU、global motion 或光流估計相機運動；rolling shutter 和時間戳偏差仍需驗證。',ref:'pipeline'},
{id:'llm',group:'model',name:'本地 LLM / Strata',short:'模型 · 量化 · RAM / VRAM',icon:'chat',detail:'預設以 Strata 作 Qwen3.8-Flash-Next 的本地路徑，經相容 API 接 Agent。GPU expert cache、CPU/RAM 與 SSD embedding 分層；桌機結果不能當 Jetson benchmark。',ref:'depth-decision',source:'https://github.com/Niko1221/Strata'},
{id:'asr',group:'model',name:'串流 ASR + VAD',short:'語音辨識 · endpointing',icon:'chat',detail:'指定語言、麥克風距離、噪音、喚醒詞與句尾偵測；衡量 WER 與 final transcript 延遲。',ref:'pipeline'},
{id:'tts',group:'model',name:'串流 TTS + AEC',short:'首音訊 · 回音 · 打斷',icon:'chat',detail:'指定第一段音訊延遲、語言、聲音與串流格式；回音消除與 barge-in 需要音訊回路驗證。',ref:'pipeline'},
{id:'rag',group:'model',name:'本地 RAG / Tool calling',short:'檢索 · 權限 · 可追溯',icon:'branch',detail:'embedding、reranking、文件索引與工具執行各有 RAM／延遲預算；不能只量 LLM decode tok/s。',ref:'pipeline'},
{id:'posemodel',group:'model',name:'Pose / Action 模型',short:'關節點 · 時序分類',icon:'people',detail:'從輕量 pose 起測，再依動作期限選時序分類。人物數、骨架點數、視角和時間窗會增加負載。',ref:'algorithms'},
{id:'optics',group:'limit',name:'FOV 與目標占比',short:'1280×720 · 目標像素',icon:'camera',detail:'定義水平 FOV、輸出高寬、目標框像素及縮圖後大小；寬視野降低同一目標的像素密度。',ref:'pipeline'},
{id:'motion',group:'limit',name:'機身／雲台晃動',short:'角速度 · 快門 · IMU',icon:'camera',detail:'以 FOV 和角速度推算局部中心附近的像素位移；需要相機 timestamp、IMU 同步與快門型態。',ref:'pipeline'},
{id:'metric',group:'limit',name:'距離分段誤差',short:'近距嚴格 · 遠距容許',icon:'depth',detail:'在近／遠距分別指定絕對誤差上限，保留 95% 或最大誤差的驗收定義。這是需求，不是模型已達成。',ref:'depth-decision'},
{id:'stopping',group:'limit',name:'移動速度與煞停',short:'延遲 + 制動 + 餘量',icon:'clock',detail:'以速度、可用減速度、P95 延遲、距離誤差和安全餘量估算最低感知距離；需再驗證控制與硬體。',ref:'validation'},
{id:'audio',group:'limit',name:'語音回應與聲學',short:'500 ms · 首音訊 / 完整',icon:'chat',detail:'500 ms 可選首音訊或完整回覆；需包含 VAD、ASR、prefill、LLM、工具與 TTS，而非只看 decode。',ref:'pipeline'},
{id:'localstack',group:'limit',name:'本地模型與部署框架',short:'Strata · llama.cpp · QNN',icon:'chip',detail:'模型與 runtime 成對選擇；同時限定量化、context、並行數、RAM／VRAM／SSD 與平台架構。',ref:'compatibility'},
{id:'lighting',group:'limit',name:'照明／反光／遮擋',short:'低照 · 小缺陷 · 偏差',icon:'inspect',detail:'感知失效可能源自打光、材質、透明反光與遮擋；增加算力前先改善取像並建立驗收資料。',ref:'validation'},
{id:'sensorio',group:'limit',name:'感測器與資料同步',short:'CSI / USB / ROS 2 / IMU',icon:'camera',detail:'檢查實際 carrier I/O、相機驅動、timestamps、ROS 2 及持續傳輸頻寬；SoC 能力不代表載板已接出。',ref:'platforms'}
);
DEVICES.push(
{id:'agx',name:'Jetson AGX Orin 64GB',vendor:'NVIDIA',route:'JetPack / CUDA / TensorRT',ram:64,minPower:15,family:'gpu',source:'https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/',note:'64 GB 統一記憶體；大型模型須計入權重、狀態、ASR/TTS、OS 與 context。Strata ARM/Jetson 路徑尚無本工具可核實的支援。'},
{id:'thor',name:'Jetson AGX Thor T5000 128GB',vendor:'NVIDIA',route:'JetPack / Blackwell CUDA',ram:128,minPower:40,family:'gpu',source:'https://developer.nvidia.com/embedded/jetson-modules',note:'128 GB 統一記憶體，官方模組模式 40–130 W；容量充足仍要驗證模型 kernel、JetPack 與首音訊期限。'},
{id:'rtx',name:'RTX 5070 12GB + x86 64GB',vendor:'NVIDIA / x86 Edge PC',route:'Strata · GPU cache + host RAM + SSD',ram:64,vram:12,minPower:null,family:'desktop',source:'https://github.com/Niko1221/Strata',note:'依 Strata 專案的實際測試配置建立候選；桌機型 edge box，功耗與尺寸不同於嵌入式模組。升級 96/128 GB 須另建配置。'},
{id:'strix',name:'Ryzen AI Max / Strix Halo 128GB',vendor:'AMD',route:'Strata · Linux / experimental',ram:128,minPower:null,family:'unifiedpc',source:'https://github.com/Niko1221/Strata/blob/main/docs/STRIX_HALO.md',note:'使用者提供的 Strata 討論與專案實驗支援路徑；128 GB 是本候選的配置假設。需確認實際 iGPU carve-out、機型與 runtime commit。'},
{id:'cv72',name:'Ambarella CV72S 相機方案',vendor:'Ambarella',route:'CVflow SDK / ISP / encoder',ram:null,minPower:null,family:'camera',source:'https://www.ambarella.com/products/security/',note:'面向整合影像處理與安防相機；板卡 RAM、SDK access、可匯入網路與第三方模型算子需要供應商確認。'}
);
DEVICES.push({id:'qcs8550',name:'Open-Q QCS8550 SOM 16GB',vendor:'Qualcomm / Lantronix',route:'QNN / Hexagon / Adreno',ram:16,minPower:null,family:'soc',maxCsi:5,source:'https://www.lantronix.com/products/open-q-8550cs-som/',note:'本候選是官方提供的 16GB LPDDR5x / 128GB UFS 配置；最高 5 路同時相機為 SoM 規格，載板、解析度、FPS 與驅動另驗證。48 INT8 TOPS 不是本模型即時達標證據。'});
const PLATFORM_CASES=[{id:'qcs8550case',title:'QCS8550 / 多相機 Edge AI',url:'https://www.lantronix.com/products/open-q-8550cs-som/',scene:'checkout',ids:['checkout','yolo','ocr','camera','multi','sensorio'],params:{sensorWidth:1280,sensorHeight:720,streams:3,sensorBus:'csi'},kind:'官方 SoM 能力；3 路工作負載為規劃示例'},
{id:'seco',title:'SECO / QCS6490 本地 LLM + RAG',url:'https://www.qualcomm.com/developer/blog/2025/09/seco-ai-assistant-llm-rag-edge-device-dragonwing',scene:'ragagent',ids:['ragagent','llm','rag','private','localstack'],params:{llmProfile:'small3',llmRuntime:'qnn',contextTokens:4096,kvGB:.5,runtimeGB:1,hostReserveGB:2},kind:'官方架構；3B 模型與容量為規劃示例'},
{id:'riva',title:'Jetson / Riva 語音機器人',url:'https://developer.nvidia.com/blog/low-code-building-blocks-for-speech-ai-robotics/',scene:'voiceagent',ids:['voiceagent','llm','asr','tts','private','audio','localstack'],params:{llmProfile:'small8',llmRuntime:'llamacpp',speechDeadline:500,speechRuntime:'riva',kvGB:.5,runtimeGB:2,hostReserveGB:4},kind:'官方語音案例；LLM 組合為規劃延伸'},
{id:'strata',title:'Strata / Qwen3.8 本地 Agent',url:'https://github.com/Niko1221/Strata',scene:'ragagent',ids:['ragagent','llm','rag','private','localstack'],params:{llmProfile:'flash',llmRuntime:'strata',strataQuant:'iq3',contextTokens:32768},kind:'開源專案實測；不是嵌入式 benchmark'},
{id:'halo',title:'Strata / Strix Halo 社群參考',url:'https://www.reddit.com/r/LocalLLaMA/comments/1wz4rvx/qwen38flashnext_on_strata/',scene:'voiceagent',ids:['voiceagent','llm','asr','tts','audio','private','localstack'],params:{llmProfile:'flash',llmRuntime:'strata',strataQuant:'q4',speechDeadline:500},kind:'社群部署參考；語音為規劃延伸'},
{id:'intelcheck',title:'Intel / 零售訂單核對',url:'https://docs.openedgeplatform.intel.com/dev/edge-ai-suites/ai-suite-retail/order-accuracy/index.html',scene:'checkout',ids:['checkout','yolo','ocr','camera','lighting'],params:{sensorWidth:1280,sensorHeight:720,inputWidth:640},kind:'官方參考管線'},
{id:'kncam',title:'Kneron / 廣角智慧攝影機',url:'https://www.kneron.com/page/solutions/cams/',scene:'security',ids:['security','yolo','camera','optics','lighting','fanless'],params:{fov:120,sensorWidth:1920,sensorHeight:1080},kind:'官方應用方向'},
{id:'ambcam',title:'Ambarella / 4K 安防攝影機',url:'https://www.ambarella.com/products/security/',scene:'security',ids:['security','yolo','camera','sensorio'],params:{sensorWidth:3840,sensorHeight:2160,sensorFps:30},kind:'官方產品方向'},
{id:'amr',title:'AMR / 度量深度避障起測',url:'https://www.ambarella.com/applications/aiot-industrial-robotics/',scene:'obstacle',ids:['obstacle','stereo','metric','stopping','camera','sensorio','realtime','latency'],params:{depthMode:'stereo',depthUse:'avoid',latency:100,nearDistance:1,nearError:.03,farDistance:5,farError:.15,baselineMm:120},kind:'依官方應用方向推導；數值為示例'}
];
const LLM_PROFILES={small3:{name:'小型 3B（規劃配置）',mainB:3,embeddingB:0},small8:{name:'小型 8B（規劃配置）',mainB:8,embeddingB:0},next80:{name:'Qwen3-Next 80B-A3B',mainB:80,embeddingB:0},flash:{name:'Qwen3.8-Flash-Next',mainB:125,embeddingB:51}};
const SCENE_CONSTRAINTS={
 people:['camera','optics','lighting','latency'],inspection:['camera','optics','lighting','latency'],document:['lighting','localstack'],points:['camera','optics','motion','sensorio','latency'],gimbaltrack:['camera','optics','motion','sensorio','latency'],depthscene:['metric','camera','sensorio'],obstacle:['metric','stopping','camera','sensorio','latency'],maskscene:['memory','camera'],semantic:['camera','localstack','latency'],voiceagent:['audio','localstack','memory','power'],ragagent:['localstack','memory','power'],checkout:['camera','optics','lighting','multi'],security:['camera','optics','lighting','fanless','sensorio'],pose:['camera','optics','lighting','latency']
};
CATALOG.push(
{id:'uavtrack',group:'scene',name:'無人機遠距追蹤',short:'長焦 · 小目標 · 雲台',icon:'camera',models:['tapir','stabilize'],story:'無人機在 120 m 拍攝距離，使用長焦雲台追蹤遠處巡檢車；先檢查有效像素與角速度，再決定追蹤更新率。',pipeline:['長焦 gimbal','IMU / 同步','目標 / 特徵','時序追蹤'],detail:'遠距不只看 FPS：物件實際尺寸、距離與 FOV 決定像素密度；大氣、震動、曝光、遮擋和地理定位誤差也要驗收。',ref:'scenarios'},
{id:'uavmap',group:'scene',name:'無人機空拍建圖',short:'尺度 · 位姿 · 影像重疊',icon:'depth',models:['slam','depth','stabilize'],story:'無人機空拍工業區，利用相機／IMU／GNSS 估計位姿與尺度，再建立可核對的地圖。',pipeline:['相機 + IMU / GNSS','位姿 / VIO','深度 / 重建','地圖驗收'],detail:'相對深度不能直接當地理尺度。影像重疊、時間同步、GNSS／地面控制點與漂移是主要限制；離線建圖與飛行控制分開。',ref:'depth-decision'},
{id:'uavavoid',group:'scene',name:'無人機飛行避障',short:'近場感測 · 速度 · 餘量',icon:'depth',models:['stereo','stabilize'],story:'低速室內巡檢無人機用前向度量深度辨識管線與低矮障礙，按感知距離與制動能力設定速度。',pipeline:['Stereo / ToF','運動補償','障礙距離','飛控限制'],detail:'飛行的垂直／水平速度與制動不同；本工具只是單方向保守起測。失效、飛控與安全分析需獨立驗證。',ref:'validation'},
{id:'mobilerobot',group:'scene',name:'移動機器人空間感知',short:'相機移動 · 融合 · 地圖',icon:'depth',models:['slam','depth','stereo'],story:'戶外配送機器人辨識近處路緣與遠處行人，融合相機、里程與度量感測維持可核對的空間位置。',pipeline:['相機 / LiDAR','位姿 / SLAM','深度融合','路徑規劃'],detail:'移動相機需要區分本體運動與目標運動；近場避障、遠場語意與定位漂移採不同驗收尺度。',ref:'scenarios'},
{id:'vehicle',group:'scene',name:'車載遠距觀測',short:'道路遠場 · 曝光 · 延遲',icon:'camera',models:['yolo','depth','stabilize'],story:'車載前向相機觀察遠處車輛與行人，檢查小目標縮圖尺寸和端到端延遲，供影片分析或研究原型。',pipeline:['前向相機','運動補償','偵測 / 深度','事件 / 研究控制'],detail:'此為車載感知規劃，不代表自駕／ADAS 認證。高速、反光、雨霧、鏡頭畸變與感測融合必須獨立驗收。',ref:'validation'},
{id:'slam',group:'model',name:'SLAM / VIO / GNSS 融合',short:'位姿 · 尺度 · 地圖漂移',icon:'branch',detail:'先區分幾何 SLAM、learned 特徵／深度與導航控制。IMU timestamp、相機標定、回環與 GNSS／控制點決定尺度與漂移；深度模型無法取代全部定位。',ref:'depth-decision'},
{id:'longrange',group:'limit',name:'遠距離與長焦取像',short:'距離 m · FOV · 物件 m',icon:'camera',detail:'以 pinhole 中心近似估算目標像素：fx × 物件尺寸 ÷ 距離。長焦提高像素密度，也提高角速度造成的像素位移；實際還需標定與大氣／曝光驗證。',ref:'pipeline'}
);
PLATFORM_CASES.push(
{id:'uavlong',title:'無人機 / 120m 遠距追蹤',url:'https://www.lantronix.com/products/drone-reference-platform/',scene:'uavtrack',ids:['uavtrack','tapir','stabilize','camera','motion','longrange','sensorio','realtime','latency'],params:{cameraPlatform:'uav',lensClass:'tele',pixelMode:'geometry',viewDistance:120,objectMeters:3,objectHeightMeters:2,fov:25,sensorWidth:1920,sensorHeight:1080,inputWidth:1280,targetPixels:8,minFeature:4,sensorFps:60,inferFps:30,speed:80,angularSpeed:.5,exposure:2,trackingPoints:128,stabilization:'imu',latency:100},kind:'依官方無人機應用方向推導；120m 與取像參數為規劃示例'},
{id:'uavsurvey',title:'無人機 / 空拍建圖與尺度',url:'https://www.lantronix.com/products/drone-reference-platform/',scene:'uavmap',ids:['uavmap','slam','depth','stabilize','camera','motion','longrange','batch','metric','sensorio'],params:{cameraPlatform:'uav',pixelMode:'geometry',viewDistance:80,objectMeters:5,objectHeightMeters:4,depthUse:'measure',depthMode:'metricmono',scaleAnchor:'gnss',nearDistance:10,nearError:.3,farDistance:100,farError:5,fov:70,angularSpeed:2,stabilization:'imu',sensorWidth:3840,sensorHeight:2160,inputWidth:1280,inferFps:5},kind:'空拍建圖規劃示例；不是指定深度模型已達成精度'},
{id:'uavflight',title:'無人機 / 室內低速飛行避障',url:'https://www.lantronix.com/products/drone-reference-platform/',scene:'uavavoid',ids:['uavavoid','stereo','stabilize','camera','motion','metric','stopping','sensorio','realtime','latency'],params:{cameraPlatform:'uav',depthMode:'stereo',depthUse:'avoid',nearDistance:2,nearError:.1,farDistance:15,farError:1.5,baselineMm:120,robotSpeed:3,deceleration:2,margin:1,latency:100,angularSpeed:3,stabilization:'imu',viewDistance:8},kind:'飛行避障規劃示例；飛控／安全驗證另行進行'},
{id:'robotspace',title:'移動機器人 / 近遠場融合',url:'https://blogs.nvidia.com/blog/build-ai-with-nvidia-jetson/',scene:'mobilerobot',ids:['mobilerobot','slam','depth','stereo','camera','motion','metric','stopping','sensorio','realtime','latency'],params:{cameraPlatform:'robot',pixelMode:'geometry',viewDistance:30,objectMeters:.6,objectHeightMeters:1.7,fov:80,depthUse:'avoid',depthMode:'fusion',nearDistance:2,nearError:.1,farDistance:30,farError:1,robotSpeed:1.5,latency:100,angularSpeed:2},kind:'移動機器人規劃延伸；近遠精度與速度為示例'},
{id:'vehiclefar',title:'車載 / 80m 遠場觀測',url:'https://www.ambarella.com/technology/',scene:'vehicle',ids:['vehicle','yolo','depth','stabilize','camera','motion','longrange','metric','realtime','latency'],params:{cameraPlatform:'vehicle',pixelMode:'geometry',viewDistance:80,objectMeters:4.5,objectHeightMeters:1.7,fov:60,sensorWidth:1920,sensorHeight:1080,inputWidth:960,sensorFps:60,inferFps:30,speed:800,angularSpeed:5,stabilization:'imu',exposure:1,depthUse:'measure',depthMode:'metricmono',scaleAnchor:'calibrated',nearDistance:5,nearError:.2,farDistance:100,farError:2,latency:100},kind:'車載感知研究規劃；不代表 ADAS / 自駕安全認證'}
);
Object.assign(SCENE_CONSTRAINTS,{uavtrack:['longrange','optics','motion','camera','sensorio','latency'],uavmap:['longrange','motion','metric','sensorio','memory'],uavavoid:['motion','metric','stopping','sensorio','power','latency'],mobilerobot:['motion','metric','stopping','sensorio','latency'],vehicle:['longrange','motion','metric','camera','sensorio','latency']});
for(const c of CATALOG){const preset=PLATFORM_CASES.find(x=>x.scene===c.id&&['uavtrack','uavmap','uavavoid','mobilerobot','vehicle'].includes(c.id));if(preset){c.platform=preset.params.cameraPlatform;c.sceneDefaults={...preset.params};}}
CATALOG.push(...AIOT.data.scenes,...AIOT.data.models);
PLATFORM_CASES.push(...AIOT.data.cases);
// Editable planning envelopes, not benchmark measurements.
const RESOURCE_DEFAULTS={yolo:[.02,.45],ocr:[.1,.4],tapir:[.1,1.4],cotracker:[.2,2],sam:[.25,3],depth:[.15,1.5],vlm:[1,3],stereo:[.05,.25],stabilize:[.02,.25],asr:[.3,.8],tts:[.2,.8],rag:[.15,.4],posemodel:[.05,.45],slam:[.05,.6]};
const COST_BANDS={low:{order:1,label:'低',en:'Low'},mid:{order:2,label:'中',en:'Medium'},high:{order:3,label:'高',en:'High'}};
const DEVICE_COST_DEFAULTS={nano:'mid',nx:'mid',agx:'high',thor:'high',intel:'mid',qcs:'low',qcs8550:'mid',kl:'low',cv72:'mid',rtx:'high',strix:'high'};
function resourcePlan(models,p,streams,llm){
 const issues=[],tasks=[],budgets=p.modelBudgets&&typeof p.modelBudgets==='object'?p.modelBudgets:{};
 for(const id of models){if(['llm','jev','iotlink','mcuvision'].includes(id))continue;const def=RESOURCE_DEFAULTS[id]||[0,0];const custom=budgets[id]||{};const weightGB=custom.weightGB===undefined?def[0]:Number(custom.weightGB),stateGB=custom.stateGB===undefined?def[1]:Number(custom.stateGB);
  const hostDefault=['rag','slam','stereo','stabilize'].includes(id)||(['asr','tts'].includes(id)&&p.speechRuntime==='generic');
  const place=custom.place|| (hostDefault?'host':'accelerator');
  const copies=['asr','tts','rag'].includes(id)?p.concurrency:streams;
  const rate=custom.rateHz===undefined?(['asr','tts','rag'].includes(id)?p.agentRateHz:p.inferFps):Number(custom.rateHz);
  const timing=custom.timings?.[p.profileDevice];const ms=timing===undefined||timing===''||timing===null?null:Number(timing);
  if(!Number.isFinite(weightGB)||!Number.isFinite(stateGB)||weightGB<0||weightGB>2048||stateGB<0||stateGB>2048||!Number.isFinite(rate)||rate<0||rate>10000||!['host','accelerator'].includes(place)||(ms!==null&&(!Number.isFinite(ms)||ms<0)))issues.push({code:'resourceinput',task:id,text:`${id} 資源預算無效，請填入非負數與有效執行位置。`});
  tasks.push({id,weightGB,stateGB,copies,rateHz:rate,timeMs:ms,place,totalGB:weightGB+stateGB*copies,occupancy:ms===null?null:ms*rate*copies/1000});
 }
 if(models.includes('jev')&&p.decisionPlacement==='local'){
  const qwenGB=p.jevParamsB*p.jevBits/8;tasks.push({id:'jev',weightGB:qwenGB,stateGB:p.jevStateGB,copies:p.concurrency,rateHz:p.agentRateHz,timeMs:null,place:p.jevBackend==='host'?'host':'accelerator',totalGB:qwenGB+p.jevStateGB*p.concurrency,occupancy:null});
 }
 const otherHostGB=tasks.filter(t=>t.place==='host').reduce((s,t)=>s+t.totalGB,0),otherAccelGB=tasks.filter(t=>t.place==='accelerator').reduce((s,t)=>s+t.totalGB,0);
 const localLLM=llm&&!llm.cloud;const hostLLM=localLLM&&!llm.strata&&(p.llmMemoryPlace==='host'||(p.llmMemoryPlace==='auto'&&p.llmRuntime==='llamacpp'));const llmHostGB=localLLM?(llm.strata?p.strataResidentGB+p.hostReserveGB+(p.kvGB+p.runtimeGB)*p.concurrency:hostLLM?llm.fullGB:0):0;
 const llmAccelGB=localLLM?(llm.strata?p.strataGpuGB:hostLLM?0:llm.fullGB-p.hostReserveGB):0;
 const hostGB=localLLM?(llm.strata?Math.max(llm.hostGB,llmHostGB+otherHostGB):(hostLLM?llm.fullGB:p.hostReserveGB)+otherHostGB):p.systemReserveGB+otherHostGB;
 const acceleratorGB=llmAccelGB+otherAccelGB;
 const known=tasks.filter(t=>t.place==='accelerator'&&t.occupancy!==null);const occupancy=known.reduce((s,t)=>s+t.occupancy,0);
 return {tasks,hostGB,acceleratorGB,totalGB:hostGB+acceleratorGB,otherHostGB,otherAccelGB,occupancy,allTimed:!localLLM&&tasks.filter(t=>t.place==='accelerator').every(t=>t.timeMs!==null),timedCount:known.length,issues,referenceDevice:p.profileDevice,utilLimit:p.utilLimit};
}
const DEFAULTS={...AIOT.defaults,sensorFps:30,inferFps:15,speed:600,exposure:4,sensorWidth:1920,inputWidth:480,targetPixels:24,maxStep:24,maxBlur:3,minFeature:6,watts:15,streams:1,ram:16,latency:150,modelSize:'n',costPriority:'technical',maxCostBand:'any',costOverrides:{},modelBudgets:{},systemReserveGB:2,agentRateHz:.5,profileDevice:'nx',utilLimit:.8,strataResidentGB:48,strataGpuGB:10,llmPlacement:'local',llmMemoryPlace:'auto',decisionPlacement:'local',jevParamsB:3,jevBits:4,jevStateGB:1,jevBackend:'host',cameraPlatform:'fixed',lensClass:'wide',pixelMode:'measured',viewDistance:5,objectMeters:1,objectHeightMeters:1,scaleAnchor:'none',sensorHeight:720,targetHeight:24,objectWidth:80,objectHeight:120,fov:90,angularSpeed:0,stabilization:'none',shutter:'rolling',imuSyncMs:5,trackingPoints:32,occlusion:'partial',lighting:'normal',smallDefectPx:8,depthUse:'relative',depthMode:'relative',nearDistance:1,nearError:.03,farDistance:5,farError:.15,robotSpeed:1,deceleration:1,margin:.2,baselineMm:75,focalPx:700,disparityError:.5,llmProfile:'flash',llmRuntime:'strata',strataQuant:'iq3',weightBits:4,contextTokens:8192,kvGB:2,runtimeGB:4,concurrency:1,hostReserveGB:8,ssdGB:128,speechDeadline:500,responseMetric:'firstAudio',vadMs:100,asrMs:100,ttsMs:80,toolMs:0,replyTokens:32,measuredTps:0,audioPlaybackMs:3000,audioEnv:'quiet',bargeIn:'yes',speechRuntime:'generic',sensorBus:'usb',timestampSync:'unknown'};
// One applicability policy shared by rendering and evaluation.
function conditionContext(ids,params={}){
 const selected=new Set(ids),p={...DEFAULTS,...params},scenes=CATALOG.filter(c=>c.group==='scene'&&selected.has(c.id)),models=CATALOG.filter(c=>c.group==='model'&&selected.has(c.id)).map(c=>c.id);
 const vision=scenes.some(c=>!['voiceagent','ragagent','document','iotlocal','iotcv','iotcompanion'].includes(c.id))||selected.has('camera');
 const points=models.some(m=>['tapir','cotracker'].includes(m));
 const depth=scenes.some(c=>['depthscene','obstacle','uavmap','uavavoid','mobilerobot','vehicle'].includes(c.id))||selected.has('metric')||models.includes('stereo');
 const motion=points||selected.has('motion')||models.includes('stabilize')||(vision&&p.cameraPlatform!=='fixed')||scenes.some(c=>c.id==='gimbaltrack');
 const avoid=depth&&(p.depthUse==='avoid'||scenes.some(c=>['obstacle','uavavoid','mobilerobot'].includes(c.id)));
 const metric=depth&&(avoid||p.depthUse==='measure'||p.depthMode!=='relative');
 const localLLM=models.includes('llm')&&p.llmPlacement==='local',speech=scenes.some(c=>c.id==='voiceagent'||c.id==='iotlocal'||(c.id==='iotcompanion'&&p.companionBackend==='local'))||selected.has('audio'),inactive=new Set();
 const only=(active,keys)=>{if(!active)keys.split(' ').forEach(k=>inactive.add(k));};
 only(points,'targetPixels maxStep maxBlur minFeature trackingPoints');
 only(vision,'cameraPlatform lensClass pixelMode viewDistance sensorWidth sensorHeight fov inputWidth objectWidth objectHeight objectMeters objectHeightMeters sensorFps exposure lighting sensorBus');
 only(vision&&p.pixelMode==='geometry','objectMeters objectHeightMeters');
 only(vision&&p.pixelMode==='measured','objectWidth objectHeight');
 only(motion,'angularSpeed imuSyncMs stabilization shutter');only(points||motion,'speed');
 only(vision&&(motion||selected.has('sensorio')),'timestampSync');
 only(scenes.some(c=>c.id==='inspection'),'smallDefectPx');
 only(depth,'depthUse depthMode');only(metric,'nearDistance nearError farDistance farError');
 only(depth&&p.depthMode==='metricmono','scaleAnchor');only(depth&&p.depthMode==='stereo','baselineMm focalPx disparityError');only(avoid,'robotSpeed deceleration margin');
 only(models.includes('llm')||models.includes('jev'),'agentRateHz');
 only(localLLM,'llmProfile llmRuntime llmMemoryPlace strataQuant contextTokens weightBits kvGB runtimeGB hostReserveGB ssdGB strataResidentGB strataGpuGB');
 only(speech,'speechDeadline responseMetric audioEnv bargeIn speechRuntime vadMs asrMs ttsMs toolMs replyTokens measuredTps audioPlaybackMs');
 only(speech&&p.responseMetric==='fullReply','audioPlaybackMs replyTokens measuredTps');
 only(vision||models.some(m=>!['llm','jev','asr','tts','rag','iotlink','mcuvision'].includes(m)),'inferFps');
 if(!models.some(m=>!['iotlink','mcuvision'].includes(m))){for(const key of ['systemReserveGB','utilLimit','profileDevice','modelBudgets'])inactive.add(key);}
 const aiot=AIOT.context(ids,p),activeAiot=AIOT.activeKeys(aiot,p);for(const key of Object.keys(AIOT.defaults))if(!activeAiot.includes(key))inactive.add(key);
 return {vision,points,depth,motion,avoid,metric,speech,inactive};
}
function evaluateBase(ids,params={}){
 const selected=new Set(ids.filter(id=>CATALOG.some(c=>c.id===id))),p={...DEFAULTS,...params};
 const context=conditionContext([...selected],p);for(const key of context.inactive)p[key]=DEFAULTS[key];
 const scenes=CATALOG.filter(c=>c.group==='scene'&&selected.has(c.id));
 const models=CATALOG.filter(c=>c.group==='model'&&selected.has(c.id)).map(c=>c.id);
 const vision=scenes.some(c=>!['voiceagent','ragagent','document','iotlocal','iotcv','iotcompanion'].includes(c.id))||selected.has('camera');
 const pointWork=models.some(m=>['tapir','cotracker'].includes(m));
 const depthWork=scenes.some(c=>['depthscene','obstacle','uavmap','uavavoid','mobilerobot','vehicle'].includes(c.id))||selected.has('metric')||models.includes('stereo');
 const agentWork=models.includes('llm');const localAgent=agentWork&&p.llmPlacement==='local';const localDecision=models.includes('jev')&&p.decisionPlacement==='local';
 const speechWork=scenes.some(c=>c.id==='voiceagent'||c.id==='iotlocal'||(c.id==='iotcompanion'&&p.companionBackend==='local'))||selected.has('audio');
 const motionWork=pointWork||selected.has('motion')||models.includes('stabilize')||(vision&&p.cameraPlatform!=='fixed')||scenes.some(c=>c.id==='gimbaltrack');
 const issues=[], pending=[]; const issue=(code,text,extra={})=>issues.push({code,text,...extra});
 const owners={sensorFps:'camera',speed:'camera',exposure:'camera',sensorWidth:'camera',inputWidth:'camera',targetPixels:'camera',maxStep:'camera',maxBlur:'camera',minFeature:'camera',watts:'power',streams:'multi',ram:'memory',latency:'latency'};
 for(const [key,min,max] of [['sensorFps',1,1000],['inferFps',.1,1000],['speed',0,100000],['exposure',.01,1000],['sensorWidth',1,20000],['inputWidth',1,20000],['targetPixels',.1,20000],['maxStep',.1,10000],['maxBlur',.1,10000],['minFeature',.1,10000],['watts',.1,10000],['streams',1,128],['ram',1,1024],['latency',1,600000]]){
  if(['maxStep','maxBlur','minFeature'].includes(key)&&!pointWork){p[key]=DEFAULTS[key];continue;}
  if(key==='inferFps'&&agentWork&&!vision){p[key]=DEFAULTS[key];continue;}
  if(owners[key]&&!selected.has(owners[key])&&!(owners[key]==='camera'&&vision)){p[key]=DEFAULTS[key];continue;}
  if(!Number.isFinite(Number(p[key]))||Number(p[key])<min||Number(p[key])>max)issue('input',`${key} 超出有效範圍 ${min}–${max}`); else p[key]=Number(p[key]);
 }
 if(!models.includes('yolo'))p.modelSize=DEFAULTS.modelSize;
 if(!['n','s','m'].includes(p.modelSize))issue('input','未知 YOLO 型號');
 if(!scenes.length)pending.push('加入至少一個場景，才能形成應用建議。');
 if(!models.length)pending.push('加入模型，或使用場景的建議技術。');
 const domainRanges=[
 ['viewDistance',.1,10000,vision],['objectMeters',.01,100,vision&&p.pixelMode==='geometry'],['objectHeightMeters',.01,100,vision&&p.pixelMode==='geometry'],['sensorHeight',1,20000,vision],['objectWidth',.1,20000,vision&&p.pixelMode==='measured'],['objectHeight',.1,20000,vision&&p.pixelMode==='measured'],['fov',1,179,vision],['angularSpeed',0,1000,motionWork],['imuSyncMs',0,1000,motionWork],['trackingPoints',1,10000,pointWork],['smallDefectPx',.1,10000,selected.has('lighting')||scenes.some(c=>c.id==='inspection')],
 ['nearDistance',.05,1000,depthWork],['nearError',.001,100,depthWork],['farDistance',.1,1000,depthWork],['farError',.001,100,depthWork],['baselineMm',1,1000,depthWork],['focalPx',1,20000,depthWork],['disparityError',.01,20,depthWork],['robotSpeed',0,100,selected.has('stopping')||scenes.some(c=>['obstacle','uavavoid','mobilerobot'].includes(c.id))||p.depthUse==='avoid'],['deceleration',.01,100,selected.has('stopping')||scenes.some(c=>['obstacle','uavavoid','mobilerobot'].includes(c.id))||p.depthUse==='avoid'],['margin',0,100,depthWork],
 ['weightBits',2,16,localAgent&&p.llmRuntime!=='strata'],['contextTokens',256,1000000,localAgent],['kvGB',0,512,localAgent],['runtimeGB',0,512,localAgent],['concurrency',1,32,agentWork||localDecision||models.some(m=>['asr','tts','rag'].includes(m))],['hostReserveGB',1,128,localAgent],['ssdGB',1,4096,localAgent],
 ['speechDeadline',50,600000,speechWork],['vadMs',0,10000,speechWork],['asrMs',0,10000,speechWork],['ttsMs',0,10000,speechWork],['toolMs',0,600000,speechWork],['replyTokens',1,10000,speechWork],['measuredTps',0,1000,speechWork],['audioPlaybackMs',0,600000,speechWork&&p.responseMetric==='fullReply']];
 for(const [key,min,max,active] of domainRanges){if(!active){p[key]=DEFAULTS[key];continue;}const n=Number(p[key]);if(!Number.isFinite(n)||n<min||n>max)issue('input',`${key} 有效範圍 ${min}–${max}`);else p[key]=n;}
 const extraRanges=[['systemReserveGB',.1,128,models.length>0],['agentRateHz',.01,100,agentWork||models.includes('jev')],['utilLimit',.1,1,models.length>0],['strataResidentGB',1,1024,localAgent&&p.llmRuntime==='strata'],['strataGpuGB',1,1024,localAgent&&p.llmRuntime==='strata'],['jevParamsB',.1,176,localDecision],['jevBits',2,16,localDecision],['jevStateGB',0,1024,localDecision]];
 for(const [key,min,max,active] of extraRanges){if(!active){p[key]=DEFAULTS[key];continue;}if(!Number.isFinite(Number(p[key]))||Number(p[key])<min||Number(p[key])>max)issue('input',`${key} 有效範圍 ${min}–${max}`);else p[key]=Number(p[key]);}
 const enumOptions={costPriority:['technical','cost'],maxCostBand:['any','low','mid','high'],llmPlacement:['local','cloud'],llmMemoryPlace:['auto','host','accelerator'],decisionPlacement:['local','cloud'],jevBackend:['host','accelerator'],cameraPlatform:['fixed','uav','robot','vehicle'],lensClass:['wide','tele','stereo'],pixelMode:['measured','geometry'],scaleAnchor:['none','calibrated','gnss','groundtruth'],llmProfile:Object.keys(LLM_PROFILES),llmRuntime:['strata','llamacpp','openvino','qnn','tensorrt','vllm'],strataQuant:['iq2','iq3','q4'],depthUse:['relative','measure','avoid'],depthMode:['relative','metricmono','stereo','tof','fusion'],stabilization:['none','gimbal','imu','visual'],shutter:['rolling','global'],lighting:['normal','lowlight','reflective','occluded'],responseMetric:['firstAudio','fullReply'],audioEnv:['quiet','noisy','farfield'],bargeIn:['yes','no'],speechRuntime:['generic','riva','qnn'],sensorBus:['usb','csi','ethernet'],timestampSync:['unknown','hardware','software']};
 for(const [key,allowed] of Object.entries(enumOptions)){const active=['costPriority','maxCostBand'].includes(key)?true:['decisionPlacement','jevBackend'].includes(key)?models.includes('jev'):key==='llmPlacement'?agentWork:key.startsWith('llm')||key==='strataQuant'?localAgent:key.startsWith('depth')?depthWork:['responseMetric','audioEnv','bargeIn','speechRuntime'].includes(key)?speechWork:vision;if(active&&!allowed.includes(p[key]))issue('input',`${key} 選項無效。`);}
 const platforms=new Set(scenes.filter(c=>c.platform).map(c=>c.platform));if(platforms.size>1)issue('platformmix','不同載體的場景共用同一取像參數：請拆開無人機／機器人／車載評估。');
 const coverage={iotlocal:['llm'],iotcv:['mcuvision'],iotcompanion:['iotlink'],uavtrack:['tapir','cotracker'],uavmap:['slam'],uavavoid:['stereo'],mobilerobot:['slam'],vehicle:['yolo'],obstacle:['stereo','depth'],gimbaltrack:['tapir','cotracker'],voiceagent:['llm'],ragagent:['llm'],checkout:['yolo'],security:['yolo'],pose:['posemodel'],people:['yolo'],inspection:['yolo','sam'],document:['ocr','vlm'],points:['tapir','cotracker'],depthscene:['depth'],maskscene:['sam'],semantic:['vlm']};
 for(const scene of scenes)if(!coverage[scene.id].some(m=>models.includes(m)))issue('coverage',`${scene.name}缺少對應技術：請加入 ${coverage[scene.id].map(id=>CATALOG.find(c=>c.id===id).name).join(' 或 ')}。`);
 if(pointWork&&!Number.isInteger(p.trackingPoints))issue('input','追蹤點數須為整數。');
 if((agentWork||localDecision)&&(!Number.isInteger(p.concurrency)||(localAgent&&!Number.isInteger(p.contextTokens))))issue('input','並行數與 context tokens 須為整數。');
 if(scenes.some(c=>c.id==='voiceagent'||c.id==='iotlocal'||(c.id==='iotcompanion'&&p.companionBackend==='local')))for(const id of ['asr','tts'])if(!models.includes(id))issue('speechtech',`語音 Agent 缺少 ${id.toUpperCase()} 技術，請加入或改非語音場景。`);
 if(scenes.some(c=>c.id==='ragagent')&&!models.includes('rag'))pending.push('RAG 場景尚未加入本地檢索／工具技術；目前只做 LLM 容量預檢。');
 if(motionWork&&['imu','visual'].includes(p.stabilization)&&!models.includes('stabilize'))issue('motiontech','選擇 IMU / 視覺補償時需加入運動補償技術卡。');
 if(!Number.isInteger(p.streams))issue('input','相機路數須為整數。');
 if(selected.has('realtime')&&selected.has('batch'))issue('timing','即時與離線批次並存：請拆開評估，或只保留目前這條管線的時限。');
 if(selected.has('private')&&((models.includes('jev')&&p.decisionPlacement==='cloud')||(agentWork&&p.llmPlacement==='cloud')))issue('offline','完全離線與雲端模型路徑衝突，請選本地部署或移除離線限制。');
 const points=models.some(m=>['tapir','cotracker'].includes(m));
 const heavy=models.some(m=>['tapir','cotracker','sam','depth','vlm'].includes(m));
 const camera=vision,realtime=selected.has('realtime');
 const trackerFps=realtime?Math.min(p.sensorFps,p.inferFps):p.sensorFps;
 const fx=p.sensorWidth/(2*Math.tan(p.fov*Math.PI/360));
 const cameraSpeed=motionWork?fx*Math.abs(p.angularSpeed)*Math.PI/180:0;
 const combinedSpeed=p.speed+cameraSpeed;
 if(vision&&p.pixelMode==='geometry'){p.objectWidth=fx*p.objectMeters/p.viewDistance;p.objectHeight=fx*p.objectHeightMeters/p.viewDistance;}

 const metrics={step:combinedSpeed/p.sensorFps,trackerStep:combinedSpeed/trackerFps,trackerFps,blur:combinedSpeed*p.exposure/1000,feature:p.targetPixels*p.inputWidth/p.sensorWidth,frameBudget:1000/p.inferFps,cameraSpeed,objectArea:p.objectWidth*p.objectHeight/(p.sensorWidth*p.sensorHeight)*100,objectInputWidth:p.objectWidth*p.inputWidth/p.sensorWidth,detectorObjectWidth:p.objectWidth*640/p.sensorWidth,imuPixelError:cameraSpeed*p.imuSyncMs/1000};
 if(camera){
  if(p.exposure>1000/p.sensorFps)issue('exposure','曝光時間長於影格週期；降低曝光或降低感測 FPS。');
  if(realtime&&p.inferFps>p.sensorFps)issue('fps','推論更新率高於實拍 FPS；重複或插值影格不能增加觀測。');
  if(points&&metrics.trackerStep>p.maxStep)issue('step','追蹤輸入間位移超過起測門檻：減少抽幀、提高實拍與追蹤更新率、降低速度或改變視野。');
  if(points&&metrics.blur>p.maxBlur)issue('blur','曝光模糊超過起測門檻：縮短曝光並改善打光。');
  if(points&&metrics.feature<p.minFeature)issue('feature','縮圖後特徵太小：提高輸入尺寸、放大目標或改變鏡頭。');
 }
 if(points&&!camera)pending.push('點追蹤尚未指定相機與運動條件。');
 if(points&&camera)pending.push(realtime?'追蹤假設以模型更新 FPS 均勻抽幀；若實際有排隊、丟幀或不同 tracker 頻率，請重算輸入時間間隔。':'非持續即時模式假設逐幀處理完整影片；若抽幀，請依實際 timestamp 重算位移。');
 if(!selected.has('power'))pending.push('整機功耗預算尚未設定。');
 if(!selected.has('latency')&&realtime)pending.push('即時管線尚未指定 P95 反應期限。');
 if(models.includes('jev')&&p.decisionPlacement==='cloud')pending.push('Jev 雲端 API 不計本地 Qwen 推論負載；網路、資料政策、API 和端到端延遲仍需驗證。');
 const requirements=[];
 const req=(name,state,text)=>requirements.push({name,state,text});
 if(vision){req('取像與目標尺寸',issues.some(i=>['step','blur','feature','fps','exposure'].includes(i.code))?'bad':'wait',`${p.cameraPlatform} / ${p.viewDistance} m，${p.sensorWidth}×${p.sensorHeight} / FOV ${p.fov}°；目標 ${p.objectWidth}×${p.objectHeight} px，占畫面 ${metrics.objectArea.toFixed(2)}%。`);
  if(p.viewDistance>=30){pending.push('遠距影像：小目標、霧氣／熱擾動與長焦穩定需驗證；縮圖後像素與角速度共同限制追蹤。');}
  if(p.objectWidth>p.sensorWidth||p.objectHeight>p.sensorHeight)issue('geometry','目標框超出畫面，請重新填寫原圖像素尺寸。');
  if(motionWork){req('相機自身運動','wait',`角速度 ${p.angularSpeed}°/s，中心附近約 ${metrics.cameraSpeed.toFixed(1)} px/s；同步誤差約 ${metrics.imuPixelError.toFixed(1)} px。`);if(p.angularSpeed>0)pending.push('相機旋轉的幾何估算加入位移；gimbal / IMU 補償仍須量測殘差，沒有自動扣除晃動。');if(p.shutter==='rolling'&&p.angularSpeed>0)pending.push('rolling shutter + 相機晃動：驗證讀出時間、畸變與補償。');}
  if(p.lighting!=='normal')pending.push('低照、反光或遮擋：先驗證光學／打光，再評估額外分割、補償與多路負載。');
 }
 let depth=null;
 if(depthWork){
  const avoid=p.depthUse==='avoid'||scenes.some(c=>['obstacle','uavavoid','mobilerobot'].includes(c.id));
  if(context.metric&&p.nearDistance>=p.farDistance)issue('depthrange','近距測點須小於遠距測點。');
  if((avoid||p.depthUse==='measure')&&p.depthMode==='relative')issue('metric','測距／避障需要公尺與誤差預算；相對 Depth Anything 請改度量模型、Stereo / ToF 或融合。');
  if(['stereo','tof','fusion'].includes(p.depthMode)&&!models.includes('stereo'))issue('sensorpath','已選度量感測路徑但缺 Stereo / ToF 技術卡，請加入或改模型。');
  if(p.depthMode==='metricmono'&&!models.includes('depth'))issue('depthtech','度量單目路徑缺少深度模型技術卡。');
  if(p.depthMode==='metricmono'&&p.scaleAnchor==='none')issue('scale','度量單目需要可驗證的尺度／標定依據，請指定標定或 GNSS / 地面對照。');
  const sigma=z=>z*z*p.disparityError/(p.focalPx*p.baselineMm/1000);
  depth={nearSigma:sigma(p.nearDistance),farSigma:sigma(p.farDistance),stopDistance:p.robotSpeed*(selected.has('latency')?p.latency:150)/1000+p.robotSpeed*p.robotSpeed/(2*p.deceleration)+p.margin+Math.max(p.nearError,p.farError),avoid};
  if(p.depthMode==='stereo'&&(depth.nearSigma>p.nearError||depth.farSigma>p.farError))issue('depthprecision','Stereo 幾何誤差起測估算超出分段預算：增加 baseline / 焦距、降低 disparity 誤差或改感測器；加算力不能直接解決。');
  if(avoid&&depth.stopDistance>p.farDistance)issue('stop','估算煞停距離大於最遠有效感知距離：降低速度、延遲或增加可用感知距離。');
  if(context.metric)req('公尺精度與控制',issues.some(i=>['metric','sensorpath','depthprecision','stop','depthrange','scale'].includes(i.code))?'bad':'wait',`近 ${p.nearDistance} m ±${p.nearError} m；遠 ${p.farDistance} m ±${p.farError} m。${avoid?`估算煞停距離 ${depth.stopDistance.toFixed(2)} m。`:''}`);
  if(context.metric)pending.push('距離誤差是驗收需求；Stereo 公式只有幾何項，不是模型的總誤差／95% 保證。反光、低紋理和尺度漂移需實測。');
 }
 let llm=null;
 if(agentWork){
  const profile=LLM_PROFILES[p.llmProfile]||LLM_PROFILES.flash;
  const weightsGB=(profile.mainB+profile.embeddingB)*p.weightBits/8;
  const fullGB=weightsGB+(p.kvGB+p.runtimeGB)*p.concurrency+p.hostReserveGB;
  const strata=p.llmRuntime==='strata';const strataHost=({iq2:48,iq3:64,q4:96}[p.strataQuant]||64)+(p.concurrency-1)*(p.kvGB+p.runtimeGB);
  llm={cloud:p.llmPlacement==='cloud',profile:profile.name,weightsGB,fullGB,hostGB:strata?strataHost:fullGB,minVram:strata?12:0,strata,context:p.contextTokens};
  if(!llm.cloud&&strata&&p.llmProfile!=='flash')issue('runtime','目前查核的 Strata 模型路徑是 Qwen3.8-Flash-Next；其他模型請選相應 runtime 並驗證。');
  if(!llm.cloud&&strata&&p.ssdGB<94&&p.strataQuant==='q4')issue('ssd','Strata UD-IQ4_XS 模型下載約 94 GB，SSD 預算還要保留系統與 embedding 空間。');
  if(llm.cloud){req('雲端模型路徑','wait','LLM 推論不占本地模型容量；ASR / TTS / RAG / 視覺仍在本地計算。網路與 API 延遲另需驗證。');pending.push('雲端 API 的網路、逾時、資料政策和離線退化需驗證。');}
  else {req('本地模型容量','wait',strata?`Strata / ${p.strataQuant.toUpperCase()}：參考 host RAM ${strataHost} GB + GPU ≥12 GB + SSD；不是全權重塞 GPU。`:`全駐留粗估 ${fullGB.toFixed(1)} GB（含使用者輸入的 KV / runtime 餘量）。`);
  pending.push(`Context ${p.contextTokens.toLocaleString()} tokens、並行 ${p.concurrency}；KV / runtime 記憶體預算是手動假設，須量測。`);
  if(strata)pending.push('Strata 專案桌機配置和 Strix Halo 實驗支援不等於 Jetson ARM 支援；指定 commit、量化與 benchmark。');}
 }
 let speech=null;
 if(speechWork){
  const front=p.vadMs+p.asrMs+p.ttsMs+p.toolMs;
  const decode=p.responseMetric==='fullReply'&&p.measuredTps>0?p.replyTokens/p.measuredTps*1000:0;
  const playback=p.responseMetric==='fullReply'?p.audioPlaybackMs:0;
  speech={frontMs:front,remainingMs:p.speechDeadline-front-decode-playback,decodeMs:decode,playbackMs:playback};
  if(speech.remainingMs<=0)issue('speech','VAD + ASR + 工具 + TTS／decode／播放時長已用完回應期限，尚未包含 LLM prefill / 首 token。');
  req('語音回應期限',speech.remainingMs<=0?'bad':'wait',`${p.speechDeadline} ms ${p.responseMetric==='firstAudio'?'首音訊':'完整回覆'}；留給 prefill / 首 token ${Math.max(0,speech.remainingMs).toFixed(0)} ms。`);
  pending.push('語音階段延遲皆為預算／使用者測量值；500 ms 達標仍需 VAD→首音訊 P95 實測。');
  if(p.responseMetric==='fullReply'&&!p.measuredTps)pending.push('完整回覆尚未填寫實測 tok/s，不能驗證 decode 時間。');
  if(p.audioEnv!=='quiet'||p.bargeIn==='yes')pending.push('噪音／遠場／barge-in：檢查麥克風陣列、AEC 與串流 ASR/TTS 並存負載。');
 }
 const streams=selected.has('multi')?p.streams:1;
 const detectorOps=models.includes('yolo')?({n:8.7,s:28.6,m:78.9}[p.modelSize]*p.inferFps*streams/1000):null;
 const resources=resourcePlan(models,p,streams,llm);issues.push(...resources.issues);
 if(!DEVICES.some(d=>d.id===p.profileDevice))issue('resourceinput','參考装置不存在。');
 if(models.length){req('並存模型資源','wait',`規劃總記憶體 ${resources.totalGB.toFixed(1)} GB；GPU時間僅對指定參考装置使用，尚未填寫的 profile 不代表通過。`);pending.push('資源預設是可修改的規劃包絡，不是 benchmark；固定 checkpoint / 尺寸 / precision 後填入峰值與時間。');}
 if(localDecision)req('Jev 本地決策','wait',`RLCD Qwen ${p.jevParamsB}B / ${p.jevBits}-bit；權重 ${(p.jevParamsB*p.jevBits/8).toFixed(1)} GB，另加 state / runtime。`);
 const candidates=DEVICES.map(d=>{
  let score=0;const why=[],checks=['固定模型 / export / SDK / driver，編譯並核對 fallback。','以同一輸入量測 P95 延遲、峰值 RAM、熱穩態和精度。'],blocked=[];
  const add=(n,t)=>{score+=n;why.push(`${t}（優先權 +${n}）`);};
  if(heavy){if(d.family==='gpu')add(4,'複雜模型先走彈性 GPU 路徑');if(d.family==='pc')add(2,'CPU / GPU 可用來定位不支援的子圖');if(['soc','npu'].includes(d.family))checks.push('Transformer / 時序狀態需 export 與 backend 實證；不假設 NPU 全圖支援。');}
  if(!heavy&&models.length){if(['npu','soc','camera'].includes(d.family))add(3,'固定視覺管線可先測專用 NPU');if(d.family==='pc')add(2,'通用視覺與主機整合路徑');if(d.id==='nano')add(2,'以小型 GPU 平台作效能起測');}
  if(scenes.some(c=>c.id==='document')&&d.family==='pc')add(3,'文件與 x86 周邊整合');
  if(heavy&&(models.length>1||streams>1)&&d.id==='nx')add(2,'16 GB 相對 8 GB 提供較多記憶體餘裕');
  if(heavy&&models.length===1&&streams===1&&d.id==='nano')add(1,'單一模型先從較小配置驗證');
  if(selected.has('power')){
   if(d.minPower!==null&&p.watts<=d.minPower)blocked.push(`整機 ${p.watts} W 不足以容納官方模組模式下限 ${d.minPower} W 加周邊預算。`);
   else checks.push(`整機 ≤${p.watts} W 尚無測量證據；${d.minPower?`模組下限 ${d.minPower} W 不能保證整機通過。`:'此板卡功耗未知。'}`);
  }
  if(selected.has('memory')){if(d.ram&&d.ram>p.ram)blocked.push(`此配置 ${d.ram} GB 超過你允許的實體 RAM ${p.ram} GB。`);else checks.push(`實體 RAM ≤${p.ram} GB；模型峰值與 OS 保留量需另測。`);}
  if(points&&d.id==='kl')blocked.push('預設點追蹤路徑的採樣算子存在風險；KL730 官方不支援 GridSample，未驗證改圖或 host 路徑前排除。');
  if(selected.has('fanless'))checks.push('無風扇：需在目標環溫下完成整機熱穩態測試。');
  if(streams>1)checks.push(`${streams} 路同時輸入：確認實際載板介面、ISP/解碼與記憶體頻寬。`);
  if(selected.has('latency'))checks.push(`端到端 P95 ≤${p.latency} ms；目前無此組合的真機數據。`);
  if(models.includes('vlm'))checks.push('VLM 以事件取樣：固定模型、context、量化與輸出長度，驗證峰值 RAM。');
  if(pointWork&&p.trackingPoints>=256){if(d.id==='nx')add(3,'高追蹤點數的 state / attention 記憶體餘裕');if(d.id==='agx')add(2,'高追蹤點數與融合餘裕');checks.push('高點數時序 profile 尚未量測。');}
  if(vision&&metrics.objectInputWidth<8){pending.push('目標縮圖後小於 8 px 的示例門檻：先改鏡頭 / ROI / tiling，另量額外模型呼叫負載。');if(['gpu','pc'].includes(d.family))add(1,'小目標分塊與多階段處理彈性');}
  if(vision&&p.cameraPlatform!=='fixed'){if(d.family==='gpu'&&d.ram>=16)add(2,'移動平台的時序 / 感測融合路徑');checks.push('移動平台需要 timestamp、IMU / 里程 / GNSS、實際 carrier 與航行／車載環境驗證。');}
  if(vision&&p.viewDistance>=30&&p.inputWidth>=960){if(d.id==='nx')add(2,'遠距高輸入尺寸的起測餘裕');checks.push('長焦 / 遠距小目標的高解析或 ROI pipeline 尚未 profile。');}
  if(vision&&p.angularSpeed>0&&['imu','visual'].includes(p.stabilization)){if(['gpu','pc'].includes(d.family))add(2,'相機運動補償與時序融合的彈性路徑');checks.push('IMU / 相機同步與補償殘差未驗證。');}
  if(depthWork&&depth.avoid){if(d.family==='gpu'&&d.ram>=16)add(3,'度量感測、融合與機器人管線');if(d.family==='pc')add(2,'度量感測器／控制系統整合');checks.push(`分段距離誤差 ${p.nearError}/${p.farError} m 與控制期限需整機驗收。`);}
  if(scenes.some(c=>c.id==='security')&&['npu','camera'].includes(d.family))add(3,'ISP / 安防攝影機整合方向');
  if(scenes.some(c=>c.id==='checkout')&&d.family==='pc')add(3,'零售核對與周邊資料整合');
  if(d.id==='qcs8550'&&(streams>1||(agentWork&&llm&&!llm.strata&&llm.fullGB>8)))add(2,'16GB Qualcomm 配置的多路／本地模型容量餘裕');
  if(d.id==='qcs'&&!heavy&&!agentWork&&streams===1)add(1,'單路固定視覺先測較小 SoM 配置');
  if(d.id==='qcs8550'&&p.sensorBus==='csi'&&streams<=5)add(1,'公開多路 MIPI CSI 感測接入方向');
  if(d.maxCsi&&p.sensorBus==='csi'&&streams>d.maxCsi)blocked.push(`此 SoM 公開規格最多 ${d.maxCsi} 路 concurrent 相機；要求 ${streams} 路 CSI 超出此路徑。`);
  if(llm&&!llm.cloud){
   if(llm.strata){
    if(d.id==='rtx'){if(llm.hostGB>d.ram)blocked.push(`此 Strata ${p.strataQuant} 配置參考 host RAM ${llm.hostGB} GB，候選只有 ${d.ram} GB；請升級 RAM 或換量化。`);else add(12,'Strata 專案有此 x86 + RTX 類路徑證據');}
    else if(d.id==='strix'){if(llm.hostGB>d.ram)blocked.push(`Strata host 預算 ${llm.hostGB} GB 超過此配置 ${d.ram} GB。`);else add(9,'Strata 的 Strix Halo 實驗部署路徑');}
    else blocked.push('指定 Strata 路徑未查到此候選的可用部署證據；Jetson ARM 或 NPU 不能套用桌機結果。');
    checks.push('驗證 GPU cache / CPU-RAM / SSD embedding 分層及 cold / warm prefill。');
   }else{
    if(['npu','camera'].includes(d.family))blocked.push('此本地 LLM 方案沒有模型／framework 部署證據。');
    if(p.llmRuntime==='qnn'&&!['soc'].includes(d.family))blocked.push('指定 QNN 路徑不適用此平台。');
    if(p.llmRuntime==='openvino'&&d.family!=='pc')blocked.push('指定 OpenVINO 路徑不適用此候選。');
    if(['tensorrt','vllm'].includes(p.llmRuntime)&&!['gpu','desktop'].includes(d.family))blocked.push('指定 CUDA serving 路徑不適用此候選。');
    if(!blocked.length){if(d.id==='agx'&&p.llmProfile==='next80')add(10,'64 GB 統一記憶體可作量化 80B 的容量起測');else if(d.id==='thor'&&p.llmProfile==='flash')add(10,'128 GB 統一記憶體可作大型模型容量起測');else if(['small3','small8'].includes(p.llmProfile)&&d.id==='nx')add(7,'小型本地 Agent 先從 16 GB GPU 配置起測');else if(p.llmRuntime==='qnn'&&d.id==='qcs')add(8,'小型 QNN 本地助理的官方應用方向');}
    checks.push('全駐留只是容量下限；新架構 kernel、量化、長 context 與平台 runtime 未驗證。');
   }
  }
  if(vision&&p.sensorWidth>=3840&&d.id==='cv72')add(3,'4K 影像處理與編碼相機路徑');
  if(speechWork&&p.speechRuntime==='riva'){if(!['gpu','desktop'].includes(d.family))blocked.push('指定 Riva GPU speech 路徑不適用此候選；需更換 speech runtime。');if(d.id==='agx')add(8,'AGX Orin / Riva 的語音機器人部署方向');checks.push('Riva 模型、語言、JetPack 與 embedded 平台支援需依版本驗證。');}
  if(speechWork&&p.speechRuntime==='qnn'&&d.family!=='soc')blocked.push('指定 Qualcomm speech backend 不適用此候選。');
  if(speechWork)checks.push(`以 ${p.speechDeadline} ms ${p.responseMetric==='firstAudio'?'首音訊':'完整回覆'}驗收 VAD / ASR / prefill / 工具 / TTS；沒有此組合實測。`);
  if(localAgent&&!llm.strata&&d.id==='rtx')checks.push('RAM 與 VRAM 分開；不能把 host RAM 當作全 GPU 顯存，offload 效能需另測。');
  const costBand=(p.costOverrides||{})[d.id]||DEVICE_COST_DEFAULTS[d.id]||'mid';const costRank=COST_BANDS[costBand]?.order;
  if(!costRank)issue('costinput',`${d.name} 採購等級無效。`,{device:d.id});
  if(p.maxCostBand!=='any'&&costRank>COST_BANDS[p.maxCostBand]?.order)blocked.push(`採購等級 ${costBand} 超出上限 ${p.maxCostBand}；分級是使用者規劃，不是市價。`);
  const unified=['gpu','unifiedpc','pc','soc'].includes(d.family);
  if(unified&&d.ram&&resources.totalGB>d.ram)blocked.push(`同時運行規劃記憶體 ${resources.totalGB.toFixed(1)} GB 超過此配置 ${d.ram} GB，需降低模型／狀態負載或換配置。`);
  if(d.vram){if(resources.acceleratorGB>d.vram)blocked.push(`同時運行 accelerator 預算 ${resources.acceleratorGB.toFixed(1)} GB 超過 VRAM ${d.vram} GB。`);if(resources.hostGB>d.ram)blocked.push(`同時運行 host 預算 ${resources.hostGB.toFixed(1)} GB 超過 RAM ${d.ram} GB。`);}
  if(d.id===p.profileDevice&&resources.timedCount&&resources.occupancy>p.utilLimit)blocked.push(`指定參考裝置的合計運算時間占用 ${Math.round(resources.occupancy*100)}% 超過規劃上限 ${Math.round(p.utilLimit*100)}%；只依輸入的 profile。`);
  if(resources.tasks.length>=3&&!blocked.length&&unified&&d.ram){if(d.ram>=resources.totalGB*2)add(2,'多模型並存的記憶體餘裕');}
  checks.push(`預設全部模型並存：總預算 ${resources.totalGB.toFixed(1)} GB；權重共用、每路 state 分開，數值仍需實測。`);
  if(localDecision&&['npu','camera'].includes(d.family))blocked.push('本地 RLCD Qwen 在此候選缺少可驗證 host 容量與部署路徑；請先確認外接 host 或改雲端。');
  if(localAgent&&['tensorrt','vllm','qnn'].includes(p.llmRuntime)&&p.llmMemoryPlace==='host')blocked.push('指定 accelerator runtime 與純 host 記憶體路徑不相容。');
  if(localDecision)checks.push('本地 RLCD Qwen checkpoint、runtime、量化與決策正確性需驗證。');
  return {...d,score,why,checks,blocked,costBand,costRank};
 }).sort((a,b)=>(!!a.blocked.length-!!b.blocked.length)||(p.costPriority==='cost'?(a.costRank-b.costRank)||b.score-a.score:(b.score-a.score)||(a.costRank-b.costRank)));
 const ready=scenes.length&&models.length&&!issues.length;
 const winner=ready?(candidates.find(c=>!c.blocked.length)||null):null;
 const stages=[
 {name:'場景',state:scenes.length?'ok':'wait',value:scenes.length?`${scenes.length} 種場景`:'等待選擇',text:scenes.map(c=>c.name).join('、')||'加入一張場景卡'},
 {name:'時序',state:issues.some(i=>i.code==='timing')?'bad':'ok',value:selected.has('batch')?'離線批次':realtime?'持續即時':'按需 / 待定',text:`模型更新 ${p.inferFps} FPS；${streams} 路。多場景預設同一輸入共享模型；不同輸入請分開評估。`},
 {name:'觀測',state:issues.some(i=>['step','blur','feature','fps','exposure'].includes(i.code))?'bad':camera?'ok':'wait',value:camera?`${p.sensorFps} 實拍 FPS`:'條件未定',text:camera?'依使用者設定的影像條件與起測門檻推算，並非模型保證。':'點追蹤應加入相機限制'},
 {name:'部署',state:issues.some(i=>i.code==='offline')?'bad':'wait',value:models.length?`${models.length} 技術待編譯`:'等待技術',text:'算子、opset、精度、版本與 CPU fallback 仍需逐模型驗證。'},
 {name:'容量',state:'wait',value:selected.has('power')?`${p.watts} W 整機`:'功耗未定',text:'理論運算量只作起測；功耗、RAM、熱與端到端延遲尚未量測。'},
 {name:'候選',state:winner?'wait':issues.length?'bad':'wait',value:winner?winner.name:'尚無可推薦組合',text:winner?'按公開可行路徑與明示規則排序；條件式 PoC 候選，不是採購結論。':'先處理衝突或補齊場景與模型。'}
 ];
 return {ids:[...selected],params:p,scenes,models,issues,pending,metrics,resources,requirements,depth,llm,speech,candidates,winner,stages,detectorOps,streams};
}
// Dependencies describe capabilities, not a promise of runtime compatibility.
function dependencyRules(ids,p={}){
 const set=new Set(ids), rules=[];
 const capabilities={iotlocal:['llm'],iotcv:['mcuvision'],iotcompanion:['iotlink'],uavtrack:['tapir','cotracker'],uavmap:['slam'],uavavoid:['stereo'],mobilerobot:['slam'],vehicle:['yolo'],obstacle:['stereo','depth'],gimbaltrack:['tapir','cotracker'],voiceagent:['llm'],ragagent:['llm'],checkout:['yolo'],security:['yolo'],pose:['posemodel'],people:['yolo'],inspection:['yolo','sam'],document:['ocr','vlm'],points:['tapir','cotracker'],depthscene:['depth'],maskscene:['sam'],semantic:['vlm']};
 for(const c of CATALOG.filter(c=>c.group==='scene'&&set.has(c.id))){
  const groups=[capabilities[c.id]||[]];
  if(['voiceagent','iotlocal'].includes(c.id))groups.push(['asr'],['tts']);
  if(c.id==='iotlocal')groups.push(['iotlink']);
  if(c.id==='ragagent')groups.push(['rag']);
  for(const choices of groups)rules.push({source:c.id,choices,reason:'場景輸出需要此技術能力。'});
 }
 const need=(source,choices,reason)=>rules.push({source,choices,reason});
 if(set.has('rag'))need('rag',['llm'],'檢索資料需要生成模型組成回答。');
 if(set.has('iotcompanion')&&p.companionBackend==='local')for(const id of ['llm','asr','tts'])need('iotcompanion',[id],'本地語音對話需要辨識、生成與語音合成。');
 if(set.has('metric')||set.has('stopping'))need(set.has('metric')?'metric':'stopping',['depth','stereo'],'公尺距離與停止距離需要深度路徑；仍須校準尺度與誤差。');
 if(ids.some(id=>['depth','stereo','depthscene','obstacle','uavavoid','mobilerobot'].includes(id))){
  if(['stereo','tof','fusion'].includes(p.depthMode))need('sensorio',['stereo'],'所選感測融合路徑需要感測器整合技術。');
  if(p.depthMode==='metricmono')need('metric',['depth'],'單目公尺距離需要深度模型與尺度校準。');
 }
 if(ids.some(id=>['motion','tapir','cotracker','gimbaltrack','uavtrack','uavmap','uavavoid','vehicle','mobilerobot'].includes(id))&&['imu','visual'].includes(p.stabilization))need('motion',['stabilize'],'所選補償路徑需要穩像與時間同步。');
 return rules.map(rule=>({...rule,met:rule.choices.some(id=>set.has(id))}));
}
function dependencyClosure(ids,p={}){
 const selected=new Set(ids),added=[];
 for(let pass=0;pass<CATALOG.length;pass++){
  const missing=dependencyRules([...selected],p).filter(r=>!r.met&&r.choices.length===1);
  if(!missing.length)break;
  for(const rule of missing){const id=rule.choices[0];if(!selected.has(id)){selected.add(id);added.push({...rule,id});}}
 }
 return {ids:[...selected],added,choices:dependencyRules([...selected],p).filter(r=>!r.met)};
}
function evaluate(ids,params={}){
 const result=AIOT.assess(evaluateBase(ids,params));
 result.dependencies=dependencyRules(ids,{...DEFAULTS,...params});
 for(const rule of result.dependencies.filter(r=>!r.met))result.issues.push({code:'dependency',text:(CATALOG.find(c=>c.id===rule.source)?.name||rule.source)+' → '+rule.choices.map(id=>CATALOG.find(c=>c.id===id).name).join(' / ')+'：'+rule.reason,choices:rule.choices});
 if(result.dependencies.some(r=>!r.met))result.winner=null;
 return result;
}
if(typeof module!=='undefined')module.exports={dependencyRules,dependencyClosure,conditionContext,CATALOG,DEVICES,DEFAULTS,PLATFORM_CASES,LLM_PROFILES,SCENE_CONSTRAINTS,RESOURCE_DEFAULTS,COST_BANDS,DEVICE_COST_DEFAULTS,evaluate};
