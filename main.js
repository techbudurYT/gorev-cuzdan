import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocs, runTransaction, addDoc, serverTimestamp, updateDoc, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBN85bxThpJYifWAvsS0uqPD0C9D55uPpM",
    authDomain: "gorev-cuzdan.firebaseapp.com",
    projectId: "gorev-cuzdan",
    storageBucket: "gorev-cuzdan.appspot.com",
    messagingSenderId: "139914511950",
    appId: "1:139914511950:web:0d7c9352e410223742e51f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY"; // Lütfen bu anahtarı KENDİ ImageBB API anahtarınızla değiştirin!
const PREMIUM_MONTHLY_FEE = 50;
const PREMIUM_BONUS_PERCENTAGE = 0.35;

const categoryData = {
    "youtube": { name: "YouTube", logo: "img/logos/youtube.png" },
    "instagram": { name: "Instagram", logo: "img/logos/instagram.png" },
    "telegram": { name: "Telegram", logo: "img/logos/telegram.png" },
    "google-maps": { name: "Google Maps", logo: "img/logos/google-maps.png" },
    "other": { name: "Diğer", logo: "img/logos/other.png" }
};

function showAlert(message, isSuccess = false) {
    const alertBox = document.getElementById("alertBox");
    if (!alertBox) return;
    const alertClass = isSuccess ? 'alert-success' : 'alert-error';
    alertBox.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    alertBox.style.display = 'block';
    setTimeout(() => {
        if (alertBox) {
            alertBox.innerHTML = '';
            alertBox.style.display = 'none';
        }
    }, 5000);
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

function handleInputLabels() {
    document.querySelectorAll('.input-group input, .input-group textarea').forEach(input => {
        if (input.value) {
            input.classList.add('populated');
        } else {
            input.classList.remove('populated');
        }

        input.addEventListener('input', () => {
            if (input.value) {
                input.classList.add('populated');
            } else {
                input.classList.remove('populated');
            }
        });

        input.addEventListener('focus', () => {
            input.parentElement.querySelector('label')?.classList.add('focused');
        });

        input.addEventListener('blur', () => {
            input.parentElement.querySelector('label')?.classList.remove('focused');
        });
    });

    document.querySelectorAll('.input-group select').forEach(select => {
        const label = select.parentElement.querySelector('label');
        if (label) {
            label.classList.add('static-label');
            select.addEventListener('focus', () => {
                label.classList.add('focused');
            });
            select.addEventListener('blur', () => {
                label.classList.remove('focused');
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;

    // Admin sayfaları için main.js'yi çalıştırma. Bu kontrol kritik.
    if (pageId.startsWith('page-admin')) {
        console.log("Admin sayfası algılandı, main.js çalışmayacak.");
        return; 
    }

    showLoader();

    onAuthStateChanged(auth, async (user) => {
        const isAuthPage = pageId === 'page-login' || pageId === 'page-register';
        
        if (user) {
            // Kullanıcı Auth'a kayıtlıysa, Firestore belgesini kontrol et veya oluştur
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Firestore belgesi yoksa oluştur
                console.log(`Firestore'da yeni kullanıcı belgesi oluşturuluyor: ${user.uid}`);
                await setDoc(userRef, {
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    balance: 0,
                    isAdmin: false,
                    isPremium: false,
                    premiumExpirationDate: null,
                    lastPremiumPaymentDate: null,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                    totalCompletedTasks: 0,
                    totalEarned: 0
                });
            } else {
                // Mevcut kullanıcının verilerini güncelle/tamamla
                const userData = userDoc.data();
                const updates = {};
                
                // Her oturum açışta son giriş zamanını güncelle
                updates.lastLoginAt = serverTimestamp();

                // Premium alanları yoksa ekle
                if (typeof userData.isPremium === 'undefined') {
                    updates.isPremium = false;
                    updates.premiumExpirationDate = null;
                    updates.lastPremiumPaymentDate = null;
                }
                // Diğer eksik alanları ekle
                if (typeof userData.totalCompletedTasks === 'undefined') updates.totalCompletedTasks = 0;
                if (typeof userData.totalEarned === 'undefined') updates.totalEarned = 0;

                if (Object.keys(updates).length > 0) {
                    await updateDoc(userRef, updates);
                }
            }

            // Kullanıcı oturum açmışsa
            if (isAuthPage) {
                // Eğer zaten login/register sayfasındaysa, ana sayfaya yönlendir
                console.log("Kullanıcı zaten oturum açık. Auth sayfasından index.html'ye yönlendiriliyor.");
                window.location.replace('index.html');
                // Yönlendirme olduğu için burada hideLoader() ve diğer init fonksiyonlarını çağırmaya gerek yok
            } else {
                // Diğer sayfalardaysa (yani oturum açık ve kullanıcı sayfası), ilgili verileri yükle
                console.log(`Kullanıcı oturum açık. Sayfa: ${pageId} için veri yükleniyor.`);
                switch (pageId) {
                    case 'page-index': await loadIndexPageData(user); break;
                    case 'page-profile': await loadProfilePageData(user); break;
                    case 'page-my-tasks': await loadMyTasksPageData(user); break;
                    case 'page-task-detail': await loadTaskDetailPageData(user); break;
                    case 'page-wallet': await loadWalletPageData(user); break;
                    case 'page-support': await loadSupportPageData(user); break;
                    case 'page-ticket-detail': await loadTicketDetailPageData(user); break;
                    case 'page-bonus': await loadBonusPageData(user); break;
                    case 'page-announcements': await loadAnnouncementsPageData(); break;
                    case 'page-faq': await loadFaqPageData(); break;
                    case 'page-premium': await loadPremiumPageData(user); break;
                    case 'page-leaderboard': await loadLeaderboardPageData(user); break;
                    default: 
                        console.warn(`Bilinmeyen kullanıcı sayfası (${pageId}). index.html'ye yönlendiriliyor.`);
                        window.location.replace('index.html');
                        break;
                }
                hideLoader(); // Veri yüklendikten sonra loader'ı gizle
                handleInputLabels(); // Input label'larını güncelle
            }
        } else {
            // Kullanıcı oturum açmamışsa
            if (!isAuthPage) {
                // Eğer login/register sayfasında değilse, login.html'ye yönlendir
                console.log("Kullanıcı oturum açmamış. Auth dışı sayfadan login.html'ye yönlendiriliyor.");
                window.location.replace('login.html');
            } else {
                // Eğer login/register sayfasındaysa, bu sayfayı göster
                console.log(`Kullanıcı oturum açmamış. Auth sayfası: ${pageId} gösteriliyor.`);
                hideLoader(); // Loader'ı gizle
                handleInputLabels(); // Input label'larını güncelle
                // initLoginPage veya initRegisterPage fonksiyonları burada DOMContentLoaded'den sonra doğrudan çağrılıyor.
            }
        }
    }, (error) => {
        console.error("onAuthStateChanged sırasında hata oluştu:", error);
        showAlert("Uygulama yüklenirken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.", false);
        hideLoader();
        // Hata durumunda, eğer auth sayfasında değilsek login'e yönlendir
        if (!isAuthPage) {
            window.location.replace('login.html');
        }
    });

    // Sayfa DOM'u yüklendiğinde auth sayfaları için init fonksiyonlarını doğrudan çağır
    // onAuthStateChanged döngüsü, yönlendirme sonrası bu fonksiyonların tekrar çağrılmasını engellemek için tasarlandı.
    if (pageId === 'page-login') {
        initLoginPage();
    }
    if (pageId === 'page-register') {
        initRegisterPage();
    }
});

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (password.length < 6) return showAlert("Şifre en az 6 karakter olmalıdır.", false);

        try {
            showLoader();
            await signInWithEmailAndPassword(auth, email, password);
            showAlert("Giriş başarılı! Yönlendiriliyorsunuz...", true);
            // onAuthStateChanged tetiklenecek ve index.html'ye yönlendirecek
        } catch (error) {
            hideLoader();
            console.error("Giriş işlemi sırasında hata:", error);
            showAlert(error.code === 'auth/wrong-password' ? "Yanlış şifre." : 
                      error.code === 'auth/user-not-found' ? "Kullanıcı bulunamadı." : 
                      "Giriş hatası: " + error.message, false);
        }
    });

    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Şifre sıfırlama için e-posta adresinizi girin:");
            if (email) {
                sendPasswordResetEmail(auth, email)
                    .then(() => showAlert("Şifre sıfırlama e-postası gönderildi!", true))
                    .catch((error) => showAlert("Şifre sıfırlama hatası: " + error.message, false));
            }
        });
    }
}

