// Telefonda plaka okuma: iki küçük ONNX modeli tarayıcıda (onnxruntime-web,
// WASM) çalışır. Görüntü HİÇBİR YERE gönderilmez ve kaydedilmez: kamera
// karesi bellekteki bir canvas'a çizilir, modellerden geçer, sadece okunan
// metin döner. Modeller ve WASM motoru kendi sunucumuzdan, içerik hash'li
// adlarla gelir (bir kez indirilir, sonra tarayıcı önbelleğinden).
//
// 1) Plaka bulucu (YOLOv9-t, 384): kare içindeki plakanın kutusu.
// 2) Okuyucu (CCT-XS v2 global): kırpılan plakadaki karakterler + ülke.
// Ön/son işlem, modellerin Python kütüphanelerindeki (open-image-models,
// fast-plate-ocr) kodun birebir karşılığı; bkz. models/README.md.
import * as ort from "onnxruntime-web/wasm";
import loaderSource from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?raw";
import wasmUrl from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url";
import detectorUrl from "./models/plate-detector-yolo-v9-t-384.onnx?url";
import ocrUrl from "./models/plate-ocr-cct-xs-v2-global.onnx?url";

const DETECTOR_SIZE = 384;
const DETECTOR_MIN_SCORE = 0.25;
const OCR_W = 128;
const OCR_H = 64;
const OCR_SLOTS = 10;
const OCR_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const PAD = "_";
// cct_xs_v2_global_plate_config.yaml -> plate_regions (sıra önemli).
const REGIONS = [
  "Albania", "Andorra", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahrain",
  "Belarus", "Belgium", "Bosnia and Herzegovina", "Brazil", "Bulgaria", "Cambodia", "Canada", "Croatia",
  "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Georgia", "Germany",
  "Gibraltar", "Greece", "Guernsey", "Hungary", "Iceland", "Indonesia", "Ireland", "Israel", "Italy",
  "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malaysia", "Malta", "Mexico", "Moldova",
  "Monaco", "Montenegro", "Netherlands", "New Zealand", "North Macedonia", "Norway", "Poland",
  "Portugal", "Qatar", "Romania", "San Marino", "Serbia", "Singapore", "Slovakia", "Slovenia", "Spain",
  "Sweden", "Switzerland", "Thailand", "Turkey", "United States", "Ukraine", "United Kingdom", "Vietnam",
  "Unknown",
];
const REGION_TR: Record<string, string> = {
  Turkey: "Türkiye", Georgia: "Gürcistan", Azerbaijan: "Azerbaycan", Bulgaria: "Bulgaristan",
  Romania: "Romanya", Ukraine: "Ukrayna", Greece: "Yunanistan", Armenia: "Ermenistan",
  Moldova: "Moldova", Serbia: "Sırbistan", "North Macedonia": "Kuzey Makedonya", Poland: "Polonya",
  Hungary: "Macaristan", Germany: "Almanya", Belarus: "Belarus", Lithuania: "Litvanya",
  Albania: "Arnavutluk", "Bosnia and Herzegovina": "Bosna-Hersek", Unknown: "Bilinmiyor",
};

export type PlateBox = { x: number; y: number; w: number; h: number; score: number };
export type PlateReading = {
  text: string; // ham okuma (dolgu atılmış)
  plate: string; // kullanılacak değer (Türk plakasıysa düzeltilmiş)
  confidence: number; // karakter olasılıklarının en küçüğü (0-1)
  region: string; // ülke (Türkçe ad)
  isTurkish: boolean; // Türk plakası biçimine uyuyor mu
  box: PlateBox; // kaynaktaki konumu (çerçeve çizmek için)
};

type Sessions = { detector: ort.InferenceSession; ocr: ort.InferenceSession };
let loading: Promise<Sessions> | null = null;

