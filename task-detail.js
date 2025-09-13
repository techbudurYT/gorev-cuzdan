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

    // IMGBB API Key
    const IMGBB_API_KEY = "84a7c0a54294a6e8ea2ffc9bab240719";

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

            // Kullanıcının bu görev için bekleyen bir kanıtı var mı kontrol et
            const pendingProofSnapshot = await db.collection('taskProofs')
                                                  .where('userId', '==', currentUser.uid)
                                                  .where('taskId', '==', taskId)
                                                  .where('status', '==', 'pending')
                                                  .get();

            if (!pendingProofSnapshot.empty) {
                taskDetailContainer.innerHTML = `<p class="info-message">Bu görev için gönderdiğiniz kanıtlar onay bekliyor.</p>
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
        proofMessage.textContent = 'Kanıtlar yükleniyor ve görev onaya gönderiliyor...';
        proofMessage.className = 'info-message';

        try {
            const uploadPromises = selectedFiles.map(file => {
                const formData = new FormData();
                formData.append('image', file);

                return fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        return data.data.url;
                    } else {
                        throw new Error('ImageBB yükleme hatası: ' + data.error.message);
                    }
                });
            });

            const downloadURLs = await Promise.all(uploadPromises);

            // Kullanıcı verisini çek (username için)
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data();

            // Kanıtları ayrı bir koleksiyonda sakla ve onaya gönder
            await db.collection('taskProofs').add({
                taskId: taskId,
                taskTitle: currentTask.title, // Admin panelinde kolaylık için görev başlığını da ekle
                userId: currentUser.uid,
                username: userData.username || currentUser.email,
                proofUrls: downloadURLs,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending' // pending, approved, rejected
            });

            proofMessage.textContent = 'Kanıtlarınız başarıyla gönderildi ve görev onaya iletildi!';
            proofMessage.className = 'success-message';
            completeTaskBtn.textContent = 'Onaya Gönderildi';
            setTimeout(() => {
                window.location.href = 'my-tasks.html';
            }, 2000);

        } catch (error) {
            console.error("Kanıt yükleme veya onaya gönderme hatası: ", error);
            proofMessage.textContent = `Hata: ${error.message}`;
            proofMessage.className = 'error-message';
            completeTaskBtn.disabled = false;
            completeTaskBtn.textContent = 'Görevi Tamamla';
        }
    });

    logoutBtn.addEventListener('click', () => auth.signOut());
});