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
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    let currentTicketId = null;
    let currentUser = null;
    let currentAdminData = null;

    const urlParams = new URLSearchParams(window.location.search);
    currentTicketId = urlParams.get('ticketId');

    if (!currentTicketId) {
        if (initialLoadingMessage) {
            initialLoadingMessage.textContent = 'Talep bulunamadı. Lütfen geçerli bir talep seçin.';
            initialLoadingMessage.className = 'message-box error-message';
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

    // Menü Toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

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
            initialLoadingMessage.className = 'message-box info-message';
            initialLoadingMessage.style.display = 'block';
        }
        if (ticketCard) ticketCard.classList.add('content-hidden');

        try {
            const ticketDocRef = db.collection('tickets').doc(ticketId);
            // Use onSnapshot for real-time updates to messages
            ticketDocRef.onSnapshot(docSnapshot => {
                if (docSnapshot.exists) {
                    const ticketData = docSnapshot.data();
                    if (initialLoadingMessage) initialLoadingMessage.style.display = 'none';
                    if (ticketCard) ticketCard.classList.remove('content-hidden');

                    ticketSubject.textContent = ticketData.subject;
                    ticketRequester.textContent = ticketData.username || ticketData.email;
                    ticketStatus.textContent = ticketData.status === 'open' ? 'Açık' : 'Kapalı';
                    ticketStatus.className = `btn-small ${ticketData.status === 'open' ? 'btn-info' : 'btn-secondary'}`;

                    renderMessages(ticketData.messages, ticketData.uid);

                    if (ticketData.status === 'closed') {
                        if (adminReplyMessageInput) adminReplyMessageInput.disabled = true;
                        if (sendReplyBtn) sendReplyBtn.disabled = true;
                        if (closeTicketBtn) closeTicketBtn.disabled = true;
                        if (ticketMessage) {
                            ticketMessage.textContent = 'Bu talep kapatılmıştır.';
                            ticketMessage.className = 'message-box info-message';
                            ticketMessage.style.display = 'block';
                        }
                    } else {
                        if (adminReplyMessageInput) adminReplyMessageInput.disabled = false;
                        if (sendReplyBtn) sendReplyBtn.disabled = false;
                        if (closeTicketBtn) closeTicketBtn.disabled = false;
                        if (ticketMessage) ticketMessage.textContent = '';
                        if (ticketMessage) ticketMessage.style.display = 'none';
                    }
                } else {
                    if (initialLoadingMessage) {
                        initialLoadingMessage.textContent = 'Talep bulunamadı.';
                        initialLoadingMessage.className = 'message-box error-message';
                        initialLoadingMessage.style.display = 'block';
                    }
                    if (ticketCard) ticketCard.classList.add('content-hidden');
                }
            });

        } catch (error) {
            console.error("Talep detayları yüklenirken hata oluştu: ", error);
            if (initialLoadingMessage) {
                initialLoadingMessage.textContent = `Talep detayları yüklenemedi: ${error.message}`;
                initialLoadingMessage.className = 'message-box error-message';
                initialLoadingMessage.style.display = 'block';
            }
            if (ticketCard) ticketCard.classList.add('content-hidden');
        }
    }

    function renderMessages(messages, requesterUid) {
        if (messageList) messageList.innerHTML = '';
        if (!messages || messages.length === 0) {
            if (messageList) messageList.innerHTML = '<p class="message-box info-message">Henüz mesaj yok.</p>';
            return;
        }

        messages.sort((a, b) => {
            const timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate() : new Date(0);
            const timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate() : new Date(0);
            return timeA - timeB;
        });

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble ${msg.senderId === requesterUid ? 'user-message' : 'admin-message'}`;
            
            const senderName = msg.senderName || (msg.senderId === requesterUid ? 'Kullanıcı' : 'Admin');
            const timestamp = msg.timestamp && typeof msg.timestamp.toDate === 'function' ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Tarih Yok';

            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <p class="message-text">${msg.message}</p>
            `;
            if (messageList) messageList.appendChild(messageDiv);
        });
        if (messageList) messageList.scrollTop = messageList.scrollHeight; // Scroll to bottom
    }

    if (sendReplyBtn) {
        sendReplyBtn.addEventListener('click', async () => {
            const replyText = adminReplyMessageInput.value.trim();
            if (!replyText || !currentUser || !currentTicketId || !currentAdminData) {
                if (ticketMessage) {
                    ticketMessage.textContent = 'Lütfen bir mesaj yazın ve giriş yaptığınızdan emin olun.';
                    ticketMessage.className = 'message-box error-message';
                    ticketMessage.style.display = 'block';
                }
                return;
            }

            if (ticketMessage) {
                ticketMessage.textContent = 'Cevap gönderiliyor...';
                ticketMessage.className = 'message-box info-message';
                ticketMessage.style.display = 'block';
            }
            if (sendReplyBtn) sendReplyBtn.disabled = true;
            if (adminReplyMessageInput) adminReplyMessageInput.disabled = true;

            try {
                const ticketDocRef = db.collection('tickets').doc(currentTicketId);
                const doc = await ticketDocRef.get();
                if (!doc.exists) throw new Error("Talep bulunamadı.");

                const ticketData = doc.data();
                const newMessage = {
                    senderId: currentUser.uid,
                    senderName: currentAdminData.username || currentUser.email,
                    message: replyText,
                    timestamp: new Date() // Use client-side date for array element, Firestore converts it upon update.
                };
                const updatedMessages = [...(ticketData.messages || []), newMessage];

                await ticketDocRef.update({ messages: updatedMessages });

                if (adminReplyMessageInput) adminReplyMessageInput.value = '';
                if (ticketMessage) {
                    ticketMessage.textContent = 'Cevap başarıyla gönderildi!';
                    ticketMessage.className = 'message-box success-message';
                }
                setTimeout(() => { if (ticketMessage) ticketMessage.textContent = ''; if (ticketMessage) ticketMessage.style.display = 'none'; }, 3000);

            } catch (error) {
                console.error("Cevap gönderme hatası: ", error);
                if (ticketMessage) {
                    ticketMessage.textContent = `Hata: ${error.message}`;
                    ticketMessage.className = 'message-box error-message';
                }
            } finally {
                if (sendReplyBtn) sendReplyBtn.disabled = false;
                if (adminReplyMessageInput) adminReplyMessageInput.disabled = false;
            }
        });
    }

    if (closeTicketBtn) {
        closeTicketBtn.addEventListener('click', async () => {
            if (!confirm('Bu destek talebini kapatmak istediğinize emin misiniz?')) return;

            if (ticketMessage) {
                ticketMessage.textContent = 'Kapatılıyor...';
                ticketMessage.className = 'message-box info-message';
                ticketMessage.style.display = 'block';
            }
            if (closeTicketBtn) closeTicketBtn.disabled = true;
            if (sendReplyBtn) sendReplyBtn.disabled = true;
            if (adminReplyMessageInput) adminReplyMessageInput.disabled = true;

            try {
                await db.collection('tickets').doc(currentTicketId).update({
                    status: 'closed',
                    closedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (ticketMessage) {
                    ticketMessage.textContent = 'Destek talebi başarıyla kapatıldı!';
                    ticketMessage.className = 'message-box success-message';
                }
                setTimeout(() => {
                    window.location.href = 'admin-panel.html'; // Yönlendirme
                }, 2000);

            } catch (error) {
                console.error("Destek talebi kapatılırken hata oluştu: ", error);
                if (ticketMessage) {
                    ticketMessage.textContent = `Hata: ${error.message}`;
                    ticketMessage.className = 'message-box error-message';
                }
            } finally {
                if (closeTicketBtn) closeTicketBtn.disabled = false;
                if (sendReplyBtn) sendReplyBtn.disabled = false;
                if (adminReplyMessageInput) adminReplyMessageInput.disabled = false;
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});