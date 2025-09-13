// register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const submitButton = registerForm.querySelector('button[type="submit"]');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim().toLowerCase();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        errorMessage.textContent = '';
        submitButton.disabled = true;
        submitButton.textContent = 'İşleniyor...';

        if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
            errorMessage.textContent = 'Kullanıcı adı 3-15 karakter uzunluğunda olmalı ve sadece harf, rakam veya _ içerebilir.';
            submitButton.disabled = false;
            submitButton.textContent = 'Kayıt Ol';
            return;
        }

        let createdUser = null;

        try {
            // 1. Kullanıcı adının benzersizliğini 'usernames' koleksiyonunda güvenli bir şekilde kontrol et
            const usernameDocRef = db.collection('usernames').doc(username);
            const usernameDoc = await usernameDocRef.get();

            if (usernameDoc.exists) {
                throw { code: 'auth/username-already-in-use' };
            }

            // 2. Auth kullanıcısını oluştur
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            createdUser = userCredential.user;

            // 3. Firestore'a kullanıcı verilerini ve kullanıcı adını atomik olarak (birlikte) yaz
            const batch = db.batch();

            const userDocRef = db.collection('users').doc(createdUser.uid);
            batch.set(userDocRef, {
                uid: createdUser.uid,
                username: username,
                email: email,
                balance: 0,
                completedTasks: 0,
                isAdmin: false,
                completedTaskIds: []
            });

            // Kullanıcı adını rezerve etmek için 'usernames' koleksiyonuna ekle
            batch.set(usernameDocRef, { uid: createdUser.uid });

            await batch.commit();

            // 4. Başarılı, yönlendir
            window.location.href = 'my-tasks.html';

        } catch (error) {
            // Hata yönetimi
            if (createdUser) {
                // Eğer Firestore yazma işlemi başarısız olursa Auth'da oluşturulan kullanıcıyı sil
                // Bu adım, kısmen oluşturulmuş hesapları temizler.
                await createdUser.delete().catch(authError => {
                    console.error("Kısmen oluşturulan kullanıcı silinirken hata oluştu:", authError);
                });
            }

            if (error.code === 'auth/username-already-in-use') {
                errorMessage.textContent = 'Bu kullanıcı adı zaten alınmış.';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'Bu e-posta adresi zaten kullanılıyor.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage.textContent = 'Şifre en az 6 karakter uzunluğunda olmalıdır.';
            }
            else {
                errorMessage.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
            }
            console.error("Kayıt Hatası:", error);

            submitButton.disabled = false;
            submitButton.textContent = 'Kayıt Ol';
        }
    });
});