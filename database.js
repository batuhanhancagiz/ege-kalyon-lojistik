const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setupDb() {
    const db = await open({
        filename: './ege_kalyon.db',
        driver: sqlite3.Database
    });

    await db.exec(`CREATE TABLE IF NOT EXISTS kullanicilar (id INTEGER PRIMARY KEY AUTOINCREMENT, firma_adi TEXT, email TEXT UNIQUE, sifre TEXT)`);

    // Araçlar: Plaka, Ruhsat, Marka
    await db.exec(`CREATE TABLE IF NOT EXISTS araclar (
        id INTEGER PRIMARY KEY AUTOINCREMENT, kullanici_id INTEGER, 
        plaka TEXT, ruhsat_no TEXT, marka_model TEXT
    )`);

    // Şoförler: Ad Soyad, GSM, TC
    await db.exec(`CREATE TABLE IF NOT EXISTS soforler (
        id INTEGER PRIMARY KEY AUTOINCREMENT, kullanici_id INTEGER, 
        ad_soyad TEXT, gsm TEXT, tc_no TEXT
    )`);

    // İşler: "durum" sütunu eklendi (1: Aktif, 0: Tamamlandı)
    await db.exec(`CREATE TABLE IF NOT EXISTS isler (
        id INTEGER PRIMARY KEY AUTOINCREMENT, kullanici_id INTEGER,
        tarih TEXT, sira TEXT, ihr_ith TEXT, saat TEXT, musteri TEXT, firma TEXT,
        booking_acente TEXT, acenta TEXT, ebat TEXT, kont_getir TEXT, sofor_ad_soyad TEXT,
        kont_gotur TEXT, konteyner_no TEXT, muhur_no TEXT, alim_yeri TEXT,
        yukleme_bosaltma_yeri TEXT, teslim_yeri TEXT, kontrol TEXT, mail TEXT,
        bizim_fatura TEXT, transit TEXT, fiyat REAL, kantar REAL, bekleme_hakki INTEGER,
        aciklama TEXT, plaka TEXT, durum INTEGER DEFAULT 1 
    )`);

    return db;
}
module.exports = setupDb;