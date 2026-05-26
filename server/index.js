const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
const cron = require('node-cron');
const {
    connectRedis,
    pingRedis,
    isRedisConfigured,
    isRedisReady,
    getCache,
    setCache,
    invalidateVehiclesCache,
    CACHE_KEYS,
} = require('./lib/redis');
const { pool: db } = require('./lib/db');
const {
    ensureHiddenInboxTable,
    hideConversationForUser,
    unhideConversationForUser,
    HIDDEN_INBOX_SQL,
} = require('./lib/inbox');
const { ensureMessagesSchema, ADMIN_CONV_REGEXP, adminConversationFilterSql } = require('./lib/messagesSchema');
const {
    normalizeVehicleRow,
    normalizeVehiclesList,
    migratePhotoUrlsInDb,
} = require('./lib/uploadPaths');
const {
    ensurePhotoStorage,
    useCloudinary,
    createMulterStorage,
    saveUploadedPhotos,
    removeStoredPhoto,
} = require('./lib/photoStorage');
const {
    connectRabbitMQ,
    pingRabbitMQ,
    isRabbitConfigured,
    publishMessage,
} = require('./lib/rabbitmq');
const { initSocketBridge, subscribeSocketDispatch } = require('./lib/socketBridge');
const { processIncomingMessage } = require('./lib/messageProcessor');
const { emitMessageProcessed } = require('./lib/socketEmit');
require('dotenv').config();



const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

const applySocketAuth = (socket, token) => {
    if (!token) return false;
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = user.id;
        socket.userRole = user.role;
        return true;
    } catch {
        return false;
    }
};

// Socket bağlantısında JWT ile kullanıcı kimliği (mesaj/bildirim için)
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
        applySocketAuth(socket, token);
    }
    next();
});

app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

console.log('✅ MySQL bağlantı havuzu oluşturuldu.');

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        const redisConfigured = isRedisConfigured();
        const redisConnected = redisConfigured ? await pingRedis() : null;
        const rabbitConfigured = isRabbitConfigured();
        const rabbitConnected = rabbitConfigured ? await pingRabbitMQ() : null;
        res.json({
            status: 'ok',
            database: 'connected',
            photoStorage: useCloudinary() ? 'cloudinary' : 'local',
            redis: redisConfigured
                ? redisConnected
                    ? 'connected'
                    : 'disconnected'
                : 'disabled',
            rabbitmq: rabbitConfigured
                ? rabbitConnected
                    ? 'connected'
                    : 'disconnected'
                : 'disabled',
            queue: process.env.RABBITMQ_URL ? 'galerio.messages' : null,
            uptime: process.uptime(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            message: err.message,
        });
    }
});

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

ensurePhotoStorage();

const MAX_PHOTOS_PER_VEHICLE = 10;

const upload = multer({ 
    storage: createMulterStorage(uploadsDir, multer),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
        }
    },
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: MAX_PHOTOS_PER_VEHICLE,
    },
});

const runUpload = (uploadMiddleware) => (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    message: 'Bir fotoğraf çok büyük (en fazla 8MB). Daha küçük fotoğraf seçin.',
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    message: `Tek istekte en fazla ${MAX_PHOTOS_PER_VEHICLE} fotoğraf gönderilebilir.`,
                });
            }
            return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message || 'Dosya yüklenemedi.' });
    });
};

// E-posta transporter - Render Free tier için sadece SendGrid Web API (HTTPS) kullanılabilir, klasik SMTP (Gmail) portları engellidir.
const sendgridTransport = require('nodemailer-sendgrid-transport');

