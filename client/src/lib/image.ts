// Yüklenecek fotoğrafı tarayıcıda küçültür: en uzun kenar en fazla
// `maxSide` piksel, JPEG, `maxBytes` altı (sunucu/nginx sınırı 1 MB). Canvas'a
// yeniden çizildiği için EXIF (konum/GPS, cihaz bilgisi) silinir; telefonun
// döndürme bilgisi çizimde uygulanır.
export async function shrinkImage(file: Blob, maxSide = 1600, maxBytes = 950_000): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Tarayıcı canvas desteklemiyor");
      ctx.drawImage(bitmap, 0, 0, w, h);
      for (const quality of [0.85, 0.75, 0.65]) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
        if (blob && blob.size <= maxBytes) return blob;
      }
      scale *= 0.8; // hâlâ büyükse boyutu küçült
    }
    throw new Error("Fotoğraf yeterince küçültülemedi");
  } finally {
    bitmap.close();
  }
}