async function initRegisterPage() {
    const registerForm = document.getElementById("registerForm");
    handleInputLabels(); // Form yüklendiğinde label'ları ayarla

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;

        if (username.length < 3) return showAlert("Kullanıcı adı en az 3 karakter olmalıdır.", false);
        if (password.length < 6) return showAlert("Şifre en az 6 karakter olmalıdır.", false);

        try {
            showLoader();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            await updateProfile(newUser, { displayName: username });

            showAlert("Kayıt başarılı! Yönlendiriliyorsunuz...", true);
            // Başarılı kayıttan sonra onAuthStateChanged tetiklenecek ve ana sayfaya yönlendirmeyi yapacak.
            
        } catch (error) {
            hideLoader();
            console.error("Kayıt işlemi sırasında hata:", error);
            showAlert(error.code === 'auth/email-already-in-use' ? "Bu e-posta zaten kullanımda." : "Kayıt hatası: " + error.message, false);
        }
    });
}

async function loadIndexPageData(user) {
    const userRef = doc(db, 'users', user.uid);
    const balanceDisplay = document.getElementById('balanceDisplay');
    const tasksContainer = document.getElementById('tasksContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const categoryFilter = document.getElementById('categoryFilter');
    let currentTasks = [];
    let lastVisible = null;
    let unsubscribeTasks = null;
    let currentCategory = 'all';

    const updateBalance = () => {
        onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (balanceDisplay) {
                    balanceDisplay.textContent = `${(data.balance || 0).toFixed(2)} ₺`;
                }
            }
        });
    };

    const renderTasks = (tasks, append = false) => {
        if (!append) {
            tasksContainer.innerHTML = '';
        }
        if (tasks.length === 0) {
            tasksContainer.innerHTML = '<div class="empty-state">Görev bulunamadı.</div>';
            loadMoreBtn.style.display = 'none';
            return;
        }
        tasks.forEach(task => {
            const category = categoryData[task.category] || categoryData['other'];
            tasksContainer.innerHTML += `
                <div class="spark-card task-item" data-task-id="${task.id}">
                    <div class="task-header">
                        <img src="${category.logo}" alt="${category.name}" class="task-logo">
                        <div class="task-title">${task.title}</div>
                        <div class="task-reward">${task.reward} ₺</div>
                    </div>
                    <div class="task-description">${task.description}</div>
                    <button class="spark-button primary-button start-task-btn" data-task-id="${task.id}">Başlat</button>
                </div>
            `;
        });
        loadMoreBtn.style.display = tasks.length === 10 ? 'block' : 'none';
    };

    const loadTasks = (category = 'all', append = false) => {
        if (unsubscribeTasks) unsubscribeTasks();
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
            currentTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (category !== 'all') {
                currentTasks = currentTasks.filter(t => t.category === category);
            }
            renderTasks(currentTasks, append);
        });
    };

    categoryFilter.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        loadTasks(currentCategory, false);
    });

    loadMoreBtn.addEventListener('click', () => {
        const nextQuery = query(
            collection(db, 'tasks'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(10)
        );
        // Implement pagination logic here
    });

    tasksContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('start-task-btn')) {
            const taskId = e.target.dataset.taskId;
            window.location.href = `task-detail.html?id=${taskId}`;
        }
    });

    loadTasks();
    updateBalance();
}

