import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocs, runTransaction, addDoc, deleteDoc, serverTimestamp, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBN85bxThpJYifWAvsS0uqPD0C9D55uPpM", // Burayı KENDİ API ANAHTARINIZLA DEĞİŞTİRİN!
    authDomain: "gorev-cuzdan.firebaseapp.com",
    projectId: "gorev-cuzdan",
    storageBucket: "gorev-cuzdan.appspot.com",
    messagingSenderId: "139914511950",
    appId: "1:139914511950:web:0d7c9352e410223742e51f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PREMIUM_BONUS_PERCENTAGE = 0.35; // %35 ek ödül

function showAlert(message, isSuccess = false) {
    const alertBox = document.getElementById("alertBox");
    if (alertBox) {
        const alertClass = isSuccess ? 'alert-success' : 'alert-error';
        alertBox.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
        alertBox.style.display = 'block';
        setTimeout(() => {
            if (alertBox) {
                alertBox.innerHTML = '';
                alertBox.style.display = 'none';
            }
        }, 5000);
    } else {
        console.log(`[Admin Panel Alert - ${isSuccess ? 'SUCCESS' : 'ERROR'}]: ${message}`);
    }
}

function showLoader() {
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    if (loader) loader.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'flex';
    }
    if (loader) {
        loader.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;

    // Sadece admin sayfaları için bu script çalışmalı
    if (!pageId.startsWith('page-admin')) {
        return; // Admin dışı sayfalarda admin.js'yi çalıştırma
    }

    showLoader(); // Admin sayfaları için de loader göster

    if (pageId === 'page-admin-panel') {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().isAdmin) {
                        hideLoader(); // Adminse loader'ı gizle
                        initAdminPanel(user);
                    } else {
                        console.warn("Admin yetkisi olmayan kullanıcı girişi. Çıkış yapılıyor.");
                        await auth.signOut();
                        window.location.replace('admin-login.html');
                    }
                } catch (error) {
                    console.error("Admin yetkilendirme hatası:", error);
                    await auth.signOut();
                    window.location.replace('admin-login.html');
                }
            } else {
                console.log("Kullanıcı oturum açmamış, admin giriş sayfasına yönlendiriliyor.");
                window.location.replace('admin-login.html');
            }
        });
    } else if (pageId === 'page-admin-login') {
        hideLoader(); // Login sayfası yüklendiğinde loader'ı gizle
        const loginForm = document.getElementById('adminLoginForm');
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            showLoader(); // Giriş denemesi yaparken loader göster
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              const user = userCredential.user;

              const userDoc = await getDoc(doc(db, "users", user.uid));
              if (userDoc.exists() && userDoc.data().isAdmin) {
                showAlert("Giriş başarılı!", true);
                setTimeout(() => { window.location.replace('admin-panel.html'); }, 1000);
              } else {
                console.warn("Giriş yapan kullanıcı admin değil. Oturum kapatılıyor.");
                await auth.signOut();
                showAlert("Bu hesap yönetici değil!", false);
                hideLoader(); // Hata durumunda loader'ı gizle
              }
            } catch (error) {
                console.error("Admin giriş hatası:", error);
                showAlert("Hatalı e-posta veya şifre!", false);
                hideLoader(); // Hata durumunda loader'ı gizle
            }
        });

        // Admin girişi sayfasında bile, eğer zaten oturum açmış bir admin varsa doğrudan panele yönlendir.
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().isAdmin) {
                        window.location.replace('admin-panel.html');
                    } else {
                        // Oturum açmış ama admin olmayan kullanıcıyı login sayfasında bırak
                        await auth.signOut(); // Güvenlik için oturumu kapat
                    }
                } catch (error) {
                    console.error("Admin yetki kontrolü sırasında hata:", error);
                    await auth.signOut(); // Hata durumunda oturumu kapat
                }
            }
        });
    }
});

