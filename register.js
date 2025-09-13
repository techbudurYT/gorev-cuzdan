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

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                // Yeni kullanıcı için Firestore'da bir belge oluştur
                db.collection('users').doc(user.uid).set({
                    email: user.email,
                    balance: 0,
                    completedTasks: 0,
                    isAdmin: false, // Varsayılan olarak admin değil
                    uid: user.uid
                }).then(() => {
                    // Kayıt başarılı, yönlendirme onAuthStateChanged tarafından yapılacak
                });
            })
            .catch((error) => {
                if (error.code == 'auth/email-already-in-use') {
                    errorMessage.textContent = 'Bu e-posta adresi zaten kullanılıyor.';
                } else {
                    errorMessage.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
                }
                console.error("Kayıt Hatası:", error);
            });
    });
});