document.addEventListener('DOMContentLoaded', () => {
    const taskDetailTitleHeader = document.getElementById('task-detail-title-header');
    const taskDetailContainer = document.getElementById('task-detail-container');
    const taskDetailIcon = document.getElementById('task-detail-icon');
    const taskDetailDescription = document.getElementById('task-detail-description');
    const taskDetailReward = document.getElementById('task-detail-reward');
    const taskDetailStock = document.getElementById('task-detail-stock');
    const taskDetailProofCount = document.getElementById('task-detail-proof-count');
    const proofUploadForm = document.getElementById('proof-upload-form');
    const proofFilesInput = document.getElementById('proof-files');
    const fileList = document.getElementById('file-list');
    const completeTaskBtn = document.getElementById('complete-task-btn');
    const proofMessage = document.getElementById('proof-message');

    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');

    let currentUser = null;
    let currentTask = null;
    let selectedFiles = [];

    // URL'den görev ID'sini al
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('taskId');

    if (!taskId) {
        taskDetailContainer.innerHTML = '<p class="error-message">Görev bulunamadı. Lütfen geçerli bir görev seçin.</p>';
        completeTaskBtn.disabled = true;
        proofFilesInput.disabled = true;
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            checkAdminStatus(user.uid);
            loadTaskDetails(taskId);
        } else {
            window.location.href = 'login.html';
        }
    });

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            adminPanelLink.style.display = 'block';
        }
    }

    async function loadTaskDetails(id) {
        taskDetailContainer.innerHTML = '<p class="info-message">Görev detayları yükleniyor...</p>';
        try {
            const taskDoc = await db.collection('tasks').doc(id).get();
            if (!taskDoc.exists) {
                taskDetailContainer.innerHTML = '<p class="error-message">Görev bulunamadı.</p>';
                completeTaskBtn.disabled = true;
                proofFilesInput.disabled = true;
                return;
            }
            currentTask = { id: taskDoc.id, ...taskDoc.data() };

            // Kullanıcı bu görevi daha önce tamamladı mı kontrol et
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data();
            if (userData.completedTaskIds && userData.completedTaskIds.includes(taskId)) {
                taskDetailContainer.innerHTML = `<p class="success-message">Bu görevi zaten tamamladınız!</p>
                                                 <button class="btn-primary" onclick="window.location.href='my-tasks.html'">Görevlere Geri Dön</button>`;
                return;
            }

            // Stok kontrolü
            const currentStock = currentTask.stock - currentTask.completedCount;
            if (currentStock <= 0 && currentTask.stock > 0) {
                 taskDetailContainer.innerHTML = `<p class="error-message">Bu görevin stoğu bitmiştir.</p>
                                                  <button class="btn-primary" onclick="window.location.href='my-tasks.html'">Görevlere Geri Dön</button>`;
                 return;
            }

            taskDetailTitleHeader.textContent = currentTask.title;
            taskDetailContainer.querySelector('h2').textContent = currentTask.title;
            taskDetailIcon.src = `img/logos/${currentTask.icon || 'other.png'}`;
            taskDetailDescription.textContent = currentTask.description;
            taskDetailReward.textContent = `${currentTask.reward.toFixed(2)} ₺`;
            taskDetailStock.textContent = `${currentStock}/${currentTask.stock}`;
            taskDetailProofCount.textContent = currentTask.proofCount;

            // Form ve buton durumunu güncelle
            completeTaskBtn.disabled = false;
            proofFilesInput.disabled = false;
            proofMessage.textContent = `Bu görev için ${currentTask.proofCount} adet kanıt dosyası yüklemelisiniz.`;
            proofMessage.className = 'info-message';

            // Mevcut boşaltma (önceki yükleme mesajını temizlemek için)
            const oldMessage = taskDetailContainer.querySelector('.info-message, .error-message, .success-message');
            if (oldMessage) oldMessage.remove();

        } catch (error) {
            console.error("Görev detayları yüklenirken hata oluştu: ", error);
            taskDetailContainer.innerHTML = '<p class="error-message">Görev detayları yüklenemedi.</p>';
            completeTaskBtn.disabled = true;
            proofFilesInput.disabled = true;
        }
    }

    proofFilesInput.addEventListener('change', (e) => {
        selectedFiles = [];
        fileList.innerHTML = '';
        const files = Array.from(e.target.files);

        if (files.length > currentTask.proofCount) {
            proofMessage.textContent = `En fazla ${currentTask.proofCount} dosya yükleyebilirsiniz. Lütfen dosya sayısını azaltın.`;
            proofMessage.className = 'error-message';
            proofFilesInput.value = ''; // Seçimi sıfırla
            return;
        }
        
        proofMessage.textContent = ''; // Hata mesajını temizle

        files.forEach(file => {
            selectedFiles.push(file);
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-file';
            removeButton.innerHTML = '&times;';
            removeButton.addEventListener('click', () => {
                selectedFiles = selectedFiles.filter(f => f !== file);
                renderSelectedFiles();
            });
            listItem.appendChild(removeButton);
            fileList.appendChild(listItem);
        });
        renderSelectedFiles();
    });

    function renderSelectedFiles() {
        fileList.innerHTML = '';
        selectedFiles.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-file';
            removeButton.innerHTML = '&times;';
            removeButton.addEventListener('click', () => {
                selectedFiles = selectedFiles.filter(f => f !== file);
                renderSelectedFiles();
            });
            listItem.appendChild(removeButton);
            fileList.appendChild(listItem);
        });
        if (selectedFiles.length === currentTask.proofCount) {
            proofMessage.textContent = 'Tüm kanıt dosyaları seçildi.';
            proofMessage.className = 'success-message';
        } else {
            proofMessage.textContent = `Bu görev için ${currentTask.proofCount - selectedFiles.length} adet daha kanıt dosyası yüklemelisiniz.`;
            proofMessage.className = 'info-message';
        }
        completeTaskBtn.disabled = selectedFiles.length !== currentTask.proofCount;
    }


    proofUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (selectedFiles.length === 0 || selectedFiles.length !== currentTask.proofCount) {
            proofMessage.textContent = `Lütfen ${currentTask.proofCount} adet kanıt dosyası yükleyin.`;
            proofMessage.className = 'error-message';
            return;
        }

        completeTaskBtn.disabled = true;
        completeTaskBtn.textContent = 'Yükleniyor...';
        proofMessage.textContent = 'Kanıtlar yükleniyor ve görev tamamlanıyor...';
        proofMessage.className = 'info-message';

        try {
            const uploadPromises = selectedFiles.map(file => {
                const storageRef = storage.ref(`proofs/${currentUser.uid}/${taskId}/${file.name}`);
                return storageRef.put(file).then(snapshot => snapshot.ref.getDownloadURL());
            });

            const downloadURLs = await Promise.all(uploadPromises);

            // Firestore transaction kullanarak kullanıcı ve görev verilerini atomik olarak güncelle
            const userDocRef = db.collection('users').doc(currentUser.uid);
            const taskDocRef = db.collection('tasks').doc(taskId);

            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                const taskDoc = await transaction.get(taskDocRef);

                if (!userDoc.exists) throw "Kullanıcı belgesi bulunamadı!";
                if (!taskDoc.exists) throw "Görev belgesi bulunamadı!";

                const userData = userDoc.data();
                const taskData = taskDoc.data();

                // Kullanıcının bu görevi zaten tamamlayıp tamamlamadığını son bir kez kontrol et
                const currentCompletedTaskIds = userData.completedTaskIds || [];
                if (currentCompletedTaskIds.includes(taskId)) {
                    throw new Error("Bu görev zaten tamamlanmış.");
                }

                // Görev stoğu kontrolü
                if (taskData.completedCount >= taskData.stock && taskData.stock > 0) {
                    throw new Error("Bu görevin stoğu bitmiştir.");
                }

                const newBalance = (userData.balance || 0) + currentTask.reward;
                const newCompletedTasks = (userData.completedTasks || 0) + 1;
                const newCompletedTaskIds = [...currentCompletedTaskIds, taskId];
                
                const newCompletedCount = (taskData.completedCount || 0) + 1;

                transaction.update(userDocRef, {
                    balance: newBalance,
                    completedTasks: newCompletedTasks,
                    completedTaskIds: newCompletedTaskIds
                });
                
                transaction.update(taskDocRef, {
                    completedCount: newCompletedCount
                });

                // Kanıtları ayrı bir koleksiyonda sakla
                transaction.set(db.collection('taskProofs').doc(), {
                    taskId: taskId,
                    userId: currentUser.uid,
                    username: userData.username || currentUser.email,
                    proofUrls: downloadURLs,
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending' // pending, approved, rejected
                });
            });

            proofMessage.textContent = 'Görev başarıyla tamamlandı ve kanıtlar gönderildi!';
            proofMessage.className = 'success-message';
            completeTaskBtn.textContent = 'Tamamlandı!';
            setTimeout(() => {
                window.location.href = 'my-tasks.html';
            }, 2000);

        } catch (error) {
            console.error("Görev tamamlama veya kanıt yükleme hatası: ", error);
            proofMessage.textContent = `Hata: ${error.message}`;
            proofMessage.className = 'error-message';
            completeTaskBtn.disabled = false;
            completeTaskBtn.textContent = 'Görevi Tamamla';
        }
    });

    logoutBtn.addEventListener('click', () => auth.signOut());
});