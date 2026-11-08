use tokio::{fs, io::AsyncWriteExt};

// middleware/logger.js'teki `logEvents()` karşılığı: `yyyyMMdd\tHH:mm:ss\t<uuid>\t<mesaj>`
// satırını `logs/<dosya>` dosyasının sonuna ekler. Hem request logger (Ders 6)
// hem de hata loglama (Ders 5'te eprintln! ile geçici bıraktığımız yer) bu
// tek fonksiyonu paylaşıyor -- Node tarafında da aynı `logEvents` fonksiyonu
// hem `logger.js` hem `errorHandler.js` hem `loginLimiter.js` tarafından
// kullanılıyordu.
// `message`/`log_file_name` BİLEREK `String` (ödünç alınmış `&str` değil):
// `tokio::spawn` verdiğimiz future'ın `'static` olmasını istiyor -- yani
// hiçbir ödünç almayan, kendi verisinin SAHİBİ olan bir future. `&str`
// kullansaydık, çağıran taraftaki geçici `String`'e bir referans taşımamız
// gerekirdi ve o `String` spawn edilen task bitmeden silinebilirdi (derleyici
// bunu tam olarak bu yüzden reddeder). Sahipliği devretmek bu sorunu kökten
// çözüyor.
pub async fn log_event(message: String, log_file_name: &'static str) {
    let timestamp = chrono::Local::now().format("%Y%m%d\t%H:%M:%S");
    let line = format!("{timestamp}\t{}\t{message}\n", uuid::Uuid::new_v4());

    if let Err(err) = fs::create_dir_all("logs").await {
        eprintln!("[LOG ERROR] logs dizini oluşturulamadı: {err}");
        return;
    }

    let path = std::path::Path::new("logs").join(log_file_name);

    match fs::OpenOptions::new().create(true).append(true).open(&path).await {
        Ok(mut file) => {
            if let Err(err) = file.write_all(line.as_bytes()).await {
                eprintln!("[LOG ERROR] {log_file_name} yazılamadı: {err}");
            }
        }
        Err(err) => eprintln!("[LOG ERROR] {path:?} açılamadı: {err}"),
    }
}
