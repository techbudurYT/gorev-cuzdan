import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocs, runTransaction, addDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBN85bxThpJYifWAvsS0uqPD0C9D55uPpM", // KENDİ API ANAHTARINIZI GİRİN!
    authDomain: "gorev-cuzdan.firebaseapp.com",
    projectId: "gorev-cuzdan",
    storageBucket: "gorev-cuzdan.appspot.com",
    messagingSenderId: "139914511950",
    appId: "1:139914511950:web:0d7c9352e410223742e51f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    if (loader) loader.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    if (loader) loader.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;

    if (pageId.startsWith('page-admin')) {
        return; 
    }

    showLoader();

    onAuthStateChanged(auth, async (user) => {
        const isAuthPage = pageId === 'page-login' || pageId === 'page-register';
        if (user) {
            if (isAuthPage) { 
                window.location.replace('index.html');
            } else { 
                switch (pageId) {
                    case 'page-index': await loadIndexPageData(user); break;
                    case 'page-profile': await loadProfilePageData(user); break;
                    case 'page-my-tasks': await loadMyTasksPageData(user); break;
                    case 'page-task-detail': await loadTaskDetailPageData(user); break;
                    case 'page-wallet': await loadWalletPageData(user); break;
                    case 'page-support': await loadSupportPageData(user); break;
                    case 'page-ticket-detail': await loadTicketDetailPageData(user); break;
                    case 'page-bonus': await loadBonusPageData(user); break;
                }
                hideLoader();
            }
        } else {
            if (!isAuthPage) { 
                window.location.replace('login.html');
            } else { 
                hideLoader();
            }
        }
    });

    if (pageId === 'page-login') initLoginPage();
    if (pageId === 'page-register') initRegisterPage();
});

function initRegisterPage() {
    const registerForm = document.getElementById("registerForm");
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
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username, email, balance: 0, isAdmin: false 
            });
            showAlert("Kayıt başarılı! Giriş yapılıyor...", true);
            setTimeout(() => window.location.replace("index.html"), 1500);
        } catch (error) {
            hideLoader();
            showAlert(error.code === 'auth/email-already-in-use' ? "Bu e-posta zaten kayıtlı." : "Bir hata oluştu.", false);
        }
    });
}

function initLoginPage() {
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        try {
            showLoader();
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            hideLoader();
            showAlert("Hatalı e-posta veya şifre!", false);
        }
    });
}

async function loadIndexPageData(user) {
    const taskList = document.getElementById("taskList");
    const balanceDisplay = document.getElementById("balanceDisplay");
    const filterButtons = document.querySelectorAll(".filter-btn");

    onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
            balanceDisplay.textContent = `${(docSnapshot.data().balance || 0).toFixed(2)} ₺`;
        } else {
            balanceDisplay.textContent = `0.00 ₺`;
        }
    });

    try {
        const tasksQuery = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
        const tasksSnapshot = await getDocs(tasksQuery);
        const allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const submissionsQuery = query(collection(db, "submissions"), 
                                        where("userId", "==", user.uid),
                                        where("status", "in", ["pending", "approved"]));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submittedTaskIds = submissionsSnapshot.docs.map(doc => doc.data().taskId);

        const renderTasks = (filterCategory) => {
            taskList.innerHTML = "";
            const filteredTasks = filterCategory === 'all' 
                ? allTasks 
                : allTasks.filter(task => task.category === filterCategory);

            if (filteredTasks.length === 0) {
                taskList.innerHTML = `<p class="empty-state">Bu kategoride aktif görev bulunmamaktadır.</p>`;
                return;
            }

            filteredTasks.forEach((task, index) => {
                const isSubmitted = submittedTaskIds.includes(task.id);
                const categoryInfo = categoryData[task.category] || categoryData["other"];
                const li = document.createElement("li");
                li.className = "spark-card task-card";
                li.style.animationDelay = `${index * 0.05}s`;

                const buttonHtml = isSubmitted 
                    ? `<button class='spark-button completed' disabled>Gönderildi</button>` 
                    : `<a href="task-detail.html?id=${task.id}" class="spark-button task-link-button">Yap</a>`;
                
                li.innerHTML = `
                    <div class="task-logo"><img src="${categoryInfo.logo}" alt="${categoryInfo.name} logo"></div>
                    <div class="task-info">
                        <div class="task-title">${task.text}</div>
                        <div class="task-reward">+${task.reward} ₺</div>
                    </div>
                    <div class="task-action">${buttonHtml}</div>`;
                taskList.appendChild(li);
            });
        };

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector('.filter-btn.active')?.classList.remove('active');
                button.classList.add('active');
                const category = button.dataset.category;
                renderTasks(category);
            });
        });

        renderTasks('all');

    } catch(error) {
        console.error("Görevler yüklenirken hata oluştu:", error);
        taskList.innerHTML = `<p class="empty-state" style="color:var(--spark-danger);">Görevler yüklenemedi.</p>`;
    }
}

