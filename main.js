
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, updateEmail, updatePassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocs, runTransaction, addDoc, serverTimestamp, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

const IMGBB_API_KEY = "84a7c0a54294a6e8ea2ffc9bab240719";
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
    document.querySelectorAll('.input-group.spark input, .input-group.spark textarea').forEach(input => {
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

    document.querySelectorAll('.input-group.spark select').forEach(select => {
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

    if (pageId.startsWith('page-admin')) {
        // Admin sayfaları admin.js tarafından yönetilecek
        return;
    }

    showLoader();

    onAuthStateChanged(auth, async (user) => {
        const isAuthPage = pageId === 'page-login' || pageId === 'page-register';
        if (user) {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Veritabanı belgesi yoksa oluştur. Bu, yeni kayıt olmuş bir kullanıcı için çalışacaktır.
                await setDoc(userRef, {
                    username: user.displayName || user.email.split('@')[0], // Kayıtta girilen adı kullan
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
                // Belge varsa, giriş bilgilerini ve eksik alanları güncelle.
                const userData = userDoc.data();
                const updates = {};
                
                updates.lastLoginAt = serverTimestamp(); // Update last login time on every login

                if (typeof userData.isPremium === 'undefined') {
                    updates.isPremium = false;
                    updates.premiumExpirationDate = null;
                    updates.lastPremiumPaymentDate = null;
                }

                if (Object.keys(updates).length > 0) {
                    await updateDoc(userRef, updates);
                }
            }

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
                    case 'page-announcements': await loadAnnouncementsPageData(); break;
                    case 'page-faq': await loadFaqPageData(); break;
                    case 'page-premium': await loadPremiumPageData(user); break;
                    case 'page-leaderboard': await loadLeaderboardPageData(user); break;
                }
                hideLoader();
                handleInputLabels();
            }
        } else {
            // Kullanıcı oturum açmamışsa
            if (!isAuthPage) {
                // Eğer mevcut sayfa bir kimlik doğrulama sayfası değilse, login.html'ye yönlendir
                window.location.replace('login.html');
            } else {
                // Eğer mevcut sayfa bir kimlik doğrulama sayfasıysa (login veya register), loader'ı gizle ve formları göster
                hideLoader();
                handleInputLabels();
            }
        }
    });

    if (pageId === 'page-login') initLoginPage();
    if (pageId === 'page-register') initRegisterPage();
});

function initRegisterPage() {
    const registerForm = document.getElementById("registerForm");
    handleInputLabels();

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

            // Sadece Auth profilini güncelle. Firestore belgesi onAuthStateChanged tarafından oluşturulacak.
            await updateProfile(newUser, { displayName: username });

            showAlert("Kayıt başarılı! Yönlendiriliyorsunuz...", true);
            // Yönlendirmeyi onAuthStateChanged'in yapmasına izin ver.
            
        } catch (error) {
            hideLoader();
            console.error("Kayıt işlemi sırasında hata:", error);
            showAlert(error.code === 'auth/email-already-in-use' ? "Bu e-posta zaten kayıtlı." : "Bir hata oluştu: " + error.message, false);
        }
    });
}


function initLoginPage() {
    const loginForm = document.getElementById("loginForm");
    handleInputLabels();

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

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt("Şifrenizi sıfırlamak için lütfen e-posta adresinizi girin:");
            if (email) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    showAlert("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.", true);
                } catch (error) {
                    console.error("Şifre sıfırlama hatası:", error);
                    showAlert("Şifre sıfırlama bağlantısı gönderilirken bir sorun oluştu. Lütfen e-posta adresinizi kontrol edin veya daha sonra tekrar deneyin.", false);
                }
            }
        });
    }
}

