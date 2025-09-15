document.addEventListener('DOMContentLoaded', () => {
    const taskDetailTitleHeader = document.getElementById('task-detail-title-header');
    const taskDetailContentWrapper = document.getElementById('task-detail-content-wrapper');
    const initialLoadingMessage = document.getElementById('initial-loading-message');
    const taskDetailCard = document.getElementById('task-detail-card');
    
    const taskCardMainTitle = document.getElementById('task-card-main-title'); 
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
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    let currentUser = null;
    let userData = null; 
    let currentTask = null;
    let selectedFiles = [];

    const IMGBB_API_KEY = "84a7c0a54294a6e8ea2ffc9bab240719"; 

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('taskId');

    if (!taskId) {
        if (initialLoadingMessage) {
            initialLoadingMessage.textContent = 'Görev bulunamadı. Lütfen geçerli bir görev seçin.';
            initialLoadingMessage.className = 'message-box error-message';
            initialLoadingMessage.style.display = 'block';
        }
        if (taskDetailCard) taskDetailCard.classList.add('content-hidden'); 
        if (completeTaskBtn) completeTaskBtn.disabled = true;
        if (proofFilesInput) proofFilesInput.disabled = true;
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserDataAndTaskDetails(taskId, user.uid);
            checkAdminStatus(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            if (adminPanelLink) adminPanelLink.style.display = 'block';
        }
    }

    async function loadUserDataAndTaskDetails(id, uid) {
        if (initialLoadingMessage) {
            initialLoadingMessage.textContent = 'Görev detayları yükleniyor...';
            initialLoadingMessage.className = 'message-box info-message';
            initialLoadingMessage.style.display = 'block';
        }
        if (taskDetailCard) taskDetailCard.classList.add('content-hidden');
        if (completeTaskBtn) completeTaskBtn.disabled = true;
        if (proofFilesInput) proofFilesInput.disabled = true;
        if (proofMessage) proofMessage.style.display = 'none';

        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                throw new Error("Kullanıcı verisi bulunamadı.");
            }
            userData = userDoc.data();

            const taskDoc = await db.collection('tasks').doc(id).get();
            if (!taskDoc.exists) {
                if (initialLoadingMessage) {
                    initialLoadingMessage.textContent = 'Görev bulunamadı.';
                    initialLoadingMessage.className = 'message-box error-message';
                    initialLoadingMessage.style.display = 'block';
                }
                return;
            }
            currentTask = { id: taskDoc.id, ...taskDoc.data() };
            console.log("Görev verisi yüklendi:", currentTask); 

            // Check if task is already completed by user
            if (userData.completedTaskIds && userData.completedTaskIds.includes(taskId)) {
                if (initialLoadingMessage) {
                    initialLoadingMessage.textContent = 'Bu görevi zaten tamamladınız!';
                    initialLoadingMessage.className = 'message-box success-message';
                    initialLoadingMessage.style.display = 'block';
                }
                if (taskDetailContentWrapper) {
                     const backBtn = document.createElement('button');
                     backBtn.className = 'btn-primary';
                     backBtn.textContent = 'Görevlere Geri Dön';
                     backBtn.onclick = () => window.location.href='my-tasks.html';
                     taskDetailContentWrapper.appendChild(backBtn);
                }
                return;
            }

            // Check for pending proofs for this task by this user
            const pendingProofSnapshot = await db.collection('taskProofs')
                                                  .where('userId', '==', currentUser.uid)
                                                  .where('taskId', '==', taskId)
                                                  .where('status', '==', 'pending')
                                                  .get();

            if (!pendingProofSnapshot.empty) {
                if (initialLoadingMessage) {
                    initialLoadingMessage.textContent = 'Bu görev için gönderdiğiniz kanıtlar onay bekliyor.';
                    initialLoadingMessage.className = 'message-box info-message';
                    initialLoadingMessage.style.display = 'block';
                }
                if (taskDetailContentWrapper) {
                    const backBtn = document.createElement('button');
                    backBtn.className = 'btn-primary';
                    backBtn.textContent = 'Görevlere Geri Dön';
                    backBtn.onclick = () => window.location.href='my-tasks.html';
                    taskDetailContentWrapper.appendChild(backBtn);
                }
                return;
            }

            // Check task stock
            const currentStock = currentTask.stock - (currentTask.completedCount || 0); 
            if (currentTask.stock > 0 && currentStock <= 0) { 
                if (initialLoadingMessage) {
                    initialLoadingMessage.textContent = 'Bu görevin stoğu bitmiştir.';
                    initialLoadingMessage.className = 'message-box error-message';
                    initialLoadingMessage.style.display = 'block';
                }
                if (taskDetailContentWrapper) {
                    const backBtn = document.createElement('button');
                    backBtn.className = 'btn-primary';
                    backBtn.textContent = 'Görevlere Geri Dön';
                    backBtn.onclick = () => window.location.href='my-tasks.html';
                    taskDetailContentWrapper.appendChild(backBtn);
                }
                return;
            }

            // If all checks pass, display task details and enable submission
            if (initialLoadingMessage) initialLoadingMessage.style.display = 'none'; 
            if (taskDetailCard) {
                taskDetailCard.classList.remove('content-hidden'); 
            }
            
            if (taskDetailTitleHeader) taskDetailTitleHeader.textContent = currentTask.title;
            if (taskCardMainTitle) taskCardMainTitle.textContent = currentTask.title; 
            if (taskDetailIcon) taskDetailIcon.src = `img/logos/${currentTask.icon || 'other.png'}`;
            if (taskDetailDescription) taskDetailDescription.textContent = currentTask.description;
            if (taskDetailReward) taskDetailReward.textContent = `${currentTask.reward.toFixed(2)} ₺`;
            if (taskDetailStock) taskDetailStock.textContent = `${currentTask.stock === 0 ? 'Sınırsız' : currentStock}/${currentTask.stock === 0 ? 'Sınırsız' : currentTask.stock}`;
            if (taskDetailProofCount) taskDetailProofCount.textContent = currentTask.proofCount;

            if (completeTaskBtn) completeTaskBtn.disabled = selectedFiles.length !== (currentTask ? currentTask.proofCount : 0);
            if (proofFilesInput) proofFilesInput.disabled = false;
            if (proofMessage) {
                proofMessage.textContent = `Bu görev için ${currentTask.proofCount} adet kanıt dosyası yüklemelisiniz.`;
                proofMessage.className = 'message-box info-message';
                proofMessage.style.display = 'block';
            }
            renderSelectedFiles(); 

        } catch (error) {
            console.error("Görev detayları yüklenirken hata oluştu: ", error);
            if (initialLoadingMessage) {
                initialLoadingMessage.textContent = `Görev detayları yüklenemedi: ${error.message}`;
                initialLoadingMessage.className = 'message-box error-message';
                initialLoadingMessage.style.display = 'block';
            }
            if (taskDetailCard) taskDetailCard.classList.add('content-hidden');
            if (completeTaskBtn) completeTaskBtn.disabled = true;
            if (proofFilesInput) proofFilesInput.disabled = true;
        }
    }

    if (proofFilesInput) {
        proofFilesInput.addEventListener('change', (e) => {
            selectedFiles = [];
            if (fileList) fileList.innerHTML = '';
            const files = Array.from(e.target.files);

            if (!currentTask || !currentTask.proofCount) {
                if (proofMessage) {
                    proofMessage.textContent = `Görev bilgileri eksik. Lütfen sayfayı yenileyin.`;
                    proofMessage.className = 'message-box error-message';
                    proofMessage.style.display = 'block';
                }
                if (proofFilesInput) proofFilesInput.value = '';
                return;
            }

            if (files.length > currentTask.proofCount) {
                if (proofMessage) {
                    proofMessage.textContent = `En fazla ${currentTask.proofCount} dosya yükleyebilirsiniz. Lütfen dosya sayısını azaltın.`;
                    proofMessage.className = 'message-box error-message';
                    proofMessage.style.display = 'block';
                }
                if (proofFilesInput) proofFilesInput.value = ''; 
                return;
            }
            
            if (proofMessage) proofMessage.textContent = ''; 
            if (proofMessage) proofMessage.style.display = 'none';

            files.forEach(file => {
                // Basit dosya tipi kontrolü
                if (!file.type.startsWith('image/')) {
                    alert(`Sadece resim dosyaları yükleyebilirsiniz. "${file.name}" bir resim dosyası değil.`);
                    // Clear selected files or remove invalid one
                    selectedFiles = [];
                    e.target.value = ''; // Clear input
                    return;
                }
                selectedFiles.push(file);
            });
            renderSelectedFiles();
        });
    }


    function renderSelectedFiles() {
        if (fileList) fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-file';
            removeButton.innerHTML = '&times;';
            removeButton.addEventListener('click', () => {
                selectedFiles.splice(index, 1); // Remove by index
                // Reset file input value to allow re-selection of same file if needed
                if (proofFilesInput) proofFilesInput.value = ''; 
                renderSelectedFiles();
            });
            listItem.appendChild(removeButton);
            if (fileList) fileList.appendChild(listItem);
        });
        if (proofMessage && currentTask) {
            if (selectedFiles.length === currentTask.proofCount) {
                proofMessage.textContent = 'Tüm kanıt dosyaları seçildi.';
                proofMessage.className = 'message-box success-message';
            } else {
                proofMessage.textContent = `Bu görev için ${currentTask.proofCount - selectedFiles.length} adet daha kanıt dosyası yüklemelisiniz.`;
                proofMessage.className = 'message-box info-message';
            }
            proofMessage.style.display = 'block';
        }
        if (completeTaskBtn) completeTaskBtn.disabled = selectedFiles.length !== (currentTask ? currentTask.proofCount : 0);
    }


    if (proofUploadForm) {
        proofUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (selectedFiles.length === 0 || !currentTask || selectedFiles.length !== currentTask.proofCount) {
                if (proofMessage) {
                    proofMessage.textContent = `Lütfen ${currentTask ? currentTask.proofCount : 0} adet kanıt dosyası yükleyin.`;
                    proofMessage.className = 'message-box error-message';
                    proofMessage.style.display = 'block';
                }
                return;
            }

            if (completeTaskBtn) {
                completeTaskBtn.disabled = true;
                completeTaskBtn.textContent = 'Yükleniyor...';
            }
            if (proofMessage) {
                proofMessage.textContent = 'Kanıtlar yükleniyor ve görev onaya gönderiliyor...';
                proofMessage.className = 'message-box info-message';
                proofMessage.style.display = 'block';
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

                await db.collection('taskProofs').add({
                    taskId: taskId,
                    taskTitle: currentTask.title, 
                    userId: currentUser.uid,
                    username: userData.username || currentUser.email,
                    proofUrls: downloadURLs,
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending' 
                });

                if (proofMessage) {
                    proofMessage.textContent = 'Kanıtlarınız başarıyla gönderildi ve görev onaya iletildi!';
                    proofMessage.className = 'message-box success-message';
                }
                if (completeTaskBtn) completeTaskBtn.textContent = 'Onaya Gönderildi';
                setTimeout(() => {
                    window.location.href = 'my-tasks.html';
                }, 2000);

            } catch (error) {
                console.error("Kanıt yükleme veya onaya gönderme hatası: ", error);
                if (proofMessage) {
                    proofMessage.textContent = `Hata: ${error.message}`;
                    proofMessage.className = 'message-box error-message';
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