async function loadBonusPageData(user) {
    const bonusBtn = document.getElementById("claimBonusBtn");
    const bonusStatusText = document.getElementById("bonusStatusText");
    const userRef = doc(db, 'users', user.uid);

    onSnapshot(userRef, (docSnapshot) => {
        if (!docSnapshot.exists()) return;

        const userData = docSnapshot.data();
        const lastClaimTimestamp = userData.lastBonusClaimed;

        if (lastClaimTimestamp) {
            const lastClaimDate = lastClaimTimestamp.toDate();
            const now = new Date();
            const diffHours = (now - lastClaimDate) / (1000 * 60 * 60);

            if (diffHours >= 24) {
                bonusBtn.disabled = false;
                bonusBtn.textContent = "Bonusunu Al (+0.50 ₺)";
                bonusStatusText.textContent = "Günün bonusu seni bekliyor!";
            } else {
                bonusBtn.disabled = true;
                const nextClaimDate = new Date(lastClaimDate.getTime() + 24 * 60 * 60 * 1000);
                bonusBtn.textContent = `Bonus Alındı`;
                bonusStatusText.textContent = `Sonraki bonusun ${nextClaimDate.toLocaleTimeString('tr-TR')} tarihinde aktif olacak.`;
            }
        } else {
            bonusBtn.disabled = false;
            bonusBtn.textContent = "Bonusunu Al (+0.50 ₺)";
            bonusStatusText.textContent = "İlk bonusunu alarak kazanmaya başla!";
        }
    });

    bonusBtn.addEventListener('click', async () => {
        bonusBtn.disabled = true;
        
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw "Kullanıcı bulunamadı!";
                
                const userData = userDoc.data();
                const lastClaim = userData.lastBonusClaimed;
                let isEligible = !lastClaim || ((new Date() - lastClaim.toDate()) / (1000 * 60 * 60) >= 24);

                if (isEligible) {
                    const newBalance = (userData.balance || 0) + 0.5;
                    transaction.update(userRef, { balance: newBalance, lastBonusClaimed: serverTimestamp() });
                    showAlert("Bonus başarıyla eklendi!", true);
                } else {
                    showAlert("Günlük bonusunu zaten aldınız.", false);
                }
            });
        } catch (error) {
            console.error("Bonus alma hatası:", error);
            showAlert("Bonus alınırken bir hata oluştu.", false);
        }
    });
}

async function loadProfilePageData(user) {
    const usernameDisplay = document.getElementById("usernameDisplay");
    const balanceDisplay = document.getElementById("balanceDisplay");
    const taskCountsDisplay = document.getElementById("task-counts");
    const logoutBtn = document.getElementById("logoutBtn");

    onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
        if(docSnapshot.exists()) {
            const userData = docSnapshot.data();
            usernameDisplay.textContent = userData.username || 'N/A';
            balanceDisplay.textContent = `${(userData.balance || 0).toFixed(2)} ₺`;
        } else {
             console.warn("Kullanıcı belgesi bulunamadı. Varsayılan oluşturuluyor...");
            setDoc(doc(db, "users", user.uid), {
                username: user.email.split('@')[0], email: user.email, balance: 0, isAdmin: false
            });
        }
    });
    
    try {
        const approvedSubmissionsQuery = query(collection(db, "submissions"), where('userId', '==', user.uid), where('status', '==', 'approved'));
        const approvedSubmissionsSnapshot = await getDocs(approvedSubmissionsQuery);
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        if(taskCountsDisplay) {
            taskCountsDisplay.textContent = `${approvedSubmissionsSnapshot.size} / ${tasksSnapshot.size}`;
        }
    } catch (error) {
        console.error("Görev sayıları alınırken hata:", error);
    }

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault(); 
        signOut(auth).then(() => window.location.replace("login.html"));
    });
}

