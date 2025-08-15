const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
const cron = require('node-cron');
require('dotenv').config();



const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+03:00'
}).promise();

console.log('✅ MySQL bağlantı havuzu oluşturuldu.');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token.' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Bu işlem için yönetici yetkisi gereklidir.' });
    }
    next();
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

if (!process.env.SENDGRID_API_KEY) {
    console.warn("⚠️ UYARI: SENDGRID_API_KEY .env dosyasında bulunamadı! E-posta özellikleri çalışmayacak.");
} else {
    console.log("✅ SendGrid API anahtarı bulundu.");
}

// ===================================
//         API ROTALARI
// ===================================

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password || password.length < 6) {
            return res.status(400).json({ message: 'Tüm alanlar zorunludur ve şifre en az 6 karakter olmalıdır.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, 'user']);
        res.status(201).json({ message: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
    } catch (err) {
        console.error("Kayıt hatası:", err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
        res.status(500).json({ message: 'Kayıt sırasında bir sunucu hatası oluştu.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) return res.status(401).json({ message: 'Kullanıcı bulunamadı veya şifre yanlış.' });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Kullanıcı bulunamadı veya şifre yanlış.' });
        const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (err) {
        console.error("Giriş hatası:", err);
        res.status(500).json({ message: 'Giriş sırasında bir sunucu hatası oluştu.' });
    }
});

// *** YENİ ENDPOINT: Admin kullanıcı bilgisi almak için ***
app.get('/api/admin-user', authenticateToken, async (req, res) => {
    try {
        const [admins] = await db.query('SELECT id, name FROM users WHERE role = "admin" LIMIT 1');
        if (admins.length === 0) {
            return res.status(404).json({ message: 'Admin kullanıcı bulunamadı.' });
        }
        res.json(admins[0]);
    } catch (err) {
        console.error("Admin kullanıcı alınamadı:", err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

app.post('/api/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'E-posta adresi gereklidir.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Bu e-posta adresiyle bir kullanıcı bulunamadı.' });
        }
        const user = users[0];

        const resetCode = crypto.randomInt(100000, 999999).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 10);
        
        await db.query(
            'UPDATE users SET sifre_sifirlama_kodu = ?, sifre_sifirlama_gecerlilik = ? WHERE id = ?', 
            [resetCode, expires, user.id]
        );

        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
             console.error("❌ SendGrid yapılandırması eksik. E-posta gönderilemedi.");
             console.log(`Geliştirme | Şifre sıfırlama kodu (${user.email}): ${resetCode}`);
             return res.status(200).json({ message: `[DEV] E-posta gönderimi kapalı. Kod konsola yazdırıldı.` });
        }
        
        const transporter = nodemailer.createTransport(sgTransport({ auth: { api_key: process.env.SENDGRID_API_KEY } }));
        const mailOptions = {
            to: user.email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Şifre Sıfırlama İsteği',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Merhaba ${user.name},</h2>
                    <p>Şifrenizi sıfırlama talebinizi aldık. Aşağıdaki 6 haneli kodu kullanarak yeni bir şifre belirleyebilirsiniz.</p>
                    <p>Bu kod <strong>10 dakika</strong> süreyle geçerlidir.</p>
                    <h3 style="letter-spacing: 5px; background-color: #f0f0f0; padding: 15px; border-radius: 5px;">${resetCode}</h3>
                    <p style="font-size: 12px; color: #888;">Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Şifre sıfırlama kodu e-postası gönderildi: ${user.email}`);
        res.status(200).json({ message: `Şifre sıfırlama kodu ${user.email} adresine başarıyla gönderildi.` });

    } catch (err) {
        console.error("❌ Şifre sıfırlama isteği hatası:", err);
        res.status(500).json({ message: 'İşlem sırasında bir sunucu hatası oluştu.' });
    }
});

app.post('/api/verify-and-reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: 'E-posta, güvenlik kodu ve yeni şifre alanları zorunludur.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Yeni şifreniz en az 6 karakter olmalıdır.' });
    }

    try {
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ? AND sifre_sifirlama_kodu = ? AND sifre_sifirlama_gecerlilik > NOW()',
            [email, code]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Güvenlik kodu geçersiz veya süresi dolmuş. Lütfen yeni bir kod isteyin.' });
        }
        const user = users[0];

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE users SET password = ?, sifre_sifirlama_kodu = NULL, sifre_sifirlama_gecerlilik = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );
        
        console.log(`✅ Şifre başarıyla güncellendi: ${user.email}`);
        res.status(200).json({ message: 'Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz.' });

    } catch (err) {
        console.error("❌ Şifre doğrulama ve sıfırlama hatası:", err);
        res.status(500).json({ message: 'Şifre güncellenirken bir sunucu hatası oluştu.' });
    }
});

app.get('/api/vehicles', async (req, res) => {
    try {
        const sql = `
            SELECT v.*, 
                   (SELECT photo_url FROM vehicle_photos WHERE vehicle_id = v.id ORDER BY id ASC LIMIT 1) as photo_url 
            FROM vehicles v ORDER BY created_at DESC
        `;
        const [vehicles] = await db.query(sql);
        res.json(vehicles);
    } catch (err) {
        console.error("Araçlar alınırken hata:", err);
        res.status(500).json({ message: 'Sunucu hatası: Araçlar alınamadı.' });
    }
});

app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const [vehicleResults] = await db.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
        if (vehicleResults.length === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
        
        const [photoResults] = await db.query('SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY id ASC', [req.params.id]);
        const vehicle = vehicleResults[0];
        vehicle.photos = photoResults;
        res.json(vehicle);
    } catch (err) {
        console.error("Araç detayı alınırken hata:", err);
        res.status(500).json({ message: 'Sunucu hatası: Araç detayı alınamadı.' });
    }
});

app.post('/api/vehicles', authenticateToken, requireAdmin, upload.array('photos', 10), async (req, res) => {
    const { brand, model, year, color, gear, fuel, mileage, purchase_price, sale_price, description } = req.body;
    if (!brand || !model || !year) {
        return res.status(400).json({ message: 'Marka, model ve yıl alanları zorunludur.' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const sql = `
            INSERT INTO vehicles (brand, model, year, color, gear, fuel, mileage, purchase_price, sale_price, description, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(sql, [
            brand, model, parseInt(year), color, gear, fuel, 
            parseInt(mileage) || 0, 
            parseFloat(purchase_price) || 0, 
            parseFloat(sale_price) || 0, 
            description,
            req.user.id
        ]);
        const vehicleId = result.insertId;
        if (req.files && req.files.length > 0) {
            const photoValues = req.files.map(file => [vehicleId, file.path.replace(/\\/g, "/")]);
            await connection.query('INSERT INTO vehicle_photos (vehicle_id, photo_url) VALUES ?', [photoValues]);
        }
        await connection.commit();
        res.status(201).json({ 
            message: 'Araç ve fotoğraflar başarıyla eklendi',
            vehicleId: vehicleId
        });
    } catch (err) {
        await connection.rollback();
        console.error("❌ ARAÇ EKLEME SIRASINDA HATA:", err);
        res.status(500).json({ 
            message: 'Araç eklenemedi, sunucu hatası.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        connection.release();
    }
});

app.put('/api/vehicles/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { brand, model, year, color, gear, fuel, mileage, purchase_price, sale_price, description } = req.body;
        const sql = `
            UPDATE vehicles SET 
                brand=?, model=?, year=?, color=?, gear=?, fuel=?, 
                mileage=?, purchase_price=?, sale_price=?, description=? 
            WHERE id=?
        `;
        const [result] = await db.query(sql, [
            brand, model, parseInt(year), color, gear, fuel,
            parseInt(mileage) || 0,
            parseFloat(purchase_price) || 0,
            parseFloat(sale_price) || 0,
            description,
            req.params.id
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Güncellenecek araç bulunamadı.' });
        }
        res.json({ message: 'Araç başarıyla güncellendi' });
    } catch (err) {
        console.error("Araç güncelleme hatası:", err);
        res.status(500).json({ message: 'Güncelleme sırasında bir hata oluştu.' });
    }
});

app.post('/api/vehicles/:id/add-photos', authenticateToken, requireAdmin, upload.array('photos', 10), async (req, res) => {
    try {
        const vehicleId = req.params.id;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Yüklenecek fotoğraf seçilmedi.' });
        }
        const photoValues = req.files.map(file => [vehicleId, file.path.replace(/\\/g, "/")]);
        await db.query('INSERT INTO vehicle_photos (vehicle_id, photo_url) VALUES ?', [photoValues]);
        res.status(201).json({ message: 'Fotoğraflar başarıyla eklendi.' });
    } catch (err) {
        console.error("FOTOĞRAF EKLEME HATASI:", err);
        res.status(500).json({ message: 'Fotoğraflar eklenirken bir hata oluştu.' });
    }
});

app.delete('/api/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
    const photoId = req.params.id;
    try {
        const [photoResults] = await db.query('SELECT photo_url FROM vehicle_photos WHERE id = ?', [photoId]);
        if (photoResults.length === 0) {
            return res.status(404).json({ message: 'Fotoğraf bulunamadı.' });
        }
        const photoPath = photoResults[0].photo_url;
        await db.query('DELETE FROM vehicle_photos WHERE id = ?', [photoId]);
        const fullPath = path.join(__dirname, photoPath);
        fs.unlink(fullPath, (err) => {
            if (err && err.code !== 'ENOENT') console.error('Dosya silme hatası:', err);
        });
        res.status(200).json({ message: 'Fotoğraf başarıyla silindi.' });
    } catch (err) {
        console.error("Fotoğraf silme hatası:", err);
        res.status(500).json({ message: 'Fotoğraf silinirken bir hata oluştu.' });
    }
});

app.delete('/api/vehicles/:id', authenticateToken, requireAdmin, async (req, res) => {
    const vehicleId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [photos] = await connection.query('SELECT photo_url FROM vehicle_photos WHERE vehicle_id = ?', [vehicleId]);
        await connection.query('DELETE FROM vehicle_photos WHERE vehicle_id = ?', [vehicleId]);
        await connection.query('DELETE FROM messages WHERE vehicle_id = ?', [vehicleId]);
        const [deleteResult] = await connection.query('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
        if (deleteResult.affectedRows === 0) throw new Error('Araç bulunamadı');
        photos.forEach(photo => {
            const fullPath = path.join(__dirname, photo.photo_url);
            fs.unlink(fullPath, (err) => {
                if (err && err.code !== 'ENOENT') console.error('Dosya silme hatası:', err);
            });
        });
        await connection.commit();
        res.json({ message: 'Araç ve ilgili tüm veriler başarıyla silindi' });
    } catch (err) {
        await connection.rollback();
        console.error("Araç silme hatası:", err);
        res.status(err.message === 'Araç bulunamadı' ? 404 : 500).json({ 
            message: err.message || 'Araç silinemedi' 
        });
    } finally {
        connection.release();
    }
});

app.get('/api/personnel', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [personnel] = await db.query('SELECT * FROM personnel ORDER BY ad ASC');
        res.json(personnel);
    } catch (err) {
        console.error("Personel listesi hatası:", err);
        res.status(500).json({ message: 'Personel listesi alınamadı.' });
    }
});

app.post('/api/personnel', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ad, soyad, tc_kimlik, telefon, dogum_tarihi, adres, pozisyon, maas, ise_baslama_tarihi } = req.body;
        const [existing] = await db.query('SELECT id FROM personnel WHERE tc_kimlik = ?', [tc_kimlik]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Bu TC Kimlik numarası zaten kayıtlı.' });
        }
        const sql = `INSERT INTO personnel (ad, soyad, tc_kimlik, telefon, dogum_tarihi, adres, pozisyon, maas, ise_baslama_tarihi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.query(sql, [ad, soyad, tc_kimlik, telefon, dogum_tarihi || null, adres, pozisyon, maas || null, ise_baslama_tarihi]);
        res.status(201).json({ message: 'Personel başarıyla eklendi' });
    } catch (err) {
        console.error("Personel ekleme hatası:", err);
        res.status(500).json({ message: 'Personel eklenemedi.' });
    }
});

app.put('/api/personnel/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { ad, soyad, tc_kimlik, telefon, dogum_tarihi, adres, pozisyon, maas, ise_baslama_tarihi } = req.body;
        const sql = `UPDATE personnel SET ad=?, soyad=?, tc_kimlik=?, telefon=?, dogum_tarihi=?, adres=?, pozisyon=?, maas=?, ise_baslama_tarihi=? WHERE id=?`;
        const [result] = await db.query(sql, [ad, soyad, tc_kimlik, telefon, dogum_tarihi || null, adres, pozisyon, maas || null, ise_baslama_tarihi, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Güncellenecek personel bulunamadı.' });
        }
        res.json({ message: 'Personel bilgileri güncellendi' });
    } catch (err) {
        console.error("Personel güncelleme hatası:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Bu TC Kimlik numarası başka bir personele ait.' });
        }
        res.status(500).json({ message: 'Güncelleme hatası.' });
    }
});

app.delete('/api/personnel/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM personnel WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Personel bulunamadı." });
        }
        res.json({ message: 'Personel başarıyla silindi' });
    } catch (err) {
        console.error("Personel silme hatası:", err);
        res.status(500).json({ message: 'Silme hatası.' });
    }
});

app.post('/api/kredi/hesapla', (req, res) => {
    try {
        const { krediTutari, vade, aylikFaizOrani } = req.body;
        if (!krediTutari || !vade || !aylikFaizOrani) {
            return res.status(400).json({ message: 'Lütfen tüm alanları doldurun.' });
        }
        const aylikAnaFaiz = parseFloat(aylikFaizOrani) / 100.0;
        const KKDF_ORANI = 0.15, BSMV_ORANI = 0.15;
        const aylikMaliyetOrani = aylikAnaFaiz * (1 + KKDF_ORANI + BSMV_ORANI);
        const aylikTaksit = (parseFloat(krediTutari) * aylikMaliyetOrani * Math.pow(1 + aylikMaliyetOrani, vade)) / (Math.pow(1 + aylikMaliyetOrani, vade) - 1);
        let kalanAnapara = parseFloat(krediTutari);
        const odemePlani = Array.from({ length: vade }, (_, i) => {
            const faizTutari = kalanAnapara * aylikAnaFaiz;
            const kkdfTutari = faizTutari * KKDF_ORANI;
            const bsmvTutari = faizTutari * BSMV_ORANI;
            let anaparaTutari = aylikTaksit - (faizTutari + kkdfTutari + bsmvTutari);
            kalanAnapara -= anaparaTutari;
            const tarih = new Date();
            tarih.setMonth(tarih.getMonth() + i + 1);
            return { 
                taksitNo: i + 1, tarih: tarih.toLocaleDateString('tr-TR'), taksitTutari: aylikTaksit, 
                anapara: anaparaTutari, faiz: faizTutari, kkdf: kkdfTutari, bsmv: bsmvTutari, 
                kalanAnapara: Math.max(0, kalanAnapara) 
            };
        });
        const alternatifTeklifler = [
            { bankaAdi: "Garanti BBVA", logoUrl: "/logos/garanti.png", yonlendirmeUrl: "https://www.garantibbva.com.tr/krediler/tasit-kredisi" },
            { bankaAdi: "Akbank", logoUrl: "/logos/akbank.png", yonlendirmeUrl: "https://www.akbank.com/basvuru/tasit-kredisi/" },
            { bankaAdi: "İş Bankası", logoUrl: "/logos/isbank.png", yonlendirmeUrl: "https://www.isbank.com.tr/tasit-kredisi" }
        ];
        res.status(200).json({ 
            krediTuru: "Taşıt Kredisi", krediTutari, vade, aylikTaksit, 
            toplamGeriOdeme: aylikTaksit * vade, odemePlani, alternatifTeklifler 
        });
    } catch (error) {
        console.error("Kredi hesaplama hatası:", error);
        res.status(500).json({ message: 'Kredi hesaplanırken bir hata oluştu.' });
    }
});

app.get('/api/notifications/unread-count', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(DISTINCT conversation_id) AS unreadCount 
            FROM messages 
            WHERE 
                is_read_by_admin = FALSE 
                AND receiver_id = ?;
        `;
        const [rows] = await db.query(sql, [req.user.id]);
        res.json({ unreadCount: rows[0].unreadCount || 0 });
    } catch (err) {
        console.error("Okunmamış bildirim sayısı alınamadı:", err);
        res.status(500).json({ message: "Bildirim sayısı alınırken hata oluştu." });
    }
});

