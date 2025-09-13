
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

            loadTransactionHistory(userData.completedTaskIds || []);
        } else {
            console.error("Kullanıcı verisi bulunamadı!");
        }
    }
    
    async function loadTransactionHistory(taskIds) {
        transactionHistory.innerHTML = '<li>Yükleniyor...</li>';
        if (taskIds.length === 0) {
            transactionHistory.innerHTML = '<li>Henüz bir işlem yok.</li>';
            return;
        }

        try {
            // Task IDs'nin benzersiz olduğundan ve sıranın önemli olduğundan emin olalım
            const uniqueTaskIds = [...new Set(taskIds)]; // Yinelenen ID'leri kaldır

            // Firebase 'in' sorguları 10 elemanla sınırlıdır.
            // Eğer taskIds çok büyük olursa birden fazla sorgu yapmak gerekir.
            // Basitlik adına, şimdilik tüm görevleri çekip filtreleyelim.
            const tasksSnapshot = await db.collection('tasks').get();
            const allTasks = {};
            tasksSnapshot.forEach(doc => {
                allTasks[doc.id] = doc.data();
            });

            transactionHistory.innerHTML = '';
            
            // Kullanıcının tamamladığı görevlerin kaydını ters sırada göster (en yeni en üstte)
            // Bu, 'completedTaskIds' dizisinin sırasına göre yapılır, bu diziye eklenme sırası önemli olmalıdır.
            const reversedTaskIds = [...taskIds].reverse(); 

            reversedTaskIds.forEach(taskId => {
                const task = allTasks[taskId];
                if (task) {
                    const li = document.createElement('li');
                    const timestamp = task.completedAt ? new Date(task.completedAt.toDate()).toLocaleString() : 'Tarih Yok';
                    li.innerHTML = `
                        <span>${task.title}</span>
                        <div>
                            <span class="history-reward">+${task.reward.toFixed(2)} ₺</span>
                            <span class="history-date">${timestamp}</span>
                        </div>
                    `;
                    transactionHistory.appendChild(li);
                }
            });

        } catch (error) {
            console.error("İşlem geçmişi yüklenemedi:", error);
            transactionHistory.innerHTML = '<li>Geçmiş yüklenirken bir hata oluştu.</li>';
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});