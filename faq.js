document.addEventListener('DOMContentLoaded', () => {
    const faqContainer = document.getElementById('faq-container');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');

    auth.onAuthStateChanged(user => {
        if (user) {
            checkAdminStatus(user.uid);
            loadFaqs();
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

    async function loadFaqs() {
        faqContainer.innerHTML = '<p>Yükleniyor...</p>';
        try {
            const snapshot = await db.collection('faqs').orderBy('createdAt', 'desc').get();
            faqContainer.innerHTML = '';
            if (snapshot.empty) {
                faqContainer.innerHTML = '<p>Şu anda Sıkça Sorulan Soru bulunmamaktadır.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const faq = doc.data();
                const faqItem = document.createElement('div');
                faqItem.className = 'faq-item';
                faqItem.innerHTML = `
                    <button class="faq-question">
                        <span>${faq.question}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="faq-answer">
                        <p>${faq.answer}</p>
                    </div>
                `;
                faqContainer.appendChild(faqItem);
            });

            document.querySelectorAll('.faq-question').forEach(button => {
                button.addEventListener('click', () => {
                    const faqItem = button.closest('.faq-item');
                    faqItem.classList.toggle('active');
                    const answer = faqItem.querySelector('.faq-answer');
                    if (faqItem.classList.contains('active')) {
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                    } else {
                        answer.style.maxHeight = null;
                    }
                });
            });

        } catch (error) {
            console.error("SSS yüklenirken hata oluştu: ", error);
            faqContainer.innerHTML = '<p>SSS yüklenemedi.</p>';
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});