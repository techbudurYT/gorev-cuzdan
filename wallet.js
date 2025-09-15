document.addEventListener('DOMContentLoaded', () => {
    const walletBalance = document.getElementById('wallet-balance');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    const withdrawalForm = document.getElementById('withdrawal-form');
    const withdrawalAmountInput = document.getElementById('withdrawal-amount');
    const withdrawalMethodInput = document.getElementById('withdrawal-method');
    const submitWithdrawalBtn = document.getElementById('submit-withdrawal-btn');
    const withdrawalMessage = document.getElementById('withdrawal-message');

    const userWithdrawalHistoryBody = document.getElementById('user-withdrawal-history-body');
    const userWithdrawalHistoryMessage = document.getElementById('user-withdrawal-history-message');

    let currentUser = null;
    let currentUserData = null; // Store user data to access balance

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadWalletData(user.uid);
            loadUserWithdrawalHistory(user.uid);
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

    async function loadWalletData(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
            currentUserData = doc.data(); // Save user data
            if (walletBalance) {
                walletBalance.textContent = `${currentUserData.balance.toFixed(2)} ₺`;
            }

            if (currentUserData.isAdmin) {
                if (adminPanelLink) {
                    adminPanelLink.style.display = 'block';
                }
            }
            // Enable withdrawal button if balance is sufficient (e.g., > min withdrawal)
            if (submitWithdrawalBtn) {
                const minWithdrawal = parseFloat(withdrawalAmountInput.min) || 10.00;
                submitWithdrawalBtn.disabled = currentUserData.balance < minWithdrawal;
                if (currentUserData.balance < minWithdrawal) {
                    withdrawalMessage.textContent = `Minimum çekim miktarı ${minWithdrawal.toFixed(2)} ₺'dir. Mevcut bakiyeniz yetersiz.`;
                    withdrawalMessage.className = 'message-box info-message';
                    withdrawalMessage.style.display = 'block';
                } else {
                    withdrawalMessage.textContent = '';
                    withdrawalMessage.style.display = 'none';
                }
            }

        } else {
            console.error("Kullanıcı verisi bulunamadı!");
            alert("Cüzdan verileriniz yüklenemedi. Lütfen destek ile iletişime geçin.");
            auth.signOut();
        }
    }
    
    // Withdrawal Form Submission
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            withdrawalMessage.textContent = '';
            withdrawalMessage.style.display = 'none';

            if (!currentUser || !currentUserData) {
                withdrawalMessage.textContent = 'Lütfen giriş yaptığınızdan emin olun.';
                withdrawalMessage.className = 'message-box error-message';
                withdrawalMessage.style.display = 'block';
                return;
            }

            const amount = parseFloat(withdrawalAmountInput.value);
            const method = withdrawalMethodInput.value.trim();
            const minWithdrawal = parseFloat(withdrawalAmountInput.min) || 10.00;

            if (isNaN(amount) || amount <= 0) {
                withdrawalMessage.textContent = 'Lütfen geçerli bir miktar girin.';
                withdrawalMessage.className = 'message-box error-message';
                withdrawalMessage.style.display = 'block';
                return;
            }
            if (amount < minWithdrawal) {
                withdrawalMessage.textContent = `Minimum çekim miktarı ${minWithdrawal.toFixed(2)} ₺'dir.`;
                withdrawalMessage.className = 'message-box error-message';
                withdrawalMessage.style.display = 'block';
                return;
            }
            if (amount > currentUserData.balance) {
                withdrawalMessage.textContent = 'Yetersiz bakiye. Çekmek istediğiniz miktar bakiyenizden yüksek.';
                withdrawalMessage.className = 'message-box error-message';
                withdrawalMessage.style.display = 'block';
                return;
            }
            if (!method) {
                withdrawalMessage.textContent = 'Lütfen çekim yönteminizi belirtin (IBAN, Papara, vb.).';
                withdrawalMessage.className = 'message-box error-message';
                withdrawalMessage.style.display = 'block';
                return;
            }

            if (submitWithdrawalBtn) submitWithdrawalBtn.disabled = true;
            withdrawalMessage.textContent = 'Çekim talebiniz gönderiliyor...';
            withdrawalMessage.className = 'message-box info-message';
            withdrawalMessage.style.display = 'block';

            try {
                await db.collection('withdrawalRequests').add({
                    userId: currentUser.uid,
                    username: currentUserData.username || currentUser.email,
                    amount: amount,
                    method: method,
                    status: 'pending', // pending, approved, rejected
                    requestedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                withdrawalForm.reset();
                withdrawalMessage.textContent = 'Çekim talebiniz başarıyla gönderildi! Kısa süre içinde incelenecektir.';
                withdrawalMessage.className = 'message-box success-message';
                loadUserWithdrawalHistory(currentUser.uid); // Refresh history
                setTimeout(() => { withdrawalMessage.textContent = ''; withdrawalMessage.style.display = 'none'; }, 5000);

            } catch (error) {
                console.error("Çekim talebi gönderme hatası: ", error);
                withdrawalMessage.textContent = `Hata: ${error.message}`;
                withdrawalMessage.className = 'message-box error-message';
                withdrawalMessage.style.display = 'block';
            } finally {
                if (submitWithdrawalBtn) submitWithdrawalBtn.disabled = false;
            }
        });
    }

    // Load User Withdrawal History
    async function loadUserWithdrawalHistory(uid) {
        userWithdrawalHistoryBody.innerHTML = '<tr><td colspan="4">Yükleniyor...</td></tr>';
        userWithdrawalHistoryMessage.textContent = '';
        userWithdrawalHistoryMessage.style.display = 'none';

        try {
            const snapshot = await db.collection('withdrawalRequests')
                                     .where('userId', '==', uid)
                                     .orderBy('requestedAt', 'desc')
                                     .get();
            
            userWithdrawalHistoryBody.innerHTML = '';
            if (snapshot.empty) {
                userWithdrawalHistoryMessage.textContent = 'Henüz para çekme talebiniz bulunmamaktadır.';
                userWithdrawalHistoryMessage.className = 'message-box info-message';
                userWithdrawalHistoryMessage.style.display = 'block';
                return;
            }

            snapshot.forEach(doc => {
                const request = doc.data();
                const requestedAt = request.requestedAt && typeof request.requestedAt.toDate === 'function' 
                                    ? new Date(request.requestedAt.toDate()).toLocaleString() 
                                    : 'Tarih Yok';
                
                let statusClass = 'btn-info'; // pending
                if (request.status === 'approved') statusClass = 'btn-success';
                else if (request.status === 'rejected') statusClass = 'btn-danger';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Miktar">${request.amount.toFixed(2)} ₺</td>
                    <td data-label="Yöntem">${request.method}</td>
                    <td data-label="Durum"><span class="btn-small ${statusClass}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></td>
                    <td data-label="Talep Tarihi">${requestedAt}</td>
                `;
                userWithdrawalHistoryBody.appendChild(row);
            });

        } catch (error) {
            console.error("Para çekme geçmişi yüklenirken hata oluştu: ", error);
            userWithdrawalHistoryBody.innerHTML = '<tr><td colspan="4">Para çekme geçmişi yüklenemedi.</td></tr>';
            userWithdrawalHistoryMessage.textContent = 'Hata: Para çekme geçmişi yüklenemedi. ' + error.message;
            userWithdrawalHistoryMessage.className = 'message-box error-message';
            userWithdrawalHistoryMessage.style.display = 'block';
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});