async function loadProfilePageData(user) {
    const userRef = doc(db, 'users', user.uid);
    const usernameDisplay = document.getElementById('usernameDisplay');
    const emailDisplay = document.getElementById('emailDisplay');
    const balanceDisplay = document.getElementById('profileBalance');
    const tasksCompleted = document.getElementById('tasksCompleted');
    const totalEarned = document.getElementById('totalEarned');
    const editProfileForm = document.getElementById('editProfileForm');
    const changePasswordForm = document.getElementById('changePasswordForm');

    onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            usernameDisplay.textContent = data.username || 'Kullanıcı Adı';
            emailDisplay.textContent = data.email || 'E-posta';
            balanceDisplay.textContent = `${(data.balance || 0).toFixed(2)} ₺`;
            tasksCompleted.textContent = data.totalCompletedTasks || 0;
            totalEarned.textContent = `${(data.totalEarned || 0).toFixed(2)} ₺`;
        }
    });

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('newUsername').value.trim();
        if (newUsername.length < 3) return showAlert('Kullanıcı adı en az 3 karakter olmalı.', false);
        try {
            await updateProfile(user, { displayName: newUsername });
            await updateDoc(userRef, { username: newUsername });
            showAlert('Profil güncellendi!', true);
            editProfileForm.reset();
        } catch (error) {
            showAlert('Profil güncelleme hatası: ' + error.message, false);
        }
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (newPassword !== confirmPassword) return showAlert('Şifreler eşleşmiyor.', false);
        if (newPassword.length < 6) return showAlert('Şifre en az 6 karakter olmalı.', false);
        try {
            await updatePassword(user, newPassword);
            showAlert('Şifre değiştirildi!', true);
            changePasswordForm.reset();
        } catch (error) {
            showAlert('Şifre değiştirme hatası: ' + error.message, false);
        }
    });
}

