document.addEventListener('DOMContentLoaded', () => {
    const walletBalance = document.getElementById('wallet-balance');
    // const transactionHistory = document.getElementById('transaction-history'); // Kaldırıldı
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');

    auth.onAuthStateChanged(user => {
        if (user) {
            loadWalletData(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    async function loadWalletData(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
            const userData = doc.data();
            if (walletBalance) {
                walletBalance.textContent = `${userData.balance.toFixed(2)} ₺`;
            }

            if (userData.isAdmin) {
                if (adminPanelLink) {
                    adminPanelLink.style.display = 'block';
                }
            }

            // loadTransactionHistory(uid); // Görev geçmişi ayrı bir sayfaya taşındığı için kaldırıldı
        } else {
            console.error("Kullanıcı verisi bulunamadı!");
        }
    }
    
    // loadTransactionHistory fonksiyonu task-history.js'e taşındı
    /*
    async function loadTransactionHistory(uid) {
        if (transactionHistory) transactionHistory.innerHTML = '<li>Yükleniyor...</li>';
       
        try {
            const approvedProofsSnapshot = await db.collection('taskProofs')
                                                   .where('userId', '==', uid)
                                                   .where('status', '==', 'approved')
                                                   .orderBy('reviewedAt', 'desc')
                                                   .get();

            if (approvedProofsSnapshot.empty) {
                if (transactionHistory) transactionHistory.innerHTML = '<li>Henüz onaylanmış bir işleminiz yok.</li>';
                return;
            }

            if (transactionHistory) transactionHistory.innerHTML = '';
            
            for (const doc of approvedProofsSnapshot.docs) {
                const proofData = doc.data();
                
                const taskDoc = await db.collection('tasks').doc(proofData.taskId).get();
                const taskData = taskDoc.exists ? taskDoc.data() : { title: 'Bilinmeyen Görev', reward: 0 };


                const li = document.createElement('li');
                const timestamp = proofData.reviewedAt && typeof proofData.reviewedAt.toDate === 'function' 
                                  ? new Date(proofData.reviewedAt.toDate()).toLocaleString() 
                                  : 'Tarih Yok';
                li.innerHTML = `
                    <span>${taskData.title}</span>
                    <div>
                        <span class="history-reward">+${taskData.reward.toFixed(2)} ₺</span>
                        <span class="history-date">${timestamp}</span>
                    </div>
                `;
                if (transactionHistory) transactionHistory.appendChild(li);
            }

        } catch (error) {
            console.error("İşlem geçmişi yüklenemedi:", error);
            if (transactionHistory) transactionHistory.innerHTML = '<li>Geçmiş yüklenirken bir hata oluştu.</li>';
        }
    }
    */

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});