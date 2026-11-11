# Sunucuya kurulum

Sunucu düzeni (Ubuntu, root olarak `server-setup.sh` kurar):

| Ne | Nerede |
|---|---|
| Backend binary, views, public | `/opt/park/back/` (systemd: `park-backend`, kullanıcı `park`) |
| Ayarlar (gizli anahtarlar sunucuda üretilir) | `/opt/park/back/.env` |
| Veritabanı | `/opt/park/back/data/akbaslar.db` |
| Günlük yedek (03:30, 14 gün) | `/opt/park/back/data/backups/` (`park-backup.timer`) |
| Client (statik) | `/opt/park/client/` |
| nginx | `/` → client, `/api/` → `127.0.0.1:3500` |

## Güncelleme

Yerelde:

```sh
cd back && cargo build --release
cd ../client && VITE_API_URL=/api bun x vite build --outDir /tmp/park-pkg/client --emptyOutDir
mkdir -p /tmp/park-pkg/back /tmp/park-pkg/deploy
cp ../back/target/release/akbaslar_backend /tmp/park-pkg/back/
cp -r ../back/views ../back/public /tmp/park-pkg/back/
cp ../deploy/* /tmp/park-pkg/deploy/
tar czf /tmp/park-deploy.tgz -C /tmp/park-pkg .
scp /tmp/park-deploy.tgz root@SUNUCU:/root/
```

Sunucuda:

```sh
mkdir -p /root/park-deploy && tar xzf /root/park-deploy.tgz -C /root/park-deploy
sh /root/park-deploy/deploy/server-setup.sh     # veritabanına dokunmaz
rm -rf /root/park-deploy /root/park-deploy.tgz
```

Yeni migration'lar backend açılırken otomatik uygulanır (önce bir yedek almak
için: `systemctl start park-backup`).

## Alan adı ve HTTPS

1. Alan adının DNS A kaydını sunucu IP'sine yönlendirin.
2. `nginx-park.conf` içinde `server_name _;` yerine alan adını yazın.
3. Sunucuda: `apt install certbot python3-certbot-nginx && certbot --nginx -d ALAN_ADI`
4. `/opt/park/back/.env` içinden `COOKIE_SECURE=false` satırını silip
   `systemctl restart park-backend`.
