document.addEventListener('DOMContentLoaded', () => {
    const userDisplayName = document.getElementById('user-display-name');
    const profileBalanceDisplay = document.getElementById('profile-balance');
    const profileTasksCompletedDisplay = document.getElementById('profile-tasks-completed');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnProfile = document.getElementById('logout-btn-profile');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    auth.onAuthStateChanged(user => {
        if (user) {
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
            const userData = doc.data();
            if (userDisplayName) userDisplayName.textContent = userData.username || userData.email;
            if (profileBalanceDisplay) profileBalanceDisplay.textContent = `${userData.balance.toFixed(2)} ₺`;
            if (profileTasksCompletedDisplay) profileTasksCompletedDisplay.textContent = userData.completedTasks;
            
            if(userData.isAdmin) {
                if (adminPanelLink) adminPanelLink.style.display = 'block';
            }
        } else {
            console.log("Kullanıcı verisi bulunamadı!");
        }
    }

    const handleLogout = () => auth.signOut();
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutBtnProfile) logoutBtnProfile.addEventListener('click', handleLogout);
});