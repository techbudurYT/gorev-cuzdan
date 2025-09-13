document.addEventListener('DOMContentLoaded', () => {
    const supportForm = document.getElementById('support-form');
    const formMessage = document.getElementById('form-message');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            checkAdminStatus(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            adminPanelLink.style.display = 'block';
        }
    }

    supportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const subject = document.getElementById('support-subject').value;
        const message = document.getElementById('support-message').value;
        
        if (!currentUser) {
            formMessage.textContent = 'Lütfen önce giriş yapın.';
            formMessage.className = 'error-message';
            return;
        }

        db.collection('tickets').add({
            uid: currentUser.uid,
            email: currentUser.email,
            subject: subject,
            message: message,
            status: 'open', // open, closed
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            supportForm.reset();
            formMessage.textContent = 'Destek talebiniz başarıyla gönderildi.';
            formMessage.className = 'success-message';
            setTimeout(() => formMessage.textContent = '', 4000);
        })
        .catch(error => {
            console.error("Destek talebi hatası: ", error);
            formMessage.textContent = 'Talep gönderilirken bir hata oluştu.';
            formMessage.className = 'error-message';
        });
    });

    logoutBtn.addEventListener('click', () => auth.signOut());
});