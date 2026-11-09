#!/bin/sh
# Sunucuda (root olarak) çalışır. Yükleme paketi açıldığı klasörden çağrılır:
#   ./server-setup.sh            -> kur / güncelle (mevcut veritabanına DOKUNMAZ)
#   ./server-setup.sh --with-db  -> paketteki data/akbaslar.db'yi de yükle
#                                   (sadece veritabanı henüz yoksa)
# Paket içeriği: back/akbaslar_backend, back/views, back/public, client/ (dist),
#                deploy/*, [data/akbaslar.db]
set -eu
HERE=$(cd "$(dirname "$0")/.." && pwd)
WITH_DB=${1:-}

export DEBIAN_FRONTEND=noninteractive
if ! command -v nginx >/dev/null || ! command -v sqlite3 >/dev/null; then
    apt-get update -q
    apt-get install -y -q nginx sqlite3 ufw
fi

id park >/dev/null 2>&1 || useradd --system --home /opt/park --shell /usr/sbin/nologin park
mkdir -p /opt/park/back/data /opt/park/back/logs /opt/park/client

# Backend: binary + statik görünümler.
install -m 755 "$HERE/back/akbaslar_backend" /opt/park/back/akbaslar_backend.new
mv /opt/park/back/akbaslar_backend.new /opt/park/back/akbaslar_backend
rm -rf /opt/park/back/views /opt/park/back/public
cp -r "$HERE/back/views" "$HERE/back/public" /opt/park/back/

# .env sadece ilk kurulumda oluşturulur (gizli anahtarlar sunucuda üretilir).
if [ ! -f /opt/park/back/.env ]; then
    umask 077
    cat > /opt/park/back/.env <<ENV
HOST=127.0.0.1
PORT=3500
DATABASE_URL=sqlite://data/akbaslar.db
ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
TRUST_PROXY=true
# Alan adı + HTTPS kurulunca bu satırı silin:
COOKIE_SECURE=false
ENV
    umask 022
fi

if [ "$WITH_DB" = "--with-db" ] && [ -f "$HERE/data/akbaslar.db" ]; then
    if [ -f /opt/park/back/data/akbaslar.db ]; then
        echo "UYARI: /opt/park/back/data/akbaslar.db zaten var, yüklenmedi."
    else
        install -m 640 "$HERE/data/akbaslar.db" /opt/park/back/data/akbaslar.db
    fi
fi
chown -R park:park /opt/park/back
chmod 750 /opt/park/back/data /opt/park/back/logs
chmod 600 /opt/park/back/.env

# Client: yeni derlemeyi atomik olarak yerine koy.
rm -rf /opt/park/client.new && cp -r "$HERE/client" /opt/park/client.new
rm -rf /opt/park/client.old && mv /opt/park/client /opt/park/client.old && mv /opt/park/client.new /opt/park/client
rm -rf /opt/park/client.old

# systemd
install -m 644 "$HERE/deploy/park-backend.service" "$HERE/deploy/park-backup.service" \
    "$HERE/deploy/park-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now park-backup.timer
systemctl enable park-backend
systemctl restart park-backend

# nginx
install -m 644 "$HERE/deploy/nginx-park.conf" /etc/nginx/sites-available/park
ln -sf /etc/nginx/sites-available/park /etc/nginx/sites-enabled/park
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

# Güvenlik duvarı: sadece SSH ve web.
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

sleep 2
systemctl is-active park-backend nginx