let emailTransporter = null;
if (process.env.SENDGRID_API_KEY) {
    emailTransporter = nodemailer.createTransport(sendgridTransport({
        auth: {
            api_key: process.env.SENDGRID_API_KEY
        }
    }));
    console.log('✅ SendGrid Web API e-posta servisi yapılandırıldı.');
} else {
    console.warn('⚠️ UYARI: SENDGRID_API_KEY bulunamadı! Render üzerinde SMTP engelli olduğu için e-posta özellikleri çalışmayabilir.');
    console.warn('📧 Şifre sıfırlama kodları sadece konsola yazdırılacak.');
}

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
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET tanımlı değil (Render Environment Variables).');
            return res.status(503).json({ message: 'Sunucu yapılandırması eksik (JWT_SECRET).' });
        }
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'E-posta ve şifre zorunludur.' });
        }
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) return res.status(401).json({ message: 'Kullanıcı bulunamadı veya şifre yanlış.' });
        const user = results[0];
        if (!user.password || typeof user.password !== 'string') {
            console.error('Geçersiz şifre hash:', email);
            return res.status(401).json({ message: 'Kullanıcı bulunamadı veya şifre yanlış.' });
        }
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (bcryptErr) {
            console.error('bcrypt hatası:', email, bcryptErr.message);
            return res.status(401).json({ message: 'Kullanıcı bulunamadı veya şifre yanlış.' });
        }
        if (!isMatch) return res.status(401).json({ message: 'Kullanıcı bulunamadı veya şifre yanlış.' });
        const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (err) {
        console.error("Giriş hatası:", err);
        res.status(500).json({
            message: 'Giriş sırasında bir sunucu hatası oluştu.',
            hint: err.code || err.message,
        });
    }
});

app.get('/api/admin-user', authenticateToken, async (req, res) => {
    try {
        const [admins] = await db.query(
            "SELECT id, name FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
        );
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
        
        await db.query(
            'UPDATE users SET sifre_sifirlama_kodu = ?, sifre_sifirlama_gecerlilik = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?', 
            [resetCode, user.id]
        );

        if (!emailTransporter) {
             console.warn(`⚠️ E-posta servisi yapılandırılmamış. Kod konsola yazdırılıyor.`);
             console.log(`📧 Şifre sıfırlama kodu (${user.email}): ${resetCode}`);
             return res.status(200).json({ message: `Şifre sıfırlama kodu gönderildi. (Demo mod: kod konsolda görüntülenir)` });
        }
        
        const mailOptions = {
            to: user.email,
            from: process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER || 'noreply@galerio.com',
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

        await emailTransporter.sendMail(mailOptions);
        
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
        const cacheKey = CACHE_KEYS.vehiclesList;
        const cached = await getCache(cacheKey);
        if (cached) {
            res.set('X-Cache', 'HIT');
            return res.json(normalizeVehiclesList(cached));
        }

        const sql = `
            SELECT v.*, 
                   (SELECT photo_url FROM vehicle_photos WHERE vehicle_id = v.id ORDER BY id ASC LIMIT 1) as photo_url 
            FROM vehicles v ORDER BY created_at DESC
        `;
        const [vehicles] = await db.query(sql);
        const normalized = normalizeVehiclesList(vehicles);
        await setCache(cacheKey, normalized);
        res.set('X-Cache', isRedisReady() ? 'MISS' : 'BYPASS');
        res.json(normalized);
    } catch (err) {
        console.error("Araçlar alınırken hata:", err);
        res.status(500).json({ message: 'Sunucu hatası: Araçlar alınamadı.' });
    }
});

app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicleId = req.params.id;
        const cacheKey = CACHE_KEYS.vehicleDetail(vehicleId);
        const cached = await getCache(cacheKey);
        if (cached) {
            res.set('X-Cache', 'HIT');
            return res.json(normalizeVehicleRow(cached));
        }

        const [vehicleResults] = await db.query('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
        if (vehicleResults.length === 0) return res.status(404).json({ message: 'Araç bulunamadı' });
        
        const [photoResults] = await db.query('SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY id ASC', [vehicleId]);
        const vehicle = normalizeVehicleRow({
            ...vehicleResults[0],
            photos: photoResults,
        });
        await setCache(cacheKey, vehicle);
        res.set('X-Cache', isRedisReady() ? 'MISS' : 'BYPASS');
        res.json(vehicle);
    } catch (err) {
        console.error("Araç detayı alınırken hata:", err);
        res.status(500).json({ message: 'Sunucu hatası: Araç detayı alınamadı.' });
    }
});

