#!/usr/bin/env python3
"""Eski Node/MongoDB otopark sitelerinin verisini yeni SQLite veritabanına taşır.

Girdi `mongoexport` çıktısı (satır başına bir JSON belge). Örnek:

    mongoexport --uri "$URI" -c users -o muallimkoy_users.json
    mongoexport --uri "$URI" -c notes -o muallimkoy_notes.json

Kullanım (back/ klasöründen, backend DURDURULMUŞKEN):

    python3 scripts/mongo_to_sqlite.py data/akbaslar.db \\
        --park muallimkoy "Muallimköy Tır Parkı" muallimkoy_users.json muallimkoy_notes.json \\
        --park akbaslar "Akbaşlar Tır Parkı" akbaslar_users.json akbaslar_notes.json \\
        --officers authdb_users.json \\
        --super-admin HACI

Kurallar:
  * SQLite'taki MEVCUT tüm otopark/kullanıcı/kayıt verisi silinip yerine
    yazılır (tek transaction; hata olursa hiçbir şey değişmez). Şema için
    backend'in bu dosyayla en az bir kez çalışmış olması gerekir.
  * Kullanıcı adları tüm otoparklarda eşsizdir (`username_key`, Türkçe
    I/İ/ı/i aynı sayılır). Aynı ada sahip hesaplar AYNI KİŞİ sayılır ve
    birleştirilir: parametre sırasında İLK görülen hesabın şifresi, rolleri
    ve otoparkı geçerli olur.
  * `--officers`: başka bir uygulamadaki (örn. birleşik uygulamanın authDb'si)
    kullanıcılardan sadece "Memur" rolündekiler alınır ve TÜM otoparklara
    erişim izni verilir. Bir parktaki aynı adlı "sadece memur" hesapla
    birleşirse o hesap da tüm otoparklara erişir.
  * `--super-admin`: bu kullanıcıya SüperAdmin rolü eklenir.
  * Mongo ObjectId'leri sabit (deterministik) UUID'lere çevrilir; script
    aynı veriyle tekrar çalıştırıldığında aynı id'ler oluşur.
"""

import argparse
import json
import sqlite3
import sys
import uuid
from datetime import datetime

# Mongo ObjectId -> UUID dönüşümü için sabit isim alanı.
NS = uuid.UUID("6f6c6420-6d6f-6e67-6f2d-746f2d73716c")
# migrations/0001_init.sql'deki varsayılan otoparkın id'si: muallimkoy
# otoparkı bu id'yi korur.
SEED_TENANT = {"muallimkoy": uuid.UUID("e02ce5f1-b257-4964-8ed7-4eae87e03cbf")}

OFFICER, ADMIN, MANAGER, SUPER_ADMIN = "Memur", "Kurucu", "Yönetici", "SüperAdmin"

NOTE_TEXT = [
    "getiren", "dorse", "firma", "mal", "gumrukBilgi", "goturen",
    "girisYapan", "gumrukYapan", "cikisYapan", "guncellemeYapan",
]
NOTE_TIME = ["girisTarihi", "gumrukBilgiTarihi", "cikisTarihi", "guncellemeTarihi"]


def snake(name: str) -> str:
    return "".join("_" + c.lower() if c.isupper() else c for c in name)


def username_key(username: str) -> str:
    """Rust'taki models::user::username_key ile birebir aynı kural."""
    return "".join("i" if c in "Iİı" else c.lower() for c in username)


def is_officer(roles: list[str]) -> bool:
    """Rust'taki roles::is_officer ile aynı kural."""
    return OFFICER in roles and not ({ADMIN, MANAGER, SUPER_ADMIN} & set(roles))


def oid(doc: dict) -> str:
    v = doc["_id"]
    return v["$oid"] if isinstance(v, dict) else str(v)


def to_uuid(object_id: str) -> uuid.UUID:
    return uuid.uuid5(NS, object_id)


def to_ms(v):
    """Mongo'daki tarih alanı -> milisaniye epoch (INTEGER) ya da None."""
    if v is None:
        return None
    if isinstance(v, dict):
        if "$numberLong" in v:
            return int(v["$numberLong"])
        if "$numberDouble" in v:
            return round(float(v["$numberDouble"]))
        if "$date" in v:
            d = v["$date"]
            if isinstance(d, dict):
                return int(d["$numberLong"])
            if isinstance(d, (int, float)):
                return int(d)
            return round(datetime.fromisoformat(d.replace("Z", "+00:00")).timestamp() * 1000)
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return round(v)
    if isinstance(v, str) and v.strip().lstrip("-").isdigit():
        return int(v)
    raise ValueError(f"tanınmayan tarih değeri: {v!r}")


def text(v):
    if v is None:
        return None
    return v if isinstance(v, str) else str(v)


