// --- START OF FILE admin.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocs, runTransaction, addDoc, deleteDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');

    if (pageId === 'page-admin-panel') {
        if (loader) loader.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().isAdmin) {
                        if (loader) loader.style.display = 'none';
                        if (mainContent) mainContent.style.display = 'block';
                        initAdminPanel(user);
                    } else {
                        await auth.signOut();
                        window.location.replace('admin-login.html');
                    }
                } catch (error) {
                    console.error("Admin yetkilendirme hatası:", error);
                    await auth.signOut();
                    window.location.replace('admin-login.html');
                }
            } else {
                window.location.replace('admin-login.html');
            }
        });
    } else if (pageId === 'page-admin-login') {
        const loginForm = document.getElementById('adminLoginForm');
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              const user = userCredential.user;

              const userDoc = await getDoc(doc(db, "users", user.uid));
              if (userDoc.exists() && userDoc.data().isAdmin) {
                showAlert("Giriş başarılı!", true);
                setTimeout(() => { window.location.replace('admin-panel.html'); }, 1000);
              } else {
                await auth.signOut();
                showAlert("Bu hesap yönetici değil!", false);
              }
            } catch (error) {
                showAlert("Hatalı e-posta veya şifre!", false);
            }
        });

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data().isAdmin) {
                        window.location.replace('admin-panel.html');
                    } else {
                        await auth.signOut();
                    }
                } catch (error) {
                    await auth.signOut();
                }
            }
        });
    }
});

