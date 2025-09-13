document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    auth.onAuthStateChanged(user => {
        if (user) {
            window.location.href = 'my-tasks.html';
        }
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        errorMessage.textContent = '';
        let createdUser = null; // Kullanıcıyı daha sonra erişmek için sakla

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                createdUser = user; // Kullanıcı nesnesini sakla
                // Yeni kullanıcı için Firestore'da bir belge oluştur
                return db.collection('users').doc(user.uid).set({
                    email: user.email,
                    balance: 0,
                    completedTasks: 0,
                    isAdmin: false, // Varsayılan olarak admin değil
                    uid: user.uid,
                    completedTaskIds: [] // Başlangıçta boş bir dizi ekleyelim
                });
            })
            .then(() => {
                // Firestore'a yazma başarılı, yönlendirme onAuthStateChanged tarafından yapılacak
                console.log("Kullanıcı başarıyla oluşturuldu ve Firestore'a kaydedildi.");
            })
            .catch((error) => {
                // Hata yönetimi
                if (error.code == 'auth/email-already-in-use') {
                    errorMessage.textContent = 'Bu e-posta adresi zaten kullanılıyor.';
                } else if (error.code) { // Firebase Auth hatası
                    errorMessage.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
                } else { // Firestore hatası olabilir
                    errorMessage.textContent = 'Kullanıcı veritabanı oluşturulamadı. Lütfen tekrar deneyin.';
                    // Eğer veritabanı oluşturma başarısız olursa, oluşturulan Auth kullanıcısını sil
                    if (createdUser) {
                        createdUser.delete().catch(deleteError => {
                            console.error("Auth kullanıcısı silinirken hata oluştu:", deleteError);
                        });
                    }
                }
                console.error("Kayıt Hatası:", error);
            });
    });
});