async function loadIndexPageData(user) {
    const taskList = document.getElementById("taskList");
    const balanceDisplay = document.getElementById("balanceDisplay");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const showMoreTasksBtn = document.getElementById("showMoreTasksBtn");
    const announcementsContainer = document.getElementById("announcementsContainer");
    const searchTaskInput = document.getElementById("searchTaskInput");

    let allTasks = [];
    let submittedTaskIds = [];
    const tasksPerLoad = 4;
    let currentTaskDisplayCount = tasksPerLoad;
    let currentFilterCategory = 'all';
    let currentSearchTerm = '';
    let isUserPremium = false;
    let premiumExpiry = null;

    onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            balanceDisplay.textContent = `${(userData.balance || 0).toFixed(2)} ₺`;
            isUserPremium = userData.isPremium || false;
            premiumExpiry = userData.premiumExpirationDate ? userData.premiumExpirationDate.toDate() : null;
            renderTasks();
        } else {
            balanceDisplay.textContent = `0.00 ₺`;
        }
    });

    const fetchTasksAndSubmissions = async () => {
        try {
            const tasksQuery = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
            const tasksSnapshot = await getDocs(tasksQuery);
            allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const submissionsQuery = query(collection(db, "submissions"),
                where("userId", "==", user.uid),
                where("status", "in", ["pending", "approved"]));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            submittedTaskIds = submissionsSnapshot.docs.map(doc => doc.data().taskId);

            renderTasks();
        } catch (error) {
            console.error("Görevler veya gönderimler yüklenirken hata oluştu:", error);
            taskList.innerHTML = `<li class="empty-state" style="color:var(--c-danger);">Görevler yüklenemedi.</li>`;
        }
    };

    const renderTasks = () => {
        taskList.innerHTML = "";
        let filteredTasks = allTasks;

        if (currentFilterCategory !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.category === currentFilterCategory);
        }

        if (currentSearchTerm) {
            const searchTermLower = currentSearchTerm.toLowerCase();
            filteredTasks = filteredTasks.filter(task =>
                task.text.toLowerCase().includes(searchTermLower) ||
                task.description.toLowerCase().includes(searchTermLower)
            );
        }

        filteredTasks = filteredTasks.filter(task => (task.stock || 0) > 0);

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<li class="empty-state">Bu kriterlere uygun aktif görev bulunmamaktadır.</li>`;
            showMoreTasksBtn.style.display = 'none';
            return;
        }

        const tasksToDisplay = filteredTasks.slice(0, currentTaskDisplayCount);

        tasksToDisplay.forEach((task, index) => {
            const isSubmitted = submittedTaskIds.includes(task.id);
            const categoryInfo = categoryData[task.category] || categoryData["other"];
            const li = document.createElement("li");
            li.className = "spark-card task-card";
            li.style.animationDelay = `${index * 0.05}s`;

            let displayReward = task.reward;
            let premiumBonusText = '';
            const now = new Date();
            const isPremiumActive = isUserPremium && premiumExpiry && premiumExpiry > now;

            if (isPremiumActive) {
                displayReward = (task.reward * (1 + PREMIUM_BONUS_PERCENTAGE)).toFixed(2);
                premiumBonusText = `<span style="font-size: 0.8em; color: var(--c-success);"> (+%${PREMIUM_BONUS_PERCENTAGE * 100} Premium Bonus)</span>`;
            }

            let actionButtonsHtml = '';
            if (isSubmitted) {
                actionButtonsHtml += `<button class='spark-button completed' disabled>Gönderildi</button>`;
            } else if ((task.stock || 0) <= 0) {
                actionButtonsHtml += `<button class='spark-button disabled-stock' disabled>Stok Yok</button>`;
            } else {
                actionButtonsHtml += `<a href="task-detail.html?id=${task.id}" class="spark-button task-link-button">Yap</a>`;
            }

            li.innerHTML = `
                <div class="task-logo"><img src="${categoryInfo.logo}" alt="${categoryInfo.name} logo" loading="lazy"></div>
                <div class="task-info">
                    <div class="task-title">${task.text}</div>
                    <div class="task-reward">+${displayReward} ₺${premiumBonusText}</div>
                </div>
                <div class="task-action">${actionButtonsHtml}</div>`;
            taskList.appendChild(li);
        });

        if (filteredTasks.length > currentTaskDisplayCount) {
            showMoreTasksBtn.style.display = 'block';
        } else {
            showMoreTasksBtn.style.display = 'none';
        }
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            button.classList.add('active');
            currentFilterCategory = button.dataset.category;
            currentTaskDisplayCount = tasksPerLoad;
            renderTasks();
        });
    });

    searchTaskInput.addEventListener('input', () => {
        currentSearchTerm = searchTaskInput.value.trim();
        currentTaskDisplayCount = tasksPerLoad;
        renderTasks();
    });

    showMoreTasksBtn.addEventListener('click', () => {
        currentTaskDisplayCount += tasksPerLoad;
        renderTasks();
    });

    await fetchTasksAndSubmissions();

    try {
        const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(2));
        const announcementsSnapshot = await getDocs(announcementsQuery);
        if (!announcementsSnapshot.empty) {
            announcementsContainer.innerHTML = '<h3>Son Duyurular</h3>';
            announcementsSnapshot.forEach(doc => {
                const announcement = doc.data();
                const date = announcement.createdAt ? announcement.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';
                announcementsContainer.innerHTML += `
                    <div class="spark-card announcement-card">
                        <h4>${announcement.title}</h4>
                        <p>${announcement.content}</p>
                        <span class="announcement-date">${date}</span>
                    </div>
                `;
            });
            announcementsContainer.innerHTML += `
                <div class="announcement-link">
                    <a href="announcements.html" class="spark-button small-button">Tüm Duyurular</a>
                </div>
            `;
        } else {
            announcementsContainer.innerHTML = `<div class="empty-state" style="color:var(--c-text-secondary);">Henüz duyuru bulunmamaktadır.</div>`;
        }
    } catch (error) {
        console.error("Duyurular yüklenirken hata oluştu:", error);
        announcementsContainer.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Duyurular yüklenemedi.</div>`;
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
                    const totalEarned = (userData.totalEarned || 0) + 0.5;
                    transaction.update(userRef, {
                        balance: newBalance,
                        lastBonusClaimed: serverTimestamp(),
                        totalEarned: totalEarned
                    });
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