function initAdminPanel(user) {
    const addTaskForm = document.getElementById('addTaskForm');
    const existingTasksList = document.getElementById('existingTasksList');
    const submissionsList = document.getElementById('adminSubmissionsList');
    const adminWithdrawalRequestsList = document.getElementById('adminWithdrawalRequestsList');
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchBtn = document.getElementById('userSearchBtn');
    const userListDiv = document.getElementById('userList');
    const logoutBtn = document.getElementById('logoutAdmin');
    const adminTicketsList = document.getElementById('adminTicketsList');

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.replace("admin-login.html");
        }).catch((error) => {
            showAlert("Çıkış hatası: " + error.message, false);
        });
    });

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
        const filteredUsers = allUsers.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.toLowerCase().includes(searchTerm.toLowerCase()));
        let usersHtml = '';
        if (filteredUsers.length === 0) {
            usersHtml = `<p class="empty-state">Kullanıcı bulunamadı.</p>`;
        } else {
            filteredUsers.forEach(u => {
                usersHtml += `
                    <div class="user-list-item spark-card" id="user-${u.id}">
                        <div class="user-info"><strong>${u.username}</strong> <span style="font-size:0.9em; color:var(--c-text-secondary);">(${u.email})</span><p>Bakiye: ${u.balance} ₺ | Admin: ${u.isAdmin ? 'Evet' : 'Hayır'}</p></div>
                        <div class="user-actions"><button class="spark-button small-button btn-edit-user" data-id="${u.id}">Düzenle</button><button class="spark-button small-button btn-delete-user" data-id="${u.id}">Sil</button></div>
                    </div>`;
            });
        }
        userListDiv.innerHTML = usersHtml;
    };

    userSearchBtn.addEventListener('click', () => renderUsers(userSearchInput.value.trim()));
    userSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') userSearchBtn.click(); });

    userListDiv.addEventListener('click', async (e) => {
        if (e.target.matches('.btn-edit-user')) {
            const userId = e.target.dataset.id;
            const userToEdit = allUsers.find(u => u.id === userId);
            if (userToEdit) {
                const newUsername = prompt("Yeni kullanıcı adı:", userToEdit.username);
                if (newUsername === null) return;
                const newBalance = prompt("Yeni bakiye (₺):", userToEdit.balance);
                if (newBalance === null) return;
                const newIsAdmin = confirm(`Kullanıcıyı admin yapmak ister misiniz? (Şimdiki durum: ${userToEdit.isAdmin ? 'Evet' : 'Hayır'})`);
                try {
                    await updateDoc(doc(db, "users", userId), { username: newUsername, balance: Number(newBalance), isAdmin: newIsAdmin });
                    showAlert("Kullanıcı güncellendi!", true);
                } catch (error) {
                    showAlert("Güncelleme hatası: " + error.message, false);
                }
            }
        }
        if (e.target.matches('.btn-delete-user')) {
            const userId = e.target.dataset.id;
            if (confirm("Kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                try {
                    await deleteDoc(doc(db, "users", userId));
                    showAlert("Kullanıcı silindi!", true);
                } catch (error) {
                    showAlert("Silme hatası: " + error.message, false);
                }
            }
        }
    });
    loadUsers();

    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('taskText').value;
        const category = document.getElementById('taskCategory').value;
        const reward = Number(document.getElementById('taskReward').value);
        const taskLink = document.getElementById('taskLink').value.trim();
        const taskFileCount = Number(document.getElementById('taskFileCount').value);
        const description = document.getElementById('taskDescription').value;
        const taskStock = Number(document.getElementById('taskStock').value); // NEW: Get taskStock
        
        if (!text || !category || !reward || !description || !taskFileCount || !taskStock) { // NEW: Add taskStock to validation
             showAlert("Lütfen tüm alanları doldurun!", false);
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
                    <span>${task.text} - ${task.reward} ₺ ${fileCountDisplay} ${stockDisplay} ${taskLinkDisplay}</span>
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

            submissionsList.innerHTML += `
                <div class="spark-card submission-card">
                    <h3>${task.text} (+${task.reward} ₺)</h3>
                    <p style="font-size: 0.95em; color: var(--c-text-secondary);"><strong>Kullanıcı:</strong> ${sub.userEmail}</p>
                    <div class="submission-images-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 10px;">${submissionImagesHtml}</div>
                    <div class="submission-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="spark-button small-button btn-approve" data-submission-id="${sub.id}" data-user-id="${sub.userId}" data-reward="${task.reward}" style="background-color: var(--c-success);">Onayla</button>
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
                    t.update(userRef, { balance: userDoc.data().balance + Number(target.dataset.reward) });
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

    onSnapshot(query(collection(db, "withdrawalRequests"), where("status", "==", "pending"), orderBy("createdAt", "desc")), (snapshot) => {
        let requestsHtml = snapshot.empty ? `<p class="empty-state">Bekleyen çekme talebi yok.</p>` : '';
        snapshot.forEach(doc => {
            const req = { id: doc.id, ...doc.data() };
            requestsHtml += `
                <div class="spark-card submission-card">
                    <h3>${req.amount} ₺</h3>
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

    const ticketsQuery = query(collection(db, "tickets"), orderBy("lastUpdatedAt", "desc"));
    onSnapshot(ticketsQuery, (snapshot) => {
        if (snapshot.empty) {
            adminTicketsList.innerHTML = `<p class="empty-state">Henüz destek talebi yok.</p>`;
            return;
        }
        let ticketsHtml = '';
        snapshot.forEach(doc => {
            const ticket = { id: doc.id, ...doc.data() };
            const lastUpdate = ticket.lastUpdatedAt.toDate().toLocaleString('tr-TR');
            const actionButtons = ticket.status !== 'closed' ? `<button class="spark-button small-button btn-reply-ticket" data-id="${ticket.id}" style="background-color: var(--c-primary);">Cevapla</button><button class="spark-button small-button btn-close-ticket" data-id="${ticket.id}" style="background-color: var(--c-danger);">Kapat</button>` : `<p style="font-size: 0.9em; color: var(--c-text-secondary);">Talep kapatılmıştır.</p>`;
            ticketsHtml += `<div class="spark-card ticket-admin-item"><div class="ticket-info"><strong>${ticket.subject}</strong><p style="font-size: 0.9em; color: var(--c-text-secondary);">Kullanıcı: ${ticket.userEmail}</p><p style="font-size: 0.85em; color: var(--c-text-secondary);">Son Güncelleme: ${lastUpdate}</p></div><div class="ticket-status-admin"><span class="status-badge status-${ticket.status}">${ticket.status === 'open' ? 'Açık' : 'Kapalı'}</span></div><div class="ticket-actions-admin">${actionButtons}</div></div>`;
        });
        adminTicketsList.innerHTML = ticketsHtml;
    });

    adminTicketsList.addEventListener('click', async (e) => {
        const target = e.target;
        const ticketId = target.dataset.id;
        if (target.matches('.btn-reply-ticket')) {
            const replyMessage = prompt("Cevabınızı giriniz:");
            if (replyMessage) {
                const ticketRef = doc(db, "tickets", ticketId);
                await addDoc(collection(ticketRef, "replies"), { message: replyMessage, senderType: 'admin', sentAt: serverTimestamp() });
                await updateDoc(ticketRef, { lastUpdatedAt: serverTimestamp() });
                showAlert("Cevap gönderildi!", true);
            }
        }
        if (target.matches('.btn-close-ticket')) {
            if (confirm("Talebi kapatmak istediğinize emin misiniz?")) {
                await updateDoc(doc(db, "tickets", ticketId), { status: 'closed', lastUpdatedAt: serverTimestamp() });
                showAlert("Talep kapatıldı!", true);
            }
        }
    });
}