// *** DÜZELTME: Conversations endpoint tamamen yeniden yazıldı ***

app.get('/api/user-conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role !== 'user') {
            return res.status(403).json({ message: 'Bu işlem sadece kullanıcılar içindir.' });
        }

        const sql = `
            SELECT DISTINCT
                m.conversation_id,
                m.message,
                m.created_at,
                m.vehicle_id,
                v.brand,
                v.model,
                admin.name as admin_name,
                (SELECT COUNT(*) FROM messages m2
                 WHERE m2.conversation_id = m.conversation_id
                   AND m2.receiver_id = ?
                   AND m2.is_read_by_user = FALSE) as unread_count
            FROM messages m
                     INNER JOIN (
                SELECT conversation_id, MAX(created_at) as latest_time
                FROM messages
                GROUP BY conversation_id
            ) latest ON m.conversation_id = latest.conversation_id
                AND m.created_at = latest.latest_time
                     LEFT JOIN vehicles v ON m.vehicle_id = v.id
                     LEFT JOIN users admin ON admin.id = CAST(
                    SUBSTRING_INDEX(m.conversation_id, '_admin_', -1) AS UNSIGNED
                                                         )
            WHERE
                m.conversation_id LIKE CONCAT('user_', ?, '_%')
              AND admin.role = 'admin'
            ORDER BY m.created_at DESC
        `;

        const [conversations] = await db.query(sql, [userId, userId]);
        res.json(conversations);

    } catch (err) {
        console.error("Kullanıcı konuşmaları alınamadı:", err);
        res.status(500).json({ message: "Sunucuda bir hata oluştu." });
    }
});