async function loadMyTasksPageData(user) {
    const submissionsRef = collection(db, 'submissions');
    const userSubmissionsQuery = query(submissionsRef, where('userId', '==', user.uid), orderBy('submittedAt', 'desc'));
    const myTasksList = document.getElementById('myTasksList');

    onSnapshot(userSubmissionsQuery, (snapshot) => {
        let html = '';
        snapshot.forEach(doc => {
            const sub = doc.data();
            const status = sub.approved ? 'Onaylandı' : sub.rejected ? 'Reddedildi' : 'Beklemede';
            html += `
                <div class="spark-card submission-item">
                    <h4>${sub.taskTitle}</h4>
                    <p>Durum: <span class="status-${status.toLowerCase()}">${status}</span></p>
                    <p>Tarih: ${sub.submittedAt.toDate().toLocaleDateString('tr-TR')}</p>
                </div>
            `;
        });
        myTasksList.innerHTML = html || '<div class="empty-state">Henüz tamamlanmış göreviniz yok.</div>';
    });
}

async function loadTaskDetailPageData(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    if (!taskId) return window.location.replace('index.html');

    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) return window.location.replace('index.html');

    const task = taskDoc.data();
    const taskTitle = document.getElementById('taskTitle');
    const taskDescription = document.getElementById('taskDescription');
    const taskReward = document.getElementById('taskReward');
    const submitForm = document.getElementById('submitForm');
    const proofInput = document.getElementById('proofInput');

    taskTitle.textContent = task.title;
    taskDescription.textContent = task.description;
    taskReward.textContent = `${task.reward} ₺`;

    submitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const proof = proofInput.value.trim();
        if (!proof) return showAlert('Kanıt girin.', false);

        try {
            await addDoc(collection(db, 'submissions'), {
                userId: user.uid,
                taskId: task.id,
                taskTitle: task.title,
                proof,
                reward: task.reward,
                submittedAt: serverTimestamp(),
                approved: false,
                rejected: false
            });
            showAlert('Görev gönderildi, inceleme bekleniyor.', true);
            proofInput.value = '';
        } catch (error) {
            showAlert('Gönderim hatası: ' + error.message, false);
        }
    });
}

