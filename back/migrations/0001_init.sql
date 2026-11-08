-- back/models/User.js karşılığı
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fullname TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    roles TEXT[] NOT NULL DEFAULT ARRAY['Çalışan'],
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Mongoose'daki `.collation({ locale: 'en', strength: 2 })` ile yapılan
-- case-insensitive essiz kullanıcı adı kontrolünün Postgres karşılığı.
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));

-- back/models/Note.js karşılığı
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    getiren TEXT NOT NULL,
    dorse TEXT NOT NULL,
    firma TEXT,
    mal TEXT,
    gumruk_bilgi TEXT,
    goturen TEXT,
    giris_yapan TEXT,
    gumruk_yapan TEXT,
    cikis_yapan TEXT,
    guncelleme_yapan TEXT,
    giris_tarihi BIGINT,
    gumruk_bilgi_tarihi BIGINT,
    cikis_tarihi BIGINT,
    guncelleme_tarihi BIGINT
);

-- notesController.getAllNotes (`cikisTarihi: {$exists:false}`) ve
-- raporController.rapor (`cikisTarihi: {$exists:true}`) sorgularının
-- her ikisi de bu sütuna bakıyor; index ekliyoruz.
CREATE INDEX notes_cikis_tarihi_idx ON notes (cikis_tarihi);
