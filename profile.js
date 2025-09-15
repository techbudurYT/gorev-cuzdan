document.addEventListener('DOMContentLoaded', () => {
    const userDisplayName = document.getElementById('user-display-name');
    const profileBalanceDisplay = document.getElementById('profile-balance');
    const profileTasksCompletedDisplay = document.getElementById('profile-tasks-completed');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnProfile = document.getElementById('logout-btn-profile');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Username update elements
    const updateUsernameForm = document.getElementById('update-username-form');
    const profileUsernameInput = document.getElementById('profile-username');
    const usernameMessage = document.getElementById('username-message');

    // Password change elements
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordMessage = document.getElementById('password-message');

    // Delete account elements
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteAccountMessage = document.getElementById('delete-account-message');

    let currentUser = null;
    let currentUserData = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserProfile(user);
        } else {
            window.location.href = 'login.html';
        }
    });

    // Menü Toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    async function loadUserProfile(user) {
        const userDocRef = db.collection('users').doc(user.uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
            currentUserData = doc.data();
            if (userDisplayName) userDisplayName.textContent = currentUserData.username || currentUserData.email;
            if (profileBalanceDisplay) profileBalanceDisplay.textContent = `${currentUserData.balance.toFixed(2)} ₺`;
            if (profileTasksCompletedDisplay) profileTasksCompletedDisplay.textContent = currentUserData.completedTasks;
            if (profileUsernameInput) profileUsernameInput.value = currentUserData.username || '';
            
            if(currentUserData.isAdmin) {
                if (adminPanelLink) adminPanelLink.style.display = 'block';
            }
        } else {
            console.error("Kullanıcı verisi bulunamadı!");
            alert("Profil verileriniz yüklenemedi. Lütfen destek ile iletişime geçin.");
            auth.signOut();
        }
    }

    // Update Username
    if (updateUsernameForm) {
        updateUsernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = profileUsernameInput.value.trim().toLowerCase();

            usernameMessage.textContent = '';
            usernameMessage.style.display = 'none';

            if (!currentUser || !currentUserData) {
                usernameMessage.textContent = 'Kullanıcı bilgileri yüklenemedi. Lütfen sayfayı yenileyin.';
                usernameMessage.className = 'message-box error-message';
                usernameMessage.style.display = 'block';
                return;
            }

            if (newUsername === currentUserData.username) {
                usernameMessage.textContent = 'Yeni kullanıcı adı mevcut kullanıcı adınızla aynı.';
                usernameMessage.className = 'message-box info-message';
                usernameMessage.style.display = 'block';
                return;
            }

            if (!/^[a-zA-Z0-9_]{3,15}$/.test(newUsername)) {
                usernameMessage.textContent = 'Kullanıcı adı 3-15 karakter uzunluğunda olmalı ve sadece harf, rakam veya _ içerebilir.';
                usernameMessage.className = 'message-box error-message';
                usernameMessage.style.display = 'block';
                return;
            }

            usernameMessage.textContent = 'Kullanıcı adı güncelleniyor...';
            usernameMessage.className = 'message-box info-message';
            usernameMessage.style.display = 'block';

            try {
                const userDocRef = db.collection('users').doc(currentUser.uid);
                const batch = db.batch();

                // 1. Check if new username is already taken by another user
                const usernameDocRef = db.collection('usernames').doc(newUsername);
                const usernameDoc = await usernameDocRef.get();

                if (usernameDoc.exists && usernameDoc.data().uid !== currentUser.uid) {
                    throw new Error('Bu kullanıcı adı zaten alınmış.');
                }

                // 2. Delete old username entry if it exists
                if (currentUserData.username) {
                    batch.delete(db.collection('usernames').doc(currentUserData.username));
                }

                // 3. Create new username entry
                batch.set(usernameDocRef, { uid: currentUser.uid });

                // 4. Update user document
                batch.update(userDocRef, {
                    username: newUsername
                });

                await batch.commit();

                // Update UI and local data
                currentUserData.username = newUsername;
                if (userDisplayName) userDisplayName.textContent = newUsername;
                usernameMessage.textContent = 'Kullanıcı adınız başarıyla güncellendi!';
                usernameMessage.className = 'message-box success-message';
                setTimeout(() => usernameMessage.style.display = 'none', 3000);

            } catch (error) {
                console.error("Kullanıcı adı güncelleme hatası: ", error);
                usernameMessage.textContent = `Hata: ${error.message}`;
                usernameMessage.className = 'message-box error-message';
                usernameMessage.style.display = 'block';
            }
        });
    }

    // Change Password
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
            passwordMessage.textContent = '';
            passwordMessage.style.display = 'none';

            if (!currentUser) {
                passwordMessage.textContent = 'Lütfen giriş yaptığınızdan emin olun.';
                passwordMessage.className = 'message-box error-message';
                passwordMessage.style.display = 'block';
                return;
            }

            // Firebase'in parola değiştirme mekanizması, kullanıcının son zamanlarda kimlik doğrulaması yapmasını gerektirir.
            // Bu nedenle, doğrudan burada bir şifre değiştirme formu sunmak yerine,
            // kullanıcının şifre sıfırlama e-postası göndermeyi tercih edebiliriz veya
            // re-authentication akışı uygulayabiliriz. Basitlik için bir uyarı ve yönlendirme yapıyoruz.
            
            if (confirm('Şifrenizi değiştirmek için, Firebase tarafından şifre sıfırlama e-postası alacaksınız. Devam etmek istiyor musunuz?')) {
                try {
                    await auth.sendPasswordResetEmail(currentUser.email);
                    passwordMessage.textContent = 'Şifre sıfırlama e-postası başarıyla gönderildi. E-postanızı kontrol edin.';
                    passwordMessage.className = 'message-box info-message';
                    passwordMessage.style.display = 'block';
                } catch (error) {
                    console.error("Şifre sıfırlama e-postası gönderme hatası: ", error);
                    passwordMessage.textContent = `Hata: ${error.message}`;
                    passwordMessage.className = 'message-box error-message';
                    passwordMessage.style.display = 'block';
                }
            }
        });
    }

    // Delete Account
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            deleteAccountMessage.textContent = '';
            deleteAccountMessage.style.display = 'none';

            if (!currentUser) {
                deleteAccountMessage.textContent = 'Lütfen giriş yaptığınızdan emin olun.';
                deleteAccountMessage.className = 'message-box error-message';
                deleteAccountMessage.style.display = 'block';
                return;
            }

            if (confirm('Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir!')) {
                // Re-authenticate user before deleting account for security
                // For simplicity, we'll prompt for re-login or use a placeholder here.
                // In a real app, you'd show a re-authentication dialog.
                alert('Hesabınızı silmeden önce güvenlik amacıyla tekrar giriş yapmanız istenebilir. Lütfen bu işlemi onaylayın.');

                deleteAccountMessage.textContent = 'Hesap siliniyor...';
                deleteAccountMessage.className = 'message-box info-message';
                deleteAccountMessage.style.display = 'block';

                try {
                    // Delete user's Firestore data first
                    const batch = db.batch();
                    batch.delete(db.collection('users').doc(currentUser.uid));
                    if (currentUserData && currentUserData.username) {
                        batch.delete(db.collection('usernames').doc(currentUserData.username));
                    }
                    // In a real application, you would also delete all tasks, proofs, tickets etc. associated with this user.
                    // This is best handled by Cloud Functions triggered on user deletion.
                    await batch.commit();

                    // Then delete the Firebase Auth user
                    await currentUser.delete();

                    deleteAccountMessage.textContent = 'Hesabınız başarıyla silindi. Yönlendiriliyorsunuz...';
                    deleteAccountMessage.className = 'message-box success-message';
                    setTimeout(() => {
                        window.location.href = 'register.html'; // Redirect to registration page after deletion
                    }, 2000);

                } catch (error) {
                    console.error("Hesap silme hatası: ", error);
                    let errorMessageText = `Hesap silinirken bir hata oluştu: ${error.message}`;
                    if (error.code === 'auth/requires-recent-login') {
                        errorMessageText = 'Güvenlik nedeniyle, bu işlemi gerçekleştirmek için yakın zamanda giriş yapmış olmanız gerekmektedir. Lütfen tekrar giriş yapıp deneyin.';
                    }
                    deleteAccountMessage.textContent = errorMessageText;
                    deleteAccountMessage.className = 'message-box error-message';
                    deleteAccountMessage.style.display = 'block';
                }
            }
        });
    }

    const handleLogout = () => auth.signOut();
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutBtnProfile) logoutBtnProfile.addEventListener('click', handleLogout);
});