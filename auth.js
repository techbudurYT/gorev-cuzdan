import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBN85bxThpJYifWAvsS0uqPD0C9D55uPpM",
    authDomain: "gorev-cuzdan.firebaseapp.com",
    projectId: "gorev-cuzdan",
    storageBucket: "gorev-cuzdan.appspot.com",
    messagingSenderId: "139914511950",
    appId: "1:139914511950:web:0d7c9352e410223742e51f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function showAlert(message, isSuccess = false) {
    const alertBox = document.getElementById("alertBox");
    if (!alertBox) return;
    const alertClass = isSuccess ? 'alert-success' : 'alert-error';
    alertBox.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    alertBox.style.display = 'block';
    setTimeout(() => {
        if (alertBox) {
            alertBox.innerHTML = '';
            alertBox.style.display = 'none';
        }
    }, 5000);
}

function showLoader() {
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    if (loader) loader.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'block'; 
    }
    if (loader) loader.style.display = 'none';
}

function handleInputLabels() {
    document.querySelectorAll('.input-group.spark input, .input-group.spark textarea').forEach(input => {
        if (input.value) input.classList.add('populated');
        else input.classList.remove('populated');

        input.addEventListener('input', () => {
            if (input.value) input.classList.add('populated');
            else input.classList.remove('populated');
        });

        input.addEventListener('focus', () => {
            input.parentElement.querySelector('label')?.classList.add('focused');
        });
        input.addEventListener('blur', () => {
            input.parentElement.querySelector('label')?.classList.remove('focused');
        });
    });
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (password.length < 6) return showAlert("Şifre en az 6 karakter olmalıdır.", false);

        try {
            showLoader();
            await signInWithEmailAndPassword(auth, email, password);
            // Başarılı girişten sonra onAuthStateChanged yönlendirecek
        } catch (error) {
            hideLoader();
            console.error("Giriş hatası:", error);
            showAlert("Hatalı e-posta veya şifre.", false);
        }
    });

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt("Şifrenizi sıfırlamak için e-posta adresinizi girin:");
            if (email) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    showAlert("Şifre sıfırlama bağlantısı gönderildi.", true);
                } catch (error) {
                    console.error("Şifre sıfırlama hatası:", error);
                    showAlert("Şifre sıfırlama hatası: " + error.message, false);
                }
            }
        });
    }
}

function initRegisterPage() {
    const registerForm = document.getElementById("registerForm");
    if(!registerForm) return;

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;

        if (username.length < 3) return showAlert("Kullanıcı adı en az 3 karakter olmalıdır.", false);
        if (password.length < 6) return showAlert("Şifre en az 6 karakter olmalıdır.", false);

        try {
            showLoader();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            await updateProfile(newUser, { displayName: username });
            // Başarılı kayıttan sonra onAuthStateChanged yönlendirecek
        } catch (error) {
            hideLoader();
            console.error("Kayıt hatası:", error);
            showAlert(error.code === 'auth/email-already-in-use' ? "Bu e-posta zaten kullanımda." : "Kayıt hatası: " + error.message, false);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Eğer kullanıcı giriş yapmışsa ve bu sayfalardan birindeyse, ana sayfaya yönlendir
            window.location.replace('index.html');
        } else {
            // Kullanıcı giriş yapmamışsa, formu göster
            hideLoader();
            handleInputLabels();
            if (pageId === 'page-login') {
                initLoginPage();
            } else if (pageId === 'page-register') {
                initRegisterPage();
            }
        }
    });
});