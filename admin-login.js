document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('alertBox');

    // Eğer bir yönetici zaten giriş yapmışsa, panele yönlendir
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().isAdmin) {
                    window.location.href = 'admin-panel.html';
                }
            });
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        errorMessage.textContent = '';
        errorMessage.className = 'error-message'; // Reset class
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Kullanıcı giriş yaptı, şimdi admin mi diye kontrol et.
                const user = userCredential.user;
                const userDocRef = db.collection('users').doc(user.uid);
                
                return userDocRef.get();
            })
            .then(doc => {
                if (doc.exists && doc.data().isAdmin) {
                    // Başarılı, admin paneline yönlendir
                    window.location.href = 'admin-panel.html';
                } else {
                    // Admin değil veya veri yok.
                    auth.signOut(); // Güvenlik için çıkış yaptır
                    errorMessage.textContent = "Bu hesabın yönetici erişim yetkisi yok.";
                }
            })
            .catch((error) => {
                console.error("Admin Giriş Hatası:", error);
                errorMessage.textContent = "E-posta veya şifre hatalı.";
            });
    });
});