
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
}``````javascript
// admin.js dosyası
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
                        if (mainContent) mainContent.style.display = 'flex'; // Use flex for app-layout
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
        
        // Hide loader and show content initially for login page
        if (loader) loader.style.display = 'none';
        if (mainContent) mainContent.style.display = 'flex';

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
                const premiumStatus = (u.isPremium && u.premiumExpirationDate && u.premiumExpirationDate.toDate() > new Date()) ? 
                                      `Evet (Bitiş: ${u.premiumExpirationDate.toDate().toLocaleDateString('tr-TR')})` : 'Hayır'; // NEW
                usersHtml += `
                    <div class="user-list-item spark-card" id="user-${u.id}">
                        <div class="user-info"><strong>${u.username}</strong> <span style="font-size:0.9em; color:var(--c-text-secondary);">(${u.email})</span><p>Bakiye: ${u.balance} ₺ | Admin: ${u.isAdmin ? 'Evet' : 'Hayır'} | Premium: ${premiumStatus} | Completed: ${u.totalCompletedTasks || 0}</p></div>
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
                const newBalance = prompt("Yeni bakiye (₺):", userToEdit.balance);
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
                    <h3>${task.text} (+${task.reward} ₺)</h3>
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

            const lastUpdate = ticket.lastUpdatedAt.toDate().toLocaleString('tr-TR');
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
            const date = announcement.createdAt ? announcement.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor';
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
