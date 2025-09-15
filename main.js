document.addEventListener('DOMContentLoaded', () => {
    const balanceDisplay = document.getElementById('balance-display');
    const tasksCompletedDisplay = document.getElementById('tasks-completed-display');
    const taskList = document.getElementById('task-list');
    const taskListMessage = document.getElementById('task-list-message');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const categoryFilter = document.getElementById('category-filter');

    let currentUser = null;
    let userData = null;
    let allTasks = []; 

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
        
        await fetchAndDisplayTasks(); 
    }

    function updateUI() {
        if (userData) {
            balanceDisplay.textContent = `${userData.balance.toFixed(2)} ₺`;
            tasksCompletedDisplay.textContent = userData.completedTasks;
        }
    }
    
    async function fetchAndDisplayTasks() {
        taskList.innerHTML = ''; 
        taskListMessage.style.display = 'none';

        try {
            const tasksSnapshot = await db.collection('tasks').get();
            allTasks = []; 
            tasksSnapshot.forEach(doc => {
                allTasks.push({ id: doc.id, ...doc.data() });
            });
            filterAndRenderTasks();
        } catch (error) {
            console.error("Görevler yüklenirken hata oluştu: ", error);
            taskListMessage.textContent = 'Görevler yüklenemedi. Lütfen daha sonra tekrar deneyin.';
            taskListMessage.className = 'message-box error-message';
            taskListMessage.style.display = 'block';
        }
    }

    async function filterAndRenderTasks() {
        taskList.innerHTML = ''; 
        taskListMessage.style.display = 'none';

        const userCompletedTasks = userData.completedTaskIds || [];
        const selectedCategory = categoryFilter.value;

        try {
            const allPendingProofsSnapshot = await db.collection('taskProofs')
                                                  .where('userId', '==', currentUser.uid)
                                                  .where('status', '==', 'pending')
                                                  .get();
            const userPendingTaskIds = new Set();
            allPendingProofsSnapshot.forEach(doc => {
                userPendingTaskIds.add(doc.data().taskId);
            });

            let availableTasksCount = 0;
            allTasks.forEach(task => {
                const taskId = task.id;
                const isCompleted = userCompletedTasks.includes(taskId);
                const hasPendingProof = userPendingTaskIds.has(taskId);

                const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;

                const currentStock = task.stock - (task.completedCount || 0);
                const isOutOfStock = task.stock > 0 && currentStock <= 0;

                if (matchesCategory && !isOutOfStock) { // Display tasks if category matches and not out of stock
                    const taskCard = document.createElement('div');
                    taskCard.className = 'task-card';
                    
                    if (isCompleted) {
                        taskCard.classList.add('completed-task');
                        taskCard.innerHTML = `
                            <img src="img/logos/${task.icon || 'other.png'}" alt="${task.title}" class="task-icon">
                            <div class="task-info">
                                <h4>${task.title}</h4>
                                <p>${task.description}</p>
                            </div>
                            <div class="task-reward">
                                <span>+${task.reward.toFixed(2)} ₺</span>
                            </div>
                            <button class="btn-task btn-success" disabled>Tamamlandı</button>
                        `;
                    } else if (hasPendingProof) {
                        taskCard.classList.add('pending-task');
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
                    } else {
                        taskCard.innerHTML = `
                            <img src="img/logos/${task.icon || 'other.png'}" alt="${task.title}" class="task-icon">
                            <div class="task-info">
                                <h4>${task.title}</h4>
                                <p>${task.description}</p>
                                ${task.stock > 0 ? `<p class="task-stock-info">Kalan: ${currentStock}</p>` : ''}
                            </div>
                            <div class="task-reward">
                                <span>+${task.reward.toFixed(2)} ₺</span>
                            </div>
                            <a href="task-detail.html?taskId=${taskId}" class="btn-task">Görevi Yap</a>
                        `;
                    }
                    taskList.appendChild(taskCard);
                    availableTasksCount++;
                }
            });

            if (availableTasksCount === 0) {
                taskListMessage.textContent = 'Uygun görev bulunmamaktadır.';
                taskListMessage.className = 'message-box info-message';
                taskListMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Görevler filtrelenirken veya render edilirken hata oluştu: ", error);
            taskListMessage.textContent = 'Görevler yüklenemedi. Lütfen daha sonra tekrar deneyin.';
            taskListMessage.className = 'message-box error-message';
            taskListMessage.style.display = 'block';
        }
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndRenderTasks);
    }

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
});