app.get('/api/user-notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(403).json({ message: 'Bu işlem sadece kullanıcılar içindir.' });
        }

        const sql = `
            SELECT COUNT(DISTINCT conversation_id) AS unreadCount 
            FROM messages 
            WHERE 
                receiver_id = ? 
                AND is_read_by_user = FALSE;
        `;

        const [rows] = await db.query(sql, [req.user.id]);
        res.json({ unreadCount: rows[0].unreadCount || 0 });

    } catch (err) {
        console.error("Kullanıcı okunmamış bildirim sayısı alınamadı:", err);
        res.status(500).json({ message: "Bildirim sayısı alınırken hata oluştu." });
    }
});

// 3. KULLANICI SOHBET SİLME (sadece bir kere)
app.delete('/api/user/conversations/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // GÜVENLİK KONTROLÜ
        const userIdMatch = conversationId.match(/user_(\d+)_/);
        const userIdFromConv = userIdMatch ? parseInt(userIdMatch[1]) : null;

        if (req.user.role !== 'user' || userId !== userIdFromConv) {
            return res.status(403).json({ message: 'Bu sohbeti silme yetkiniz yok.' });
        }

        const [deleteResult] = await db.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Silinecek sohbet bulunamadı.' });
        }

        io.to(conversationId).emit('conversation_deleted', conversationId);
        io.emit('admin_refresh_conversations');

        res.status(200).json({ message: 'Sohbet başarıyla silindi.' });

    } catch (err) {
        console.error("Kullanıcı sohbeti silinirken hata:", err);
        res.status(500).json({ message: 'Sohbet silinirken bir sunucu hatası oluştu.' });
    }
});