async function loadMyTasksPageData(user) {
    const submissionsList = document.getElementById('submissionsList');

    submissionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-show-reason')) {
            alert(`Görev Reddedilme Nedeni:\n\n${e.target.dataset.reason}`);
        }
    });

    try {
        const submissionsQuery = query(collection(db, 'submissions'), where('userId', '==', user.uid), orderBy('submittedAt', 'desc'));
        onSnapshot(submissionsQuery, async (snapshot) => {
            if (snapshot.empty) {
                submissionsList.innerHTML = `<p class="empty-state">Henüz görev göndermediniz.</p>`;
                return;
            }

            submissionsList.innerHTML = '';
            for (const docSnapshot of snapshot.docs) {
                const submission = { id: docSnapshot.id, ...docSnapshot.data() };
                const taskDoc = await getDoc(doc(db, "tasks", submission.taskId));
                const task = taskDoc.exists() ? taskDoc.data() : { text: 'Görev Silinmiş', reward: 0 };

                let statusText = '', statusClass = '', reasonButtonHtml = '';
                switch (submission.status) {
                    case 'pending': statusText = 'Onay Bekliyor'; statusClass = 'status-pending'; break;
                    case 'approved': statusText = 'Onaylandı'; statusClass = 'status-approved'; break;
                    case 'rejected':
                        statusText = 'Reddedildi'; statusClass = 'status-rejected';
                        if (submission.rejectionReason) {
                            const encodedReason = submission.rejectionReason.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            reasonButtonHtml = `<button class="spark-button small-button btn-show-reason" data-reason="${encodedReason}">İptal Nedeni</button>`;
                        }
                        break;
                    default: statusText = 'Bilinmiyor'; statusClass = ''; break;
                }
                const submissionDate = submission.submittedAt ? submission.submittedAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';

                submissionsList.innerHTML += `
                  <div class="spark-card submission-card">
                    <div class="submission-header">
                      <h3>${task.text}</h3>
                      <span class="submission-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="submission-details">
                        <p>Gönderim Tarihi: ${submissionDate}</p>
                        <p>Ödül: +${task.reward} ₺</p>
                    </div>
                    <div class="submission-actions">${reasonButtonHtml}</div>
                  </div>`;
            }
        });
    } catch (error) {
        console.error("Gönderimler yüklenirken hata oluştu:", error);
        submissionsList.innerHTML = `<p class="empty-state" style="color:var(--spark-danger);">Gönderimler yüklenemedi.</p>`;
    }
}

async function loadTaskDetailPageData(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    if (!taskId) { window.location.replace("index.html"); return; }

    const taskTitle = document.getElementById('taskTitle');
    const taskReward = document.getElementById('taskReward');
    const taskDescription = document.getElementById('taskDescription');
    const submitTaskBtn = document.getElementById('submitTask');
    const fileInput = document.getElementById('taskProof');
    const fileNameSpan = document.getElementById('fileName');
    const imagePreview = document.getElementById('imagePreview');
    
    const IMGBB_API_KEY = "84a7c0a54294a6e8ea2ffc9bab240719"; 
    let fileToUpload = null;

    try {
        const taskDoc = await getDoc(doc(db, "tasks", taskId));
        if (taskDoc.exists()) {
            const task = taskDoc.data();
            taskTitle.textContent = task.text;
            taskReward.textContent = `+${task.reward} ₺`;
            taskDescription.textContent = task.description;
        } else { window.location.replace("index.html"); }
    } catch(error) {
        console.error("Görev detayları yüklenirken hata:", error);
        window.location.replace("index.html");
    }

    fileInput.addEventListener('change', (e) => {
        fileToUpload = e.target.files[0];
        if (fileToUpload) {
            fileNameSpan.textContent = fileToUpload.name;
            const reader = new FileReader();
            reader.onload = e => imagePreview.innerHTML = `<img src="${e.target.result}" alt="Önizleme">`;
            reader.readAsDataURL(fileToUpload);
        } else {
            fileNameSpan.textContent = "Dosya seçilmedi";
            imagePreview.innerHTML = "";
        }
    });

    submitTaskBtn.addEventListener('click', async () => {
        if (!fileToUpload) return showAlert('Lütfen bir kanıt dosyası seçin!', false);
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(fileToUpload.type)) {
            return showAlert('Lütfen sadece JPG veya PNG formatında bir resim dosyası seçin.', false);
        }

        submitTaskBtn.disabled = true;
        submitTaskBtn.textContent = "Yükleniyor...";
        const formData = new FormData();
        formData.append('image', fileToUpload);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                const q = query(collection(db, "submissions"), where("userId", "==", user.uid), where("taskId", "==", taskId));
                if (!(await getDocs(q)).empty) {
                    showAlert('Bu görevi zaten gönderdiniz.', false);
                } else {
                    await addDoc(collection(db, "submissions"), {
                        taskId, userId: user.uid, userEmail: user.email, fileURL: result.data.url,
                        submittedAt: serverTimestamp(), status: 'pending'
                    });
                    showAlert('Göreviniz başarıyla onaya gönderildi!', true);
                    setTimeout(() => { window.location.href = 'my-tasks.html'; }, 1500);
                }
            } else { throw new Error(result.error?.message || 'Resim yükleme başarısız.'); }
        } catch (error) {
            showAlert("Hata: " + error.message, false);
        } finally {
            submitTaskBtn.disabled = false;
            submitTaskBtn.textContent = "Görevi Onaya Gönder";
        }
    });
}

