document.addEventListener('DOMContentLoaded', () => {
    const balanceDisplay = document.getElementById('balance-display');
    const tasksCompletedDisplay = document.getElementById('tasks-completed-display');
    const taskList = document.getElementById('task-list');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    let currentUser = null;
    let userData = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserDataAndTasks();
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

    async function loadUserDataAndTasks() {
        const userDocRef = db.collection('users').doc(currentUser.uid);
        let userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            console.warn("Firestore'da kullanıcı verisi bulunamadı. Eksik belge oluşturuluyor...");
            const defaultUserData = {
                email: currentUser.email,
                username: currentUser.email.split('@')[0],
                balance: 0,
                completedTasks: 0,
                isAdmin: false,
                uid: currentUser.uid,
                completedTaskIds: []
            };

            try {
                await userDocRef.set(defaultUserData);
                userDoc = await userDocRef.get();
                userData = userDoc.data();
            } catch (error) {
                console.error("Eksik kullanıcı belgesi oluşturulurken hata oluştu:", error);
                alert("Hesap verileriniz yüklenemedi. Lütfen destek ile iletişime geçin.");
                auth.signOut();
                return;
            }
        } else {
            userData = userDoc.data();
        }

        updateUI();
        
        if(userData && userData.isAdmin) {
            adminPanelLink.style.display = 'block';
        }
        
        loadTasks();
    }

    function updateUI() {
        if (userData) {
            balanceDisplay.textContent = `${userData.balance.toFixed(2)} ₺`;
            tasksCompletedDisplay.textContent = userData.completedTasks;
        }
    }
    
    async function loadTasks() {
        taskList.innerHTML = ''; 
        const tasksSnapshot = await db.collection('tasks').get();
        const userCompletedTasks = userData.completedTaskIds || [];

        // Fetch all pending proofs for the current user once
        const allPendingProofsSnapshot = await db.collection('taskProofs')
                                                .where('userId', '==', currentUser.uid)
                                                .where('status', '==', 'pending')
                                                .get();
        const userPendingTaskIds = new Set();
        allPendingProofsSnapshot.forEach(doc => {
            userPendingTaskIds.add(doc.data().taskId);
        });

        if (tasksSnapshot.empty) {
            taskList.innerHTML = '<p class="info-message">Şu anda aktif görev bulunmamaktadır.</p>';
            return;
        }
        
        let availableTasks = 0;
        for (const doc of tasksSnapshot.docs) {
            const task = doc.data();
            const taskId = doc.id;
            const isCompleted = userCompletedTasks.includes(taskId);
            const hasPendingProof = userPendingTaskIds.has(taskId);

            if (!isCompleted && !hasPendingProof) {
                availableTasks++;
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';

                taskCard.innerHTML = `
                    <img src="img/logos/${task.icon || 'other.png'}" alt="${task.title}" class="task-icon">
                    <div class="task-info">
                        <h4>${task.title}</h4>
                        <p>${task.description}</p>
                    </div>
                    <div class="task-reward">
                        <span>+${task.reward.toFixed(2)} ₺</span>
                    </div>
                    <a href="task-detail.html?taskId=${taskId}" class="btn-task">Görevi Yap</a>
                `;
                taskList.appendChild(taskCard);
            } else if (hasPendingProof) {
                // Bekleyen kanıtı olan görevler için farklı bir kart veya durum göster
                availableTasks++;
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card pending-task';
                taskCard.innerHTML = `
                    <img src="img/logos/${task.icon || 'other.png'}" alt="${task.title}" class="task-icon">
                    <div class="task-info">
                        <h4>${task.title}</h4>
                        <p>${task.description}</p>
                    </div>
                    <div class="task-reward">
                        <span>+${task.reward.toFixed(2)} ₺</span>
                    </div>
                    <button class="btn-task btn-info" disabled>Onay Bekliyor</button>
                `;
                taskList.appendChild(taskCard);
            }
        }

        // Eğer gösterilecek hiç görev kalmadıysa bilgilendirme mesajı göster
        if (availableTasks === 0) {
            taskList.innerHTML = '<p class="info-message">Tebrikler! Mevcut tüm görevleri tamamladınız veya onay bekleyen görevleriniz var.</p>';
        }
    }

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
});