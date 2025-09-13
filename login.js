document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    auth.onAuthStateChanged(user => {
        if (user) {
            window.location.href = 'my-tasks.html';
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        errorMessage.textContent = '';

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Giriş başarılı, yönlendirme onAuthStateChanged tarafından yapılacak
            })
            .catch((error) => {
                errorMessage.textContent = "E-posta veya şifre hatalı.";
                console.error("Giriş Hatası:", error);
            });
    });
});