async function uploadImageToImageBB(file) {
    if (!IMGBB_API_KEY || IMGBB_API_KEY === "YOUR_IMGBB_API_KEY") {
        throw new Error("ImageBB API Key ayarlanmamış veya varsayılan değerde. Lütfen main.js dosasındaki IMGBB_API_KEY değişkenini güncelleyin.");
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`ImageBB yükleme hatası: ${errorData.error.message || response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
            return result.data.url;
        } else {
            throw new Error(`ImageBB yüklemesi başarısız: ${result.status_txt}`);
        }
    } catch (error) {
        console.error("ImageBB'ye resim yüklenirken hata:", error);
        throw error;
    }
}

async function loadProfilePageData(user) {
    const usernameDisplay = document.getElementById("usernameDisplay");
    const balanceDisplay = document.getElementById("balanceDisplay");
    const taskCountsDisplay = document.getElementById("task-counts");
    const totalEarnedDisplay = document.getElementById("totalEarnedDisplay");
    const isPremiumDisplay = document.getElementById("isPremiumDisplay");
    const premiumExpirationSection = document.getElementById("premiumExpirationSection");
    const premiumExpirationDisplay = document.getElementById("premiumExpirationDisplay");
    const logoutBtn = document.getElementById("logoutBtn");

    onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            usernameDisplay.textContent = userData.username || 'N/A';
            balanceDisplay.textContent = `${(userData.balance || 0).toFixed(2)} ₺`;
            totalEarnedDisplay.textContent = `${(userData.totalEarned || 0).toFixed(2)} ₺`;

            const now = new Date();
            if (userData.isPremium && userData.premiumExpirationDate && userData.premiumExpirationDate.toDate() > now) {
                isPremiumDisplay.textContent = 'Evet (Aktif)';
                isPremiumDisplay.classList.remove('inactive');
                isPremiumDisplay.classList.add('active');
                premiumExpirationDisplay.textContent = userData.premiumExpirationDate.toDate().toLocaleDateString('tr-TR');
                premiumExpirationSection.style.display = 'block';
            } else {
                isPremiumDisplay.textContent = 'Hayır (Pasif)';
                isPremiumDisplay.classList.remove('active');
                isPremiumDisplay.classList.add('inactive');
                premiumExpirationSection.style.display = 'none';
            }

            handleInputLabels();
        } else {
            console.warn("Kullanıcı belgesi bulunamadı. Varsayılan oluşturuluyor...");
            setDoc(doc(db, "users", user.uid), {
                username: user.email.split('@')[0],
                email: user.email,
                balance: 0,
                isAdmin: false,
                isPremium: false,
                premiumExpirationDate: null,
                lastPremiumPaymentDate: null,
                totalCompletedTasks: 0,
                totalEarned: 0
            }, { merge: true });
        }
    });

    try {
        const approvedSubmissionsQuery = query(collection(db, "submissions"), where('userId', '==', user.uid), where('status', '==', 'approved'));
        const approvedSubmissionsSnapshot = await getDocs(approvedSubmissionsQuery);
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        if (taskCountsDisplay) {
            taskCountsDisplay.textContent = `${approvedSubmissionsSnapshot.size} / ${tasksSnapshot.size}`;
            await updateDoc(doc(db, "users", user.uid), {
                totalCompletedTasks: approvedSubmissionsSnapshot.size,
            }, { merge: true });
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
                submissionsList.innerHTML = `<div class="empty-state">Henüz görev göndermediniz.</div>`;
                return;
            }

            submissionsList.innerHTML = '';
            for (const docSnapshot of snapshot.docs) {
                const submission = { id: docSnapshot.id, ...docSnapshot.data() };
                const taskDoc = await getDoc(doc(db, "tasks", submission.taskId));
                const task = taskDoc.exists() ? taskDoc.data() : { text: 'Görev Silinmiş', reward: 0 };

                let statusText = '', statusClass = '', reasonButtonHtml = '';
                switch (submission.status) {
                    case 'pending':
                        statusText = 'Onay Bekliyor';
                        statusClass = 'status-pending';
                        break;
                    case 'approved':
                        statusText = 'Onaylandı';
                        statusClass = 'status-approved';
                        break;
                    case 'rejected':
                        statusText = 'Reddedildi';
                        statusClass = 'status-rejected';
                        if (submission.rejectionReason) {
                            const encodedReason = submission.rejectionReason.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            reasonButtonHtml = `<button class="spark-button small-button btn-show-reason" data-reason="${encodedReason}">İptal Nedeni</button>`;
                        }
                        break;
                    case 'archived':
                        statusText = 'Arşivlendi';
                        statusClass = 'status-archived';
                        break;
                    default:
                        statusText = 'Bilinmiyor';
                        statusClass = '';
                        break;
                }
                const submissionDate = submission.submittedAt ? submission.submittedAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';

                let rewardDisplay = task.reward;
                let premiumBonusInfo = '';
                if (submission.isPremiumBonusApplied) {
                    rewardDisplay = (task.reward * (1 + PREMIUM_BONUS_PERCENTAGE)).toFixed(2);
                    premiumBonusInfo = ` (%${PREMIUM_BONUS_PERCENTAGE * 100} Premium Bonus)`;
                }

                submissionsList.innerHTML += `
                    <div class="spark-card submission-card">
                        <div class="submission-header">
                            <h3>${task.text}</h3>
                            <span class="submission-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="submission-details">
                            <p>Gönderim Tarihi: ${submissionDate}</p>
                            <p>Ödül: +${rewardDisplay} ₺${premiumBonusInfo}</p>
                        </div>
                        <div class="submission-actions">${reasonButtonHtml}</div>
                    </div>`;
            }
        });
    } catch (error) {
        console.error("Gönderimler yüklenirken hata oluştu:", error);
        submissionsList.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Gönderimler yüklenemedi.</div>`;
    }
}

