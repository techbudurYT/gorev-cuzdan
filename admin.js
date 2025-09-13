document.addEventListener('DOMContentLoaded', () => {
    const addTaskForm = document.getElementById('add-task-form');
    const successMessage = document.getElementById('success-message');
    const logoutBtn = document.getElementById('logout-btn');

    // Admin kontrolü
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (!doc.exists || !doc.data().isAdmin) {
                    // Kullanıcı admin değilse ana sayfaya yönlendir
                    alert("Bu alana erişim yetkiniz yok.");
                    window.location.href = 'my-tasks.html';
                }
            });
        } else {
            // Giriş yapılmamışsa login sayfasına yönlendir
            window.location.href = 'login.html';
        }
    });

    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const reward = parseFloat(document.getElementById('task-reward').value);
        const icon = document.getElementById('task-icon').value;

        db.collection('tasks').add({
            title: title,
            description: description,
            reward: reward,
            icon: icon,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            successMessage.textContent = 'Görev başarıyla eklendi!';
            addTaskForm.reset();
            setTimeout(() => successMessage.textContent = '', 3000);
        })
        .catch(error => {
            console.error("Görev ekleme hatası: ", error);
            successMessage.textContent = 'Bir hata oluştu.';
            successMessage.style.color = 'red';
        });
    });
    
    logoutBtn.addEventListener('click', () => auth.signOut());
});