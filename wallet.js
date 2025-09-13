document.addEventListener('DOMContentLoaded', () => {
    const walletBalance = document.getElementById('wallet-balance');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');


    auth.onAuthStateChanged(user => {
        if (user) {
            loadWalletData(user.uid);
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

    async function loadWalletData(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
            const userData = doc.data();
            if (walletBalance) {
                walletBalance.textContent = `${userData.balance.toFixed(2)} ₺`;
            }

            if (userData.isAdmin) {
                if (adminPanelLink) {
                    adminPanelLink.style.display = 'block';
                }
            }
        } else {
            console.error("Kullanıcı verisi bulunamadı!");
        }
    }
    

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});