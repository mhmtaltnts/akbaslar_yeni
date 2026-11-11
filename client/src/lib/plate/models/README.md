# Plaka okuma modelleri

Telefonda (tarayıcıda, onnxruntime-web ile) çalışan iki model. Görüntü
telefondan çıkmaz; bkz. `../reader.ts`.

| Dosya | Kaynak | Lisans |
|---|---|---|
| `plate-detector-yolo-v9-t-384.onnx` | [open-image-models](https://github.com/ankandrew/open-image-models) `yolo-v9-t-384-license-plate-end2end` (release `assets`) | MIT (depo) |
| `plate-ocr-cct-xs-v2-global.onnx` | [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) `cct-xs-v2-global-model` (cnn-ocr-lp release `arg-plates`) | MIT (depo) |

OCR ayarları (`cct_xs_v2_global_plate_config.yaml`): 10 karakter yuvası,
alfabe `0-9A-Z_`, dolgu `_`, giriş 64x128 RGB uint8 (NHWC), en-boy oranı
korunmadan doğrusal yeniden boyutlandırma. Bölge listesi `../reader.ts`'te.