async function loadWalletPageData(user) {
    const userRef = doc(db, 'users', user.uid);
    const balanceDisplay = document.getElementById('walletBalance');
    const withdrawalForm = document.getElementById('withdrawalForm');
    const amountInput = document.getElementById('withdrawalAmount');

    onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            balanceDisplay.textContent = `${(doc.data().balance || 0).toFixed(2)} ₺`;
        }
    });

    withdrawalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(amountInput.value);
        if (amount < 10) return showAlert('Minimum çekim 10 ₺.', false);

        try {
            await addDoc(collection(db, 'withdrawalRequests'), {
                userId: user.uid,
                amount,
                status: 'pending',
                requestedAt: serverTimestamp()
            });
            showAlert('Çekim talebi gönderildi.', true);
            amountInput.value = '';
        } catch (error) {
            showAlert('Çekim talebi hatası: ' + error.message, false);
        }
    });
}

async function loadSupportPageData(user) {
    const supportForm = document.getElementById('supportForm');
    const categorySelect = document.getElementById('ticketCategory');
    const subjectInput = document.getElementById('ticketSubject');
    const messageInput = document.getElementById('ticketMessage');
    const fileInput = document.getElementById('ticketFile');

    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = categorySelect.value;
        const subject = subjectInput.value.trim();
        const message = messageInput.value.trim();
        const file = fileInput.files[0];

        if (!category || !subject || !message) return showAlert('Tüm alanları doldurun.', false);

        try {
            let fileUrl = null;
            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) fileUrl = data.data.url;
            }

            await addDoc(collection(db, 'tickets'), {
                userId: user.uid,
                userEmail: user.email,
                category,
                subject,
                message,
                fileUrl,
                status: 'open',
                createdAt: serverTimestamp(),
                lastUpdatedAt: serverTimestamp()
            });
            showAlert('Destek talebi gönderildi!', true);
            supportForm.reset();
        } catch (error) {
            showAlert('Talep gönderme hatası: ' + error.message, false);
        }
    });
}

