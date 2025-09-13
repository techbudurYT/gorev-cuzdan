document.addEventListener('DOMContentLoaded', () => {
    const initialLoadingMessage = document.getElementById('initial-loading-message');
    const ticketCard = document.getElementById('ticket-card');
    const ticketSubject = document.getElementById('ticket-subject');
    const ticketRequester = document.getElementById('ticket-requester');
    const ticketStatus = document.getElementById('ticket-status');
    const messageList = document.getElementById('message-list');
    const adminReplyMessageInput = document.getElementById('admin-reply-message');
    const sendReplyBtn = document.getElementById('send-reply-btn');
    const closeTicketBtn = document.getElementById('close-ticket-btn');
    const ticketMessage = document.getElementById('ticket-message');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');

    let currentTicketId = null;
    let currentUser = null;
    let currentAdminData = null;

    const urlParams = new URLSearchParams(window.location.search);
    currentTicketId = urlParams.get('ticketId');

    if (!currentTicketId) {
        if (initialLoadingMessage) {
            initialLoadingMessage.textContent = 'Talep bulunamadı. Lütfen geçerli bir talep seçin.';
            initialLoadingMessage.className = 'error-message';
        }
        if (ticketCard) ticketCard.classList.add('content-hidden');
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            checkAdminStatus(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            currentAdminData = doc.data();
            if (adminPanelLink) adminPanelLink.style.display = 'block';
            loadTicketDetails(currentTicketId);
        } else {
            alert("Bu alana erişim yetkiniz yok.");
            window.location.href = 'my-tasks.html';
        }
    }

    async function loadTicketDetails(ticketId) {
        if (initialLoadingMessage) {
            initialLoadingMessage.textContent = 'Talep detayları yükleniyor...';
            initialLoadingMessage.className = 'info-message';
            initialLoadingMessage.style.display = 'block';
        }
        if (ticketCard) ticketCard.classList.add('content-hidden');

        try {
            const ticketDocRef = db.collection('tickets').doc(ticketId);
            ticketDocRef.onSnapshot(docSnapshot => { // Real-time updates
                if (docSnapshot.exists) {
                    const ticketData = docSnapshot.data();
                    if (initialLoadingMessage) initialLoadingMessage.style.display = 'none';
                    if (ticketCard) ticketCard.classList.remove('content-hidden');

                    ticketSubject.textContent = ticketData.subject;
                    ticketRequester.textContent = ticketData.username || ticketData.email;
                    ticketStatus.textContent = ticketData.status === 'open' ? 'Açık' : 'Kapalı';

                    renderMessages(ticketData.messages, ticketData.uid);

                    if (ticketData.status === 'closed') {
                        adminReplyMessageInput.disabled = true;
                        sendReplyBtn.disabled = true;
                        closeTicketBtn.disabled = true;
                        ticketMessage.textContent = 'Bu talep kapatılmıştır.';
                        ticketMessage.className = 'info-message';
                    } else {
                        adminReplyMessageInput.disabled = false;
                        sendReplyBtn.disabled = false;
                        closeTicketBtn.disabled = false;
                        ticketMessage.textContent = '';
                    }
                } else {
                    if (initialLoadingMessage) {
                        initialLoadingMessage.textContent = 'Talep bulunamadı.';
                        initialLoadingMessage.className = 'error-message';
                    }
                    if (ticketCard) ticketCard.classList.add('content-hidden');
                }
            });

        } catch (error) {
            console.error("Talep detayları yüklenirken hata oluştu: ", error);
            if (initialLoadingMessage) {
                initialLoadingMessage.textContent = `Talep detayları yüklenemedi: ${error.message}`;
                initialLoadingMessage.className = 'error-message';
                initialLoadingMessage.style.display = 'block';
            }
            if (ticketCard) ticketCard.classList.add('content-hidden');
        }
    }

    function renderMessages(messages, requesterUid) {
        messageList.innerHTML = '';
        if (!messages || messages.length === 0) {
            messageList.innerHTML = '<p class="info-message">Henüz mesaj yok.</p>';
            return;
        }

        messages.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble ${msg.senderId === requesterUid ? 'user-message' : 'admin-message'}`;
            
            const senderName = msg.senderName || (msg.senderId === requesterUid ? 'Kullanıcı' : 'Admin');
            const timestamp = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Tarih Yok';

            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <p class="message-text">${msg.message}</p>
            `;
            messageList.appendChild(messageDiv);
        });
        messageList.scrollTop = messageList.scrollHeight; // Scroll to bottom
    }

    sendReplyBtn.addEventListener('click', async () => {
        const replyText = adminReplyMessageInput.value.trim();
        if (!replyText || !currentUser || !currentTicketId || !currentAdminData) {
            ticketMessage.textContent = 'Lütfen bir mesaj yazın ve giriş yaptığınızdan emin olun.';
            ticketMessage.className = 'error-message';
            return;
        }

        ticketMessage.textContent = 'Cevap gönderiliyor...';
        ticketMessage.className = 'info-message';
        sendReplyBtn.disabled = true;
        adminReplyMessageInput.disabled = true;

        try {
            const ticketDocRef = db.collection('tickets').doc(currentTicketId);
            const doc = await ticketDocRef.get();
            if (!doc.exists) throw new Error("Talep bulunamadı.");

            const ticketData = doc.data();
            const updatedMessages = [...(ticketData.messages || []), {
                senderId: currentUser.uid,
                senderName: currentAdminData.username || currentUser.email,
                message: replyText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }];

            await ticketDocRef.update({ messages: updatedMessages });

            adminReplyMessageInput.value = '';
            ticketMessage.textContent = 'Cevap başarıyla gönderildi!';
            ticketMessage.className = 'success-message';
            setTimeout(() => ticketMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Cevap gönderme hatası: ", error);
            ticketMessage.textContent = `Hata: ${error.message}`;
            ticketMessage.className = 'error-message';
        } finally {
            sendReplyBtn.disabled = false;
            adminReplyMessageInput.disabled = false;
        }
    });

    closeTicketBtn.addEventListener('click', async () => {
        if (!confirm('Bu destek talebini kapatmak istediğinize emin misiniz?')) return;

        ticketMessage.textContent = 'Kapatılıyor...';
        ticketMessage.className = 'info-message';
        closeTicketBtn.disabled = true;
        sendReplyBtn.disabled = true;
        adminReplyMessageInput.disabled = true;

        try {
            await db.collection('tickets').doc(currentTicketId).update({
                status: 'closed',
                closedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            ticketMessage.textContent = 'Destek talebi başarıyla kapatıldı!';
            ticketMessage.className = 'success-message';
            setTimeout(() => {
                window.location.href = 'admin-panel.html'; // Yönlendirme
            }, 2000);

        } catch (error) {
            console.error("Destek talebi kapatılırken hata oluştu: ", error);
            ticketMessage.textContent = `Hata: ${error.message}`;
            ticketMessage.className = 'error-message';
        } finally {
            closeTicketBtn.disabled = false;
            sendReplyBtn.disabled = false;
            adminReplyMessageInput.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', () => auth.signOut());
});