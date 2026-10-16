# AIoT deployment examples

Checked 2026-10-16. These examples establish deployment paths, not product performance guarantees. The workbench separates endpoint resources from host resources and labels editable budgets as planning assumptions.

| Route | Implementation evidence | Planning consequence |
| --- | --- | --- |
| ESP32 voice terminal + local model host | [Xiaozhi firmware](https://github.com/78/xiaozhi-esp32) and [self-hosted backend](https://github.com/xinnan-tech/xiaozhi-esp32-server) | Wi-Fi carries application traffic. Select local ASR/LLM/TTS explicitly; an OpenAI-compatible protocol does not require an online OpenAI service. The Qwen 8B / NX preset is a capacity-planning extension, not a published benchmark of that exact combination. |
| MCU camera vision | [ESP-Detection](https://github.com/espressif/esp-detection) | ESPDet-Pico 224 single-class examples report above 7 FPS on S3 and 18 FPS on P4. The workbench uses 7/18 only as conservative screening values; higher targets require user-supplied measurements, not an assertion that the chip cannot run faster. |
| Full YOLO examples | [YOLO11 model table](https://github.com/espressif/esp-dl/tree/master/models/coco_detect), [YOLO26 example](https://github.com/espressif/esp-dl/tree/master/examples/yolo26_detect) | YOLO11 INT8 320 pre/inference/post totals are 1364.7 ms on S3 and 331.1 ms on P4 in the referenced table. YOLO26 INT8 512 P4 example totals about 2096 ms. These are distinct checkpoints and datasets; neither inherits Pico performance. No equivalent YOLOv8n configuration was verified here. |
| Connected home companion | [Muse ESP32 SDK](https://github.com/facebookincubator/muse-gadget-sdk/tree/main/esp32) | Requires app pairing and an SDK token. The checked instructions specify ESP-IDF 6.0.1. Board features vary; default replies are text, with separate TTS integration for speech. A custom local companion is an alternative backend, not an offline Muse service. |
| Tiny language-model demonstration | [esp32-ai](https://github.com/slvDev/esp32-ai) | Author reports a 28.9M TinyStories/PLE model at 9.88 tok/s on S3 with 8 MB PSRAM and 16 MB flash. The author explicitly excludes general question answering/instruction following. Do not extrapolate this to Qwen. |

## Hardware and integration boundaries

- [ESP32-S3 documentation](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf): native camera controller and USB Full-Speed; no native MIPI CSI. The workbench's S3 candidate assumes an 8 MB PSRAM board, not SRAM of that size.
- [USB camera guidance](https://docs.espressif.com/projects/esp-techpedia/en/latest/esp-friends/solution-introduction/camera/usb-camera-solution.html): compatible Full-Speed MJPEG camera, under 4 Mbps isochronous or 8.8 Mbps bulk for the documented S3 route. Driver, decoding and concurrent radio load remain separate checks.
- [ESP32-P4](https://www.espressif.com/en/products/socs/esp32-p4): MIPI CSI/ISP and USB HS; wireless requires a companion chip. The candidate uses a 32 MB PSRAM planning configuration; verify the actual board BOM.
- [ESP-DL](https://github.com/espressif/esp-dl): inspect operator support before ESP-PPQ quantization and `.espdl` export. The checked documentation requires ESP-IDF release/v5.3 or newer. P4 per-channel Conv/Gemm requires ESP-DL 3.3.1 and ESP-PPQ 1.2.10 or newer. Pin the exact model, SDK and board versions for acceptance.

Raw buffers are calculated as width × height × bytes/pixel × concurrent buffers. Model/CV workspace, display/audio/network buffers and reserve are added separately. This is a PSRAM planning envelope; internal SRAM/DMA, flash partitions, OTA capacity and fragmentation still need measurement. The local host never lends its RAM to the endpoint.

Network round trip and endpoint audio buffers consume the same end-to-end deadline as host speech and inference. Endpoint power and host power are separate budgets. Unknown timing or power remains unverified. Generated scene illustrations are original concepts; hardware candidate photos are attributed in `edge-ai-guide/assets/hardware/sources.json`.