async function loadTicketDetailPageData(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    if (!ticketId) return window.location.replace('support.html');

    const ticketRef = doc(db, 'tickets', ticketId);
    const repliesRef = collection(db, 'tickets', ticketId, 'replies');
    const ticketSnapshot = await getDoc(ticketRef);
    if (!ticketSnapshot.exists()) return window.location.replace('support.html');

    const ticket = ticketSnapshot.data();
    const subjectEl = document.getElementById('ticketSubject');
    const categoryEl = document.getElementById('ticketCategory');
    const messageEl = document.getElementById('ticketMessage');
    const statusEl = document.getElementById('ticketStatus');
    const createdAtEl = document.getElementById('ticketCreatedAt');
    const repliesList = document.getElementById('repliesList');
    const replyForm = document.getElementById('replyForm');
    const replyMessageInput = document.getElementById('replyMessage');
    const replyFileInput = document.getElementById('replyFile');
    const replyBtn = document.getElementById('replyBtn');
    const closeTicketBtn = document.getElementById('closeTicketBtn');

    subjectEl.textContent = ticket.subject;
    categoryEl.textContent = ticket.category;
    messageEl.textContent = ticket.message;
    statusEl.textContent = ticket.status;
    createdAtEl.textContent = ticket.createdAt.toDate().toLocaleDateString('tr-TR');

    if (ticket.fileUrl) {
        messageEl.innerHTML += `<br><img src="${ticket.fileUrl}" alt="Ek" style="max-width: 100%; margin-top: 10px;">`;
    }

    const renderReplies = async () => {
        const repliesSnapshot = await getDocs(query(repliesRef, orderBy('sentAt', 'asc')));
        let html = '';
        repliesSnapshot.forEach(doc => {
            const reply = doc.data();
            const isUser = reply.senderType === 'user';
            html += `
                <div class="reply-item ${isUser ? 'user-reply' : 'admin-reply'}">
                    <strong>${reply.senderName || (isUser ? 'Siz' : 'Admin')}:</strong>
                    <p>${reply.message}</p>
                    ${reply.fileUrl ? `<img src="${reply.fileUrl}" alt="Ek" style="max-width: 100%;">` : ''}
                    <small>${reply.sentAt.toDate().toLocaleString('tr-TR')}</small>
                </div>
            `;
        });
        repliesList.innerHTML = html;
    };

    renderReplies();

    replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = replyMessageInput.value.trim();
        const file = replyFileInput.files[0];
        if (!message && !file) return showAlert('Mesaj veya dosya ekleyin.', false);

        replyBtn.disabled = true;
        replyBtn.textContent = 'Gönderiliyor...';

        try {
            let fileUrl = null;
            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) fileUrl = data.data.url;
            }

            await addDoc(repliesRef, {
                message,
                fileUrl,
                senderId: user.uid,
                senderType: 'user',
                senderName: user.displayName || user.email,
                sentAt: serverTimestamp()
            });
            await updateDoc(ticketRef, {
                lastUpdatedAt: serverTimestamp(),
                status: 'open',
                lastMessage: message,
                lastMessageSenderType: 'user'
            });
            replyMessageInput.value = '';
            replyFileInput.value = '';
            showAlert("Cevap gönderildi!", true);
            renderReplies();
        } catch (error) {
            console.error("Cevap gönderilirken hata oluştu:", error);
            showAlert("Cevap gönderilirken hata oluştu: " + error.message, false);
        } finally {
            replyBtn.disabled = false;
            replyBtn.textContent = "Gönder";
        }
    });

    closeTicketBtn.addEventListener('click', async () => {
        if (confirm("Bu talebi kapatmak istediğinize emin misiniz?")) {
            closeTicketBtn.disabled = true;
            closeTicketBtn.textContent = "Kapatılıyor...";
            try {
                await updateDoc(ticketRef, { status: 'closed', lastUpdatedAt: serverTimestamp() });
                showAlert("Talep başarıyla kapatıldı.", true);
                statusEl.textContent = 'closed';
            } catch (error) {
                console.error("Talep kapatılırken hata oluştu:", error);
                showAlert("Talep kapatılırken hata oluştu: " + error.message, false);
            } finally {
                closeTicketBtn.disabled = false;
                closeTicketBtn.textContent = "Talebi Kapat";
            }
        }
    });
}

async function loadBonusPageData(user) {
    const bonusList = document.getElementById('bonusList');
    const userRef = doc(db, 'users', user.uid);

    // Example bonuses - in real app, load from DB
    const bonuses = [
        { id: 1, title: 'İlk Görev Bonus', amount: 5, condition: 'İlk görevi tamamla' },
        { id: 2, title: 'Günlük Giriş', amount: 1, condition: 'Her gün giriş yap' }
    ];

    let html = '';
    bonuses.forEach(bonus => {
        html += `
            <div class="spark-card bonus-item">
                <h4>${bonus.title}</h4>
                <p>${bonus.condition}</p>
                <p>Ödül: ${bonus.amount} ₺</p>
                <button class="spark-button primary-button claim-bonus-btn" data-bonus-id="${bonus.id}">Talep Et</button>
            </div>
        `;
    });
    bonusList.innerHTML = html;

    bonusList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('claim-bonus-btn')) {
            const bonusId = e.target.dataset.bonusId;
            // Implement bonus claiming logic
            showAlert('Bonus talep edildi!', true);
        }
    });
}

