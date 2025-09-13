document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    // Hatalı yönlendirmeye neden olan onAuthStateChanged listener'ı kaldırıldı.
    // Yönlendirme, sadece veritabanı yazma işlemi başarılı olduktan sonra manuel olarak yapılacak.

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        errorMessage.textContent = '';
        let createdUser = null; // Hata durumunda Auth kullanıcısını silebilmek için sakla

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                createdUser = user;
                // Yeni kullanıcı için Firestore'da bir belge oluştur
                return db.collection('users').doc(user.uid).set({
                    email: user.email,
                    balance: 0,
                    completedTasks: 0,
                    isAdmin: false,
                    uid: user.uid,
                    completedTaskIds: [] // Başlangıçta boş bir dizi ekliyoruz
                });
            })
            .then(() => {
                // Firestore'a yazma işlemi başarıyla tamamlandı.
                // Artık güvenli bir şekilde ana sayfaya yönlendirebiliriz.
                window.location.href = 'my-tasks.html';
            })
            .catch((error) => {
                // Hata yönetimi
                if (error.code == 'auth/email-already-in-use') {
                    errorMessage.textContent = 'Bu e-posta adresi zaten kullanılıyor.';
                } else {
                    errorMessage.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
                }
                console.error("Kayıt Hatası:", error);

                // Eğer veritabanı oluşturma başarısız olursa, tutarsızlığı önlemek için
                // oluşturulan Auth kullanıcısını sil.
                if (createdUser) {
                    createdUser.delete().catch(deleteError => {
                        console.error("Auth kullanıcısı silinirken hata oluştu:", deleteError);
                    });
                }
            });
    });
});