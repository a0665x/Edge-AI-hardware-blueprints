# Selection dependencies and benchmark evidence

The AIoT preset group includes a local voice endpoint plus a separate Qwen host, two lightweight camera cases, a low-rate YOLO26 case and a connected companion. Selecting an endpoint does not assign its workload or memory to the host.

## Dependency policy

- A required capability with one supported path is added with an explanation and charged to the shared resource plan. Undo restores the whole action.
- Alternatives remain explicit choices: TAPIR / CoTracker, OCR / VLM, detector / segmentation for inspection, and depth / sensor integration for metric measurements. These are planning alternatives, not accuracy-equivalent replacements.
- Removing a required technology is allowed, but explains the missing capability and suspends the winner until corrected. Extra selected technologies remain concurrent workloads.
- Parameter choices can introduce dependencies, including local companion speech, metric depth, sensor fusion and motion compensation. Offline/cloud, incompatible camera platforms and batch/realtime conflicts retain their existing explicit gates.
- Low power, RAM and latency limits do not imply a particular model. Their numerical values are evaluated by the existing resource and sensor gates.

Automated coverage: 58 cards, every unordered pair (1,653), every one-scene × one-technology × one-need × one-limit tuple (17,820), and seven parameter branches for every card (406). Checks cover closure termination/idempotence, valid dependency targets, preservation of explicit selections, and suppression of recommendations with unresolved issues. This is not exhaustive enumeration of all 2^58 subsets or continuous numeric inputs, and is not hardware validation.

## Qualcomm worksheet

The worksheet defaults to **FP32** and records board, checkpoint, tensor shape/batch, execution precision, runtime, compute unit/fallback and SDK version for comparison. It calculates serial single-stream throughput and time demanded per second from user-entered model and pre/post-processing timings. Blank timings remain unknown. Values are retained across a language change while the worksheet is open; it is a scratch worksheet, not a saved benchmark database.

It does not import website numbers automatically or change ranking measurements. Actual device timings belong in the existing per-model resource editor, with matching model, board and execution path. Do not enter NPU or CPU timings as GPU timings. Existing LLM quantization assumptions are not changed by the worksheet's FP32 default.

Primary sources checked 2026-10-16:

- [Qualcomm AI Hub IoT catalog](https://aihub.qualcomm.com/iot/models): floating-point and quantized categories; QCS8550 entries may be marked Proxy. Floating Point is not evidence of FP32 execution.
- [YOLOv8 detection](https://aihub.qualcomm.com/iot/models/yolov8_det): YOLOv8-N checkpoint, 640 × 640 input. The retrieved page also contained inconsistent support presentation; no timing table was copied or treated as board qualification.
- [AI Hub API and compile options](https://workbench.aihub.qualcomm.com/docs/hub/api.html): runtime, compute unit and QAIRT version affect the execution path; ONNX/TFLite can fall back to CPU; compilation can select FLOAT16. Verify execution precision, not only source tensor dtype.

The left-to-right photon guide runs three times, then stops. Reduced-motion users receive a static guide; animation does not represent benchmark completion.
