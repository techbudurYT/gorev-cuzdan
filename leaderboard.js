document.addEventListener('DOMContentLoaded', () => {
    const leaderboardBody = document.getElementById('leaderboard-body');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');

    auth.onAuthStateChanged(user => {
        if (user) {
            checkAdminStatus(user.uid);
            loadLeaderboard();
        } else {
            window.location.href = 'login.html';
        }
    });

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            adminPanelLink.style.display = 'block';
        }
    }

    async function loadLeaderboard() {
        leaderboardBody.innerHTML = '<tr><td colspan="3">Yükleniyor...</td></tr>';

        try {
            const snapshot = await db.collection('users')
                                     .orderBy('completedTasks', 'desc')
                                     .limit(20)
                                     .get();

            if (snapshot.empty) {
                leaderboardBody.innerHTML = '<tr><td colspan="3">Veri bulunamadı.</td></tr>';
                return;
            }

            leaderboardBody.innerHTML = '';
            let rank = 1;
            snapshot.forEach(doc => {
                const userData = doc.data();
                const username = userData.username || 'isimsiz'; // Kullanıcı adı varsa onu, yoksa 'isimsiz' göster

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="rank rank-${rank}">${rank}</span></td>
                    <td>${username}</td>
                    <td>${userData.completedTasks}</td>
                `;
                leaderboardBody.appendChild(row);
                rank++;
            });

        } catch (error) {
            console.error("Liderlik tablosu yüklenirken hata oluştu: ", error);
            leaderboardBody.innerHTML = '<tr><td colspan="3">Liderlik tablosu yüklenemedi.</td></tr>';
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});