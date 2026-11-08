#!/usr/bin/env python3
"""Postgres'teki verileri yeni SQLite veritabanına taşır (tek seferlik).

Kullanım (back/ klasöründen):

    1. Backend'i SQLite ile bir kez çalıştırıp durdurun: veritabanı dosyası
       ve şema (migrations/0001_init.sql) oluşur.
    2. python3 scripts/pg_to_sqlite.py [sqlite_dosyası]

    Varsayılan SQLite dosyası: data/akbaslar.db
    Postgres'e `PSQL` ortam değişkenindeki komutla bağlanılır; varsayılan:
        docker exec -i akbaslar_postgres psql -U akbaslar -d akbaslar

SQLite'taki MEVCUT tüm otopark/kullanıcı/araç kayıtları silinip Postgres'teki
verilerle değiştirilir (tek transaction: hata olursa hiçbir şey değişmez).
Postgres veritabanına sadece okuma yapılır.
"""

import json
import os
import shlex
import sqlite3
import subprocess
import sys
import uuid

PSQL = shlex.split(
    os.environ.get("PSQL", "docker exec -i akbaslar_postgres psql -U akbaslar -d akbaslar")
)


def pg_rows(select: str) -> list[dict]:
    """Bir SELECT'in sonucunu JSON olarak Postgres'ten okur."""
    sql = f"SELECT coalesce(json_agg(t), '[]') FROM ({select}) t"
    out = subprocess.run(
        PSQL + ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return json.loads(out)


def pg_has_table(name: str) -> bool:
    return pg_rows(f"SELECT to_regclass('{name}') IS NOT NULL AS ok")[0]["ok"]


def blob(u: str) -> bytes:
    """Postgres UUID metni -> sqlx'in SQLite'ta kullandığı 16 baytlık BLOB."""
    return uuid.UUID(u).bytes


def username_key(username: str) -> str:
    """Rust'taki models::user::username_key ile birebir aynı kural."""
    return "".join("i" if c in "Iİı" else c.lower() for c in username)


def main() -> None:
    db_path = sys.argv[1] if len(sys.argv) > 1 else "data/akbaslar.db"
    if not os.path.exists(db_path):
        sys.exit(f"{db_path} bulunamadı: önce backend'i SQLite ile bir kez çalıştırın.")

    tenants = pg_rows(
        "SELECT id, name, slug, address, active,"
        " (extract(epoch FROM created_at) * 1000)::bigint AS created_at FROM tenants"
    )
    users = pg_rows("SELECT id, tenant_id, fullname, username, password, roles, active FROM users")
    notes = pg_rows(
        "SELECT *, (extract(epoch FROM created_at) * 1000)::bigint AS created_ms FROM notes"
    )
    grants = pg_rows("SELECT user_id, tenant_id FROM officer_parks") if pg_has_table("officer_parks") else []

    # SQLite'ta eşsizlik `username_key` ile kontrol ediliyor; Postgres'in
    # `lower()`'ı Türkçe I/ı'yı ayırdığı için orada çakışmayan iki ad burada
    # çakışabilir. Yazmadan önce raporla.
    seen: dict[str, str] = {}
    for u in users:
        key = username_key(u["username"])
        if key in seen:
            sys.exit(f"Kullanıcı adı çakışması: '{seen[key]}' ve '{u['username']}'. Birini değiştirip tekrar deneyin.")
        seen[key] = u["username"]

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA foreign_keys = ON")
    try:
        with con:  # tek transaction
            for table in ("officer_parks", "notes", "users", "tenants"):
                con.execute(f"DELETE FROM {table}")

            con.executemany(
                "INSERT INTO tenants (id, name, slug, address, active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    (blob(t["id"]), t["name"], t["slug"], t["address"], int(t["active"]), t["created_at"])
                    for t in tenants
                ],
            )
            con.executemany(
                "INSERT INTO users (id, tenant_id, fullname, username, username_key, password, roles, active)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        blob(u["id"]),
                        blob(u["tenant_id"]),
                        u["fullname"],
                        u["username"],
                        username_key(u["username"]),
                        u["password"],
                        json.dumps(u["roles"], ensure_ascii=False),
                        int(u["active"]),
                    )
                    for u in users
                ],
            )
            note_cols = [
                "getiren", "dorse", "firma", "mal", "gumruk_bilgi", "goturen", "giris_yapan",
                "gumruk_yapan", "cikis_yapan", "guncelleme_yapan", "giris_tarihi",
                "gumruk_bilgi_tarihi", "cikis_tarihi", "guncelleme_tarihi",
            ]
            con.executemany(
                f"INSERT INTO notes (id, tenant_id, created_at, {', '.join(note_cols)})"
                f" VALUES ({', '.join('?' * (len(note_cols) + 3))})",
                [
                    (blob(n["id"]), blob(n["tenant_id"]), n["created_ms"], *(n[c] for c in note_cols))
                    for n in notes
                ],
            )
            con.executemany(
                "INSERT INTO officer_parks (user_id, tenant_id) VALUES (?, ?)",
                [(blob(g["user_id"]), blob(g["tenant_id"])) for g in grants],
            )
    finally:
        con.close()

    print(
        f"Taşındı: {len(tenants)} otopark, {len(users)} kullanıcı, "
        f"{len(notes)} araç kaydı, {len(grants)} memur izni -> {db_path}"
    )


if __name__ == "__main__":
    main()
