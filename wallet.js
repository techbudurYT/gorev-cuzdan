document.addEventListener('DOMContentLoaded', () => {
    const walletBalance = document.getElementById('wallet-balance');
    const transactionHistory = document.getElementById('transaction-history');
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
            walletBalance.textContent = `${userData.balance.toFixed(2)} ₺`;

            if (userData.isAdmin) {
                adminPanelLink.style.display = 'block';
            }

            loadTransactionHistory(uid); // Kullanıcı UID'sine göre geçmişi yükle
        } else {
            console.error("Kullanıcı verisi bulunamadı!");
        }
    }
    
    async function loadTransactionHistory(uid) {
        transactionHistory.innerHTML = '<li>Yükleniyor...</li>';
       
        try {
            // Sadece 'approved' durumdaki ve bu kullanıcıya ait kanıtları çek
            const approvedProofsSnapshot = await db.collection('taskProofs')
                                                   .where('userId', '==', uid)
                                                   .where('status', '==', 'approved')
                                                   .orderBy('reviewedAt', 'desc') // Onaylanma tarihine göre sırala
                                                   .get();

            if (approvedProofsSnapshot.empty) {
                transactionHistory.innerHTML = '<li>Henüz onaylanmış bir işleminiz yok.</li>';
                return;
            }

            transactionHistory.innerHTML = '';
            
            for (const doc of approvedProofsSnapshot.docs) {
                const proofData = doc.data();
                // Görev detaylarını (ödül bilgisini) taskProof'tan veya ayrı bir tasks koleksiyonundan alabiliriz.
                // admin.js'de taskProof'a taskTitle eklediğimiz için buradan çekebiliriz.
                // Eğer reward bilgisi de eklenseydi daha kolay olurdu, şimdilik task koleksiyonundan çekelim.
                
                const taskDoc = await db.collection('tasks').doc(proofData.taskId).get();
                const taskData = taskDoc.exists ? taskDoc.data() : { title: 'Bilinmeyen Görev', reward: 0 };


                const li = document.createElement('li');
                const timestamp = proofData.reviewedAt ? new Date(proofData.reviewedAt.toDate()).toLocaleString() : 'Tarih Yok';
                li.innerHTML = `
                    <span>${taskData.title}</span>
                    <div>
                        <span class="history-reward">+${taskData.reward.toFixed(2)} ₺</span>
                        <span class="history-date">${timestamp}</span>
                    </div>
                `;
                transactionHistory.appendChild(li);
            }

        } catch (error) {
            console.error("İşlem geçmişi yüklenemedi:", error);
            transactionHistory.innerHTML = '<li>Geçmiş yüklenirken bir hata oluştu.</li>';
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});