document.addEventListener('DOMContentLoaded', () => {
    const userEmailDisplay = document.getElementById('user-email');
    const profileBalanceDisplay = document.getElementById('profile-balance');
    const profileTasksCompletedDisplay = document.getElementById('profile-tasks-completed');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnProfile = document.getElementById('logout-btn-profile');

    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user);
        } else {
            window.location.href = 'login.html';
        }
    });

    async function loadUserProfile(user) {
        const userDocRef = db.collection('users').doc(user.uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
            const userData = doc.data();
            userEmailDisplay.textContent = userData.email;
            profileBalanceDisplay.textContent = `${userData.balance.toFixed(2)} ₺`;
            profileTasksCompletedDisplay.textContent = userData.completedTasks;
            
            if(userData.isAdmin) {
                adminPanelLink.style.display = 'block';
            }
        } else {
            console.log("Kullanıcı verisi bulunamadı!");
        }
    }

    const handleLogout = () => auth.signOut();
    
    logoutBtn.addEventListener('click', handleLogout);
    logoutBtnProfile.addEventListener('click', handleLogout);
});