async function loadAnnouncementsPageData() {
    const announcementsList = document.getElementById('announcementsList');

    try {
        const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const announcementsSnapshot = await getDocs(announcementsQuery);

        if (announcementsSnapshot.empty) {
            announcementsList.innerHTML = `<div class="empty-state">Henüz bir duyuru bulunmamaktadır.</div>`;
            return;
        }

        let announcementsHtml = '';
        announcementsSnapshot.forEach(doc => {
            const announcement = doc.data();
            const date = announcement.createdAt ? (announcement.createdAt.toDate ? announcement.createdAt.toDate().toLocaleDateString('tr-TR') : new Date(announcement.createdAt).toLocaleDateString('tr-TR')) : 'Bilinmiyor';
            announcementsHtml += `
                <div class="spark-card announcement-item">
                    <h3>${announcement.title}</h3>
                    <p>${announcement.content}</p>
                    <span class="announcement-date">${date}</span>
                </div>
            `;
        });
        announcementsList.innerHTML = announcementsHtml;

    } catch (error) {
        console.error("Duyurular yüklenirken hata oluştu:", error);
        announcementsList.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Duyurular yüklenemedi: ${error.message}</div>`;
    }
}

async function loadFaqPageData() {
    const faqList = document.getElementById('faqList');

    try {
        const faqsQuery = query(collection(db, "faqs"), orderBy("order", "asc")); // 'order' alanına göre sırala
        const faqsSnapshot = await getDocs(faqsQuery);

        if (faqsSnapshot.empty) {
            faqList.innerHTML = `<div class="empty-state">Henüz sıkça sorulan soru bulunmamaktadır.</div>`;
            return;
        }

        let faqsHtml = '';
        faqsSnapshot.forEach(doc => {
            const faq = doc.data();
            faqsHtml += `
                <div class="spark-card">
                    <h4>${faq.order}. ${faq.question}</h4>
                    <p>${faq.answer}</p>
                </div>
            `;
        });
        faqList.innerHTML = faqsHtml;

    } catch (error) {
        console.error("SSS yüklenirken hata oluştu:", error);
        faqList.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">SSS yüklenemedi: ${error.message}</div>`;
    }
}

async function loadPremiumPageData(user) {
    const isPremiumDisplay = document.getElementById('isPremiumDisplay');
    const premiumExpirationSection = document.getElementById('premiumExpirationSection');
    const premiumExpirationDisplay = document.getElementById('premiumExpirationDisplay');
    const currentBalanceForPremium = document.getElementById('currentBalanceForPremium');
    const subscribeBtn = document.getElementById('subscribeBtn');
    const userRef = doc(db, 'users', user.uid);

    onSnapshot(userRef, (docSnapshot) => {
        if (!docSnapshot.exists()) return;

        const userData = docSnapshot.data();
        const now = new Date();
        // premiumExpirationDate'in Timestamp objesi mi yoksa Date objesi mi olduğunu kontrol et
        const userPremiumExpirationDate = userData.premiumExpirationDate ? 
                                          (userData.premiumExpirationDate.toDate ? userData.premiumExpirationDate.toDate() : new Date(userData.premiumExpirationDate)) 
                                          : null;

        const isPremiumActive = userData.isPremium && userPremiumExpirationDate && userPremiumExpirationDate > now;
        currentBalanceForPremium.textContent = `${(userData.balance || 0).toFixed(2)} ₺`;

        if (isPremiumActive) {
            isPremiumDisplay.textContent = 'Evet (Aktif)';
            isPremiumDisplay.classList.remove('inactive');
            isPremiumDisplay.classList.add('active');
            premiumExpirationDisplay.textContent = userPremiumExpirationDate.toLocaleDateString('tr-TR');
            premiumExpirationSection.style.display = 'block';
            subscribeBtn.textContent = `Premium Yenile (${PREMIUM_MONTHLY_FEE} ₺)`;
        } else {
            isPremiumDisplay.textContent = 'Hayır (Pasif)';
            isPremiumDisplay.classList.remove('active');
            isPremiumDisplay.classList.add('inactive');
            premiumExpirationSection.style.display = 'none';
            subscribeBtn.textContent = `Premium Ol (${PREMIUM_MONTHLY_FEE} ₺)`;
        }

        subscribeBtn.disabled = (userData.balance || 0) < PREMIUM_MONTHLY_FEE;
        if (subscribeBtn.disabled) {
            subscribeBtn.textContent = (isPremiumActive ? `Premium Yenile` : `Premium Ol`) + ` (${PREMIUM_MONTHLY_FEE} ₺) - Yetersiz Bakiye`;
        }
    });

    subscribeBtn.addEventListener('click', async () => {
        subscribeBtn.disabled = true;
        subscribeBtn.textContent = "İşlem Yapılıyor...";

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı!");

                const userData = userDoc.data();
                const currentBalance = userData.balance || 0;

                if (currentBalance < PREMIUM_MONTHLY_FEE) {
                    throw new Error("Bakiyeniz premium üyeliği için yeterli değil.");
                }

                let newExpirationDate = new Date();
                const now = new Date();

                const userPremiumExpirationDate = userData.premiumExpirationDate ? 
                                                  (userData.premiumExpirationDate.toDate ? userData.premiumExpirationDate.toDate() : new Date(userData.premiumExpirationDate)) 
                                                  : null;

                // Eğer zaten premium aktifse ve süresi dolmadıysa, mevcut bitiş tarihine ekle
                if (userData.isPremium && userPremiumExpirationDate && userPremiumExpirationDate > now) {
                    newExpirationDate = userPremiumExpirationDate;
                } else {
                    // Premium aktif değilse veya süresi dolmuşsa, bugünden itibaren bir ay ekle
                    newExpirationDate = now;
                }
                newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);

                transaction.update(userRef, {
                    balance: currentBalance - PREMIUM_MONTHLY_FEE,
                    isPremium: true,
                    premiumExpirationDate: newExpirationDate,
                    lastPremiumPaymentDate: serverTimestamp()
                });
            });
            showAlert("Premium üyeliğiniz başarıyla etkinleştirildi/yenilendi!", true);
        } catch (error) {
            console.error("Premium işlem hatası:", error);
            showAlert("Premium işlemi sırasında bir hata oluştu: " + error.message, false);
        } finally {
            // Transaction'dan sonra button durumunu güncellemek için onSnapshot tetiklenecektir.
        }
    });
}

