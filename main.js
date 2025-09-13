document.addEventListener('DOMContentLoaded', () => {
    const balanceDisplay = document.getElementById('balance-display');
    const tasksCompletedDisplay = document.getElementById('tasks-completed-display');
    const taskList = document.getElementById('task-list');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');

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

        if (tasksSnapshot.empty) {
            taskList.innerHTML = '<p>Şu anda aktif görev bulunmamaktadır.</p>';
            return;
        }
        
        let availableTasks = 0;
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const taskId = doc.id;
            const isCompleted = userCompletedTasks.includes(taskId);

            // Sadece tamamlanmamış görevler için kart oluştur
            if (!isCompleted) {
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
                    <button class="btn-task" id="${taskId}">Görevi Yap</button>
                `;
                taskList.appendChild(taskCard);

                document.getElementById(taskId).addEventListener('click', () => completeTask(taskId, task.reward));
            }
        });

        // Eğer gösterilecek hiç görev kalmadıysa bilgilendirme mesajı göster
        if (availableTasks === 0) {
            taskList.innerHTML = '<p>Tebrikler! Mevcut tüm görevleri tamamladınız.</p>';
        }
    }

    async function completeTask(taskId, reward) {
        const taskButton = document.getElementById(taskId);
        if (taskButton) {
            taskButton.disabled = true;
            taskButton.textContent = 'İşleniyor...';
        }

        const userDocRef = db.collection('users').doc(currentUser.uid);

        try {
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists) {
                    throw "Kullanıcı belgesi bulunamadı!";
                }

                const currentCompletedTasks = userDoc.data().completedTaskIds || [];
                if (currentCompletedTasks.includes(taskId)) {
                    throw "Bu görev zaten tamamlanmış.";
                }

                const newBalance = (userDoc.data().balance || 0) + reward;
                const newCompletedTasks = (userDoc.data().completedTasks || 0) + 1;
                const newCompletedTaskIds = [...currentCompletedTasks, taskId];

                transaction.update(userDocRef, {
                    balance: newBalance,
                    completedTasks: newCompletedTasks,
                    completedTaskIds: newCompletedTaskIds
                });
            });

            // Yerel veriyi ve UI'ı güncelle
            userData.balance += reward;
            userData.completedTasks += 1;
            userData.completedTaskIds.push(taskId);
            updateUI();
            
            // Görev kartını DOM'dan kaldır
            const taskCard = taskButton.closest('.task-card');
            if (taskCard) {
                taskCard.remove();
            }

            // Eğer görev listesi boşaldıysa mesajı güncelle
            if (taskList.children.length === 0) {
                 taskList.innerHTML = '<p>Tebrikler! Mevcut tüm görevleri tamamladınız.</p>';
            }

        } catch (error) {
            console.error("Görev tamamlama hatası: ", error);
            if (taskButton) {
                taskButton.textContent = 'Hata Oluştu';
                setTimeout(() => {
                    taskButton.disabled = false;
                    taskButton.textContent = 'Görevi Yap';
                }, 2000);
            }
        }
    }

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
});