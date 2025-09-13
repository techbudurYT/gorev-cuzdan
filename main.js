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
            // Auth'da kullanıcı var ama Firestore'da yoksa, bu bir tutarsızlıktır.
            // Sistemi onarmak için kullanıcı belgesini burada oluşturalım.
            console.warn("Firestore'da kullanıcı verisi bulunamadı. Eksik belge oluşturuluyor...");
            const defaultUserData = {
                email: currentUser.email,
                balance: 0,
                completedTasks: 0,
                isAdmin: false,
                uid: currentUser.uid,
                completedTaskIds: []
            };

            try {
                // Eksik olan kullanıcı belgesini Firestore'a ekle
                await userDocRef.set(defaultUserData);
                // Yeni oluşturulan belgeyi tekrar oku
                userDoc = await userDocRef.get();
                userData = userDoc.data();
            } catch (error) {
                console.error("Eksik kullanıcı belgesi oluşturulurken hata oluştu:", error);
                alert("Hesap verileriniz yüklenemedi. Lütfen destek ile iletişime geçin.");
                auth.signOut(); // Güvenlik için çıkış yap
                return; // Fonksiyonun devam etmesini engelle
            }
        } else {
            // Belge varsa, veriyi al
            userData = userDoc.data();
        }

        // UI ve görevleri yükle
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
        taskList.innerHTML = ''; // Listeyi temizle
        const tasksSnapshot = await db.collection('tasks').get();
        const userCompletedTasks = userData.completedTaskIds || [];

        if (tasksSnapshot.empty) {
            taskList.innerHTML = '<p>Şu anda aktif görev bulunmamaktadır.</p>';
            return;
        }
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const taskId = doc.id;
            const isCompleted = userCompletedTasks.includes(taskId);

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
                <button class="btn-task" id="${taskId}" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? 'Tamamlandı' : 'Görevi Yap'}
                </button>
            `;
            taskList.appendChild(taskCard);

            if(!isCompleted) {
                 document.getElementById(taskId).addEventListener('click', () => completeTask(taskId, task.reward));
            }
        });
    }

    async function completeTask(taskId, reward) {
        const taskButton = document.getElementById(taskId);
        taskButton.disabled = true;
        taskButton.textContent = 'İşleniyor...';

        const userDocRef = db.collection('users').doc(currentUser.uid);

        try {
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists) {
                    throw "Kullanıcı belgesi bulunamadı!";
                }

                const newBalance = (userDoc.data().balance || 0) + reward;
                const newCompletedTasks = (userDoc.data().completedTasks || 0) + 1;
                const completedTaskIds = userDoc.data().completedTaskIds || [];
                
                if (completedTaskIds.includes(taskId)) {
                    throw "Bu görev zaten tamamlanmış.";
                }

                completedTaskIds.push(taskId);

                transaction.update(userDocRef, {
                    balance: newBalance,
                    completedTasks: newCompletedTasks,
                    completedTaskIds: completedTaskIds
                });
            });

            taskButton.textContent = 'Tamamlandı';
            // Yerel veriyi ve UI'ı güncelle
            userData.balance += reward;
            userData.completedTasks += 1;
            (userData.completedTaskIds = userData.completedTaskIds || []).push(taskId);
            updateUI();

        } catch (error) {
            console.error("Görev tamamlama hatası: ", error);
            taskButton.textContent = 'Hata Oluştu';
            setTimeout(() => { // Kullanıcıya tekrar deneme şansı ver
                taskButton.disabled = false;
                taskButton.textContent = 'Görevi Yap';
            }, 2000);
        }
    }

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
});