async function loadTaskDetailPageData(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    if (!taskId) {
        window.location.replace("index.html");
        return;
    }

    const taskTitle = document.getElementById('taskTitle');
    const taskReward = document.getElementById('taskReward');
    const premiumBonusInfo = document.getElementById('premiumBonusInfo');
    const taskDescription = document.getElementById('taskDescription');
    const taskLinkContainer = document.getElementById('taskLinkContainer');
    const requiredFileCountSpan = document.getElementById('requiredFileCount');
    const multipleFileUploadContainer = document.getElementById('multipleFileUploadContainer');
    const submitTaskBtn = document.getElementById('submitTask');
    const taskStockDisplay = document.getElementById('taskStockDisplay');

    let filesToUpload = [];
    const allowedTypes = ['image/jpeg', 'image/png'];

    let currentTask = null;
    let isUserPremium = false;
    let premiumExpiry = null;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        isUserPremium = userData.isPremium || false;
        premiumExpiry = userData.premiumExpirationDate ? userData.premiumExpirationDate.toDate() : null;
    }

    try {
        const taskDoc = await getDoc(doc(db, "tasks", taskId));
        if (taskDoc.exists()) {
            currentTask = taskDoc.data();
            taskTitle.textContent = currentTask.text;
            taskDescription.textContent = currentTask.description;
            taskStockDisplay.textContent = `Mevcut Stok: ${currentTask.stock || 0}`;

            let displayReward = currentTask.reward;
            const now = new Date();
            const isPremiumActive = isUserPremium && premiumExpiry && premiumExpiry > now;

            if (isPremiumActive) {
                displayReward = (currentTask.reward * (1 + PREMIUM_BONUS_PERCENTAGE)).toFixed(2);
                taskReward.textContent = `Ödül: ${currentTask.reward} ₺`;
                premiumBonusInfo.textContent = `Premium ile Kazanacağınız: +${displayReward} ₺ (İlave %${PREMIUM_BONUS_PERCENTAGE * 100})`;
                premiumBonusInfo.style.display = 'block';
            } else {
                taskReward.textContent = `Ödül: ${currentTask.reward} ₺`;
                premiumBonusInfo.style.display = 'none';
            }

            if ((currentTask.stock || 0) <= 0) {
                submitTaskBtn.disabled = true;
                submitTaskBtn.textContent = "Stok Yok";
                showAlert("Bu görevin stoğu kalmamıştır.", false);
            }

            if (currentTask.link) {
                const goTaskBtn = document.createElement('a');
                goTaskBtn.href = currentTask.link;
                goTaskBtn.target = "_blank";
                goTaskBtn.className = "spark-button task-go-button";
                goTaskBtn.textContent = "Göreve Git";
                taskLinkContainer.appendChild(goTaskBtn);
                taskLinkContainer.style.display = 'block';
            } else {
                taskLinkContainer.style.display = 'none';
            }

            const fileCount = currentTask.fileCount || 1;
            requiredFileCountSpan.textContent = fileCount;
            renderFileInputs(fileCount);

        } else {
            window.location.replace("index.html");
        }
    } catch (error) {
        console.error("Görev detayları yüklenirken hata:", error);
        window.location.replace("index.html");
    }

    function renderFileInputs(count) {
        multipleFileUploadContainer.innerHTML = '';
        filesToUpload = Array(count).fill(null);

        for (let i = 0; i < count; i++) {
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'file-upload-item';

            wrapperDiv.innerHTML = `
                <div class="file-upload">
                    <input type="file" id="taskProof-${i}" accept=".jpg,.jpeg,.png" style="display: none;">
                    <label for="taskProof-${i}" class="spark-button small-button">Kanıt ${i + 1} Seç</label>
                    <span id="fileName-${i}" class="file-name-display">Dosya seçilmedi</span>
                </div>
                <div class="upload-preview" id="imagePreview-${i}"></div>
            `;
            multipleFileUploadContainer.appendChild(wrapperDiv);

            const currentFileInput = wrapperDiv.querySelector(`#taskProof-${i}`);
            const currentFileNameSpan = wrapperDiv.querySelector(`#fileName-${i}`);
            const currentImagePreviewDiv = wrapperDiv.querySelector(`#imagePreview-${i}`);

            currentFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!allowedTypes.includes(file.type)) {
                        showAlert('Lütfen sadece JPG veya PNG formatında bir resim dosyası seçin.', false);
                        e.target.value = '';
                        filesToUpload[i] = null;
                        currentFileNameSpan.textContent = "Dosya seçilmedi";
                        currentImagePreviewDiv.innerHTML = "";
                        return;
                    }
                    filesToUpload[i] = file;
                    currentFileNameSpan.textContent = file.name;
                    const reader = new FileReader();
                    reader.onload = e => currentImagePreviewDiv.innerHTML = `<img src="${e.target.result}" alt="Önizleme ${i + 1}" loading="lazy">`;
                    reader.readAsDataURL(file);
                } else {
                    filesToUpload[i] = null;
                    currentFileNameSpan.textContent = "Dosya seçilmedi";
                    currentImagePreviewDiv.innerHTML = "";
                }
            });
        }
    }

    submitTaskBtn.addEventListener('click', async () => {
        if ((currentTask.stock || 0) <= 0) {
            showAlert("Bu görevin stoğu kalmamıştır.", false);
            submitTaskBtn.disabled = true;
            submitTaskBtn.textContent = "Stok Yok";
            return;
        }

        const missingFiles = filesToUpload.filter(f => f === null || f === undefined);
        if (missingFiles.length > 0) {
            return showAlert(`Lütfen tüm ${filesToUpload.length} kanıt dosyasını seçin!`, false);
        }

        submitTaskBtn.disabled = true;
        submitTaskBtn.textContent = "Yükleniyor...";

        let uploadedFileURLs = [];
        try {
            for (const file of filesToUpload) {
                const downloadURL = await uploadImageToImageBB(file);
                uploadedFileURLs.push(downloadURL);
            }

            

            await runTransaction(db, async (transaction) => {
                const taskRef = doc(db, "tasks", taskId);

                const latestTaskDoc = await transaction.get(taskRef);
                if (!latestTaskDoc.exists() || (latestTaskDoc.data().stock || 0) <= 0) {
                    throw new Error("Görev bulunamadı veya stoğu kalmamıştır.");
                }

                const userSubmissionsQueryForCheck = query(collection(db, "submissions"),
                    where("userId", "==", user.uid),
                    where("taskId", "==", taskId),
                    where("status", "in", ["pending", "approved"]));

                const userSubmissionsSnapshot = await getDocs(userSubmissionsQueryForCheck);

                if (!userSubmissionsSnapshot.empty) {
                    throw new Error('Bu görevi zaten gönderdiniz.');
                }

                const currentStock = latestTaskDoc.data().stock;
                const newStock = currentStock - 1;
                transaction.update(taskRef, { stock: newStock });

                const newSubmissionRef = doc(collection(db, "submissions"));
                const now = new Date();
                const isPremiumActive = isUserPremium && premiumExpiry && premiumExpiry > now;

                transaction.set(newSubmissionRef, {
                    taskId,
                    userId: user.uid,
                    userEmail: user.email,
                    fileURLs: uploadedFileURLs,
                    submittedAt: serverTimestamp(),
                    status: 'pending',
                    isPremiumBonusApplied: isPremiumActive
                });
            });
            showAlert('Göreviniz başarıyla onaya gönderildi!', true);
            setTimeout(() => { window.location.href = 'my-tasks.html'; }, 1500);

        } catch (error) {
            console.error("Görev gönderilirken genel hata:", error);
            showAlert("Hata: " + error.message, false);
            submitTaskBtn.disabled = false;
            submitTaskBtn.textContent = "Görevi Onaya Gönder";

            if (error.message.includes("stoğu kalmamıştır")) {
                taskStockDisplay.textContent = `Mevcut Stok: 0`;
                submitTaskBtn.textContent = "Stok Yok";
                submitTaskBtn.disabled = true;
            } else if (error.message.includes("zaten gönderdiniz")) {
                submitTaskBtn.textContent = "Gönderildi";
                submitTaskBtn.disabled = true;
            }
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

            const userData = docSnapshot.data();
            if (userData.iban) {
                ibanInput.value = userData.iban;
                ibanInput.classList.add('populated');
            } else {
                ibanInput.classList.remove('populated');
            }
            if (userData.phoneNumber) {
                phoneNumberInput.value = userData.phoneNumber;
                phoneNumberInput.classList.add('populated');
            } else {
                phoneNumberInput.classList.remove('populated');
            }
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
                transaction.update(userRef, { balance: currentBalance - amount, iban, phoneNumber });
                await addDoc(collection(db, "withdrawalRequests"), {
                    userId: user.uid,
                    userEmail: user.email,
                    amount,
                    iban,
                    phoneNumber,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
            });
            showAlert("Çekme talebiniz oluşturuldu.", true);
            withdrawalAmountInput.value = '';
        } catch (error) {
            showAlert("Talep oluşturulamadı: " + error.message, false);
        } finally {
            btn.disabled = false;
            btn.textContent = "Çekme Talebi Oluştur";
        }
    });

    onSnapshot(query(collection(db, "withdrawalRequests"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), (snapshot) => {
        if (snapshot.empty) {
            previousWithdrawalsList.innerHTML = `<div class="empty-state">Henüz para çekme talebiniz bulunmamaktadır.</div>`;
            return;
        }
        previousWithdrawalsList.innerHTML = '';
        snapshot.forEach(docSnapshot => {
            const request = docSnapshot.data();
            const requestDate = request.createdAt ? request.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';
            let statusText = '', statusClass = '';
            switch (request.status) {
                case 'pending':
                    statusText = 'Beklemede';
                    statusClass = 'status-pending';
                    break;
                case 'approved':
                    statusText = 'Onaylandı';
                    statusClass = 'status-approved';
                    break;
                case 'rejected':
                    statusText = 'Reddedildi';
                    statusClass = 'status-rejected';
                    break;
                case 'archived':
                    statusText = 'Arşivlendi';
                    statusClass = 'status-archived';
                    break;
                default:
                    statusText = 'Bilinmiyor';
                    statusClass = '';
                    break;
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

    let username = user.displayName || user.email.split('@')[0];
    const userDocSnapshot = await getDoc(doc(db, "users", user.uid));
    if (userDocSnapshot.exists() && userDocSnapshot.data().username) {
        username = userDocSnapshot.data().username;
    }

    createTicketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('ticketSubject').value.trim();
        const message = document.getElementById('ticketMessage').value.trim();
        const category = document.getElementById('ticketCategory').value;
        if (!subject || !message || !category) return showAlert("Lütfen tüm alanları doldurun.", false);

        try {
            const submitBtn = createTicketForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = "Talep Oluşturuluyor...";

            const newTicketRef = await addDoc(collection(db, "tickets"), {
                userId: user.uid,
                userEmail: user.email,
                subject,
                status: 'open',
                createdAt: serverTimestamp(),
                lastUpdatedAt: serverTimestamp(),
                assignedTo: null,
                assignedToName: null,
                lastMessage: message,
                lastMessageSenderType: 'user',
                category: category
            });
            await addDoc(collection(db, "tickets", newTicketRef.id, "replies"), {
                message,
                senderId: user.uid,
                senderType: 'user',
                senderName: username,
                sentAt: serverTimestamp()
            });
            showAlert("Destek talebiniz başarıyla oluşturuldu!", true);
            createTicketForm.reset();
            document.getElementById('ticketCategory').value = "";
        } catch (error) {
            console.error("Talep oluşturulurken bir hata oluştu:", error);
            showAlert("Talep oluşturulurken bir hata oluştu: " + error.message, false);
        } finally {
            const submitBtn = createTicketForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = "Talep Oluştur";
        }
    });

    const ticketsQuery = query(collection(db, "tickets"), where("userId", "==", user.uid), orderBy("lastUpdatedAt", "desc"));
    onSnapshot(ticketsQuery, (snapshot) => {
        if (snapshot.empty) {
            previousTicketsList.innerHTML = `<div class="empty-state">Henüz bir destek talebiniz bulunmuyor.</div>`;
            return;
        }
        let ticketsHtml = '';
        snapshot.forEach(doc => {
            const ticket = { id: doc.id, ...doc.data() };

            if (ticket.status === 'cleared') {
                return;
            }

            const lastUpdate = ticket.lastUpdatedAt ? ticket.lastUpdatedAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';
            let statusClass = '';
            let statusText = '';
            switch (ticket.status) {
                case 'open':
                    statusText = 'Açık';
                    statusClass = 'status-pending';
                    break;
                case 'closed':
                    statusText = 'Kapalı';
                    statusClass = 'status-rejected';
                    break;
                case 'archived':
                    statusText = 'Arşivlendi';
                    statusClass = 'status-archived';
                    break;
                default:
                    statusText = 'Bilinmiyor';
                    statusClass = '';
                    break;
            }
            if (ticket.assignedToName) {
                statusText += ` (${ticket.assignedToName})`;
            }

            ticketsHtml += `
                <a href="ticket-detail.html?id=${ticket.id}" class="spark-card ticket-list-item">
                    <div class="ticket-info"><strong>${ticket.subject}</strong><p>Son Güncelleme: ${lastUpdate}</p></div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </a>`;
        });
        previousTicketsList.innerHTML = ticketsHtml;
    }, (error) => {
        console.error("Destek talepleri yüklenirken hata oluştu:", error);
        previousTicketsList.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Destek talepleri yüklenemedi: ${error.message}</div>`;
    });
}

async function loadTicketDetailPageData(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    if (!ticketId) {
        window.location.replace("support.html");
        return;
    }

    const subjectHeader = document.getElementById('ticketSubjectHeader');
    const statusSpan = document.getElementById('ticketStatus');
    const repliesContainer = document.getElementById('ticketRepliesContainer');
    const replyForm = document.getElementById('replyTicketForm');
    const replyFormContainer = document.getElementById('replyFormContainer');
    const closeTicketBtn = document.getElementById('closeTicketBtn');
    const ticketRef = doc(db, "tickets", ticketId);
    const replyMessageInput = document.getElementById('replyMessage');
    const replyFileInput = document.getElementById('replyFile');
    const replyFileNameSpan = document.getElementById('replyFileName');
    const replyImagePreviewDiv = document.getElementById('replyImagePreview');

    let selectedFile = null;
    const allowedTypes = ['image/jpeg', 'image/png'];

    let username = user.displayName || user.email.split('@')[0];
    const userDocSnapshot = await getDoc(doc(db, "users", user.uid));
    if (userDocSnapshot.exists() && userDocSnapshot.data().username) {
        username = userDocSnapshot.data().username;
    }

    replyFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!allowedTypes.includes(file.type)) {
                showAlert('Lütfen sadece JPG veya PNG formatında bir resim dosyası seçin.', false);
                e.target.value = '';
                selectedFile = null;
                replyFileNameSpan.textContent = "Dosya seçilmedi";
                replyImagePreviewDiv.innerHTML = "";
                return;
            }
            selectedFile = file;
            replyFileNameSpan.textContent = file.name;
            const reader = new FileReader();
            reader.onload = e => replyImagePreviewDiv.innerHTML = `<img src="${e.target.result}" alt="Önizleme" loading="lazy">`;
            reader.readAsDataURL(selectedFile);
        } else {
            selectedFile = null;
            replyFileNameSpan.textContent = "Dosya seçilmedi";
            replyImagePreviewDiv.innerHTML = "";
        }
    });

    onSnapshot(ticketRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const ticket = docSnapshot.data();
            subjectHeader.textContent = ticket.subject;
            let statusText = '';
            let statusClass = '';
            switch (ticket.status) {
                case 'open':
                    statusText = 'Açık';
                    statusClass = 'status-pending';
                    break;
                case 'closed':
                    statusText = 'Kapalı';
                    statusClass = 'status-rejected';
                    break;
                case 'archived':
                    statusText = 'Arşivlendi';
                    statusClass = 'status-archived';
                    break;
                case 'cleared':
                    statusText = 'Temizlendi';
                    statusClass = 'status-archived';
                    break;
                default:
                    statusText = 'Bilinmiyor';
                    statusClass = '';
                    break;
            }
            if (ticket.assignedToName) {
                statusText += ` (${ticket.assignedToName})`;
            }
            statusSpan.textContent = statusText;
            statusSpan.className = `status-badge ${statusClass}`;

            if (ticket.status === 'closed' || ticket.status === 'archived' || ticket.status === 'cleared') {
                replyFormContainer.style.display = 'none';
                closeTicketBtn.style.display = 'none';
            } else {
                replyFormContainer.style.display = 'block';
                closeTicketBtn.style.display = 'block';
            }

        } else {
            console.warn("Talep belgesi bulunamadı:", ticketId);
            showAlert("Bu destek talebi bulunamadı.", false);
            setTimeout(() => { window.location.replace("support.html"); }, 2000);
        }
    }, (error) => {
        console.error("Talep detayları yüklenirken hata oluştu:", error);
        showAlert("Talep detayları yüklenirken bir hata oluştu: " + error.message, false);
    });

    const repliesQuery = query(collection(db, "tickets", ticketId, "replies"), orderBy("sentAt", "asc"));
    onSnapshot(repliesQuery, (snapshot) => {
        let repliesHtml = '';
        if (snapshot.empty) {
            repliesHtml = '<div class="empty-state">Henüz bir mesaj bulunmuyor.</div>';
        } else {
            snapshot.forEach(doc => {
                const reply = doc.data();
                const sentAt = reply.sentAt ? reply.sentAt.toDate().toLocaleTimeString('tr-TR') : '';
                const senderClass = reply.senderType === 'admin' ? 'reply-admin' : 'reply-user';
                const senderDisplay = reply.senderType === 'admin' ? `<span class="sender-name">${reply.senderName || 'Admin'}</span>` : '';

                let fileAttachmentHtml = '';
                if (reply.fileURL) {
                    fileAttachmentHtml = `<div style="margin-top: 10px;"><img src="${reply.fileURL}" class="uploaded-image-preview" onclick="window.open(this.src, '_blank')" alt="Ek" loading="lazy"></div>`;
                }

                repliesHtml += `
                    <div class="reply-bubble ${senderClass}">
                        ${senderDisplay}
                        <p>${reply.message}</p>
                        ${fileAttachmentHtml}
                        <span class="reply-timestamp">${sentAt}</span>
                    </div>`;
            });
        }
        repliesContainer.innerHTML = repliesHtml;
        repliesContainer.scrollTop = repliesContainer.scrollHeight;
    }, (error) => {
        console.error("Talep cevapları yüklenirken hata oluştu:", error);
        repliesContainer.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Cevaplar yüklenemedi: ${error.message}</div>`;
    });

    replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = replyMessageInput.value.trim();
        if (!message && !selectedFile) return showAlert("Lütfen bir mesaj yazın veya bir dosya seçin.", false);

        const replyBtn = replyForm.querySelector('button[type="submit"]');
        replyBtn.disabled = true;
        replyBtn.textContent = "Gönderiliyor...";

        try {
            let fileURL = null;
            if (selectedFile) {
                fileURL = await uploadImageToImageBB(selectedFile);
            }

            await addDoc(collection(db, "tickets", ticketId, "replies"), {
                message,
                senderId: user.uid,
                senderType: 'user',
                senderName: username,
                sentAt: serverTimestamp(),
                fileURL: fileURL
            });
            await updateDoc(ticketRef, {
                lastUpdatedAt: serverTimestamp(),
                status: 'open',
                lastMessage: message,
                lastMessageSenderType: 'user'
            });
            replyMessageInput.value = '';
            replyFileInput.value = '';
            selectedFile = null;
            replyFileNameSpan.textContent = "Dosya seçilmedi";
            replyImagePreviewDiv.innerHTML = "";
            showAlert("Cevap gönderildi!", true);
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

async function loadAnnouncementsPageData() {
    const announcementsList = document.getElementById('announcementsList');

    try {
        const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const announcementsSnapshot = await getDocs(announcementsQuery);

        if (announcementsSnapshot.empty) {
            announcementsList.innerHTML = `<div class="empty-state">Henüz bir duyuru bulunmamaktadır.</div>`;
            return;
        }

        announcementsList.innerHTML = '';
        announcementsSnapshot.forEach(doc => {
            const announcement = doc.data();
            const date = announcement.createdAt ? announcement.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';
            announcementsList.innerHTML += `
                <div class="spark-card announcement-item">
                    <h3>${announcement.title}</h3>
                    <p>${announcement.content}</p>
                    <span class="announcement-date">${date}</span>
                </div>
            `;
        });

    } catch (error) {
        console.error("Duyurular yüklenirken hata oluştu:", error);
        announcementsList.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Duyurular yüklenemedi.</div>`;
    }
}

async function loadFaqPageData() {
    const faqList = document.getElementById('faqList');

    try {
        const faqsQuery = query(collection(db, "faqs"), orderBy("order", "asc"));
        const faqsSnapshot = await getDocs(faqsQuery);

        if (faqsSnapshot.empty) {
            faqList.innerHTML = `<div class="empty-state">Henüz sıkça sorulan soru bulunmamaktadır.</div>`;
            return;
        }

        faqList.innerHTML = '';
        faqsSnapshot.forEach(doc => {
            const faq = doc.data();
            faqList.innerHTML += `
                <div class="spark-card">
                    <h4>${faq.question}</h4>
                    <p>${faq.answer}</p>
                </div>
            `;
        });

    } catch (error) {
        console.error("SSS yüklenirken hata oluştu:", error);
        faqList.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">SSS yüklenemedi.</div>`;
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
        const isPremiumActive = userData.isPremium && userData.premiumExpirationDate && userData.premiumExpirationDate.toDate() > now;
        currentBalanceForPremium.textContent = `${(userData.balance || 0).toFixed(2)} ₺`;

        if (isPremiumActive) {
            isPremiumDisplay.textContent = 'Evet (Aktif)';
            isPremiumDisplay.classList.remove('inactive');
            isPremiumDisplay.classList.add('active');
            premiumExpirationDisplay.textContent = userData.premiumExpirationDate.toDate().toLocaleDateString('tr-TR');
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
            subscribeBtn.textContent += " - Yetersiz Bakiye";
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

                if (userData.isPremium && userData.premiumExpirationDate && userData.premiumExpirationDate.toDate() > now) {
                    newExpirationDate = userData.premiumExpirationDate.toDate();
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
                    <span class="leaderboard-score">${score.toFixed(scoreField === 'totalEarned' ? 2 : 0)} ${unit}</span>
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
        topEarnersContainer.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Liste yüklenemedi.</div>`;
    }
    
    try {
        const topCompletersQuery = query(collection(db, "users"), orderBy("totalCompletedTasks", "desc"), limit(10));
        const topCompletersSnapshot = await getDocs(topCompletersQuery);
        const topCompleters = topCompletersSnapshot.docs.map(doc => doc.data());
        renderLeaderboard(topCompletersContainer, topCompleters, 'totalCompletedTasks', 'Görev');
    } catch (error) {
        console.error("En çok görev yapanlar yüklenirken hata oluştu:", error);
        topCompletersContainer.innerHTML = `<div class="empty-state" style="color:var(--c-danger);">Liste yüklenemedi.</div>`;
    }
}