// Modelleri bir kez yükler (ilk taramada). Sonraki çağrılar aynı oturumları
// kullanır. Yükleme başarısız olursa bir sonraki denemede tekrar denenir.
export function loadPlateReader(): Promise<Sessions> {
  loading ??= (async () => {
    // WASM: hash'li adla kendi sunucumuzdan. Motorun yükleyicisi (.mjs) ise
    // ayrı dosya olarak VERİLMEZ: nginx'in varsayılan mime.types'ı .mjs'i
    // application/octet-stream gönderiyor ve tarayıcı modülü reddediyor
    // (179'da yaşandı). Kodu pakete metin olarak gömüp bellekten yüklüyoruz;
    // sunucu ayarından bağımsız.
    const loaderUrl = URL.createObjectURL(new Blob([loaderSource], { type: "text/javascript" }));
    ort.env.wasm.wasmPaths = { mjs: loaderUrl, wasm: wasmUrl };
    // Tek iş parçacığı: çoklu iş parçacığı sayfanın "cross-origin isolated"
    // olmasını ve yükleyicinin gerçek bir adresten gelmesini ister.
    ort.env.wasm.numThreads = 1;
    const opts: ort.InferenceSession.SessionOptions = {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    };
    const [detector, ocr] = await Promise.all([
      ort.InferenceSession.create(detectorUrl, opts),
      ort.InferenceSession.create(ocrUrl, opts),
    ]);
    return { detector, ocr };
  })().catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Tarayıcı canvas desteklemiyor");
  return ctx;
}

// Bir kare (video, resim, canvas) üzerinde plakayı bulup okur. Plaka
// bulunamazsa null. `srcW/srcH`: kaynağın gerçek piksel boyutu.
export async function readPlate(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
): Promise<PlateReading | null> {
  const { detector, ocr } = await loadPlateReader();
  const box = await detect(detector, source, srcW, srcH);
  if (!box) return null;
  return { ...(await recognize(ocr, source, box)), box };
}

async function detect(
  session: ort.InferenceSession,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
): Promise<PlateBox | null> {
  // Letterbox: en-boy oranı korunarak 384x384'e sığdır, kenarlar gri (114).
  const S = DETECTOR_SIZE;
  const r = Math.min(S / srcH, S / srcW);
  const nw = Math.round(srcW * r);
  const nh = Math.round(srcH * r);
  const dw = (S - nw) / 2;
  const dh = (S - nh) / 2;
  const left = Math.round(dw - 0.1);
  const top = Math.round(dh - 0.1);

  const ctx = canvas2d(S, S);
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, srcW, srcH, left, top, nw, nh);
  const px = ctx.getImageData(0, 0, S, S).data;

  // NCHW, RGB, 0-1.
  const plane = S * S;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    input[i] = px[i * 4] / 255;
    input[plane + i] = px[i * 4 + 1] / 255;
    input[2 * plane + i] = px[i * 4 + 2] / 255;
  }
  const out = await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, S, S]),
  });
  const pred = out[session.outputNames[0]];
  // Satırlar: [batch, x1, y1, x2, y2, sınıf, skor] (NMS model içinde).
  const data = pred.data as Float32Array;
  const cols = pred.dims[pred.dims.length - 1];
  let best: PlateBox | null = null;
  for (let i = 0; i + cols <= data.length; i += cols) {
    const score = data[i + 6];
    if (score < DETECTOR_MIN_SCORE || (best && score <= best.score)) continue;
    const x1 = Math.max(0, (data[i + 1] - dw) / r);
    const y1 = Math.max(0, (data[i + 2] - dh) / r);
    const x2 = Math.min(srcW, (data[i + 3] - dw) / r);
    const y2 = Math.min(srcH, (data[i + 4] - dh) / r);
    if (x2 - x1 < 4 || y2 - y1 < 4) continue;
    best = { x: x1, y: y1, w: x2 - x1, h: y2 - y1, score };
  }
  return best;
}

