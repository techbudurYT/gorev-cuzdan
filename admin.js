
document.addEventListener('DOMContentLoaded', () => {
    const addTaskForm = document.getElementById('add-task-form');
    const addTaskMessage = document.getElementById('add-task-message');
    const logoutBtn = document.getElementById('logout-btn');
    const userManagementBody = document.getElementById('user-management-body');
    const userSearchInput = document.getElementById('user-search');
    const userEditPanel = document.getElementById('user-edit-panel');
    const editingUsername = document.getElementById('editing-username');
    const editUserForm = document.getElementById('edit-user-form');
    const editUserUid = document.getElementById('edit-user-uid');
    const editUsername = document.getElementById('edit-username');
    const editEmail = document.getElementById('edit-email');
    const editBalance = document.getElementById('edit-balance');
    const editCompletedTasks = document.getElementById('edit-completed-tasks');
    const editIsAdmin = document.getElementById('edit-is-admin');
    const editUserMessage = document.getElementById('edit-user-message');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const deleteUserBtn = document.getElementById('delete-user-btn');

    const taskManagementBody = document.getElementById('task-management-body');
    const taskEditPanel = document.getElementById('task-edit-panel');
    const editingTaskTitleDisplay = document.getElementById('editing-task-title-display');
    const editTaskForm = document.getElementById('edit-task-form');
    const editTaskId = document.getElementById('edit-task-id');
    const editTaskTitle = document.getElementById('edit-task-title');
    const editTaskDescription = document.getElementById('edit-task-description');
    const editTaskReward = document.getElementById('edit-task-reward');
    const editTaskStock = document.getElementById('edit-task-stock');
    const editTaskProofCount = document.getElementById('edit-task-proof-count');
    const editTaskCategory = document.getElementById('edit-task-category');
    const editTaskMessage = document.getElementById('edit-task-message');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task');

    const addFaqForm = document.getElementById('add-faq-form');
    const addFaqMessage = document.getElementById('add-faq-message');
    const faqManagementBody = document.getElementById('faq-management-body');

    const taskProofsBody = document.getElementById('task-proofs-body');
    const taskProofsMessage = document.getElementById('task-proofs-message');

    const supportTicketsBody = document.getElementById('support-tickets-body');
    const supportTicketsMessage = document.getElementById('support-tickets-message');

    const withdrawalRequestsBody = document.getElementById('withdrawal-requests-body');
    const withdrawalRequestsMessage = document.getElementById('withdrawal-requests-message');

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');


    let allUsers = [];
    let allTasks = {}; // Görev detaylarını depolamak için

    // Admin kontrolü
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (!doc.exists || !doc.data().isAdmin) {
                    alert("Bu alana erişim yetkiniz yok.");
                    window.location.href = 'my-tasks.html';
                } else {
                    loadUsers();
                    loadTasksForAdmin();
                    loadFaqs();
                    loadTaskProofs();
                    loadSupportTickets();
                    loadWithdrawalRequests();
                }
            }).catch(error => {
                console.error("Admin yetkisi kontrol edilirken hata oluştu: ", error);
                alert("Yetki kontrolünde bir hata oluştu.");
                auth.signOut();
            });
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

    // Yeni Görev Ekleme
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const reward = parseFloat(document.getElementById('task-reward').value);
        const stock = parseInt(document.getElementById('task-stock').value);
        const proofCount = parseInt(document.getElementById('task-proof-count').value);
        const category = document.getElementById('task-category').value; 

        addTaskMessage.textContent = 'Görev ekleniyor...';
        addTaskMessage.className = 'message-box info-message';

        db.collection('tasks').add({
            title: title,
            description: description,
            reward: reward,
            stock: stock, 
            completedCount: 0, 
            proofCount: proofCount, 
            category: category, 
            icon: category + '.png', // Kategoriye göre ikon ismi belirle
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            addTaskMessage.textContent = 'Görev başarıyla eklendi!';
            addTaskMessage.className = 'message-box success-message';
            addTaskForm.reset();
            loadTasksForAdmin(); 
            setTimeout(() => addTaskMessage.textContent = '', 3000);
        })
        .catch(error => {
            console.error("Görev ekleme hatası: ", error);
            addTaskMessage.textContent = 'Bir hata oluştu: ' + error.message;
            addTaskMessage.className = 'message-box error-message';
        });
    });

    // Görev Yönetimi (Admin)
    async function loadTasksForAdmin() {
        taskManagementBody.innerHTML = '<tr><td colspan="6">Yükleniyor...</td></tr>';
        try {
            const snapshot = await db.collection('tasks').orderBy('createdAt', 'desc').get();
            taskManagementBody.innerHTML = '';
            if (snapshot.empty) {
                taskManagementBody.innerHTML = '<tr><td colspan="6">Görev bulunamadı.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const task = doc.data();
                const taskId = doc.id;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${task.title}</td>
                    <td>${task.category || 'Belirtilmemiş'}</td> 
                    <td>${task.reward.toFixed(2)} ₺</td>
                    <td>${task.stock === 0 ? 'Sınırsız' : task.stock}</td>
                    <td>${task.completedCount || 0}</td>
                    <td class="action-buttons">
                        <button class="btn-small btn-primary edit-task-btn" data-id="${taskId}">Düzenle</button>
                        <button class="btn-small btn-danger delete-task-btn" data-id="${taskId}">Sil</button>
                    </td>
                `;
                taskManagementBody.appendChild(row);
            });

            document.querySelectorAll('.edit-task-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const taskIdToEdit = e.target.dataset.id;
                    openEditTaskPanel(taskIdToEdit);
                });
            });

            document.querySelectorAll('.delete-task-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const taskIdToDelete = e.target.dataset.id;
                    if (confirm('Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
                        try {
                            await db.collection('tasks').doc(taskIdToDelete).delete();
                            loadTasksForAdmin(); 
                            alert("Görev başarıyla silindi!");
                        } catch (error) {
                            console.error("Görev silinirken hata oluştu: ", error);
                            alert("Görev silinirken bir hata oluştu.");
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Görevler yüklenirken hata oluştu: ", error);
            taskManagementBody.innerHTML = '<tr><td colspan="6">Görevler yüklenemedi.</td></tr>';
        }
    }

    async function openEditTaskPanel(taskId) {
        taskEditPanel.classList.add('content-hidden'); // Hide until loaded
        editTaskMessage.textContent = 'Görev bilgileri yükleniyor...';
        editTaskMessage.className = 'message-box info-message';
        editTaskMessage.style.display = 'block';

        try {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                throw new Error("Görev bulunamadı!");
            }
            const taskData = taskDoc.data();

            editingTaskTitleDisplay.textContent = taskData.title;
            editTaskId.value = taskId;
            editTaskTitle.value = taskData.title;
            editTaskDescription.value = taskData.description;
            editTaskReward.value = taskData.reward.toFixed(2);
            editTaskStock.value = taskData.stock;
            editTaskProofCount.value = taskData.proofCount;
            editTaskCategory.value = taskData.category || 'other';
            
            taskEditPanel.classList.remove('content-hidden');
            editTaskMessage.textContent = '';
            editTaskMessage.style.display = 'none';
        } catch (error) {
            console.error("Görev düzenleme paneli açılırken hata oluştu: ", error);
            editTaskMessage.textContent = `Hata: ${error.message}`;
            editTaskMessage.className = 'message-box error-message';
            editTaskMessage.style.display = 'block';
        }
    }

    cancelEditTaskBtn.addEventListener('click', () => {
        taskEditPanel.classList.add('content-hidden');
    });

    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskIdToUpdate = editTaskId.value;
        const updatedTitle = editTaskTitle.value;
        const updatedDescription = editTaskDescription.value;
        const updatedReward = parseFloat(editTaskReward.value);
        const updatedStock = parseInt(editTaskStock.value);
        const updatedProofCount = parseInt(editTaskProofCount.value);
        const updatedCategory = editTaskCategory.value;

        editTaskMessage.textContent = 'Kaydediliyor...';
        editTaskMessage.className = 'message-box info-message';
        editTaskMessage.style.display = 'block';

        try {
            await db.collection('tasks').doc(taskIdToUpdate).update({
                title: updatedTitle,
                description: updatedDescription,
                reward: updatedReward,
                stock: updatedStock,
                proofCount: updatedProofCount,
                category: updatedCategory,
                icon: updatedCategory + '.png',
            });
            editTaskMessage.textContent = 'Görev başarıyla güncellendi!';
            editTaskMessage.className = 'message-box success-message';
            setTimeout(() => {
                taskEditPanel.classList.add('content-hidden');
                loadTasksForAdmin();
            }, 1500);
        } catch (error) {
            console.error("Görev güncelleme hatası: ", error);
            editTaskMessage.textContent = `Hata: ${error.message}`;
            editTaskMessage.className = 'message-box error-message';
            editTaskMessage.style.display = 'block';
        }
    });


    // Kullanıcı Yönetimi
    async function loadUsers() {
        userManagementBody.innerHTML = '<tr><td colspan="6">Yükleniyor...</td></tr>';
        try {
            const snapshot = await db.collection('users').get();
            allUsers = [];
            snapshot.forEach(doc => {
                allUsers.push({ id: doc.id, ...doc.data() });
            });
            displayUsers(allUsers);
        } catch (error) {
            console.error("Kullanıcılar yüklenirken hata oluştu: ", error);
            userManagementBody.innerHTML = '<tr><td colspan="6">Kullanıcılar yüklenemedi.</td></tr>';
        }
    }

    function displayUsers(users) {
        userManagementBody.innerHTML = '';
        if (users.length === 0) {
            userManagementBody.innerHTML = '<tr><td colspan="6">Kullanıcı bulunamadı.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Kullanıcı Adı">${user.username || 'N/A'}</td>
                <td data-label="E-posta">${user.email}</td>
                <td data-label="Bakiye">${user.balance.toFixed(2)} ₺</td>
                <td data-label="Tam. Görev">${user.completedTasks}</td>
                <td data-label="Admin">${user.isAdmin ? '<i class="fas fa-check-circle success-color"></i>' : '<i class="fas fa-times-circle error-color"></i>'}</td>
                <td data-label="Aksiyonlar" class="action-buttons">
                    <button class="btn-small btn-primary edit-user-btn" data-uid="${user.id}">Düzenle</button>
                </td>
            `;
            userManagementBody.appendChild(row);
        });

        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const uid = e.target.dataset.uid;
                openEditUserPanel(uid);
            });
        });
    }

    userSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
        displayUsers(filteredUsers);
    });

    async function openEditUserPanel(uid) {
        const user = allUsers.find(u => u.id === uid);
        if (!user) {
            alert('Kullanıcı bulunamadı!');
            return;
        }

        editingUsername.textContent = user.username || user.email;
        editUserUid.value = user.id;
        editUsername.value = user.username || '';
        editEmail.value = user.email;
        editBalance.value = user.balance.toFixed(2);
        editCompletedTasks.value = user.completedTasks;
        editIsAdmin.checked = user.isAdmin;
        
        userEditPanel.classList.remove('content-hidden');
        editUserMessage.textContent = ''; 
        editUserMessage.style.display = 'none';
        editUsername.disabled = false; // Adminler kullanıcı adı değiştirebilmeli
    }

    cancelEditBtn.addEventListener('click', () => {
        userEditPanel.classList.add('content-hidden');
    });

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uid = editUserUid.value;
        const newUsername = editUsername.value.trim().toLowerCase();
        const newBalance = parseFloat(editBalance.value);
        const newCompletedTasks = parseInt(editCompletedTasks.value);
        const newIsAdmin = editIsAdmin.checked;

        editUserMessage.textContent = 'Kaydediliyor...';
        editUserMessage.className = 'message-box info-message';
        editUserMessage.style.display = 'block';

        try {
            const userDocRef = db.collection('users').doc(uid);
            const batch = db.batch();
            const originalUser = allUsers.find(u => u.id === uid);

            if (!originalUser) {
                throw new Error("Orijinal kullanıcı verisi bulunamadı.");
            }

            // Kullanıcı adı değiştiyse kontrol et
            if (originalUser.username !== newUsername) {
                if (!/^[a-zA-Z0-9_]{3,15}$/.test(newUsername)) {
                    throw new Error('Kullanıcı adı 3-15 karakter uzunluğunda olmalı ve sadece harf, rakam veya _ içerebilir.');
                }

                const usernameDocRef = db.collection('usernames').doc(newUsername);
                const usernameDoc = await usernameDocRef.get();
                if (usernameDoc.exists && usernameDoc.data().uid !== uid) { // Başka birine ait mi diye kontrol et
                    throw new Error('Bu kullanıcı adı zaten alınmış.');
                }
                
                // Eski kullanıcı adını sil (eğer varsa) ve yenisini ekle
                if (originalUser.username) {
                    batch.delete(db.collection('usernames').doc(originalUser.username));
                }
                batch.set(usernameDocRef, { uid: uid });
            }

            batch.update(userDocRef, {
                username: newUsername,
                balance: newBalance,
                completedTasks: newCompletedTasks,
                isAdmin: newIsAdmin
            });

            await batch.commit();

            editUserMessage.textContent = 'Kullanıcı başarıyla güncellendi!';
            editUserMessage.className = 'message-box success-message';
            setTimeout(() => {
                userEditPanel.classList.add('content-hidden');
                loadUsers(); 
            }, 1500);

        } catch (error) {
            console.error("Kullanıcı güncelleme hatası: ", error);
            editUserMessage.textContent = `Hata: ${error.message}`;
            editUserMessage.className = 'message-box error-message';
            editUserMessage.style.display = 'block';
        }
    });

    deleteUserBtn.addEventListener('click', async () => {
        const uidToDelete = editUserUid.value;
        const userToDelete = allUsers.find(u => u.id === uidToDelete);

        if (!userToDelete) {
            alert("Silinecek kullanıcı bulunamadı.");
            return;
        }

        if (confirm(`"${userToDelete.username || userToDelete.email}" adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz! Kullanıcının tüm Auth verileri de silinecektir.`)) {
            editUserMessage.textContent = 'Siliniyor...';
            editUserMessage.className = 'message-box info-message';
            editUserMessage.style.display = 'block';
            try {
                const batch = db.batch();
                batch.delete(db.collection('users').doc(uidToDelete));
                if (userToDelete.username) {
                    batch.delete(db.collection('usernames').doc(userToDelete.username));
                }
                
                // Firestore'daki diğer ilgili koleksiyonları (taskProofs, tickets, withdrawalRequests) temizlemek için
                // Cloud Functions kullanmak daha güvenlidir ve önerilir. Frontend'den doğrudan silmek
                // kullanıcıya ait tüm veriyi bulup silmek için karmaşık ve güvenlik açığı barındırabilir.
                // Basitlik adına, sadece kullanıcı belgesini siliyoruz ve diğerlerinin temizliğini varsayıyoruz.
                // Gerçek bir uygulamada Cloud Functions ile tetiklenen bir temizlik işlemi olmalı.

                await batch.commit();

                // Firebase Auth kullanıcısını sil
                // NOT: Bu işlem, sadece current user (admin'in kendisi) için doğrudan yapılabilir.
                // Başka bir Auth kullanıcısını silmek için Cloud Functions veya Admin SDK gerekir.
                // Burada bir uyarı mesajı göstererek Admin SDK'sının gerekliliğini vurguluyoruz.
                if (firebase.auth().currentUser && firebase.auth().currentUser.uid === uidToDelete) {
                    await firebase.auth().currentUser.delete();
                } else {
                    alert("Uyarı: Bir kullanıcının Auth kaydını silmek için Admin SDK veya Cloud Function gereklidir. Bu işlem sadece kullanıcının Firestore verisini sildi.");
                }

                editUserMessage.textContent = 'Kullanıcı başarıyla silindi!';
                editUserMessage.className = 'message-box success-message';
                setTimeout(() => {
                    userEditPanel.classList.add('content-hidden');
                    loadUsers();
                }, 1500);

            } catch (error) {
                console.error("Kullanıcı silme hatası: ", error);
                editUserMessage.textContent = `Hata: ${error.message}`;
                editUserMessage.className = 'message-box error-message';
                editUserMessage.style.display = 'block';
            }
        }
    });

    // SSS Yönetimi
    addFaqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('faq-question').value;
        const answer = document.getElementById('faq-answer').value;

        addFaqMessage.textContent = 'Ekleniyor...';
        addFaqMessage.className = 'message-box info-message';
        addFaqMessage.style.display = 'block';

        try {
            await db.collection('faqs').add({
                question,
                answer,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            addFaqMessage.textContent = 'SSS başarıyla eklendi!';
            addFaqMessage.className = 'message-box success-message';
            addFaqForm.reset();
            loadFaqs();
            setTimeout(() => addFaqMessage.textContent = '', 3000);
        } catch (error) {
            console.error("SSS ekleme hatası: ", error);
            addFaqMessage.textContent = 'Hata: SSS eklenemedi. ' + error.message;
            addFaqMessage.className = 'message-box error-message';
            addFaqMessage.style.display = 'block';
        }
    });

    async function loadFaqs() {
        faqManagementBody.innerHTML = '<tr><td colspan="3">Yükleniyor...</td></tr>';
        try {
            const snapshot = await db.collection('faqs').orderBy('createdAt', 'desc').get();
            faqManagementBody.innerHTML = '';
            if (snapshot.empty) {
                faqManagementBody.innerHTML = '<tr><td colspan="3">SSS bulunamadı.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const faq = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Soru">${faq.question}</td>
                    <td data-label="Cevap">${faq.answer}</td>
                    <td data-label="Aksiyonlar" class="action-buttons">
                        <button class="btn-small btn-danger delete-faq-btn" data-id="${doc.id}">Sil</button>
                    </td>
                `;
                faqManagementBody.appendChild(row);
            });

            document.querySelectorAll('.delete-faq-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const faqId = e.target.dataset.id;
                    if (confirm('Bu SSS öğesini silmek istediğinize emin misiniz?')) {
                        try {
                            await db.collection('faqs').doc(faqId).delete();
                            loadFaqs(); 
                            alert("SSS başarıyla silindi!");
                        } catch (error) {
                            console.error("SSS silinirken hata oluştu: ", error);
                            alert("SSS silinirken bir hata oluştu: " + error.message);
                        }
                    }
                });
            });

        } catch (error) {
            console.error("SSS yüklenirken hata oluştu: ", error);
            faqManagementBody.innerHTML = '<tr><td colspan="3">SSS yüklenemedi.</td></tr>';
        }
    }

    // Görev Onayları Yönetimi
    async function loadTaskProofs() {
        taskProofsBody.innerHTML = '<tr><td colspan="5">Yükleniyor...</td></tr>';
        taskProofsMessage.textContent = '';
        taskProofsMessage.style.display = 'none';
        try {
            const tasksSnapshot = await db.collection('tasks').get();
            allTasks = {};
            tasksSnapshot.forEach(doc => {
                allTasks[doc.id] = doc.data();
            });

            const snapshot = await db.collection('taskProofs')
                                     .where('status', '==', 'pending')
                                     .orderBy('submittedAt', 'asc')
                                     .get();
            taskProofsBody.innerHTML = '';
            if (snapshot.empty) {
                taskProofsBody.innerHTML = '<tr><td colspan="5">Onay bekleyen görev bulunmamaktadır.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const proof = doc.data();
                const proofId = doc.id;
                const task = allTasks[proof.taskId]; 

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Kullanıcı">${proof.username || proof.email}</td>
                    <td data-label="Görev">${task ? task.title : 'Bilinmeyen Görev'}</td>
                    <td data-label="Kanıtlar">
                        ${proof.proofUrls.map(url => `<a href="${url}" target="_blank">Kanıt</a>`).join(', ')}
                    </td>
                    <td data-label="Durum"><span class="btn-small btn-info">${proof.status}</span></td>
                    <td data-label="Aksiyonlar" class="action-buttons">
                        <button class="btn-small btn-success approve-proof-btn" data-id="${proofId}" data-taskid="${proof.taskId}" data-userid="${proof.userId}">Onayla</button>
                        <button class="btn-small btn-danger reject-proof-btn" data-id="${proofId}" data-taskid="${proof.taskId}" data-userid="${proof.userId}">Reddet</button>
                    </td>
                `;
                taskProofsBody.appendChild(row);
            });

            document.querySelectorAll('.approve-proof-btn').forEach(button => {
                button.addEventListener('click', (e) => approveTaskProof(e.target.dataset.id, e.target.dataset.taskid, e.target.dataset.userid));
            });
            document.querySelectorAll('.reject-proof-btn').forEach(button => {
                button.addEventListener('click', (e) => rejectTaskProof(e.target.dataset.id, e.target.dataset.taskid, e.target.dataset.userid));
            });

        } catch (error) {
            console.error("Görev kanıtları yüklenirken hata oluştu: ", error);
            taskProofsBody.innerHTML = '<tr><td colspan="5">Görev kanıtları yüklenemedi.</td></tr>';
            taskProofsMessage.textContent = 'Hata: Görev kanıtları yüklenemedi. ' + error.message;
            taskProofsMessage.className = 'message-box error-message';
            taskProofsMessage.style.display = 'block';
        }
    }

    async function approveTaskProof(proofId, taskId, userId) {
        if (!confirm('Bu görevi onaylamak istediğinize emin misiniz?')) return;

        taskProofsMessage.textContent = 'Onaylanıyor...';
        taskProofsMessage.className = 'message-box info-message';
        taskProofsMessage.style.display = 'block';

        try {
            const proofDocRef = db.collection('taskProofs').doc(proofId);
            const userDocRef = db.collection('users').doc(userId);
            const taskDocRef = db.collection('tasks').doc(taskId);

            await db.runTransaction(async (transaction) => {
                const proofDoc = await transaction.get(proofDocRef);
                const userDoc = await transaction.get(userDocRef);
                const taskDoc = await transaction.get(taskDocRef);

                if (!proofDoc.exists) throw "Kanıt belgesi bulunamadı!";
                if (!userDoc.exists) throw "Kullanıcı belgesi bulunamadı!";
                if (!taskDoc.exists) throw "Görev belgesi bulunamadı!";

                const userData = userDoc.data();
                const taskData = taskDoc.data();
                const proofData = proofDoc.data();

                if (proofData.status !== 'pending') {
                    throw new Error("Bu kanıt zaten işlenmiş.");
                }

                const newBalance = (userData.balance || 0) + taskData.reward;
                const newCompletedTasksCount = (userData.completedTasks || 0) + 1;
                const newCompletedTaskIds = [...(userData.completedTaskIds || []), taskId];

                transaction.update(userDocRef, {
                    balance: newBalance,
                    completedTasks: newCompletedTasksCount,
                    completedTaskIds: newCompletedTaskIds
                });

                const newCompletedCount = (taskData.completedCount || 0) + 1;
                transaction.update(taskDocRef, {
                    completedCount: newCompletedCount
                });

                transaction.update(proofDocRef, {
                    status: 'approved',
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            taskProofsMessage.textContent = 'Görev başarıyla onaylandı!';
            taskProofsMessage.className = 'message-box success-message';
            loadTaskProofs(); 
            loadUsers(); 
            setTimeout(() => taskProofsMessage.textContent = '', 3000);

        } catch (error) {
                if (error.message && error.message.includes("Bu kanıt zaten işlenmiş.")) {
                    taskProofsMessage.textContent = 'Bu kanıt zaten onaylanmış veya reddedilmiş.';
                    taskProofsMessage.className = 'message-box error-message';
                    loadTaskProofs(); 
                } else {
                    console.error("Görev onaylama hatası: ", error);
                    taskProofsMessage.textContent = `Hata: ${error.message}`;
                    taskProofsMessage.className = 'message-box error-message';
                }
        }
    }

    async function rejectTaskProof(proofId, taskId, userId) {
        if (!confirm('Bu görevi reddetmek istediğinize emin misiniz?')) return;

        taskProofsMessage.textContent = 'Reddediliyor...';
        taskProofsMessage.className = 'message-box info-message';
        taskProofsMessage.style.display = 'block';

        try {
            const proofDocRef = db.collection('taskProofs').doc(proofId);
            
            await db.runTransaction(async (transaction) => {
                const proofDoc = await transaction.get(proofDocRef);

                if (!proofDoc.exists) throw "Kanıt belgesi bulunamadı!";
                const proofData = proofDoc.data();

                if (proofData.status !== 'pending') {
                    throw new Error("Bu kanıt zaten işlenmiş.");
                }

                transaction.update(proofDocRef, {
                    status: 'rejected',
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            taskProofsMessage.textContent = 'Görev başarıyla reddedildi!';
            taskProofsMessage.className = 'message-box success-message';
            loadTaskProofs(); 
            setTimeout(() => taskProofsMessage.textContent = '', 3000);

        } catch (error) {
            if (error.message && error.message.includes("Bu kanıt zaten işlenmiş.")) {
                taskProofsMessage.textContent = 'Bu kanıt zaten onaylanmış veya reddedilmiş.';
                taskProofsMessage.className = 'message-box error-message';
                loadTaskProofs(); 
            } else {
                console.error("Görev reddetme hatası: ", error);
                taskProofsMessage.textContent = `Hata: ${error.message}`;
                taskProofsMessage.className = 'message-box error-message';
            }
        }
    }

    // Destek Talepleri Yönetimi
    async function loadSupportTickets() {
        supportTicketsBody.innerHTML = '<tr><td colspan="4">Yükleniyor...</td></tr>';
        supportTicketsMessage.textContent = '';
        supportTicketsMessage.style.display = 'none';
        try {
            const snapshot = await db.collection('tickets')
                                     .where('status', '==', 'open')
                                     .orderBy('createdAt', 'asc')
                                     .get();
            supportTicketsBody.innerHTML = '';
            if (snapshot.empty) {
                supportTicketsBody.innerHTML = '<tr><td colspan="4">Açık destek talebi bulunmamaktadır.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const ticket = doc.data();
                const ticketId = doc.id;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Talep Eden">${ticket.username || ticket.email}</td>
                    <td data-label="Konu">${ticket.subject}</td>
                    <td data-label="Durum"><span class="btn-small btn-info">${ticket.status === 'open' ? 'Açık' : 'Kapalı'}</span></td>
                    <td data-label="Aksiyonlar" class="action-buttons">
                        <a href="admin-ticket-detail.html?ticketId=${ticketId}" class="btn-small btn-primary">Görüntüle/Cevapla</a>
                    </td>
                `;
                supportTicketsBody.appendChild(row);
            });

        } catch (error) {
            console.error("Destek talepleri yüklenirken hata oluştu: ", error);
            supportTicketsBody.innerHTML = '<tr><td colspan="4">Destek talepleri yüklenemedi.</td></tr>';
            supportTicketsMessage.textContent = 'Hata: Destek talepleri yüklenemedi. ' + error.message;
            supportTicketsMessage.className = 'message-box error-message';
            supportTicketsMessage.style.display = 'block';
        }
    }

    // Para Çekme Talepleri Yönetimi
    async function loadWithdrawalRequests() {
        withdrawalRequestsBody.innerHTML = '<tr><td colspan="5">Yükleniyor...</td></tr>';
        withdrawalRequestsMessage.textContent = '';
        withdrawalRequestsMessage.style.display = 'none';
        try {
            const snapshot = await db.collection('withdrawalRequests')
                                     .where('status', '==', 'pending')
                                     .orderBy('requestedAt', 'asc')
                                     .get();
            withdrawalRequestsBody.innerHTML = '';
            if (snapshot.empty) {
                withdrawalRequestsBody.innerHTML = '<tr><td colspan="5">Bekleyen para çekme talebi bulunmamaktadır.</td></tr>';
                return;
            }

            for (const doc of snapshot.docs) {
                const request = doc.data();
                const requestId = doc.id;

                const userDoc = await db.collection('users').doc(request.userId).get();
                const username = userDoc.exists ? userDoc.data().username || userDoc.data().email : 'Bilinmeyen Kullanıcı';
                const requestedAt = request.requestedAt && typeof request.requestedAt.toDate === 'function' 
                                    ? new Date(request.requestedAt.toDate()).toLocaleString() 
                                    : 'Tarih Yok';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Kullanıcı">${username}</td>
                    <td data-label="Miktar">${request.amount.toFixed(2)} ₺</td>
                    <td data-label="Durum"><span class="btn-small btn-info">${request.status}</span></td>
                    <td data-label="Talep Tarihi">${requestedAt}</td>
                    <td data-label="Aksiyonlar" class="action-buttons">
                        <button class="btn-small btn-success approve-withdrawal-btn" data-id="${requestId}" data-userid="${request.userId}" data-amount="${request.amount}">Onayla</button>
                        <button class="btn-small btn-danger reject-withdrawal-btn" data-id="${requestId}">Reddet</button>
                    </td>
                `;
                withdrawalRequestsBody.appendChild(row);
            }

            document.querySelectorAll('.approve-withdrawal-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const requestId = e.target.dataset.id;
                    const userId = e.target.dataset.userid;
                    const amount = parseFloat(e.target.dataset.amount);
                    if (confirm('Bu para çekme talebini onaylamak istediğinize emin misiniz? Kullanıcının bakiyesinden düşülecektir.')) {
                        await approveWithdrawalRequest(requestId, userId, amount);
                    }
                });
            });

            document.querySelectorAll('.reject-withdrawal-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const requestId = e.target.dataset.id;
                    if (confirm('Bu para çekme talebini reddetmek istediğinize emin misiniz?')) {
                        await rejectWithdrawalRequest(requestId);
                    }
                });
            });

        } catch (error) {
            console.error("Para çekme talepleri yüklenirken hata oluştu: ", error);
            withdrawalRequestsBody.innerHTML = '<tr><td colspan="5">Para çekme talepleri yüklenemedi.</td></tr>';
            withdrawalRequestsMessage.textContent = 'Hata: Para çekme talepleri yüklenemedi. ' + error.message;
            withdrawalRequestsMessage.className = 'message-box error-message';
            withdrawalRequestsMessage.style.display = 'block';
        }
    }

    async function approveWithdrawalRequest(requestId, userId, amount) {
        withdrawalRequestsMessage.textContent = 'Talep onaylanıyor...';
        withdrawalRequestsMessage.className = 'message-box info-message';
        withdrawalRequestsMessage.style.display = 'block';

        try {
            const requestDocRef = db.collection('withdrawalRequests').doc(requestId);
            const userDocRef = db.collection('users').doc(userId);

            await db.runTransaction(async (transaction) => {
                const requestDoc = await transaction.get(requestDocRef);
                const userDoc = await transaction.get(userDocRef);

                if (!requestDoc.exists) throw new Error("Çekim talebi bulunamadı!");
                if (!userDoc.exists) throw new Error("Kullanıcı belgesi bulunamadı!");

                const requestData = requestDoc.data();
                if (requestData.status !== 'pending') {
                    throw new Error("Bu talep zaten işlenmiş.");
                }

                const userData = userDoc.data();
                if (userData.balance < amount) {
                    throw new Error("Kullanıcının bakiyesi yeterli değil.");
                }

                transaction.update(userDocRef, {
                    balance: firebase.firestore.FieldValue.increment(-amount)
                });

                transaction.update(requestDocRef, {
                    status: 'approved',
                    processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: firebase.auth().currentUser.uid // Admin UID
                });
            });

            withdrawalRequestsMessage.textContent = 'Çekim talebi başarıyla onaylandı!';
            withdrawalRequestsMessage.className = 'message-box success-message';
            loadWithdrawalRequests();
            loadUsers(); // Refresh user balances
            setTimeout(() => withdrawalRequestsMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Çekim talebi onaylama hatası: ", error);
            withdrawalRequestsMessage.textContent = `Hata: ${error.message}`;
            withdrawalRequestsMessage.className = 'message-box error-message';
            withdrawalRequestsMessage.style.display = 'block';
        }
    }

    async function rejectWithdrawalRequest(requestId) {
        withdrawalRequestsMessage.textContent = 'Talep reddediliyor...';
        withdrawalRequestsMessage.className = 'message-box info-message';
        withdrawalRequestsMessage.style.display = 'block';

        try {
            const requestDocRef = db.collection('withdrawalRequests').doc(requestId);

            await db.runTransaction(async (transaction) => {
                const requestDoc = await transaction.get(requestDocRef);

                if (!requestDoc.exists) throw new Error("Çekim talebi bulunamadı!");
                const requestData = requestDoc.data();

                if (requestData.status !== 'pending') {
                    throw new Error("Bu talep zaten işlenmiş.");
                }

                transaction.update(requestDocRef, {
                    status: 'rejected',
                    processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    processedBy: firebase.auth().currentUser.uid // Admin UID
                });
            });

            withdrawalRequestsMessage.textContent = 'Çekim talebi başarıyla reddedildi!';
            withdrawalRequestsMessage.className = 'message-box success-message';
            loadWithdrawalRequests();
            setTimeout(() => withdrawalRequestsMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Çekim talebi reddetme hatası: ", error);
            withdrawalRequestsMessage.textContent = `Hata: ${error.message}`;
            withdrawalRequestsMessage.className = 'message-box error-message';
            withdrawalRequestsMessage.style.display = 'block';
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});
