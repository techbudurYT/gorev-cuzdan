document.addEventListener('DOMContentLoaded', () => {
    const balanceDisplay = document.getElementById('balance-display');
    const tasksCompletedDisplay = document.getElementById('tasks-completed-display');
    const taskList = document.getElementById('task-list');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const categoryFilter = document.getElementById('category-filter'); // Yeni: Kategori filtresi

    let currentUser = null;
    let userData = null;
    let allTasks = []; // Tüm görevleri saklamak için

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
        
        await fetchAndDisplayTasks(); // Tüm görevleri çek ve görüntüle
    }

    function updateUI() {
        if (userData) {
            balanceDisplay.textContent = `${userData.balance.toFixed(2)} ₺`;
            tasksCompletedDisplay.textContent = userData.completedTasks;
        }
    }
    
    async function fetchAndDisplayTasks() {
        taskList.innerHTML = ''; 
        const tasksSnapshot = await db.collection('tasks').get();
        allTasks = []; // Önceki görevleri temizle
        tasksSnapshot.forEach(doc => {
            allTasks.push({ id: doc.id, ...doc.data() });
        });

        filterAndRenderTasks();
    }

    function filterAndRenderTasks() {
        taskList.innerHTML = ''; 
        const userCompletedTasks = userData.completedTaskIds || [];
        const selectedCategory = categoryFilter.value;

        // Fetch all pending proofs for the current user once
        // Bu kısım optimize edilebilir, her filtrelemede tekrar çekmek yerine bir kere çekilip saklanabilir.
        // Ancak mevcut yapı içinde hızlı çalışması için bu şekilde bırakıldı.
        db.collection('taskProofs')
            .where('userId', '==', currentUser.uid)
            .where('status', '==', 'pending')
            .get()
            .then(allPendingProofsSnapshot => {
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

                    if (!isCompleted && !hasPendingProof && matchesCategory) {
                        availableTasksCount++;
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
                    } else if (hasPendingProof && matchesCategory) {
                        availableTasksCount++;
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
                });

                if (availableTasksCount === 0) {
                    taskList.innerHTML = '<p class="info-message">Tebrikler! Mevcut tüm görevleri tamamladınız veya onay bekleyen görevleriniz var ya da seçilen kategoriye uygun görev bulunmamaktadır.</p>';
                }
            })
            .catch(error => {
                console.error("Bekleyen kanıtlar yüklenirken hata oluştu: ", error);
                taskList.innerHTML = '<p class="error-message">Görevler yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>';
            });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndRenderTasks);
    }

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
});