app.post('/api/vehicles', authenticateToken, requireAdmin, runUpload(upload.array('photos', MAX_PHOTOS_PER_VEHICLE)), async (req, res) => {
    const { brand, model, year, color, gear, fuel, mileage, purchase_price, sale_price, description } = req.body;
    if (!brand || !model || year === undefined || year === null || year === '') {
        return res.status(400).json({ message: 'Marka, model ve yıl alanları zorunludur.' });
    }
    const yearNum = parseInt(year, 10);
    if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return res.status(400).json({ message: 'Geçerli bir model yılı giriniz.' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const sql = `
            INSERT INTO vehicles (brand, model, year, color, gear, fuel, mileage, purchase_price, sale_price, description, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(sql, [
            brand, model, yearNum, color, gear, fuel, 
            parseInt(mileage, 10) || 0, 
            parseFloat(purchase_price) || 0, 
            parseFloat(sale_price) || 0, 
            description,
            req.user.id
        ]);
        const vehicleId = result.insertId;
        if (req.files && req.files.length > 0) {
            const photoUrls = await saveUploadedPhotos(req.files);
            const photoValues = photoUrls.map((url) => [vehicleId, url]);
            await connection.query('INSERT INTO vehicle_photos (vehicle_id, photo_url) VALUES ?', [photoValues]);
        }
        await connection.commit();
        await invalidateVehiclesCache();
        res.status(201).json({ 
            message: 'Araç ve fotoğraflar başarıyla eklendi',
            vehicleId: vehicleId
        });
    } catch (err) {
        await connection.rollback();
        console.error("❌ ARAÇ EKLEME SIRASINDA HATA:", err);
        res.status(500).json({ 
            message: 'Araç eklenemedi, sunucu hatası.',
            hint: err.code || err.message,
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
        await invalidateVehiclesCache(req.params.id);
        res.json({ message: 'Araç başarıyla güncellendi' });
    } catch (err) {
        console.error("Araç güncelleme hatası:", err);
        res.status(500).json({ message: 'Güncelleme sırasında bir hata oluştu.' });
    }
});

app.post('/api/vehicles/:id/add-photos', authenticateToken, requireAdmin, runUpload(upload.array('photos', MAX_PHOTOS_PER_VEHICLE)), async (req, res) => {
    try {
        const vehicleId = req.params.id;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Yüklenecek fotoğraf seçilmedi.' });
        }

        const [countRows] = await db.query(
            'SELECT COUNT(*) AS total FROM vehicle_photos WHERE vehicle_id = ?',
            [vehicleId]
        );
        const existing = countRows[0]?.total || 0;
        const incoming = req.files.length;
        if (existing + incoming > MAX_PHOTOS_PER_VEHICLE) {
            req.files.forEach((file) => {
                try {
                    fs.unlinkSync(file.path);
                } catch (_) { /* ignore */ }
            });
            return res.status(400).json({
                message: `Bu araçta en fazla ${MAX_PHOTOS_PER_VEHICLE} fotoğraf olabilir. Mevcut: ${existing}, eklenmek istenen: ${incoming}.`,
            });
        }

        const photoUrls = await saveUploadedPhotos(req.files);
        const photoValues = photoUrls.map((url) => [vehicleId, url]);
        await db.query('INSERT INTO vehicle_photos (vehicle_id, photo_url) VALUES ?', [photoValues]);
        await invalidateVehiclesCache(vehicleId);
        res.status(201).json({
            message: 'Fotoğraflar başarıyla eklendi.',
            added: incoming,
            total: existing + incoming,
        });
    } catch (err) {
        console.error("FOTOĞRAF EKLEME HATASI:", err);
        res.status(500).json({
            message: 'Fotoğraflar eklenirken bir hata oluştu.',
            hint: err.code || err.message,
        });
    }
});

app.delete('/api/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
    const photoId = req.params.id;
    try {
        const [photoResults] = await db.query(
            'SELECT photo_url, vehicle_id FROM vehicle_photos WHERE id = ?',
            [photoId]
        );
        if (photoResults.length === 0) {
            return res.status(404).json({ message: 'Fotoğraf bulunamadı.' });
        }
        const photoPath = photoResults[0].photo_url;
        const vehicleId = photoResults[0].vehicle_id;
        await db.query('DELETE FROM vehicle_photos WHERE id = ?', [photoId]);
        await removeStoredPhoto(photoPath);
        await invalidateVehiclesCache(vehicleId);
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
        for (const photo of photos) {
            await removeStoredPhoto(photo.photo_url);
        }
        await connection.commit();
        await invalidateVehiclesCache(vehicleId);
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
        await ensureHiddenInboxTable();
        await ensureMessagesSchema();
        const adminId = req.user.id;
        const adminFilter = adminConversationFilterSql('m', adminId);
        const sql = `
            SELECT COUNT(DISTINCT m.conversation_id) AS unreadCount 
            FROM messages m
            WHERE 
                m.is_read_by_admin = FALSE
                AND ${adminFilter.sql}
                ${HIDDEN_INBOX_SQL}
        `;
        const [rows] = await db.query(sql, [...adminFilter.params, adminId]);
        res.json({ unreadCount: rows[0].unreadCount || 0 });
    } catch (err) {
        console.error("Okunmamış bildirim sayısı alınamadı:", err);
        res.status(500).json({ message: "Bildirim sayısı alınırken hata oluştu." });
    }
});



app.get('/api/user-conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role !== 'user') {
            return res.status(403).json({ message: 'Bu işlem sadece kullanıcılar içindir.' });
        }

        await ensureHiddenInboxTable();

        const sql = `
            SELECT
                m.conversation_id,
                m.message,
                m.created_at,
                m.vehicle_id,
                v.brand,
                v.model,
                v.year,
                v.color,
                v.mileage,
                v.gear,
                v.fuel,
                v.sale_price,
                admin.name as admin_name,
                (SELECT COUNT(*) FROM messages m2
                 WHERE m2.conversation_id = m.conversation_id
                   AND m2.receiver_id = ?
                   AND m2.is_read_by_user = FALSE) as unread_count
            FROM messages m
            INNER JOIN (
                SELECT conversation_id, MAX(id) as max_id
                FROM messages
                WHERE conversation_id LIKE CONCAT('user_', ?, '_%')
                GROUP BY conversation_id
            ) latest ON m.id = latest.max_id
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            LEFT JOIN users admin ON admin.id = CAST(
                SUBSTRING_INDEX(m.conversation_id, '_admin_', -1) AS UNSIGNED
            )
            WHERE
                m.conversation_id LIKE CONCAT('user_', ?, '_%')
              AND (admin.role = 'admin' OR admin.id IS NULL)
              ${HIDDEN_INBOX_SQL}
            ORDER BY m.created_at DESC
        `;

        const [conversations] = await db.query(sql, [userId, userId, userId, userId]);
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

        await ensureHiddenInboxTable();
        const userId = req.user.id;

        const sql = `
            SELECT COUNT(DISTINCT m.conversation_id) AS unreadCount 
            FROM messages m
            WHERE 
                m.receiver_id = ? 
                AND m.is_read_by_user = FALSE
                ${HIDDEN_INBOX_SQL}
        `;

        const [rows] = await db.query(sql, [userId, userId]);
        res.json({ unreadCount: rows[0].unreadCount || 0 });

    } catch (err) {
        console.error("Kullanıcı okunmamış bildirim sayısı alınamadı:", err);
        res.status(500).json({ message: "Bildirim sayısı alınırken hata oluştu." });
    }
});

// Kullanıcı: sohbeti yalnızca kendi gelen kutusundan kaldırır (mesajlar kalır)
app.delete('/api/user/conversations/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const userIdMatch = conversationId.match(/user_(\d+)_/);
        const userIdFromConv = userIdMatch ? parseInt(userIdMatch[1], 10) : null;

        if (req.user.role !== 'user' || parseInt(userId, 10) !== userIdFromConv) {
            return res.status(403).json({ message: 'Bu sohbeti kaldırma yetkiniz yok.' });
        }

        const [exists] = await db.query(
            'SELECT 1 FROM messages WHERE conversation_id = ? LIMIT 1',
            [conversationId]
        );
        if (exists.length === 0) {
            return res.status(404).json({ message: 'Sohbet bulunamadı.' });
        }

        await hideConversationForUser(userId, conversationId);
        io.emit('admin_refresh_conversations');

        res.status(200).json({ message: 'Sohbet gelen kutunuzdan kaldırıldı.' });
    } catch (err) {
        console.error("Kullanıcı sohbeti gizlenirken hata:", err);
        res.status(500).json({ message: 'Sohbet kaldırılırken bir sunucu hatası oluştu.' });
    }
});

// Tüm okunmamış bildirimleri okundu işaretle
app.post('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
    try {
        await ensureMessagesSchema();
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            const adminFilter = adminConversationFilterSql('messages', userId);
            await db.query(
                `UPDATE messages SET is_read_by_admin = TRUE
                 WHERE is_read_by_admin = FALSE
                 AND ${adminFilter.sql}`,
                adminFilter.params
            );
            io.emit('admin_refresh_conversations');
            io.emit('conversation_read_status_updated', { conversationId: null });
            io.emit('notifications_were_reset');
        } else {
            await ensureHiddenInboxTable();
            await db.query(
                `UPDATE messages SET is_read_by_user = TRUE
                 WHERE receiver_id = ? AND is_read_by_user = FALSE`,
                [userId]
            );
            io.emit('conversation_read_status_updated', { conversationId: null });
        }

        res.status(200).json({ message: 'Tüm mesajlar okundu olarak işaretlendi.' });
    } catch (err) {
        console.error('Tümünü okundu işaretleme hatası:', err);
        res.status(500).json({
            message: 'Bildirimler güncellenirken bir hata oluştu.',
            hint: err.code || err.message,
        });
    }
});

// Gelen kutusunu tamamen temizle (yalnızca kendi listesi)
app.post('/api/inbox/clear', authenticateToken, async (req, res) => {
    try {
        await ensureHiddenInboxTable();
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            await db.query(
                `INSERT INTO hidden_conversations (user_id, conversation_id)
                 SELECT DISTINCT ?, m.conversation_id
                 FROM messages m
                 WHERE m.conversation_id REGEXP '^user_[0-9]+_vehicle_[0-9]+_admin_[0-9]+$'
                 ON DUPLICATE KEY UPDATE hidden_at = CURRENT_TIMESTAMP`,
                [userId]
            );
            io.emit('admin_refresh_conversations');
        } else {
            await db.query(
                `INSERT INTO hidden_conversations (user_id, conversation_id)
                 SELECT DISTINCT ?, m.conversation_id
                 FROM messages m
                 WHERE m.conversation_id LIKE CONCAT('user_', ?, '_%')
                 ON DUPLICATE KEY UPDATE hidden_at = CURRENT_TIMESTAMP`,
                [userId, userId]
            );
        }

        res.status(200).json({ message: 'Gelen kutusu temizlendi.' });
    } catch (err) {
        console.error('Gelen kutusu temizlenirken hata:', err);
        res.status(500).json({ message: 'Gelen kutusu temizlenirken bir hata oluştu.' });
    }
});




app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    const { id: messageId } = req.params;
    const { id: userId } = req.user;
    try {
        const [msgResults] = await db.query('SELECT sender_id, conversation_id FROM messages WHERE id = ?', [messageId]);
        if (msgResults.length === 0) return res.status(404).json({ message: 'Mesaj bulunamadı.' });
        if (parseInt(msgResults[0].sender_id, 10) !== parseInt(userId, 10)) {
            return res.status(403).json({ message: 'Yalnızca kendi yazdığınız mesajları silebilirsiniz.' });
        }
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
    const adminId = req.user.id;
    try {
        if (!/^user_\d+_vehicle_\d+_admin_\d+$/.test(conversationId)) {
            return res.status(400).json({ message: 'Geçersiz sohbet kimliği.' });
        }

        const [exists] = await db.query(
            'SELECT 1 FROM messages WHERE conversation_id = ? LIMIT 1',
            [conversationId]
        );
        if (exists.length === 0) {
            return res.status(404).json({ message: 'Sohbet bulunamadı.' });
        }

        await hideConversationForUser(adminId, conversationId);
        io.emit('admin_refresh_conversations');
        res.status(200).json({ message: 'Sohbet gelen kutunuzdan kaldırıldı.' });
    } catch (err) { 
        console.error("Konuşma gizlenirken hata:", err);
        res.status(500).json({ message: 'Sohbet kaldırılırken bir hata oluştu.' }); 
    }
});



// Socket.IO bölümünün düzeltilmiş versiyonu

io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
        applySocketAuth(socket, token);
    }
    console.log(
        '👤 Yeni socket bağlantısı:',
        socket.id,
        socket.userRole ? `(${socket.userRole} #${socket.userId})` : '(kimliksiz)'
    );

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
            if (currentUserRole === 'admin' && adminIdFromRoom != null) {
                hasAccess = true;
                console.log(`✅ Admin ${currentUserId} müşteri sohbetine erişiyor: ${conversationId}`);
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

                unhideConversationForUser(currentUserId, conversationId).catch((e) =>
                    console.error('Sohbet gizleme kaldırılamadı:', e)
                );

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
        const { conversation_id, sender_id, receiver_id, vehicle_id, message, token } = data;

        if (!conversation_id || !sender_id || !receiver_id || !message) {
            console.error("❌ Eksik mesaj verisi:", data);
            return;
        }

        // İsteğe bağlı token ile kimlik doğrulama (mobil / join_room öncesi)
        if (token && (socket.userId == null || socket.userRole == null)) {
            if (!applySocketAuth(socket, token)) {
                console.error('❌ send_message token geçersiz');
                return;
            }
        }

        const senderIdNum = Number(sender_id);
        const socketUserIdNum = Number(socket.userId);

        // *** GÜVENLİK: Mesaj gönderen kişi socket ile aynı mı? ***
        if (socket.userId == null || Number.isNaN(socketUserIdNum) || socketUserIdNum !== senderIdNum) {
            console.error(`🚨 GÜVENLİK İHLALİ: Socket user ${socket.userId} başkası adına (${sender_id}) mesaj göndermeye çalıştı!`);
            return;
        }

        // *** GÜVENLİK: Bu conversation'da bu kullanıcı var mı? ***
        const userIdMatch = conversation_id.match(/user_(\d+)_/);
        const adminIdMatch = conversation_id.match(/admin_(\d+)$/);

        const userIdFromConv = userIdMatch ? parseInt(userIdMatch[1]) : null;
        const adminIdFromConv = adminIdMatch ? parseInt(adminIdMatch[1]) : null;

        if (socket.userRole === 'user' && socketUserIdNum !== userIdFromConv) {
            console.error(`🚨 GÜVENLİK: User ${socket.userId} başkasının conversation'ına mesaj göndermeye çalıştı!`);
            return;
        }

        if (socket.userRole === 'admin' && adminIdFromConv == null) {
            console.error(`🚨 GÜVENLİK: Geçersiz admin conversation: ${conversation_id}`);
            return;
        }

        try {
            const queuePayload = {
                conversation_id,
                sender_id,
                receiver_id,
                vehicle_id,
                message,
            };

            const queued = await publishMessage(queuePayload);
            if (queued) {
                return;
            }

            // RabbitMQ yoksa doğrudan işle (geliştirme yedek yolu)
            const result = await processIncomingMessage(db, queuePayload);
            await emitMessageProcessed(io, db, result);
        } catch (err) {
            console.error('❌ Mesaj işlenemedi:', err);
        }
    });

    // Admin bildirim temizleme
    socket.on('admin_cleared_notifications', async (data) => {
        const { adminId, conversationId } = data;
        if (!adminId) return;

        // Güvenlik: Sadece kendi bildirimlerini temizleyebilir
        if (Number(socket.userId) !== Number(adminId) || socket.userRole !== 'admin') {
            console.error(`🚨 GÜVENLİK: Socket user ${socket.userId} başkasının bildirimlerini temizlemeye çalıştı!`);
            return;
        }

        try {
            await ensureMessagesSchema();
            let updateQuery, updateParams;

            if (conversationId) {
                updateQuery = 'UPDATE messages SET is_read_by_admin = TRUE WHERE conversation_id = ? AND is_read_by_admin = FALSE';
                updateParams = [conversationId];
            } else {
                const adminFilter = adminConversationFilterSql('messages', adminId);
                updateQuery = `UPDATE messages SET is_read_by_admin = TRUE 
                    WHERE is_read_by_admin = FALSE 
                    AND ${adminFilter.sql}`;
                updateParams = adminFilter.params;
            }

            await db.query(updateQuery, updateParams);

            if (conversationId) {
                io.to(conversationId).emit('messages_read_update', {
                    conversationId,
                    readerRole: 'admin',
                });
            }

            io.emit('admin_refresh_conversations');
            io.emit('conversation_read_status_updated', { conversationId: conversationId || null });
            socket.emit('notifications_were_reset');
            console.log(`📭 Admin ${adminId} bildirimleri temizlendi. ConversationId: ${conversationId || 'Tümü'}`);
        } catch (err) {
            console.error("Admin bildirim temizleme hatası:", err);
        }
    });

    // User bildirim temizleme
    socket.on('user_cleared_notifications', async (data) => {
        const { userId, conversationId } = data;
        if (!userId) return;

        // Güvenlik: Sadece kendi bildirimlerini temizleyebilir
        if (Number(socket.userId) !== Number(userId) || socket.userRole !== 'user') {
            console.error(`🚨 GÜVENLİK: Socket user ${socket.userId} başkasının bildirimlerini temizlemeye çalıştı!`);
            return;
        }

        try {
            await ensureMessagesSchema();
            let updateQuery, updateParams;

            if (conversationId) {
                updateQuery = 'UPDATE messages SET is_read_by_user = TRUE WHERE receiver_id = ? AND conversation_id = ? AND is_read_by_user = FALSE';
                updateParams = [userId, conversationId];
            } else {
                updateQuery = 'UPDATE messages SET is_read_by_user = TRUE WHERE receiver_id = ? AND is_read_by_user = FALSE';
                updateParams = [userId];
            }

            await db.query(updateQuery, updateParams);

            if (conversationId) {
                io.to(conversationId).emit('messages_read_update', {
                    conversationId,
                    readerRole: 'user',
                });
            }

            socket.emit('user_notifications_were_reset');
            io.emit('conversation_read_status_updated', { conversationId: conversationId || null });
            console.log(`📭 User ${userId} bildirimleri temizlendi. ConversationId: ${conversationId || 'Tümü'}`);
        } catch (err) {
            console.error("User bildirim temizleme hatası:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket bağlantısı kesildi:', socket.id);
    });
});

app.get('/api/conversations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureHiddenInboxTable();
        await ensureMessagesSchema();
        const adminId = req.user.id;
        const adminFilter = adminConversationFilterSql('m', adminId);

        const sql = `
            SELECT
                m.conversation_id,
                m.message,
                m.created_at,
                m.vehicle_id,
                v.brand,
                v.model,
                v.year,
                v.color,
                v.mileage,
                v.gear,
                v.fuel,
                v.sale_price,
                (SELECT vp.photo_url FROM vehicle_photos vp WHERE vp.vehicle_id = v.id ORDER BY vp.id ASC LIMIT 1) AS photo_url,
                CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(m.conversation_id, 'user_', -1), '_vehicle_', 1) AS UNSIGNED) as user_id,
                u.name as user_name,
                (SELECT COUNT(*) FROM messages m2
                 WHERE m2.conversation_id = m.conversation_id
                   AND m2.is_read_by_admin = FALSE) as unread_count
            FROM messages m
            INNER JOIN (
                SELECT conversation_id, MAX(id) as max_id
                FROM messages
                WHERE conversation_id REGEXP ?
                GROUP BY conversation_id
            ) latest ON m.id = latest.max_id
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            LEFT JOIN users u ON u.id = CAST(
                SUBSTRING_INDEX(SUBSTRING_INDEX(m.conversation_id, 'user_', -1), '_vehicle_', 1) AS UNSIGNED
            )
            WHERE
                ${adminFilter.sql}
              AND (u.role = 'user' OR u.id IS NULL)
              ${HIDDEN_INBOX_SQL}
            ORDER BY m.created_at DESC
        `;

        const [conversations] = await db.query(sql, [
            ADMIN_CONV_REGEXP,
            ...adminFilter.params,
            adminId,
        ]);
        res.json(conversations);

    } catch (err) {
        console.error("Konuşmalar alınamadı:", err);
        res.status(500).json({ message: "Sunucuda bir hata oluştu, konuşmalar alınamadı." });
    }
});
const cleanupOldMessages = async () => {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        
        const [result] = await db.query("DELETE FROM messages WHERE created_at < ?", [oneMonthAgo]);
        
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
console.log('⏰ Otomatik mesaj temizleme görevi, her gün gece yarısı 30 günden eski mesajları silecek şekilde ayarlandı.');

const PORT = process.env.PORT || 5000;
Promise.all([ensureHiddenInboxTable(), ensureMessagesSchema()])
    .then(() => migratePhotoUrlsInDb(db))
    .then(() => invalidateVehiclesCache())
    .then(() => console.log('✅ Gelen kutusu, mesaj şeması ve fotoğraf yolları hazır.'))
    .catch((err) => console.error('❌ Başlangıç şeması/migrasyon hatası:', err));

connectRedis()
    .then(() => initSocketBridge())
    .then(() => {
        subscribeSocketDispatch(io, (ioInstance, dispatch) => {
            emitMessageProcessed(ioInstance, db, dispatch).catch((err) => {
                console.error('Socket dispatch emit hatası:', err);
            });
        });
    })
    .catch((err) => console.warn('Redis/socket köprüsü başlatma:', err.message));

connectRabbitMQ().catch((err) => console.warn('RabbitMQ başlatma:', err.message));

server.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor.`);
    cleanupOldMessages();
}); 