// server.js'de mevcut duplike endpoint'leri temizleyin ve bu kodu ekleyin:

// KULLANICI SOHBET SİLME ENDPOINT'İ (sadece bir tane olmalı)
app.delete('/api/user/conversations/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // GÜVENLİK KONTROLÜ: Kullanıcı sadece kendi ID'sini içeren sohbeti silebilir
        const userIdMatch = conversationId.match(/user_(\d+)_/);
        const userIdFromConv = userIdMatch ? parseInt(userIdMatch[1]) : null;

        if (req.user.role !== 'user' || userId !== userIdFromConv) {
            return res.status(403).json({ message: 'Bu sohbeti silme yetkiniz yok.' });
        }

        // Veritabanından sil
        const [deleteResult] = await db.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Silinecek sohbet bulunamadı.' });
        }

        // Socket ile diğer taraflara bildir
        io.to(conversationId).emit('conversation_deleted', conversationId);
        io.emit('admin_refresh_conversations');

        res.status(200).json({ message: 'Sohbet başarıyla silindi.' });

    } catch (err) {
        console.error("Kullanıcı sohbeti silinirken hata:", err);
        res.status(500).json({ message: 'Sohbet silinirken bir sunucu hatası oluştu.' });
    }
});
// *** YENİ ENDPOINT: Kullanıcının okunmamış mesaj sayısını getir ***




