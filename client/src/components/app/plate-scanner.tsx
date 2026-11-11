import { Button } from "@/components/ui/button";
import { readPlate, loadPlateReader, type PlateReading } from "@/lib/plate/reader";
import { Camera, Check, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Telefonda plaka okuma ekranı (deneme özelliği; SüperAdmin otopark bazında
// açar). Kamera görüntüsü sadece bu sayfanın belleğinde işlenir: kare
// kaydedilmez, sunucuya gönderilmez; okunan metin forma yazılır.
//
// Canlı kamera (getUserMedia) güvenli bağlantı (https) ister. http'de (örn.
// IP ile erişim) "Fotoğraf çek" yedeği çalışır: telefonun kamerası açılır,
// fotoğraf bellekte okunup bırakılır (iPhone galeriye kaydetmez; bazı
// Android'ler kendi kamera uygulamasında kaydedebilir).

// Aynı plaka art arda bu kadar karede okununca kendiliğinden kabul edilir.
const STABLE_FRAMES = 2;
const AUTO_ACCEPT_CONFIDENCE = 0.8;
// Kareler arası bekleme: pili ve işlemciyi yormasın.
const FRAME_GAP_MS = 120;

type Props = { title: string; onResult: (plate: string) => void; onClose: () => void };

export default function PlateScanner({ title, onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"loading" | "live" | "photo" | "error">("loading");
  const [message, setMessage] = useState("Okuma modeli hazırlanıyor…");
  const [reading, setReading] = useState<PlateReading | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const doneRef = useRef(false);
  // Üst bileşenin her çiziminde yeni fonksiyon gelir; kamera döngüsü bunlara
  // bağlı olursa kamera kapanıp yeniden açılırdı. Son hallerini ref'te tut.
  const callbacks = useRef({ onResult, onClose });
  useEffect(() => {
    callbacks.current = { onResult, onClose };
  });

  const finish = useCallback((plate: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    callbacks.current.onResult(plate);
    callbacks.current.onClose();
  }, []);

  // Modelleri yükle, sonra kamerayı aç; kapanınca kamerayı mutlaka bırak.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    const history: string[] = [];

    (async () => {
      try {
        await loadPlateReader();
      } catch {
        if (!stopped) {
          setStatus("error");
          setMessage("Okuma modeli yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
        }
        return;
      }
      if (stopped) return;

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus("photo");
        setMessage("Canlı kamera bu bağlantıda açılamıyor. Fotoğraf çekerek okutabilirsiniz.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        if (!stopped) {
          setStatus("photo");
          setMessage("Kameraya izin verilmedi. İzin verin ya da fotoğraf çekerek okutun.");
        }
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus("live");
      setMessage("Plakayı çerçevenin ortasına getirin.");

      // Okuma döngüsü: bir kare oku, kısa bekle, tekrar.
      while (!stopped && !doneRef.current) {
        if (video.readyState >= 2 && video.videoWidth) {
          try {
            const r = await readPlate(video, video.videoWidth, video.videoHeight);
            if (stopped) break;
            setFrame({ w: video.videoWidth, h: video.videoHeight });
            setReading(r);
            history.push(r && r.confidence >= AUTO_ACCEPT_CONFIDENCE ? r.plate : "");
            const last = history.slice(-STABLE_FRAMES);
            if (r && last.length === STABLE_FRAMES && last.every((p) => p && p === r.plate)) {
              finish(r.plate);
              break;
            }
          } catch {
            // Tek karelik hata (örn. kamera o an kare vermedi): devam et.
          }
        }
        await new Promise((res) => setTimeout(res, FRAME_GAP_MS));
      }
    })();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [finish]);

  // Fotoğraf yedeği: dosya bellekte çözülür, okunur ve hemen bırakılır.
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // seçimi bırak (aynı input'ta dosya tutulmasın)
    if (!file) return;
    setBusy(true);
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const r = await readPlate(bitmap, bitmap.width, bitmap.height);
      setFrame({ w: bitmap.width, h: bitmap.height });
      setReading(r);
      setMessage(r ? "Okunan plakayı kontrol edip kullanın." : "Plaka bulunamadı. Plakaya daha yakından çekin.");
    } catch {
      setMessage("Fotoğraf okunamadı. Tekrar deneyin.");
    } finally {
      bitmap?.close();
      setBusy(false);
    }
  };

  // Plaka kutusunu video üzerinde göstermek için (object-contain yerleşimi).
  const boxStyle = (() => {
    const v = videoRef.current;
    if (status !== "live" || !reading || !v || !frame.w) return null;
    const cw = v.clientWidth;
    const ch = v.clientHeight;
    const s = Math.min(cw / frame.w, ch / frame.h);
    const ox = (cw - frame.w * s) / 2;
    const oy = (ch - frame.h * s) / 2;
    const b = reading.box;
    return { left: ox + b.x * s, top: oy + b.y * s, width: b.w * s, height: b.h * s };
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 truncate font-medium">{title}</p>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Kapat">
          <X />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} className={status === "live" ? "size-full object-contain" : "hidden"} playsInline muted />
        {status === "live" && (
          <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-[22%] -translate-y-1/2 rounded-xl border-2 border-dashed border-white/50" />
        )}
        {boxStyle && <div className="pointer-events-none absolute rounded border-2 border-emerald-400" style={boxStyle} />}
        {status !== "live" && (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
            {status === "loading" && <Loader2 className="size-8 animate-spin" />}
            <p className="max-w-sm text-sm text-white/80">{message}</p>
            {status === "photo" && (
              <>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
                <Button size="lg" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Camera />} Fotoğraf çek
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 px-4 py-4">
        {status === "live" && <p className="text-center text-sm text-white/70">{message}</p>}
        <div className="flex min-h-14 items-center gap-3 rounded-xl bg-white/10 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-2xl font-semibold tracking-wider">{reading?.plate ?? "—"}</p>
            {reading && (
              <p className="text-xs text-white/60">
                {reading.region}
                {!reading.isTurkish && " · Türk plakası biçiminde değil, kontrol edin"}
              </p>
            )}
          </div>
          <Button onClick={() => reading && finish(reading.plate)} disabled={!reading}>
            <Check /> Kullan
          </Button>
        </div>
      </div>
    </div>
  );
}
