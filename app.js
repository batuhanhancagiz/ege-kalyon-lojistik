const express = require('express');
const session = require('express-session');
const app = express();
const setupDb = require('./database');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'ege-kalyon-ozel-anahtar',
    resave: false,
    saveUninitialized: true
}));

// --- GİRİŞ VE KAYIT YOLLARI ---

app.get('/', (req, res) => res.render('index'));
app.get('/giris', (req, res) => res.render('giris'));

app.get('/gizli-firma-ekle', (req, res) => {
    res.send(`
        <div style="background:#000; color:#fff; padding:50px; font-family:sans-serif; min-height:100vh; display:flex; justify-content:center; align-items:center;">
            <form action="/kayit" method="POST" style="background:#111; padding:30px; border-radius:20px; border:1px solid #333; width:300px;">
                <h2 style="color:#0071e3; margin-bottom:20px;">Yeni Firma Tanımla</h2>
                <input name="firma_adi" placeholder="Firma Adı" required style="width:100%; padding:10px; margin-bottom:10px; background:#000; border:1px solid #222; color:#fff;">
                <input name="email" placeholder="Email" required style="width:100%; padding:10px; margin-bottom:10px; background:#000; border:1px solid #222; color:#fff;">
                <input name="sifre" type="password" placeholder="Şifre" required style="width:100%; padding:10px; margin-bottom:20px; background:#000; border:1px solid #222; color:#fff;">
                <button type="submit" style="width:100%; padding:12px; background:#0071e3; color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Kaydet</button>
            </form>
        </div>
    `);
});

app.post('/kayit', async (req, res) => {
    const { firma_adi, email, sifre } = req.body;
    const db = await setupDb();
    await db.run('INSERT INTO kullanicilar (firma_adi, email, sifre) VALUES (?,?,?)', [firma_adi, email, sifre]);
    res.redirect('/giris');
});

app.post('/giris', async (req, res) => {
    const { email, sifre } = req.body;
    const db = await setupDb();
    const user = await db.get('SELECT * FROM kullanicilar WHERE email = ? AND sifre = ?', [email, sifre]);
    if (user) {
        req.session.userId = user.id;
        req.session.firmaAdi = user.firma_adi;
        res.redirect('/admin');
    } else { res.send('Hatalı giriş!'); }
});

// --- ADMIN PANELİ (KUTULAR) ---

app.get('/admin', async (req, res) => {
    if (!req.session.userId) return res.redirect('/giris');
    const db = await setupDb();
    // Sadece AKTİF (durum=1) işleri sayıyoruz ve çekiyoruz
    const isler = await db.all('SELECT * FROM isler WHERE kullanici_id = ? AND durum = 1', [req.session.userId]);
    const araclar = await db.all('SELECT * FROM araclar WHERE kullanici_id = ?', [req.session.userId]);
    const soforler = await db.all('SELECT * FROM soforler WHERE kullanici_id = ?', [req.session.userId]);
    res.render('admin', { isler, araclar, soforler, firma: req.session.firmaAdi });
});

// --- ÇİZELGE SAYFASI (DETAYLI TABLO) ---

app.get('/cizelge', async (req, res) => {
    if (!req.session.userId) return res.redirect('/giris');
    const db = await setupDb();
    // Çizelgede tüm işleri (hem batan hem çıkan) görebilmek için durum filtresini kaldırdım
    const isler = await db.all('SELECT * FROM isler WHERE kullanici_id = ? ORDER BY id DESC', [req.session.userId]);
    const araclar = await db.all('SELECT * FROM araclar WHERE kullanici_id = ?', [req.session.userId]);
    const soforler = await db.all('SELECT * FROM soforler WHERE kullanici_id = ?', [req.session.userId]);
    res.render('cizelge', { isler, araclar, soforler });
});

// --- ARAÇ VE ŞOFÖR İŞLEMLERİ ---
app.post('/arac-ekle', async (req, res) => {
    const { plaka, ruhsat_no, marka_model } = req.body;
    const db = await setupDb();
    await db.run('INSERT INTO araclar (kullanici_id, plaka, ruhsat_no, marka_model) VALUES (?,?,?,?)', 
    [req.session.userId, plaka.toUpperCase(), ruhsat_no, marka_model]);
    res.redirect('/admin');
});

app.post('/arac-sil/:id', async (req, res) => {
    const db = await setupDb();
    await db.run('DELETE FROM araclar WHERE id = ? AND kullanici_id = ?', [req.params.id, req.session.userId]);
    res.redirect('/admin');
});

app.post('/sofor-ekle', async (req, res) => {
    const { ad_soyad, gsm, tc_no } = req.body;
    const db = await setupDb();
    await db.run('INSERT INTO soforler (kullanici_id, ad_soyad, gsm, tc_no) VALUES (?,?,?,?)', 
    [req.session.userId, ad_soyad, gsm, tc_no]);
    res.redirect('/admin');
});

app.post('/sofor-sil/:id', async (req, res) => {
    const db = await setupDb();
    await db.run('DELETE FROM soforler WHERE id = ? AND kullanici_id = ?', [req.params.id, req.session.userId]);
    res.redirect('/admin');
});

// --- İŞ EKLEME (YENİ SÜTUNLAR VE DURUM) ---
app.post('/is-ekle', async (req, res) => {
    const db = await setupDb();
    const d = req.body;
    // Formdan gelen durum (1 veya 0) değerini alıyoruz
    const durum = parseInt(d.durum);

    await db.run(`INSERT INTO isler (
        kullanici_id, tarih, sofor_ad_soyad, plaka, musteri, firma, 
        alim_yeri, yukleme_bosaltma_yeri, teslim_yeri, konteyner_no, 
        fiyat, durum
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, 
    [
        req.session.userId, d.tarih, d.sofor_ad_soyad, d.plaka, d.musteri, d.firma,
        d.alim_yeri, d.yukleme_bosaltma_yeri, d.teslim_yeri, d.konteyner_no,
        d.fiyat, durum
    ]);
    res.redirect('/cizelge');
});

// --- İŞ BİTİRME ---
app.post('/is-bitir/:id', async (req, res) => {
    const db = await setupDb();
    await db.run('UPDATE isler SET durum = 0 WHERE id = ? AND kullanici_id = ?', [req.params.id, req.session.userId]);
    res.redirect('/cizelge');
});

app.get('/cikis', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => console.log("Ege Kalyon V1 yayında: http://localhost:3000"));