app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    const { id: messageId } = req.params;
    const { id: userId, role } = req.user;
    try {
        const [msgResults] = await db.query('SELECT sender_id, conversation_id FROM messages WHERE id = ?', [messageId]);
        if (msgResults.length === 0) return res.status(404).json({ message: 'Mesaj bulunamadı.' });
        if (msgResults[0].sender_id !== userId && role !== 'admin') return res.status(403).json({ message: 'Bu mesajı silme yetkiniz yok.' });
        await db.query('DELETE FROM messages WHERE id = ?', [messageId]);
        io.to(msgResults[0].conversation_id).emit('message_deleted', { messageId: parseInt(messageId) });
        io.emit('admin_refresh_conversations');
        res.status(200).json({ message: 'Mesaj başarıyla silindi.' });
    } catch (err) { 
        console.error("Mesaj silme hatası:", err);
        res.status(500).json({ message: 'Mesaj silinirken bir hata oluştu.' }); 
    }
});

app.delete('/api/conversations/:conversationId', authenticateToken, requireAdmin, async (req, res) => {
    const { conversationId } = req.params;
    try {
        const [deleteResult] = await db.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
        if (deleteResult.affectedRows > 0) {
            io.to(conversationId).emit('conversation_deleted', conversationId);
            io.emit('admin_refresh_conversations');
            res.status(200).json({ message: 'Sohbet başarıyla silindi.' });
        } else {
            res.status(404).json({ message: 'Sohbet bulunamadı.' });
        }
    } catch (err) { 
        console.error("Konuşma silme hatası:", err);
        res.status(500).json({ message: 'Sohbet silinirken bir hata oluştu.' }); 
    }
});



