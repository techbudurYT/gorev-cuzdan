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

            // İşlem geçmişini (tamamlanan görevleri) yükle
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
            // Firestore 'in' sorguları 10 elemanla sınırlıdır. Bu yüzden tüm görevleri çekip filtrelemek daha basit olabilir.
            // Büyük projelerde bu yaklaşım optimize edilmelidir.
            const tasksSnapshot = await db.collection('tasks').get();
            const allTasks = {};
            tasksSnapshot.forEach(doc => {
                allTasks[doc.id] = doc.data();
            });

            transactionHistory.innerHTML = '';
            // Görevleri en yeniden eskiye göstermek için ID listesini ters çevir
            taskIds.reverse().forEach(taskId => {
                const task = allTasks[taskId];
                if (task) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${task.title}</span>
                        <span class="history-reward">+${task.reward.toFixed(2)} ₺</span>
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