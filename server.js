const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Firebase Admin SDK'yı başlatın.
// serviceAccountKey.json dosyanızı buraya koyun.
// Bu dosya, Firebase projenizin ayarlarından indirilebilir (Project settings -> Service accounts).
// **DİKKAT:** Bu anahtarınızı herkese açık bir şekilde paylaşmayın ve üretim ortamında güvenli bir şekilde yönetin.
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// CORS ayarları
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // Frontend'inizin çalıştığı adresler
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json()); // Body'i JSON olarak parse etmek için

// Firebase Kimlik Doğrulama Middleware'i
const authenticateFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Yetkilendirme token\'ı eksik veya hatalı.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Token'dan gelen kullanıcı bilgilerini request objesine ekle
    next();
  } catch (error) {
    console.error("Token doğrulama hatası:", error);
    return res.status(403).send({ message: 'Geçersiz veya süresi dolmuş token.', error: error.message });
  }
};

// --- API Endpoints ---

// 1. Para yükleme işlemi başlatma (Frontend'den çağrılır)
app.post('/api/create-payment', authenticateFirebaseToken, async (req, res) => {
  const { amount, userId, userEmail } = req.body;

  // Güvenlik: req.user.uid ile userId'nin eşleştiğini kontrol edin
  if (req.user.uid !== userId) {
    return res.status(403).send({ message: 'Yetkilendirme hatası: Kullanıcı ID eşleşmiyor.' });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).send({ message: 'Geçerli bir miktar belirtilmelidir.' });
  }

  const paymentId = uuidv4(); // Benzersiz ödeme ID'si oluştur

  try {
    // Firestore'da bekleyen bir ödeme kaydı oluştur
    await db.collection('deposits').doc(paymentId).set({
      userId,
      userEmail,
      amount,
      status: 'pending', // Ödeme bekliyor
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentId // İşlem tekrarını önlemek için depoluyoruz
    });

    // Gerçek bir uygulamada burada Papara, PayPal, Stripe gibi ödeme sağlayıcılarının API'si çağrılır.
    // Örneğin, Papara için bir ödeme linki oluşturulur ve döndürülür.
    // Simplification for this example: simulate a payment link.
    const simulatedPaymentLink = `https://simulated-papara.com/pay?order_id=${paymentId}&amount=${amount}`;

    res.status(200).send({
      success: true,
      message: 'Ödeme işlemi başlatıldı.',
      paymentId,
      paymentLink: simulatedPaymentLink // Bu link gerçek bir ödeme gateway'ine yönlendirecek
    });

  } catch (error) {
    console.error('Ödeme işlemi başlatılırken hata:', error);
    res.status(500).send({ message: 'Sunucu hatası, ödeme başlatılamadı.', error: error.message });
  }
});

// 2. Ödeme sağlayıcısından gelen webhook (veya Frontend'den simüle edilmiş doğrulama)
// Bu endpoint normalde ödeme sağlayıcısı tarafından (Papara, Stripe vb.) arka plana çağrılır.
// Frontend'den doğrudan çağrılacaksa, güvenlik token'ı ile korunmalıdır.
app.post('/api/simulate-payment-webhook', async (req, res) => {
  const { paymentId, status } = req.body; // status: 'success' veya 'failed'

  if (!paymentId || !status) {
    return res.status(400).send({ message: 'paymentId ve status alanları gereklidir.' });
  }

  const depositRef = db.collection('deposits').doc(paymentId);

  try {
    await db.runTransaction(async (transaction) => {
      const depositDoc = await transaction.get(depositRef);

      if (!depositDoc.exists) {
        throw new Error('Ödeme kaydı bulunamadı.');
      }

      const currentDepositStatus = depositDoc.data().status;
      
      // İşlemin zaten tamamlanmadığından veya başarısız olmadığından emin olun (idempotency)
      if (currentDepositStatus !== 'pending') {
        // Eğer zaten işlenmişse, başarı durumunda tekrar başarılı yanıt verilebilir
        // veya zaten başarıyla tamamlanmışsa işlem yapmaya gerek yoktur.
        // Bu örnekte, sadece bir hata fırlatıyoruz ve "zaten işlenmiş" mesajı döndürüyoruz.
        throw new Error(`Ödeme zaten '${currentDepositStatus}' olarak işlenmiş.`);
      }

      if (status === 'success') {
        const { userId, amount } = depositDoc.data();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('Kullanıcı bulunamadı.');
        }

        const currentBalance = userDoc.data().balance || 0;
        const newBalance = currentBalance + amount;

        transaction.update(userRef, { balance: newBalance });
        transaction.update(depositRef, { status: 'completed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        
        console.log(`Kullanıcı ${userId} için ${amount} ₺ bakiye yüklendi. (Payment ID: ${paymentId})`);
        res.status(200).send({ success: true, message: 'Bakiye başarıyla güncellendi.' });

      } else if (status === 'failed') {
        transaction.update(depositRef, { status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`Ödeme işlemi başarısız oldu. (Payment ID: ${paymentId})`);
        res.status(200).send({ success: false, message: 'Ödeme başarısız oldu.' });
      } else {
        throw new Error('Geçersiz ödeme durumu.');
      }
    });

  } catch (error) {
    console.error('Ödeme webhook işlenirken hata:', error);
    const errorMessage = error.message.includes('Ödeme zaten') ? error.message : 'Sunucu hatası, ödeme doğrulanamadı.';
    res.status(500).send({ success: false, message: errorMessage, error: error.message });
  }
});

// 3. Kullanıcının para yükleme geçmişini getirme (Frontend'den çağrılır)
app.get('/api/deposit-history/:userId', authenticateFirebaseToken, async (req, res) => {
  const { userId } = req.params;

  // Güvenlik: req.user.uid ile userId'nin eşleştiğini kontrol edin
  if (req.user.uid !== userId) {
    return res.status(403).send({ message: 'Yetkilendirme hatası: Kullanıcı ID eşleşmiyor.' });
  }

  try {
    const depositsSnapshot = await db.collection('deposits')
                                    .where('userId', '==', userId)
                                    .orderBy('createdAt', 'desc')
                                    .get();
    
    const deposits = depositsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send({ success: true, deposits });
  } catch (error) {
    console.error('Para yükleme geçmişi alınırken hata:', error);
    res.status(500).send({ message: 'Sunucu hatası, geçmiş alınamadı.', error: error.message });
  }
});


// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
  console.log(`Frontend'inizin origin adreslerini CORS izin verilen listeye eklediğinizden emin olun.`);
});