// Socket.IO bölümünün düzeltilmiş versiyonu

io.on('connection', (socket) => {
    console.log('👤 Yeni socket bağlantısı:', socket.id);

    socket.on('join_room', (data) => {
        const { conversationId, token } = data;

        if (!conversationId || !token) {
            return console.error("❌ Odaya katılma isteği eksik bilgi içeriyor.");
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
            if (err) {
                return console.error(`❌ Geçersiz token ile odaya katılma denemesi. Socket ID: ${socket.id}`);
            }

            const currentUserId = decodedUser.id;
            const currentUserRole = decodedUser.role;

            // *** DÜZELTME: YENİ Conversation ID format kontrolü (sadece _ kullanıyor) ***
            const userIdMatch = conversationId.match(/user_(\d+)_/);
            const adminIdMatch = conversationId.match(/admin_(\d+)$/);

            const userIdFromRoom = userIdMatch ? parseInt(userIdMatch[1]) : null;
            const adminIdFromRoom = adminIdMatch ? parseInt(adminIdMatch[1]) : null;

            let hasAccess = false;

            // *** SIKI GÜVENLİK KONTROLÜ ***
            if (currentUserRole === 'admin' && currentUserId === adminIdFromRoom) {
                hasAccess = true;
                console.log(`✅ Admin ${currentUserId} kendi conversation'ına erişiyor: ${conversationId}`);
            } else if (currentUserRole === 'user' && currentUserId === userIdFromRoom) {
                hasAccess = true;
                console.log(`✅ User ${currentUserId} kendi conversation'ına erişiyor: ${conversationId}`);
            } else {
                // GÜVENLİK İHLALİ LOGLAMA
                console.error(`🚨 GÜVENLİK İHLALİ ENGELLENDI:`);
                console.error(`🚨 Kullanıcı: ${currentUserId} (${currentUserRole})`);
                console.error(`🚨 Erişmeye çalıştığı: ${conversationId}`);
                console.error(`🚨 User ID from room: ${userIdFromRoom}`);
                console.error(`🚨 Admin ID from room: ${adminIdFromRoom}`);
                return; // Erişimi reddet
            }

            if (hasAccess) {
                console.log(`🏠 Socket ${socket.id}, DOĞRULANMIŞ kullanıcı ${currentUserId} (${currentUserRole}) ile odaya katıldı: ${conversationId}`);
                socket.join(conversationId);

                // Socket'e kullanıcı bilgisini kaydet
                socket.userId = currentUserId;
                socket.userRole = currentUserRole;
                socket.conversationId = conversationId;

                // *** DÜZELTME: Sadece bu conversation'a ait mesajları getir ***
                const sql = `
                    SELECT m.*, sender.name as sender_name 
                    FROM messages m 
                    JOIN users sender ON m.sender_id = sender.id 
                    WHERE m.conversation_id = ? 
                    ORDER BY m.created_at ASC
                `;
                db.query(sql, [conversationId])
                    .then(([messages]) => {
                        console.log(`📨 ${messages.length} geçmiş mesaj gönderiliyor: ${conversationId}`);
                        socket.emit('load_messages', messages);
                    })
                    .catch(dbErr => console.error("Geçmiş mesajlar alınamadı:", dbErr));
            }
        });
    });

    socket.on('leave_room', (roomId) => {
        console.log(`🚪 Socket ${socket.id} ${roomId} odasından ayrıldı`);
        socket.leave(roomId);
        if (socket.conversationId === roomId) {
            socket.conversationId = null;
        }
    });

    socket.on('send_message', async (data) => {
        const { conversation_id, sender_id, receiver_id, vehicle_id, message } = data;

        if (!conversation_id || !sender_id || !receiver_id || !message) {
            console.error("❌ Eksik mesaj verisi:", data);
            return;
        }

        // *** GÜVENLİK: Mesaj gönderen kişi socket ile aynı mı? ***
        if (socket.userId !== sender_id) {
            console.error(`🚨 GÜVENLİK İHLALİ: Socket user ${socket.userId} başkası adına (${sender_id}) mesaj göndermeye çalıştı!`);
            return;
        }

        // *** GÜVENLİK: Bu conversation'da bu kullanıcı var mı? ***
        const userIdMatch = conversation_id.match(/user_(\d+)_/);
        const adminIdMatch = conversation_id.match(/admin_(\d+)$/);

        const userIdFromConv = userIdMatch ? parseInt(userIdMatch[1]) : null;
        const adminIdFromConv = adminIdMatch ? parseInt(adminIdMatch[1]) : null;

        if (socket.userRole === 'user' && socket.userId !== userIdFromConv) {
            console.error(`🚨 GÜVENLİK: User ${socket.userId} başkasının conversation'ına mesaj göndermeye çalıştı!`);
            return;
        }

        if (socket.userRole === 'admin' && socket.userId !== adminIdFromConv) {
            console.error(`🚨 GÜVENLİK: Admin ${socket.userId} başkasının conversation'ına mesaj göndermeye çalıştı!`);
            return;
        }

        try {
            const [senderResult] = await db.query('SELECT name, role FROM users WHERE id = ?', [sender_id]);
            if(senderResult.length === 0) {
                console.error("❌ Gönderici bulunamadı:", sender_id);
                return;
            }
            const sender = senderResult[0];

            // *** MESAJ VERİTABANINA KAYDET ***
            const sql = "INSERT INTO messages (conversation_id, sender_id, receiver_id, vehicle_id, message, created_at, is_read_by_admin, is_read_by_user) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)";

            // Admin gönderiyorsa admin tarafı okundu, user gönderiyorsa user tarafı okundu
            const isReadByAdmin = sender.role === 'admin' ? true : false;
            const isReadByUser = sender.role === 'user' ? true : false;

            const [result] = await db.query(sql, [conversation_id, sender_id, receiver_id, vehicle_id, message, isReadByAdmin, isReadByUser]);

            const newMessage = {
                id: result.insertId,
                conversation_id,
                sender_id,
                receiver_id,
                vehicle_id,
                message,
                sender_name: sender.name,
                created_at: new Date().toISOString()
            };

            // *** SADECE İLGİLİ ODAYA MESAJ GÖNDER ***
            console.log(`📤 Mesaj odaya gönderiliyor: ${conversation_id}`);
            io.to(conversation_id).emit('receive_message', newMessage);

            // *** BİLDİRİM SİSTEMİ ***
            if (sender.role === 'user') {
                // User mesaj gönderiyorsa admin'e bildirim gönder
                console.log(`📨 User ${sender_id} mesaj gönderdi, admin ${receiver_id}'e bildirim gönderiliyor`);

                const adminSockets = Array.from(io.sockets.sockets.values())
                    .filter(s => s.userRole === 'admin' && s.userId === receiver_id);

                console.log(`🎯 ${adminSockets.length} admin socket bulundu`);

                adminSockets.forEach(adminSocket => {
                    adminSocket.emit('admin_new_unread_message', {
                        conversationId: conversation_id,
                        message: newMessage
                    });
                });

                // Tüm admin'lere konuşma listesi yenileme sinyali gönder
                io.emit('admin_refresh_conversations');

            } else if (sender.role === 'admin') {
                // Admin mesaj gönderiyorsa user'a bildirim gönder
                console.log(`📨 Admin ${sender_id} mesaj gönderdi, user ${receiver_id}'e bildirim gönderiliyor`);

                const userSockets = Array.from(io.sockets.sockets.values())
                    .filter(s => s.userRole === 'user' && s.userId === receiver_id);

                console.log(`🎯 ${userSockets.length} user socket bulundu`);

                userSockets.forEach(userSocket => {
                    userSocket.emit('update_notification_count');
                });
            }
        } catch (err) {
            console.error("❌ Mesaj veritabanına kaydedilemedi:", err);
        }
    });

    // Admin bildirim temizleme
    socket.on('admin_cleared_notifications', async (data) => {
        const { adminId, conversationId } = data;
        if (!adminId) return;

        // Güvenlik: Sadece kendi bildirimlerini temizleyebilir
        if (socket.userId !== adminId || socket.userRole !== 'admin') {
            console.error(`🚨 GÜVENLİK: Socket user ${socket.userId} başkasının bildirimlerini temizlemeye çalıştı!`);
            return;
        }

        try {
            let updateQuery, updateParams;

            if (conversationId) {
                updateQuery = 'UPDATE messages SET is_read_by_admin = TRUE WHERE receiver_id = ? AND conversation_id = ? AND is_read_by_admin = FALSE';
                updateParams = [adminId, conversationId];
            } else {
                updateQuery = 'UPDATE messages SET is_read_by_admin = TRUE WHERE receiver_id = ? AND is_read_by_admin = FALSE';
                updateParams = [adminId];
            }

            await db.query(updateQuery, updateParams);

            socket.emit('notifications_were_reset');
            console.log(`📭 Admin ${adminId} bildirimleri temizledi. ConversationId: ${conversationId || 'Tümü'}`);
        } catch (err) {
            console.error("Admin bildirim temizleme hatası:", err);
        }
    });

    // User bildirim temizleme
    socket.on('user_cleared_notifications', async (data) => {
        const { userId, conversationId } = data;
        if (!userId) return;

        // Güvenlik: Sadece kendi bildirimlerini temizleyebilir
        if (socket.userId !== userId || socket.userRole !== 'user') {
            console.error(`🚨 GÜVENLİK: Socket user ${socket.userId} başkasının bildirimlerini temizlemeye çalıştı!`);
            return;
        }

        try {
            let updateQuery, updateParams;

            if (conversationId) {
                updateQuery = 'UPDATE messages SET is_read_by_user = TRUE WHERE receiver_id = ? AND conversation_id = ? AND is_read_by_user = FALSE';
                updateParams = [userId, conversationId];
            } else {
                updateQuery = 'UPDATE messages SET is_read_by_user = TRUE WHERE receiver_id = ? AND is_read_by_user = FALSE';
                updateParams = [userId];
            }

            await db.query(updateQuery, updateParams);

            socket.emit('user_notifications_were_reset');
            console.log(`📭 User ${userId} bildirimleri temizledi. ConversationId: ${conversationId || 'Tümü'}`);
        } catch (err) {
            console.error("User bildirim temizleme hatası:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket bağlantısı kesildi:', socket.id);
    });
});

// *** DÜZELTME: API Endpoints - Duplicate endpoint'i kaldır ***

// SADECE BU ENDPOINT KALSIN (user-conversations için)


// *** DÜZELTME: Admin conversations endpoint ***
app.get('/api/conversations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const adminId = req.user.id;

        const sql = `
            SELECT DISTINCT
                m.conversation_id,
                m.message,
                m.created_at,
                m.vehicle_id,
                v.brand,
                v.model,
                CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(m.conversation_id, 'user_', -1), '_', 1) AS UNSIGNED) as user_id,
                u.name as user_name,
                (SELECT COUNT(*) FROM messages m2
                 WHERE m2.conversation_id = m.conversation_id
                   AND m2.receiver_id = ?
                   AND m2.is_read_by_admin = FALSE) as unread_count
            FROM messages m
                     INNER JOIN (
                SELECT conversation_id, MAX(created_at) as latest_time
                FROM messages
                GROUP BY conversation_id
            ) latest ON m.conversation_id = latest.conversation_id AND m.created_at = latest.latest_time
                     LEFT JOIN vehicles v ON m.vehicle_id = v.id
                     LEFT JOIN users u ON u.id = CAST(
                    SUBSTRING_INDEX(SUBSTRING_INDEX(m.conversation_id, 'user_', -1), '_', 1) AS UNSIGNED
                                                 )
            WHERE
                m.conversation_id LIKE CONCAT('%_admin_', ?, '%')
              AND u.role = 'user'
            ORDER BY m.created_at DESC
        `;

        const [conversations] = await db.query(sql, [adminId, adminId]);
        res.json(conversations);

    } catch (err) {
        console.error("Konuşmalar alınamadı:", err);
        res.status(500).json({ message: "Sunucuda bir hata oluştu, konuşmalar alınamadı." });
    }
});
const cleanupOldMessages = async () => {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const [result] = await db.query("DELETE FROM messages WHERE created_at < ?", [threeDaysAgo]);
        
        if (result.affectedRows > 0) {
            console.log(`✅ ${result.affectedRows} adet eski mesaj başarıyla silindi.`);
            io.emit('admin_refresh_conversations');
        }
    } catch (error) { 
        console.error("❌ Otomatik mesaj temizleme sırasında hata oluştu:", error); 
    }
};

cron.schedule('0 0 * * *', cleanupOldMessages, { 
    timezone: "Europe/Istanbul" 
});
console.log('⏰ Otomatik mesaj temizleme görevi, her gün gece yarısı 3 günden eski mesajları silecek şekilde ayarlandı.');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor.`);
    cleanupOldMessages();
}); 