async function loadWalletPageData(user) {
    const currentBalanceDisplay = document.getElementById('currentBalance');
    const withdrawalForm = document.getElementById('withdrawalForm');
    const withdrawalAmountInput = document.getElementById('withdrawalAmount');
    const ibanInput = document.getElementById('iban');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const previousWithdrawalsList = document.getElementById('previousWithdrawalsList');
    let userBalance = 0;

    onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
            userBalance = docSnapshot.data().balance || 0;
            currentBalanceDisplay.textContent = `${userBalance.toFixed(2)} ₺`;
            withdrawalAmountInput.setAttribute('max', userBalance);
        }
    });

    withdrawalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = Number(withdrawalAmountInput.value);
        const iban = ibanInput.value.trim();
        const phoneNumber = phoneNumberInput.value.trim();

        if (amount < 200) return showAlert("Minimum çekim miktarı 200 ₺'dir.", false);
        if (amount > userBalance) return showAlert("Bakiyeniz yeterli değil.", false);
        if (!iban.match(/^TR[0-9]{24}$/)) return showAlert("Geçerli bir IBAN giriniz.", false);
        if (!phoneNumber.match(/^[0-9]{10}$/)) return showAlert("Geçerli bir 10 haneli telefon numarası giriniz.", false);
        
        const btn = withdrawalForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = "Talep Oluşturuluyor...";

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("Kullanıcı bulunamadı!");
                const currentBalance = userDoc.data().balance || 0;
                if (currentBalance < amount) throw new Error("Yetersiz bakiye.");
                transaction.update(userRef, { balance: currentBalance - amount });
                await addDoc(collection(db, "withdrawalRequests"), {
                    userId: user.uid, userEmail: user.email, amount, iban, phoneNumber,
                    status: 'pending', createdAt: serverTimestamp()
                });
            });
            showAlert("Çekme talebiniz oluşturuldu.", true);
            withdrawalForm.reset();
        } catch (error) {
            showAlert("Talep oluşturulamadı: " + error.message, false);
        } finally {
            btn.disabled = false;
            btn.textContent = "Çekme Talebi Oluştur";
        }
    });

    onSnapshot(query(collection(db, "withdrawalRequests"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), (snapshot) => {
        if (snapshot.empty) {
            previousWithdrawalsList.innerHTML = `<p class="empty-state">Henüz para çekme talebiniz bulunmamaktadır.</p>`;
            return;
        }
        previousWithdrawalsList.innerHTML = '';
        snapshot.forEach(docSnapshot => {
            const request = docSnapshot.data();
            const requestDate = request.createdAt ? request.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';
            let statusText = '', statusClass = '';
            switch(request.status) {
                case 'pending': statusText = 'Beklemede'; statusClass = 'status-pending'; break;
                case 'approved': statusText = 'Onaylandı'; statusClass = 'status-approved'; break;
                case 'rejected': statusText = 'Reddedildi'; statusClass = 'status-rejected'; break;
                default: statusText = 'Bilinmiyor'; statusClass = ''; break;
            }
            previousWithdrawalsList.innerHTML += `
                <div class="spark-card withdrawal-request-card">
                    <div class="request-header"><h3>${request.amount} ₺</h3><span class="request-status ${statusClass}">${statusText}</span></div>
                    <p>IBAN: ${request.iban}</p><p>Telefon: ${request.phoneNumber}</p><p>Talep Tarihi: ${requestDate}</p>
                </div>`;
        });
    });
}

