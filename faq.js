
document.addEventListener('DOMContentLoaded', () => {
    const faqContainer = document.querySelector('.faq-container'); // faq-container div'ini seçin
    const faqLoadingMessage = document.getElementById('faq-loading-message');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    auth.onAuthStateChanged(user => {
        if (user) {
            checkAdminStatus(user.uid);
            loadFaqs();
        } else {
            window.location.href = 'login.html';
        }
    });

    // Menü Toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            if (adminPanelLink) {
                adminPanelLink.style.display = 'block';
            }
        }
    }

    async function loadFaqs() {
        if (faqLoadingMessage) {
            faqLoadingMessage.textContent = 'SSS yükleniyor...';
            faqLoadingMessage.className = 'info-message';
            faqLoadingMessage.style.display = 'block';
        }
        if (faqContainer) {
            // Yükleme mesajını koruyarak diğer içeriği temizle
            const existingLoadingMessage = faqContainer.querySelector('#faq-loading-message');
            faqContainer.innerHTML = ''; 
            if (existingLoadingMessage) {
                faqContainer.appendChild(existingLoadingMessage);
            }
        }

        try {
            const snapshot = await db.collection('faqs').orderBy('createdAt', 'desc').get();
            
            if (faqLoadingMessage) {
                faqLoadingMessage.style.display = 'none'; // Hide loading message
            }

            if (snapshot.empty) {
                if (faqContainer) {
                    faqContainer.innerHTML += '<p class="info-message">Şu anda Sıkça Sorulan Soru bulunmamaktadır.</p>';
                }
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
                if (faqContainer) {
                    faqContainer.appendChild(faqItem);
                }
            });

            document.querySelectorAll('.faq-question').forEach(button => {
                button.addEventListener('click', () => {
                    const faqItem = button.closest('.faq-item');
                    if (faqItem) {
                        faqItem.classList.toggle('active');
                        const answer = faqItem.querySelector('.faq-answer');
                        if (answer) {
                            if (faqItem.classList.contains('active')) {
                                answer.style.maxHeight = answer.scrollHeight + 'px';
                            } else {
                                answer.style.maxHeight = null;
                            }
                        }
                    }
                });
            });

        } catch (error) {
            console.error("SSS yüklenirken hata oluştu: ", error);
            if (faqLoadingMessage) {
                faqLoadingMessage.textContent = 'SSS yüklenemedi. Lütfen daha sonra tekrar deneyin.';
                faqLoadingMessage.className = 'error-message';
                faqLoadingMessage.style.display = 'block';
            }
            if (faqContainer) {
                // Hata durumunda sadece hata mesajını göster
                faqContainer.innerHTML = '';
                if (faqLoadingMessage) {
                    faqContainer.appendChild(faqLoadingMessage);
                }
            }
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});