async function recognize(
  session: ort.InferenceSession,
  source: CanvasImageSource,
  box: PlateBox,
): Promise<Omit<PlateReading, "box">> {
  // Plaka kutusu en-boy oranı korunmadan 128x64'e; NHWC, RGB, uint8.
  const ctx = canvas2d(OCR_W, OCR_H);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, OCR_W, OCR_H);
  const px = ctx.getImageData(0, 0, OCR_W, OCR_H).data;
  const input = new Uint8Array(OCR_W * OCR_H * 3);
  for (let i = 0, j = 0; i < px.length; i += 4) {
    input[j++] = px[i];
    input[j++] = px[i + 1];
    input[j++] = px[i + 2];
  }
  const out = await session.run({
    [session.inputNames[0]]: new ort.Tensor("uint8", input, [1, OCR_H, OCR_W, 3]),
  });

  const plateName = session.outputNames.find((n) => n !== "region") ?? session.outputNames[0];
  const probs = out[plateName].data as Float32Array;
  const V = OCR_ALPHABET.length;
  let text = "";
  const charProbs: number[] = [];
  for (let s = 0; s < OCR_SLOTS; s++) {
    let bi = 0;
    for (let k = 1; k < V; k++) if (probs[s * V + k] > probs[s * V + bi]) bi = k;
    text += OCR_ALPHABET[bi];
    charProbs.push(probs[s * V + bi]);
  }
  // Sondaki dolgu karakterlerini at (olasılıklarıyla birlikte).
  let end = text.length;
  while (end > 0 && text[end - 1] === PAD) end--;
  text = text.slice(0, end).replaceAll(PAD, "");
  const confidence = end ? Math.min(...charProbs.slice(0, end)) : 0;

  let region = "Unknown";
  if (out.region) {
    const rp = out.region.data as Float32Array;
    let ri = 0;
    for (let k = 1; k < rp.length; k++) if (rp[k] > rp[ri]) ri = k;
    region = REGIONS[ri] ?? "Unknown";
  }

  const turkish = toTurkishPlate(text);
  return {
    text,
    plate: turkish ?? text,
    confidence,
    region: REGION_TR[region] ?? region,
    isTurkish: turkish !== null,
  };
}

// Türk plakası: il kodu (01-81) + 1-3 harf + 2-4 rakam. Ayrıca harf/rakam
// sayısı kuralı: 1 harf -> 4 rakam, 2 harf -> 3-4 rakam, 3 harf -> 2-3 rakam.
const TR_PLATE = /^(0[1-9]|[1-7][0-9]|8[01])([A-Z]{1,3})([0-9]{2,4})$/;
export function isTurkishPlate(p: string) {
  const m = TR_PLATE.exec(p);
  if (!m) return false;
  const [, , letters, digits] = m;
  if (letters.length === 1) return digits.length === 4;
  if (letters.length === 2) return digits.length >= 3;
  return digits.length <= 3;
}

// Okuyucunun sık karıştırdığı harf/rakam çiftleri. Türk plakasında bir
// karakterin harf mi rakam mı olacağı konumundan bellidir; sadece sonuç
// geçerli bir Türk plakası olursa düzeltme uygulanır, yoksa null.
const TO_DIGIT: Record<string, string> = { O: "0", D: "0", Q: "0", I: "1", L: "1", Z: "2", S: "5", G: "6", B: "8", T: "7" };
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B", "7": "T" };
export function toTurkishPlate(raw: string): string | null {
  if (isTurkishPlate(raw)) return raw;
  if (raw.length < 5 || raw.length > 9) return null;
  // İl kodu 2 rakam; geri kalanı "harfler + rakamlar" olarak her bölmeyi dene.
  for (let nl = 1; nl <= 3; nl++) {
    const nd = raw.length - 2 - nl;
    if (nd < 2 || nd > 4) continue;
    const fix = (s: string, map: Record<string, string>, ok: RegExp) =>
      [...s].map((c) => (ok.test(c) ? c : (map[c] ?? c))).join("");
    const candidate =
      fix(raw.slice(0, 2), TO_DIGIT, /[0-9]/) +
      fix(raw.slice(2, 2 + nl), TO_LETTER, /[A-Z]/) +
      fix(raw.slice(2 + nl), TO_DIGIT, /[0-9]/);
    if (isTurkishPlate(candidate)) return candidate;
  }
  return null;
}
