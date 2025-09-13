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
        // Elemanların varlığını kontrol etmeden textContent'i değiştirmeye çalışma
        if (taskDetailContainer) {
            taskDetailContainer.innerHTML = '<p class="error-message">Görev bulunamadı. Lütfen geçerli bir görev seçin.</p>';
        }
        if (completeTaskBtn) completeTaskBtn.disabled = true;
        if (proofFilesInput) proofFilesInput.disabled = true;
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
            if (adminPanelLink) adminPanelLink.style.display = 'block';
        }
    }

    async function loadTaskDetails(id) {
        // Elemanların varlığını kontrol etmeden textContent'i değiştirmeye çalışma
        if (taskDetailContainer) {
            taskDetailContainer.innerHTML = '<p class="info-message">Görev detayları yükleniyor...</p>';
        }
        try {
            const taskDoc = await db.collection('tasks').doc(id).get();
            if (!taskDoc.exists) {
                if (taskDetailContainer) taskDetailContainer.innerHTML = '<p class="error-message">Görev bulunamadı.</p>';
                if (completeTaskBtn) completeTaskBtn.disabled = true;
                if (proofFilesInput) proofFilesInput.disabled = true;
                return;
            }
            currentTask = { id: taskDoc.id, ...taskDoc.data() };

            // Kullanıcı bu görevi daha önce tamamladı mı kontrol et
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data();
            if (userData.completedTaskIds && userData.completedTaskIds.includes(taskId)) {
                if (taskDetailContainer) {
                    taskDetailContainer.innerHTML = `<p class="success-message">Bu görevi zaten tamamladınız!</p>
                                                     <button class="btn-primary" onclick="window.location.href='my-tasks.html'">Görevlere Geri Dön</button>`;
                }
                return;
            }

            // Kullanıcının bu görev için bekleyen bir kanıtı var mı kontrol et
            const pendingProofSnapshot = await db.collection('taskProofs')
                                                  .where('userId', '==', currentUser.uid)
                                                  .where('taskId', '==', taskId)
                                                  .where('status', '==', 'pending')
                                                  .get();

            if (!pendingProofSnapshot.empty) {
                if (taskDetailContainer) {
                    taskDetailContainer.innerHTML = `<p class="info-message">Bu görev için gönderdiğiniz kanıtlar onay bekliyor.</p>
                                                     <button class="btn-primary" onclick="window.location.href='my-tasks.html'">Görevlere Geri Dön</button>`;
                }
                return;
            }


            // Stok kontrolü
            const currentStock = currentTask.stock - currentTask.completedCount;
            if (currentStock <= 0 && currentTask.stock > 0) {
                if (taskDetailContainer) {
                    taskDetailContainer.innerHTML = `<p class="error-message">Bu görevin stoğu bitmiştir.</p>
                                                     <button class="btn-primary" onclick="window.location.href='my-tasks.html'">Görevlere Geri Dön</button>`;
                }
                 return;
            }

            // Null kontrolü yaparak DOM elemanlarını güncelle
            if (taskDetailTitleHeader) taskDetailTitleHeader.textContent = currentTask.title;
            const h2Element = taskDetailContainer ? taskDetailContainer.querySelector('h2') : null;
            if (h2Element) h2Element.textContent = currentTask.title;
            if (taskDetailIcon) taskDetailIcon.src = `img/logos/${currentTask.icon || 'other.png'}`;
            if (taskDetailDescription) taskDetailDescription.textContent = currentTask.description;
            if (taskDetailReward) taskDetailReward.textContent = `${currentTask.reward.toFixed(2)} ₺`;
            if (taskDetailStock) taskDetailStock.textContent = `${currentStock}/${currentTask.stock}`;
            if (taskDetailProofCount) taskDetailProofCount.textContent = currentTask.proofCount;

            // Form ve buton durumunu güncelle
            if (completeTaskBtn) completeTaskBtn.disabled = false;
            if (proofFilesInput) proofFilesInput.disabled = false;
            if (proofMessage) {
                proofMessage.textContent = `Bu görev için ${currentTask.proofCount} adet kanıt dosyası yüklemelisiniz.`;
                proofMessage.className = 'info-message';
            }

            // Mevcut boşaltma (önceki yükleme mesajını temizlemek için)
            if (taskDetailContainer) {
                const oldMessage = taskDetailContainer.querySelector('.info-message, .error-message, .success-message');
                if (oldMessage) oldMessage.remove();
            }

        } catch (error) {
            console.error("Görev detayları yüklenirken hata oluştu: ", error);
            if (taskDetailContainer) taskDetailContainer.innerHTML = '<p class="error-message">Görev detayları yüklenemedi.</p>';
            if (completeTaskBtn) completeTaskBtn.disabled = true;
            if (proofFilesInput) proofFilesInput.disabled = true;
        }
    }

    if (proofFilesInput) {
        proofFilesInput.addEventListener('change', (e) => {
            selectedFiles = [];
            if (fileList) fileList.innerHTML = '';
            const files = Array.from(e.target.files);

            if (files.length > currentTask.proofCount) {
                if (proofMessage) {
                    proofMessage.textContent = `En fazla ${currentTask.proofCount} dosya yükleyebilirsiniz. Lütfen dosya sayısını azaltın.`;
                    proofMessage.className = 'error-message';
                }
                if (proofFilesInput) proofFilesInput.value = ''; // Seçimi sıfırla
                return;
            }
            
            if (proofMessage) proofMessage.textContent = ''; // Hata mesajını temizle

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
                if (fileList) fileList.appendChild(listItem);
            });
            renderSelectedFiles();
        });
    }


    function renderSelectedFiles() {
        if (fileList) fileList.innerHTML = '';
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
            if (fileList) fileList.appendChild(listItem);
        });
        if (proofMessage) {
            if (selectedFiles.length === currentTask.proofCount) {
                proofMessage.textContent = 'Tüm kanıt dosyaları seçildi.';
                proofMessage.className = 'success-message';
            } else {
                proofMessage.textContent = `Bu görev için ${currentTask.proofCount - selectedFiles.length} adet daha kanıt dosyası yüklemelisiniz.`;
                proofMessage.className = 'info-message';
            }
        }
        if (completeTaskBtn) completeTaskBtn.disabled = selectedFiles.length !== currentTask.proofCount;
    }


    if (proofUploadForm) {
        proofUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (selectedFiles.length === 0 || selectedFiles.length !== currentTask.proofCount) {
                if (proofMessage) {
                    proofMessage.textContent = `Lütfen ${currentTask.proofCount} adet kanıt dosyası yükleyin.`;
                    proofMessage.className = 'error-message';
                }
                return;
            }

            if (completeTaskBtn) {
                completeTaskBtn.disabled = true;
                completeTaskBtn.textContent = 'Yükleniyor...';
            }
            if (proofMessage) {
                proofMessage.textContent = 'Kanıtlar yükleniyor ve görev onaya gönderiliyor...';
                proofMessage.className = 'info-message';
            }

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

                if (proofMessage) {
                    proofMessage.textContent = 'Kanıtlarınız başarıyla gönderildi ve görev onaya iletildi!';
                    proofMessage.className = 'success-message';
                }
                if (completeTaskBtn) completeTaskBtn.textContent = 'Onaya Gönderildi';
                setTimeout(() => {
                    window.location.href = 'my-tasks.html';
                }, 2000);

            } catch (error) {
                console.error("Kanıt yükleme veya onaya gönderme hatası: ", error);
                if (proofMessage) {
                    proofMessage.textContent = `Hata: ${error.message}`;
                    proofMessage.className = 'error-message';
                }
                if (completeTaskBtn) {
                    completeTaskBtn.disabled = false;
                    completeTaskBtn.textContent = 'Görevi Tamamla';
                }
            }
        });
    }


    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});