async function initAdminPanel(user) {
    const addTaskForm = document.getElementById('addTaskForm');
    const existingTasksList = document.getElementById('existingTasksList');
    const submissionsList = document.getElementById('adminSubmissionsList');
    const adminWithdrawalRequestsList = document.getElementById('adminWithdrawalRequestsList');
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchBtn = document.getElementById('userSearchBtn');
    const userListDiv = document.getElementById('userList');
    const loadMoreUsersBtn = document.getElementById('loadMoreUsersBtn');
    const logoutBtn = document.getElementById('logoutAdmin');
    const adminTicketsList = document.getElementById('adminTicketsList');
    const clearTicketsBtn = document.getElementById('clearTicketsBtn');
    const addAnnouncementForm = document.getElementById('addAnnouncementForm'); // Yeni duyuru formu
    const announcementsAdminList = document.getElementById('announcementsAdminList'); // Duyuru listesi admin paneli
    const addFaqForm = document.getElementById('addFaqForm'); // SSS ekleme formu
    const faqAdminList = document.getElementById('faqAdminList'); // SSS listesi admin paneli


    let adminUsername = 'Admin';
    let currentAdminId = user.uid;
    const adminUserDoc = await getDoc(doc(db, "users", currentAdminId));
    if (adminUserDoc.exists() && adminUserDoc.data().username) {
        adminUsername = adminUserDoc.data().username;
    }

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.replace("admin-login.html");
        }).catch((error) => {
            showAlert("Çıkış hatası: " + error.message, false);
        });
    });

    // --- User Management ---
    const usersPerPage = 3;
    let displayCount = usersPerPage;
    let allUsers = []; 
    let unsubscribeUsers = null;

    const loadUsers = (searchTerm = '') => {
        if (unsubscribeUsers) unsubscribeUsers();
        const usersQuery = query(collection(db, "users"), orderBy("email", "asc"));
        unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderUsers(searchTerm);
        });
    };

    const renderUsers = (searchTerm = '') => {
        const filteredUsers = allUsers.filter(u => 
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) || 
            u.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        let usersHtml = '';
        if (filteredUsers.length === 0) {
            usersHtml = `<p class="empty-state">Kullanıcı bulunamadı.</p>`;
            loadMoreUsersBtn.style.display = 'none';
        } else {
            const usersToDisplay = filteredUsers.slice(0, displayCount);
            usersToDisplay.forEach(u => {
                // Ensure premiumExpirationDate is a valid date object before calling toDate()
                const premiumExpirationDate = u.premiumExpirationDate ? (u.premiumExpirationDate.toDate ? u.premiumExpirationDate.toDate() : new Date(u.premiumExpirationDate)) : null;
                const premiumStatus = (u.isPremium && premiumExpirationDate && premiumExpirationDate > new Date()) ? 
                                      `Evet (Bitiş: ${premiumExpirationDate.toLocaleDateString('tr-TR')})` : 'Hayır'; // NEW
                usersHtml += `
                    <div class="user-list-item spark-card" id="user-${u.id}">
                        <div class="user-info"><strong>${u.username}</strong> <span style="font-size:0.9em; color:var(--c-text-secondary);">(${u.email})</span><p>Bakiye: ${parseFloat(u.balance || 0).toFixed(2)} ₺ | Admin: ${u.isAdmin ? 'Evet' : 'Hayır'} | Premium: ${premiumStatus} | Completed: ${u.totalCompletedTasks || 0}</p></div>
                        <div class="user-actions">
                            <button class="spark-button small-button btn-edit-user" data-id="${u.id}">Düzenle</button>
                            <button class="spark-button small-button ${u.isAdmin ? 'btn-remove-admin' : 'btn-make-admin'}" data-id="${u.id}">${u.isAdmin ? 'Adminlik Al' : 'Admin Yap'}</button>
                            <button class="spark-button small-button btn-delete-user" data-id="${u.id}">Sil</button>
                        </div>
                    </div>`;
            });
            if (filteredUsers.length > displayCount) {
                loadMoreUsersBtn.style.display = 'block';
            } else {
                loadMoreUsersBtn.style.display = 'none';
            }
        }
        userListDiv.innerHTML = usersHtml;
    };

    userSearchBtn.addEventListener('click', () => {
        displayCount = usersPerPage; // Reset display count on search
        renderUsers(userSearchInput.value.trim());
    });
    userSearchInput.addEventListener('keyup', (e) => { 
        if (e.key === 'Enter') userSearchBtn.click(); 
    });
    loadMoreUsersBtn.addEventListener('click', () => {
        displayCount += usersPerPage;
        renderUsers(userSearchInput.value.trim());
    });

    userListDiv.addEventListener('click', async (e) => {
        if (e.target.matches('.btn-edit-user')) {
            const userId = e.target.dataset.id;
            const userToEdit = allUsers.find(u => u.id === userId);
            if (userToEdit) {
                const newUsername = prompt("Yeni kullanıcı adı:", userToEdit.username);
                if (newUsername === null) return;
                const newBalance = prompt("Yeni bakiye (₺):", parseFloat(userToEdit.balance || 0).toFixed(2));
                if (newBalance === null) return;
                
                try {
                    await updateDoc(doc(db, "users", userId), { username: newUsername, balance: Number(newBalance) });
                    showAlert("Kullanıcı güncellendi!", true);
                }
                catch (error) {
                    showAlert("Güncelleme hatası: " + error.message, false);
                }
            }
        }
        if (e.target.matches('.btn-make-admin')) {
            const userId = e.target.dataset.id;
            if (confirm("Bu kullanıcıyı yönetici yapmak istediğinize emin misiniz?")) {
                try {
                    await updateDoc(doc(db, "users", userId), { isAdmin: true });
                    showAlert("Kullanıcı yönetici yapıldı!", true);
                } catch (error) {
                    showAlert("Admin yapma hatası: " + error.message, false);
                }
            }
        }
        if (e.target.matches('.btn-remove-admin')) {
            const userId = e.target.dataset.id;
            if (userId === currentAdminId) {
                showAlert("Kendi adminliğinizi kaldıramazsınız!", false);
                return;
            }
            if (confirm("Bu kullanıcının yöneticilik yetkisini kaldırmak istediğinize emin misiniz?")) {
                try {
                    await updateDoc(doc(db, "users", userId), { isAdmin: false });
                    showAlert("Kullanıcının adminlik yetkisi kaldırıldı!", true);
                } catch (error) {
                    showAlert("Adminlik kaldırma hatası: " + error.message, false);
                }
            }
        }
        if (e.target.matches('.btn-delete-user')) {
            const userId = e.target.dataset.id;
            if (userId === currentAdminId) {
                showAlert("Kendi hesabınızı silemezsiniz!", false);
                return;
            }
            if (confirm("Kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                try {
                    // Kullanıcının tüm ilgili belgelerini silme (isteğe bağlı, ancak temiz bir silme için önemli)
                    // Gerçek bir uygulamada, kullanıcının görevlerini, gönderimlerini, ticket'larını vb. de silmek isteyebilirsiniz.
                    // Bu örnekte sadece user belgesini siliyoruz.
                    await deleteDoc(doc(db, "users", userId));
                    showAlert("Kullanıcı silindi!", true);
                } catch (error) {
                    showAlert("Silme hatası: " + error.message, false);
                }
            }
        }
    });
    loadUsers();

    // --- Task Management ---
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('taskText').value;
        const category = document.getElementById('taskCategory').value;
        const reward = Number(document.getElementById('taskReward').value);
        const taskLink = document.getElementById('taskLink').value.trim();
        const taskFileCount = Number(document.getElementById('taskFileCount').value);
        const description = document.getElementById('taskDescription').value;
        const taskStock = Number(document.getElementById('taskStock').value); // NEW: Get taskStock
        
        if (!text || !category || !reward || !description || !taskFileCount || typeof taskStock !== 'number') { // NEW: Add taskStock to validation
             showAlert("Lütfen tüm alanları doldurun ve geçerli değerler girin!", false);
             return;
        }
        if (taskFileCount < 1) {
            showAlert("Gereken Kanıt Dosyası Sayısı en az 1 olmalıdır!", false);
            return;
        }
        if (taskStock < 0) { // NEW: Stock cannot be negative
            showAlert("Stok sayısı negatif olamaz!", false);
            return;
        }


        try {
            await addDoc(collection(db, "tasks"), { 
                text, 
                category, 
                reward, 
                description, 
                link: taskLink, 
                fileCount: taskFileCount, 
                stock: taskStock, // NEW: Add stock to task
                createdAt: serverTimestamp() 
            });
            showAlert("Görev eklendi!", true);
            addTaskForm.reset();
            document.getElementById('taskFileCount').value = 1;
            document.getElementById('taskStock').value = 1; // NEW: Reset stock to 1 after adding
        } catch (error) {
            showAlert("Görev ekleme hatası: " + error.message, false);
        }
    });

    onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
        let tasksHtml = snapshot.empty ? `<p class="empty-state">Henüz görev yok.</p>` : '';
        snapshot.forEach(doc => {
            const task = { id: doc.id, ...doc.data() };
            const taskLinkDisplay = task.link ? `<a href="${task.link}" target="_blank" style="margin-left: 10px; color: var(--c-secondary); text-decoration: none;">Link</a>` : '';
            const fileCountDisplay = task.fileCount ? `(${task.fileCount} Dosya)` : '';
            const stockDisplay = `(Stok: ${task.stock || 0})`; // NEW: Display stock
            tasksHtml += `
                <div class="task-list-item">
                    <span>${task.text} - ${parseFloat(task.reward || 0).toFixed(2)} ₺ ${fileCountDisplay} ${stockDisplay} ${taskLinkDisplay}</span>
                    <button class="spark-button small-button btn-delete" data-id="${task.id}">Sil</button>
                </div>`;
        });
        existingTasksList.innerHTML = tasksHtml;
    });

    existingTasksList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            if (confirm("Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                await deleteDoc(doc(db, "tasks", e.target.dataset.id));
                showAlert("Görev başarıyla silindi!", true);
            }
        }
    });

    // --- Submission Management ---
    onSnapshot(query(collection(db, "submissions"), where("status", "==", "pending"), orderBy("submittedAt", "desc")), async (snapshot) => {
        if (snapshot.empty) {
            submissionsList.innerHTML = `<p class="empty-state">Onay bekleyen gönderim yok.</p>`;
            return;
        }
        submissionsList.innerHTML = '';
        for (const docSnapshot of snapshot.docs) {
            const sub = { id: docSnapshot.id, ...docSnapshot.data() };
            const taskDoc = await getDoc(doc(db, "tasks", sub.taskId));
            const task = taskDoc.exists() ? taskDoc.data() : { text: 'Bilinmeyen Görev', reward: 0 };
            const userDoc = await getDoc(doc(db, "users", sub.userId));
            const userDisplayName = userDoc.exists() ? (userDoc.data().username || sub.userEmail) : sub.userEmail;

            let submissionImagesHtml = '';
            if (Array.isArray(sub.fileURLs) && sub.fileURLs.length > 0) {
                sub.fileURLs.forEach((url, index) => {
                    submissionImagesHtml += `<img src="${url}" class="submission-image" onclick="window.open(this.src, '_blank')" alt="Kanıt ${index + 1}" style="max-width: 100px; max-height: 100px; border-radius: 8px; cursor: pointer; margin: 5px;">`;
                });
            } else if (sub.fileURL) { 
                 submissionImagesHtml += `<img src="${sub.fileURL}" class="submission-image" onclick="window.open(this.src, '_blank')" alt="Kanıt" style="max-width: 100px; max-height: 100px; border-radius: 8px; cursor: pointer; margin: 5px;">`;
            } else {
                 submissionImagesHtml += `<p style="font-size: 0.9em; color: var(--c-text-secondary);">Görsel kanıt yok.</p>`;
            }

            // Display submission info including premium status at time of submission
            let premiumInfoText = '';
            if (sub.isPremiumBonusApplied) {
                premiumInfoText = `<p style="font-size: 0.95em; color: var(--c-success);"><strong>Premium Bonuslu Gönderim</strong></p>`;
            }

            submissionsList.innerHTML += `
                <div class="spark-card submission-card">
                    <h3>${task.text} (+${parseFloat(task.reward || 0).toFixed(2)} ₺)</h3>
                    <p style="font-size: 0.95em; color: var(--c-text-secondary);"><strong>Kullanıcı:</strong> ${userDisplayName} (${sub.userEmail})</p>
                    ${premiumInfoText}
                    <div class="submission-images-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 10px;">${submissionImagesHtml}</div>
                    <div class="submission-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="spark-button small-button btn-approve" data-submission-id="${sub.id}" data-user-id="${sub.userId}" data-task-reward="${task.reward}" data-is-premium-bonus-applied="${sub.isPremiumBonusApplied}" style="background-color: var(--c-success);">Onayla</button>
                        <button class="spark-button small-button btn-reject" data-submission-id="${sub.id}" style="background-color: var(--c-danger);">Reddet</button>
                    </div>
                </div>`;
        }
    });

    submissionsList.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.matches('.btn-approve')) {
            target.disabled = true;
            try {
                await runTransaction(db, async (t) => {
                    const userRef = doc(db, "users", target.dataset.userId);
                    const userDoc = await t.get(userRef);
                    if (!userDoc.exists()) throw "Kullanıcı bulunamadı!";
                    
                    const currentBalance = userDoc.data().balance || 0;
                    const totalCompletedTasks = userDoc.data().totalCompletedTasks || 0;
                    const totalEarned = userDoc.data().totalEarned || 0;
                    

                    let finalReward = Number(target.dataset.taskReward);
                    // Check if premium bonus was applicable at the time of submission
                    const isPremiumBonusApplied = target.dataset.isPremiumBonusApplied === 'true';

                    if (isPremiumBonusApplied) {
                        finalReward = finalReward * (1 + PREMIUM_BONUS_PERCENTAGE);
                    }
                    
                    const newCompletedTasks = totalCompletedTasks + 1;
                    
                    
                    t.update(userRef, { 
                        balance: currentBalance + finalReward,
                        totalCompletedTasks: newCompletedTasks,
                        totalEarned: totalEarned + finalReward,
                        
                    });
                    t.update(doc(db, "submissions", target.dataset.submissionId), { status: 'approved' });
                });
                showAlert("Gönderim onaylandı ve bakiye eklendi!", true);
            } catch (error) { 
                showAlert("Onaylama hatası: " + error.message, false);
                target.disabled = false; 
            }
        }
        if (target.matches('.btn-reject')) {
            target.disabled = true;
            const reason = prompt("Reddetme nedenini giriniz:");
            if (reason) {
                try {
                    await updateDoc(doc(db, "submissions", target.dataset.submissionId), { status: 'rejected', rejectionReason: reason });
                    showAlert("Gönderim reddedildi!", false);
                } catch (error) {
                    showAlert("Reddetme hatası: " + error.message, false);
                }
            }
            target.disabled = false;
        }
    });


    // --- Withdrawal Requests Management ---
    onSnapshot(query(collection(db, "withdrawalRequests"), where("status", "==", "pending"), orderBy("createdAt", "desc")), (snapshot) => {
        let requestsHtml = snapshot.empty ? `<p class="empty-state">Bekleyen çekme talebi yok.</p>` : '';
        snapshot.forEach(doc => {
            const req = { id: doc.id, ...doc.data() };
            requestsHtml += `
                <div class="spark-card submission-card">
                    <h3>${parseFloat(req.amount || 0).toFixed(2)} ₺</h3>
                    <p style="font-size: 0.95em; color: var(--c-text-secondary);"><strong>Kullanıcı:</strong> ${req.userEmail}</p>
                    <p style="font-size: 0.95em; color: var(--c-text-secondary);"><strong>IBAN:</strong> ${req.iban}</p>
                    <p style="font-size: 0.95em; color: var(--c-text-secondary);"><strong>Telefon:</strong> ${req.phoneNumber}</p>
                    <div class="submission-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="spark-button small-button btn-approve-withdrawal" data-id="${req.id}" style="background-color: var(--c-success);">Ödendi</button>
                        <button class="spark-button small-button btn-reject-withdrawal" data-id="${req.id}" data-user-id="${req.userId}" data-amount="${req.amount}" style="background-color: var(--c-danger);">Reddet</button>
                    </div>
                </div>`;
        });
        adminWithdrawalRequestsList.innerHTML = requestsHtml;
    });

    adminWithdrawalRequestsList.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.matches('.btn-approve-withdrawal')) {
            try {
                await updateDoc(doc(db, "withdrawalRequests", target.dataset.id), { status: 'approved' });
                showAlert("Çekme talebi ödendi olarak işaretlendi!", true);
            } catch (error) {
                showAlert("Ödeme işaretleme hatası: " + error.message, false);
            }
        }
        if (target.matches('.btn-reject-withdrawal')) {
            if (confirm("Bu çekme talebini reddedip bakiyeyi iade etmek istediğinize emin misiniz?")) {
                try {
                    await runTransaction(db, async (t) => {
                        const userRef = doc(db, "users", target.dataset.userId);
                        const userDoc = await t.get(userRef);
                        if (!userDoc.exists()) throw "Kullanıcı bulunamadı!";
                        t.update(userRef, { balance: userDoc.data().balance + Number(target.dataset.amount) });
                        t.update(doc(db, "withdrawalRequests", target.dataset.id), { status: 'rejected' });
                    });
                    showAlert("Çekme talebi reddedildi ve bakiye iade edildi!", false);
                } catch (error) {
                    showAlert("Reddetme hatası: " + error.message, false);
                }
            }
        }
    });

    // --- Ticket Management ---
    const ticketsQuery = query(collection(db, "tickets"), orderBy("lastUpdatedAt", "desc"));
    onSnapshot(ticketsQuery, (snapshot) => {
        if (snapshot.empty) {
            adminTicketsList.innerHTML = `<p class="empty-state">Henüz destek talebi bulunmamaktadır.</p>`;
            return;
        }
        let ticketsHtml = '';
        snapshot.forEach(docSnapshot => {
            const ticket = { id: docSnapshot.id, ...docSnapshot.data() };
            
            // "cleared" durumundaki ticket'ları gösterme
            if (ticket.status === 'cleared') {
                return; 
            }

            // Ensure lastUpdatedAt is a valid date object before calling toDate()
            const lastUpdate = ticket.lastUpdatedAt ? (ticket.lastUpdatedAt.toDate ? ticket.lastUpdatedAt.toDate().toLocaleString('tr-TR') : new Date(ticket.lastUpdatedAt).toLocaleString('tr-TR')) : 'Bilinmiyor';
            
            let actionButtons = '';
            let assignedStatus = '';

            if (ticket.status === 'closed') {
                assignedStatus = '<span class="status-badge status-closed">Kapalı</span>';
                actionButtons = `<button class="spark-button small-button btn-view-ticket" data-id="${ticket.id}">Görüntüle</button>`;
            } else {
                if (ticket.assignedTo === currentAdminId) {
                    assignedStatus = `<span class="status-badge status-assigned">Size Atanmış</span>`;
                    actionButtons = `
                        <button class="spark-button small-button btn-reply-ticket" data-id="${ticket.id}" style="background-color: var(--c-primary);">Cevapla</button>
                        <button class="spark-button small-button btn-unassign-ticket" data-id="${ticket.id}" style="background-color: var(--c-warning);">Vazgeç</button>
                        <button class="spark-button small-button btn-close-ticket" data-id="${ticket.id}" style="background-color: var(--c-danger);">Kapat</button>
                    `;
                } else if (ticket.assignedTo) {
                    assignedStatus = `<span class="status-badge status-pending">Atanmış: ${ticket.assignedToName || 'Bilinmiyor'}</span>`;
                    actionButtons = `<button class="spark-button small-button btn-reply-ticket" data-id="${ticket.id}">Cevapla</button>`;
                } else {
                    assignedStatus = `<span class="status-badge status-open">Açık</span>`;
                    actionButtons = `
                        <button class="spark-button small-button btn-assign-ticket" data-id="${ticket.id}" style="background-color: var(--c-secondary);">Üstlen</button>
                        <button class="spark-button small-button btn-reply-ticket" data-id="${ticket.id}">Cevapla</button>
                    `;
                }
            }
            
            ticketsHtml += `
                <div class="spark-card ticket-admin-item">
                    <div class="ticket-info">
                        <strong>${ticket.subject}</strong>
                        <p>Kategori: ${ticket.category || 'Belirtilmemiş'}</p>
                        <p>Kullanıcı: ${ticket.userEmail}</p>
                        <p>Son Güncelleme: ${lastUpdate}</p>
                    </div>
                    <div class="ticket-status-admin">${assignedStatus}</div>
                    <div class="ticket-actions-admin">${actionButtons}</div>
                    <div id="adminReplyArea-${ticket.id}" class="admin-reply-area" style="display: none; width: 100%;">
                        <div id="alertBox-${ticket.id}"></div>
                        <textarea id="adminReplyMessage-${ticket.id}" class="spark-input" rows="3" placeholder="Cevabınızı buraya yazın..."></textarea>
                        <button class="spark-button small-button btn-send-admin-reply" data-id="${ticket.id}">Cevapla</button>
                    </div>
                </div>`;
        });
        adminTicketsList.innerHTML = ticketsHtml;
    });

    adminTicketsList.addEventListener('click', async (e) => {
        const target = e.target;
        const ticketId = target.dataset.id;
        
        if (target.matches('.btn-assign-ticket')) {
            try {
                await updateDoc(doc(db, "tickets", ticketId), { 
                    assignedTo: currentAdminId, 
                    assignedToName: adminUsername,
                    lastUpdatedAt: serverTimestamp() 
                });
                showAlert("Talep başarıyla size atandı!", true);
            } catch (error) {
                showAlert("Talep atama hatası: " + error.message, false);
            }
        }
        if (target.matches('.btn-unassign-ticket')) {
            if (!confirm("Talebi üstlenmekten vazgeçmek istediğinize emin misiniz?")) return;
            try {
                await updateDoc(doc(db, "tickets", ticketId), { 
                    assignedTo: null, 
                    assignedToName: null,
                    lastUpdatedAt: serverTimestamp() 
                });
                showAlert("Talep üstlenmekten vazgeçildi.", true);
            } catch (error) {
                showAlert("Talep vazgeçme hatası: " + error.message, false);
            }
        }
        if (target.matches('.btn-reply-ticket') || target.matches('.btn-view-ticket')) { // View button also toggles reply area
            const replyArea = document.getElementById(`adminReplyArea-${ticketId}`);
            if (replyArea) {
                replyArea.style.display = replyArea.style.display === 'none' ? 'block' : 'none';
            }
        }
        if (target.matches('.btn-send-admin-reply')) {
            const messageInput = document.getElementById(`adminReplyMessage-${ticketId}`);
            const message = messageInput.value.trim();
            if (!message) {
                showAlert("Lütfen bir cevap yazın.", false);
                return;
            }
            try {
                await addDoc(collection(db, "tickets", ticketId, "replies"), { 
                    message, 
                    senderId: currentAdminId, 
                    senderType: 'admin', 
                    senderName: adminUsername,
                    sentAt: serverTimestamp() 
                });
                await updateDoc(doc(db, "tickets", ticketId), { 
                    lastUpdatedAt: serverTimestamp(),
                    status: 'open' // Ensure it's open if admin replies
                });
                showAlert("Cevap gönderildi!", true);
                messageInput.value = '';
                document.getElementById(`adminReplyArea-${ticketId}`).style.display = 'none'; // Hide form after sending
            } catch (error) {
                showAlert("Cevap gönderme hatası: " + error.message, false);
            }
        }
        if (target.matches('.btn-close-ticket')) {
            if (confirm("Talebi kapatmak istediğinize emin misiniz?")) {
                try {
                    await updateDoc(doc(db, "tickets", ticketId), { status: 'closed', lastUpdatedAt: serverTimestamp() });
                    showAlert("Talep kapatıldı!", true);
                } catch (error) {
                    showAlert("Kapatma hatası: " + error.message, false);
                }
            }
        }
    });

    clearTicketsBtn.addEventListener('click', async () => {
        if (!confirm("Tüm kapalı destek taleplerini temizlemek istediğinize emin misiniz? Bu işlem onları listeden kaldıracaktır.")) {
            return;
        }
        try {
            const closedTicketsQuery = query(collection(db, "tickets"), where("status", "==", "closed"));
            const snapshot = await getDocs(closedTicketsQuery);
            const batch = writeBatch(db);
            snapshot.forEach(docSnapshot => {
                // Sadece listeden kaldırmak için status'ü "cleared" olarak güncelliyoruz.
                batch.update(docSnapshot.ref, { status: 'cleared' });
            });
            await batch.commit();
            showAlert("Kapalı destek talepleri temizlendi.", true);
        } catch (error) {
            showAlert("Destek taleplerini temizleme hatası: " + error.message, false);
        }
    });

    // YENİ ÖZELLİK: Duyuru Yönetimi
    addAnnouncementForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('announcementTitle').value.trim();
        const content = document.getElementById('announcementContent').value.trim();

        if (!title || !content) {
            showAlert("Lütfen duyuru başlığı ve içeriği girin!", false);
            return;
        }

        try {
            await addDoc(collection(db, "announcements"), {
                title,
                content,
                createdAt: serverTimestamp()
            });
            showAlert("Duyuru başarıyla eklendi!", true);
            addAnnouncementForm.reset();
        } catch (error) {
            showAlert("Duyuru ekleme hatası: " + error.message, false);
        }
    });

    onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snapshot) => {
        let announcementsHtml = snapshot.empty ? `<p class="empty-state">Henüz duyuru yok.</p>` : '';
        snapshot.forEach(doc => {
            const announcement = { id: doc.id, ...doc.data() };
            const date = announcement.createdAt ? (announcement.createdAt.toDate ? announcement.createdAt.toDate().toLocaleDateString('tr-TR') : new Date(announcement.createdAt).toLocaleDateString('tr-TR')) : 'Bilinmiyor';
            announcementsHtml += `
                <div class="task-list-item">
                    <span>${announcement.title} - ${date}</span>
                    <button class="spark-button small-button btn-delete-announcement" data-id="${announcement.id}">Sil</button>
                </div>`;
        });
        announcementsAdminList.innerHTML = announcementsHtml;
    });

    announcementsAdminList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete-announcement')) {
            if (confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) {
                try {
                    await deleteDoc(doc(db, "announcements", e.target.dataset.id));
                    showAlert("Duyuru silindi!", true);
                } catch (error) {
                    showAlert("Duyuru silme hatası: " + error.message, false);
                }
            }
        }
    });

    // YENİ ÖZELLİK: SSS Yönetimi
    addFaqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('faqQuestion').value.trim();
        const answer = document.getElementById('faqAnswer').value.trim();
        const order = Number(document.getElementById('faqOrder').value);

        if (!question || !answer || isNaN(order)) {
            showAlert("Lütfen tüm SSS alanlarını doldurun ve geçerli bir sıra numarası girin!", false);
            return;
        }

        try {
            await addDoc(collection(db, "faqs"), {
                question,
                answer,
                order,
                createdAt: serverTimestamp()
            });
            showAlert("SSS başarıyla eklendi!", true);
            addFaqForm.reset();
            document.getElementById('faqOrder').value = (await getDocs(collection(db, "faqs"))).size + 1; // Otomatik sıra numarası
        } catch (error) {
            showAlert("SSS ekleme hatası: " + error.message, false);
        }
    });

    onSnapshot(query(collection(db, "faqs"), orderBy("order", "asc")), (snapshot) => {
        let faqsHtml = snapshot.empty ? `<p class="empty-state">Henüz Sıkça Sorulan Soru yok.</p>` : '';
        snapshot.forEach(doc => {
            const faq = { id: doc.id, ...doc.data() };
            faqsHtml += `
                <div class="task-list-item">
                    <span>${faq.order}. ${faq.question}</span>
                    <button class="spark-button small-button btn-delete-faq" data-id="${faq.id}">Sil</button>
                </div>`;
        });
        faqAdminList.innerHTML = faqsHtml;
    });

    faqAdminList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete-faq')) {
            if (confirm("Bu SSS'yi silmek istediğinize emin misiniz?")) {
                try {
                    await deleteDoc(doc(db, "faqs", e.target.dataset.id));
                    showAlert("SSS silindi!", true);
                } catch (error) {
                    showAlert("SSS silme hatası: " + error.message, false);
                }
            }
        }
    });
}