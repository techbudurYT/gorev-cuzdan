document.addEventListener('DOMContentLoaded', () => {
const taskHistoryList = document.getElementById('task-history-list');
const taskHistoryLoading = document.getElementById('task-history-loading');
const adminPanelLink = document.getElementById('admin-panel-link');
const logoutBtn = document.getElementById('logout-btn');
code
Code
auth.onAuthStateChanged(user => {
    if (user) {
        checkAdminStatus(user.uid);
        loadTaskHistory(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

async function checkAdminStatus(uid) {
    const userDocRef = db.collection('users').doc(uid);
    const doc = await userDocRef.get();
    if (doc.exists && doc.data().isAdmin) {
        if (adminPanelLink) {
            adminPanelLink.style.display = 'block';
        }
    }
}

async function loadTaskHistory(uid) {
    if (taskHistoryList) taskHistoryList.innerHTML = '';
    if (taskHistoryLoading) {
        taskHistoryLoading.textContent = 'Görev geçmişi yükleniyor...';
        taskHistoryLoading.className = 'info-message';
        taskHistoryLoading.style.display = 'block';
    }

    try {
        // Sadece 'approved' durumdaki ve bu kullanıcıya ait kanıtları çek
        const approvedProofsSnapshot = await db.collection('taskProofs')
                                               .where('userId', '==', uid)
                                               .where('status', '==', 'approved')
                                               .orderBy('reviewedAt', 'desc') // Onaylanma tarihine göre sırala
                                               .get();

        if (taskHistoryLoading) taskHistoryLoading.style.display = 'none';

        if (approvedProofsSnapshot.empty) {
            if (taskHistoryList) taskHistoryList.innerHTML = '<p class="info-message">Henüz onaylanmış bir göreviniz yok.</p>';
            return;
        }

        if (taskHistoryList) taskHistoryList.innerHTML = ''; // Clear loading message and add items
        
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
            if (taskHistoryList) taskHistoryList.appendChild(li);
        }

    } catch (error) {
        console.error("Görev geçmişi yüklenemedi:", error);
        if (taskHistoryLoading) {
            taskHistoryLoading.textContent = 'Görev geçmişi yüklenirken bir hata oluştu.';
            taskHistoryLoading.className = 'error-message';
            taskHistoryLoading.style.display = 'block';
        }
        if (taskHistoryList) taskHistoryList.innerHTML = ''; // Clear any partial content
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.signOut());
}
});
