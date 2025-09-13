
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

    const addFaqForm = document.getElementById('add-faq-form');
    const addFaqMessage = document.getElementById('add-faq-message');
    const faqManagementBody = document.getElementById('faq-management-body');

    const taskProofsBody = document.getElementById('task-proofs-body');
    const taskProofsMessage = document.getElementById('task-proofs-message');

    const supportTicketsBody = document.getElementById('support-tickets-body');
    const supportTicketsMessage = document.getElementById('support-tickets-message');


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
                    loadFaqs();
                    loadTaskProofs();
                    loadSupportTickets();
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

    // Yeni Görev Ekleme
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const reward = parseFloat(document.getElementById('task-reward').value);
        const stock = parseInt(document.getElementById('task-stock').value);
        const proofCount = parseInt(document.getElementById('task-proof-count').value);
        const icon = document.getElementById('task-icon').value;

        db.collection('tasks').add({
            title: title,
            description: description,
            reward: reward,
            stock: stock, // Eklenen stok
            completedCount: 0, // Başlangıçta tamamlanan sayısı
            proofCount: proofCount, // Kanıt dosyası sayısı
            icon: icon,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            addTaskMessage.textContent = 'Görev başarıyla eklendi!';
            addTaskMessage.className = 'success-message';
            addTaskForm.reset();
            setTimeout(() => addTaskMessage.textContent = '', 3000);
        })
        .catch(error => {
            console.error("Görev ekleme hatası: ", error);
            addTaskMessage.textContent = 'Bir hata oluştu.';
            addTaskMessage.className = 'error-message';
        });
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
                <td>${user.username || 'N/A'}</td>
                <td>${user.email}</td>
                <td>${user.balance.toFixed(2)} ₺</td>
                <td>${user.completedTasks}</td>
                <td>${user.isAdmin ? '<i class="fas fa-check-circle success-color"></i>' : '<i class="fas fa-times-circle error-color"></i>'}</td>
                <td>
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
        
        userEditPanel.style.display = 'block';
        editUserMessage.textContent = ''; // Mesajı temizle
        editUsername.disabled = user.isAdmin; // Admin kendi kullanıcı adını değiştirmesin
    }

    cancelEditBtn.addEventListener('click', () => {
        userEditPanel.style.display = 'none';
    });

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uid = editUserUid.value;
        const newUsername = editUsername.value.trim().toLowerCase();
        const newBalance = parseFloat(editBalance.value);
        const newCompletedTasks = parseInt(editCompletedTasks.value);
        const newIsAdmin = editIsAdmin.checked;

        editUserMessage.textContent = 'Kaydediliyor...';
        editUserMessage.className = 'info-message';

        try {
            const userDocRef = db.collection('users').doc(uid);
            const batch = db.batch();
            const originalUser = allUsers.find(u => u.id === uid);

            // Kullanıcı adı değiştiyse benzersizliği kontrol et
            if (originalUser.username !== newUsername) {
                if (!/^[a-zA-Z0-9_]{3,15}$/.test(newUsername)) {
                    throw new Error('Kullanıcı adı 3-15 karakter uzunluğunda olmalı ve sadece harf, rakam veya _ içerebilir.');
                }

                const usernameDocRef = db.collection('usernames').doc(newUsername);
                const usernameDoc = await usernameDocRef.get();
                if (usernameDoc.exists) {
                    throw new Error('Bu kullanıcı adı zaten alınmış.');
                }
                
                // Eski kullanıcı adını usernames koleksiyonundan sil
                if (originalUser.username) {
                    batch.delete(db.collection('usernames').doc(originalUser.username));
                }
                // Yeni kullanıcı adını usernames koleksiyonuna ekle
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
            editUserMessage.className = 'success-message';
            setTimeout(() => {
                userEditPanel.style.display = 'none';
                loadUsers(); // Listeyi yeniden yükle
            }, 1500);

        } catch (error) {
            console.error("Kullanıcı güncelleme hatası: ", error);
            editUserMessage.textContent = `Hata: ${error.message}`;
            editUserMessage.className = 'error-message';
        }
    });

    deleteUserBtn.addEventListener('click', async () => {
        const uidToDelete = editUserUid.value;
        const userToDelete = allUsers.find(u => u.id === uidToDelete);

        if (!userToDelete) {
            alert("Silinecek kullanıcı bulunamadı.");
            return;
        }

        if (confirm(`"${userToDelete.username || userToDelete.email}" adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
            editUserMessage.textContent = 'Siliniyor...';
            editUserMessage.className = 'info-message';
            try {
                // Firestore verilerini sil
                const batch = db.batch();
                batch.delete(db.collection('users').doc(uidToDelete));
                if (userToDelete.username) {
                    batch.delete(db.collection('usernames').doc(userToDelete.username));
                }
                await batch.commit();

                // Auth kullanıcısını sil (sunucu tarafında veya Cloud Functions ile daha güvenli)
                // Tarayıcıdan doğrudan kullanıcı silme işlemi güvenlik riski taşıdığı için genellikle önerilmez.
                // Firebase Admin SDK kullanılarak sunucu tarafında yapılmalıdır.
                // Örnek olarak burada gösteriliyor, gerçek projede dikkatli kullanılmalı.
                
                const userAuth = firebase.auth().currentUser;
                if (userAuth && userAuth.uid === uidToDelete) {
                    await userAuth.delete(); // Eğer admin kendini siliyorsa bu sorun çıkarır.
                } else {
                    // Diğer kullanıcıları silmek için bir Cloud Function tetiklemek daha iyidir.
                    // Şimdilik sadece Firestore'dan siliyoruz.
                    console.warn("Frontend'den başka bir kullanıcıyı silmek doğrudan desteklenmez, Cloud Function kullanın.");
                }

                editUserMessage.textContent = 'Kullanıcı başarıyla silindi!';
                editUserMessage.className = 'success-message';
                setTimeout(() => {
                    userEditPanel.style.display = 'none';
                    loadUsers();
                }, 1500);

            } catch (error) {
                console.error("Kullanıcı silme hatası: ", error);
                editUserMessage.textContent = `Hata: ${error.message}`;
                editUserMessage.className = 'error-message';
            }
        }
    });

    // SSS Yönetimi
    addFaqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('faq-question').value;
        const answer = document.getElementById('faq-answer').value;

        addFaqMessage.textContent = 'Ekleniyor...';
        addFaqMessage.className = 'info-message';

        try {
            await db.collection('faqs').add({
                question,
                answer,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            addFaqMessage.textContent = 'SSS başarıyla eklendi!';
            addFaqMessage.className = 'success-message';
            addFaqForm.reset();
            loadFaqs();
            setTimeout(() => addFaqMessage.textContent = '', 3000);
        } catch (error) {
            console.error("SSS ekleme hatası: ", error);
            addFaqMessage.textContent = 'Hata: SSS eklenemedi.';
            addFaqMessage.className = 'error-message';
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
                    <td>${faq.question}</td>
                    <td>${faq.answer}</td>
                    <td>
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
                            loadFaqs(); // Listeyi yeniden yükle
                        } catch (error) {
                            console.error("SSS silinirken hata oluştu: ", error);
                            alert("SSS silinirken bir hata oluştu.");
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
        try {
            // Tüm görevleri bir kere çekip allTasks objesine kaydet
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
                const task = allTasks[proof.taskId]; // Görev detaylarını al

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${proof.username || proof.email}</td>
                    <td>${task ? task.title : 'Bilinmeyen Görev'} (${proof.taskId})</td>
                    <td>
                        ${proof.proofUrls.map(url => `<a href="${url}" target="_blank">Kanıt</a>`).join(', ')}
                    </td>
                    <td><span class="btn-small btn-info">${proof.status}</span></td>
                    <td>
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
            taskProofsMessage.textContent = 'Hata: Görev kanıtları yüklenemedi.';
            taskProofsMessage.className = 'error-message';
        }
    }

    async function approveTaskProof(proofId, taskId, userId) {
        if (!confirm('Bu görevi onaylamak istediğinize emin misiniz?')) return;

        taskProofsMessage.textContent = 'Onaylanıyor...';
        taskProofsMessage.className = 'info-message';

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

                // Kullanıcının bakiyesini ve tamamlanan görev sayısını güncelle
                const newBalance = (userData.balance || 0) + taskData.reward;
                const newCompletedTasksCount = (userData.completedTasks || 0) + 1;
                const newCompletedTaskIds = [...(userData.completedTaskIds || []), taskId];

                transaction.update(userDocRef, {
                    balance: newBalance,
                    completedTasks: newCompletedTasksCount,
                    completedTaskIds: newCompletedTaskIds
                });

                // Görevdeki completedCount'u artır
                const newCompletedCount = (taskData.completedCount || 0) + 1;
                transaction.update(taskDocRef, {
                    completedCount: newCompletedCount
                });

                // Kanıtın durumunu 'approved' olarak güncelle
                transaction.update(proofDocRef, {
                    status: 'approved',
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            taskProofsMessage.textContent = 'Görev başarıyla onaylandı!';
            taskProofsMessage.className = 'success-message';
            loadTaskProofs(); // Listeyi yeniden yükle
            loadUsers(); // Kullanıcı listesini de güncelle (bakiye ve görev sayısı değişti)
            setTimeout(() => taskProofsMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Görev onaylama hatası: ", error);
            taskProofsMessage.textContent = `Hata: ${error.message}`;
            taskProofsMessage.className = 'error-message';
        }
    }

    async function rejectTaskProof(proofId, taskId, userId) {
        if (!confirm('Bu görevi reddetmek istediğinize emin misiniz?')) return;

        taskProofsMessage.textContent = 'Reddediliyor...';
        taskProofsMessage.className = 'info-message';

        try {
            const proofDocRef = db.collection('taskProofs').doc(proofId);
            
            await db.runTransaction(async (transaction) => {
                const proofDoc = await transaction.get(proofDocRef);

                if (!proofDoc.exists) throw "Kanıt belgesi bulunamadı!";
                const proofData = proofDoc.data();

                if (proofData.status !== 'pending') {
                    throw new Error("Bu kanıt zaten işlenmiş.");
                }

                // Kanıtın durumunu 'rejected' olarak güncelle
                transaction.update(proofDocRef, {
                    status: 'rejected',
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            taskProofsMessage.textContent = 'Görev başarıyla reddedildi!';
            taskProofsMessage.className = 'success-message';
            loadTaskProofs(); // Listeyi yeniden yükle
            setTimeout(() => taskProofsMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Görev reddetme hatası: ", error);
            taskProofsMessage.textContent = `Hata: ${error.message}`;
            taskProofsMessage.className = 'error-message';
        }
    }

    // Destek Talepleri Yönetimi
    async function loadSupportTickets() {
        supportTicketsBody.innerHTML = '<tr><td colspan="5">Yükleniyor...</td></tr>';
        supportTicketsMessage.textContent = '';
        try {
            const snapshot = await db.collection('tickets')
                                     .where('status', '==', 'open')
                                     .orderBy('createdAt', 'asc')
                                     .get();
            supportTicketsBody.innerHTML = '';
            if (snapshot.empty) {
                supportTicketsBody.innerHTML = '<tr><td colspan="5">Açık destek talebi bulunmamaktadır.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const ticket = doc.data();
                const ticketId = doc.id;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${ticket.username || ticket.email}</td>
                    <td>${ticket.subject}</td>
                    <td>${ticket.message}</td>
                    <td><span class="btn-small btn-info">${ticket.status === 'open' ? 'Açık' : 'Kapalı'}</span></td>
                    <td>
                        <button class="btn-small btn-success close-ticket-btn" data-id="${ticketId}">Kapat</button>
                    </td>
                `;
                supportTicketsBody.appendChild(row);
            });

            document.querySelectorAll('.close-ticket-btn').forEach(button => {
                button.addEventListener('click', (e) => closeSupportTicket(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Destek talepleri yüklenirken hata oluştu: ", error);
            supportTicketsBody.innerHTML = '<tr><td colspan="5">Destek talepleri yüklenemedi.</td></tr>';
            supportTicketsMessage.textContent = 'Hata: Destek talepleri yüklenemedi.';
            supportTicketsMessage.className = 'error-message';
        }
    }

    async function closeSupportTicket(ticketId) {
        if (!confirm('Bu destek talebini kapatmak istediğinize emin misiniz?')) return;

        supportTicketsMessage.textContent = 'Kapatılıyor...';
        supportTicketsMessage.className = 'info-message';

        try {
            await db.collection('tickets').doc(ticketId).update({
                status: 'closed',
                closedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            supportTicketsMessage.textContent = 'Destek talebi başarıyla kapatıldı!';
            supportTicketsMessage.className = 'success-message';
            loadSupportTickets();
            setTimeout(() => supportTicketsMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Destek talebi kapatılırken hata oluştu: ", error);
            supportTicketsMessage.textContent = `Hata: ${error.message}`;
            supportTicketsMessage.className = 'error-message';
        }
    }


    logoutBtn.addEventListener('click', () => auth.signOut());
});