async function loadSupportPageData(user) {
    const createTicketForm = document.getElementById('createTicketForm');
    const previousTicketsList = document.getElementById('previousTicketsList');

    createTicketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('ticketSubject').value.trim();
        const message = document.getElementById('ticketMessage').value.trim();
        if (!subject || !message) return showAlert("Lütfen tüm alanları doldurun.", false);

        try {
            const newTicketRef = await addDoc(collection(db, "tickets"), {
                userId: user.uid, userEmail: user.email, subject, status: 'open',
                createdAt: serverTimestamp(), lastUpdatedAt: serverTimestamp()
            });
            await addDoc(collection(db, "tickets", newTicketRef.id, "replies"), {
                message, senderId: user.uid, senderType: 'user', sentAt: serverTimestamp()
            });
            showAlert("Destek talebiniz başarıyla oluşturuldu!", true);
            createTicketForm.reset();
        } catch (error) {
            showAlert("Talep oluşturulurken bir hata oluştu: " + error.message, false);
        }
    });

    const ticketsQuery = query(collection(db, "tickets"), where("userId", "==", user.uid), orderBy("lastUpdatedAt", "desc"));
    onSnapshot(ticketsQuery, (snapshot) => {
        if (snapshot.empty) {
            previousTicketsList.innerHTML = `<p class="empty-state">Henüz bir destek talebiniz bulunmuyor.</p>`;
            return;
        }
        let ticketsHtml = '';
        snapshot.forEach(doc => {
            const ticket = { id: doc.id, ...doc.data() };
            const lastUpdate = ticket.lastUpdatedAt ? ticket.lastUpdatedAt.toDate().toLocaleString('tr-TR') : 'Bilinmiyor';
            ticketsHtml += `
                <a href="ticket-detail.html?id=${ticket.id}" class="ticket-list-item">
                    <div class="ticket-info"><strong>${ticket.subject}</strong><p>Son Güncelleme: ${lastUpdate}</p></div>
                    <span class="status-badge status-${ticket.status}">${ticket.status === 'open' ? 'Açık' : 'Kapalı'}</span>
                </a>`;
        });
        previousTicketsList.innerHTML = ticketsHtml;
    });
}

async function loadTicketDetailPageData(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    if (!ticketId) { window.location.replace("support.html"); return; }

    const subjectHeader = document.getElementById('ticketSubjectHeader');
    const statusSpan = document.getElementById('ticketStatus');
    const repliesContainer = document.getElementById('ticketRepliesContainer');
    const replyForm = document.getElementById('replyTicketForm');
    const replyFormContainer = document.getElementById('replyFormContainer');
    const closeTicketBtn = document.getElementById('closeTicketBtn');
    const ticketRef = doc(db, "tickets", ticketId);

    onSnapshot(ticketRef, (doc) => {
        if (doc.exists()) {
            const ticket = doc.data();
            subjectHeader.textContent = ticket.subject;
            statusSpan.textContent = ticket.status === 'open' ? 'Açık' : 'Kapalı';
            statusSpan.className = `status-badge status-${ticket.status}`;
            replyFormContainer.style.display = ticket.status === 'closed' ? 'none' : 'block';
        }
    });

    const repliesQuery = query(collection(db, "tickets", ticketId, "replies"), orderBy("sentAt", "asc"));
    onSnapshot(repliesQuery, (snapshot) => {
        let repliesHtml = '';
        snapshot.forEach(doc => {
            const reply = doc.data();
            const sentAt = reply.sentAt ? reply.sentAt.toDate().toLocaleString('tr-TR') : '';
            const senderClass = reply.senderType === 'admin' ? 'reply-admin' : 'reply-user';
            repliesHtml += `
                <div class="reply-bubble ${senderClass}">
                    <p>${reply.message}</p><span class="reply-timestamp">${sentAt}</span>
                </div>`;
        });
        repliesContainer.innerHTML = repliesHtml;
        repliesContainer.scrollTop = repliesContainer.scrollHeight;
    });

    replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('replyMessage').value.trim();
        if (!message) return;
        try {
            await addDoc(collection(db, "tickets", ticketId, "replies"), { message, senderId: user.uid, senderType: 'user', sentAt: serverTimestamp() });
            await updateDoc(ticketRef, { lastUpdatedAt: serverTimestamp() });
            replyForm.reset();
        } catch (error) {
            showAlert("Cevap gönderilirken hata oluştu: " + error.message, false);
        }
    });

    closeTicketBtn.addEventListener('click', async () => {
        if (confirm("Bu talebi kapatmak istediğinize emin misiniz?")) {
            try {
                await updateDoc(ticketRef, { status: 'closed', lastUpdatedAt: serverTimestamp() });
                showAlert("Talep başarıyla kapatıldı.", true);
            } catch (error) {
                showAlert("Talep kapatılırken bir hata oluştu: " + error.message, false);
            }
        }
    });
}