def read_jsonl(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sqlite")
    ap.add_argument("--park", nargs=4, action="append", required=True,
                    metavar=("SLUG", "AD", "USERS_JSON", "NOTES_JSON"))
    ap.add_argument("--officers", metavar="USERS_JSON")
    ap.add_argument("--super-admin", metavar="KULLANICI_ADI")
    args = ap.parse_args()

    tenants = []  # (id, slug, name)
    users: dict[str, dict] = {}  # username_key -> kullanıcı
    merged, skipped = [], []
    notes = []

    def add_user(doc: dict, tenant_id: uuid.UUID, source: str, all_parks: bool = False):
        username = doc["username"]
        key = username_key(username)
        roles = list(doc.get("roles") or ["Çalışan"])
        if key in users:
            first = users[key]
            merged.append(f"{username} ({source}, {'/'.join(roles)}) -> {first['username']} ({first['source']}, {'/'.join(first['roles'])})")
            first["all_parks"] |= all_parks
            return
        users[key] = {
            "id": to_uuid(oid(doc)),
            "tenant_id": tenant_id,
            "fullname": (doc.get("fullName") or doc.get("fullname") or username).strip(),
            "username": username,
            "key": key,
            "password": doc["password"],
            "roles": roles,
            "active": bool(doc.get("active", True)),
            "source": source,
            "all_parks": all_parks,
        }

    for slug, name, users_json, notes_json in args.park:
        tid = SEED_TENANT.get(slug) or uuid.uuid5(NS, "tenant:" + slug)
        tenants.append((tid, slug, name))
        for doc in read_jsonl(users_json):
            add_user(doc, tid, slug)
        for doc in read_jsonl(notes_json):
            object_id = oid(doc)
            row = {"id": to_uuid(object_id), "tenant_id": tid,
                   # ObjectId'nin ilk 4 baytı oluşturulma zamanı (saniye).
                   "created_at": int(object_id[:8], 16) * 1000}
            for f in NOTE_TEXT:
                row[snake(f)] = text(doc.get(f))
            for f in NOTE_TIME:
                row[snake(f)] = to_ms(doc.get(f))
            if not row["getiren"] or not row["dorse"]:
                raise ValueError(f"{slug}: {object_id} kaydında getiren/dorse boş")
            notes.append(row)

    home = tenants[0][0]
    if args.officers:
        for doc in read_jsonl(args.officers):
            if OFFICER in (doc.get("roles") or []):
                add_user(doc, home, "memurlar", all_parks=True)
            else:
                skipped.append(f"{doc['username']} ({'/'.join(doc.get('roles') or [])})")

    if args.super_admin:
        sa = users.get(username_key(args.super_admin))
        if not sa:
            sys.exit(f"SüperAdmin yapılacak kullanıcı bulunamadı: {args.super_admin}")
        if SUPER_ADMIN not in sa["roles"]:
            sa["roles"].append(SUPER_ADMIN)

    # Tüm otoparklara erişim: authDb memurları ve onlarla birleşen hesaplar
    # (sadece "sadece memur" yetkisindekiler; Kurucu/Yönetici zaten kendi
    # otoparkında kısıtsız, izin satırına ihtiyaçları yok).
    grants = [
        (u["id"], tid)
        for u in users.values()
        if u["all_parks"] and is_officer(u["roles"])
        for tid, _, _ in tenants
        if tid != u["tenant_id"]
    ]

    con = sqlite3.connect(args.sqlite)
    con.execute("PRAGMA foreign_keys = ON")
    if not con.execute("SELECT 1 FROM sqlite_master WHERE name = 'officer_parks'").fetchone():
        sys.exit(f"{args.sqlite}: şema yok. Önce backend'i bu dosyayla bir kez çalıştırın.")
    # Otopark adresleri ve alan adları Mongo'da yok: SQLite'ta aynı koda
    # (slug) sahip otoparkınki varsa korunur (alan adı: migration 0003).
    addresses = dict(con.execute("SELECT slug, address FROM tenants").fetchall())
    has_domain = any(r[1] == "domain" for r in con.execute("PRAGMA table_info(tenants)"))
    domains = dict(con.execute("SELECT slug, domain FROM tenants").fetchall()) if has_domain else {}
    try:
        with con:
            for table in ("officer_parks", "notes", "users", "tenants"):
                con.execute(f"DELETE FROM {table}")
            con.executemany(
                "INSERT INTO tenants (id, name, slug, address) VALUES (?, ?, ?, ?)",
                [(tid.bytes, name, slug, addresses.get(slug)) for tid, slug, name in tenants],
            )
            if has_domain:
                con.executemany(
                    "UPDATE tenants SET domain = ? WHERE slug = ?",
                    [(domains.get(slug), slug) for _, slug, _ in tenants],
                )
            con.executemany(
                "INSERT INTO users (id, tenant_id, fullname, username, username_key, password, roles, active)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [(u["id"].bytes, u["tenant_id"].bytes, u["fullname"], u["username"], u["key"],
                  u["password"], json.dumps(u["roles"], ensure_ascii=False), int(u["active"]))
                 for u in users.values()],
            )
            cols = ["id", "tenant_id", "created_at"] + [snake(f) for f in NOTE_TEXT + NOTE_TIME]
            con.executemany(
                f"INSERT INTO notes ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                [tuple(r[c].bytes if c in ("id", "tenant_id") else r[c] for c in cols) for r in notes],
            )
            con.executemany(
                "INSERT INTO officer_parks (user_id, tenant_id) VALUES (?, ?)",
                [(a.bytes, b.bytes) for a, b in grants],
            )
        con.execute("PRAGMA optimize")
    finally:
        con.close()

    names = {tid: name for tid, _, name in tenants}
    print(f"Otoparklar: {', '.join(n for _, _, n in tenants)}")
    print(f"Araç kaydı: {len(notes)}  (parkta: {sum(1 for n in notes if n['cikis_tarihi'] is None)})")
    print(f"Kullanıcı: {len(users)}")
    for u in users.values():
        extra = [names[t] for (uid, t) in grants if uid == u["id"]]
        print(f"  {u['username']:<14} {names[u['tenant_id']]:<22} {'/'.join(u['roles']):<28}"
              f"{' aktif' if u['active'] else ' PASİF'}{'  + ' + ', '.join(extra) if extra else ''}")
    if merged:
        print("Birleştirilen (aynı kişi sayılan) hesaplar:")
        for m in merged:
            print("  " + m)
    if skipped:
        print("Memur olmadığı için alınmayan: " + ", ".join(skipped))


if __name__ == "__main__":
    main()