async function loadLeaderboardPageData(user) {
    const topEarnersContainer = document.getElementById('leaderboardTopEarners');
    const topCompletersContainer = document.getElementById('leaderboardTopCompleters');

    const renderLeaderboard = (container, users, scoreField, unit) => {
        if (users.length === 0) {
            container.innerHTML = `<div class="empty-state">Gösterilecek kullanıcı bulunamadı.</div>`;
            return;
        }
        let listHtml = '<ol class="leaderboard-list">';
        users.forEach((user, index) => {
            const score = user[scoreField] || 0;
            listHtml += `
                <li>
                    <span class="leaderboard-rank">${index + 1}</span>
                    <span class="leaderboard-name">${user.username}</span>
                    <span class="leaderboard-score">${scoreField === 'totalEarned' ? score.toFixed(2) : score.toFixed(0)} ${unit}</span>
                </li>
            `;
        });
        listHtml += '</ol>';
        container.innerHTML = listHtml;
    };

    try {
        const topEarnersQuery = query(collection(db, "users"), orderBy("totalEarned", "desc"), limit(10));
        const topEarnersSnapshot = await getDocs(topEarnersQuery);
        const topEarners = topEarnersSnapshot.docs.map(doc => doc.data());
        renderLeaderboard(topEarnersContainer, topEarners, 'totalEarned', '₺');
    } catch (error) {
        console.error("En çok kazananlar yüklenirken hata oluştu:", error);
        topEarnersContainer.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Liste yüklenemedi: ${error.message}</div>`;
    }
    
    try {
        const topCompletersQuery = query(collection(db, "users"), orderBy("totalCompletedTasks", "desc"), limit(10));
        const topCompletersSnapshot = await getDocs(topCompletersQuery);
        const topCompleters = topCompletersSnapshot.docs.map(doc => doc.data());
        renderLeaderboard(topCompletersContainer, topCompleters, 'totalCompletedTasks', 'Görev');
    } catch (error) {
        console.error("En çok görev yapanlar yüklenirken hata oluştu:", error);
        topCompletersContainer.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Liste yüklenemedi: ${error.message}</div>`;
    }
}