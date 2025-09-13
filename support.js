
document.addEventListener('DOMContentLoaded', () => {
    const supportForm = document.getElementById('support-form');
    const formMessage = document.getElementById('form-message');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const logoutBtn = document.getElementById('logout-btn');
    const userTicketsList = document.getElementById('user-tickets-list');
    const userTicketsLoading = document.getElementById('user-tickets-loading');
    const ticketConversationPanel = document.getElementById('ticket-conversation-panel');
    const conversationSubject = document.getElementById('conversation-subject');
    const conversationMessageList = document.getElementById('conversation-message-list');
    const userReplyMessageInput = document.getElementById('user-reply-message');
    const sendUserReplyBtn = document.getElementById('send-user-reply-btn');
    const backToTicketsBtn = document.getElementById('back-to-tickets-btn');
    const conversationMessage = document.getElementById('conversation-message');


    let currentUser = null;
    let currentUserData = null; // Store user data for senderName
    let activeTicketId = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData(user.uid);
            checkAdminStatus(user.uid);
            loadUserTickets();
        } else {
            window.location.href = 'login.html';
        }
    });

    async function loadUserData(uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
        } else {
            console.error("Kullanıcı verisi bulunamadı!");
            // Handle case where user data might be missing, e.g., redirect or show error
        }
    }

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            if (adminPanelLink) {
                adminPanelLink.style.display = 'block';
            }
        }
    }

    // Function to render messages in the chat UI
    function renderConversationMessages(messages, requesterUid) {
        conversationMessageList.innerHTML = '';
        if (!messages || messages.length === 0) {
            conversationMessageList.innerHTML = '<p class="info-message">Henüz mesaj yok.</p>';
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
            
            const senderName = msg.senderName || (msg.senderId === requesterUid ? currentUserData?.username || currentUser?.email || 'Kullanıcı' : 'Destek Ekibi');
            const timestamp = msg.timestamp && typeof msg.timestamp.toDate === 'function' ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Tarih Yok';

            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <p class="message-text">${msg.message}</p>
            `;
            conversationMessageList.appendChild(messageDiv);
        });
        conversationMessageList.scrollTop = conversationMessageList.scrollHeight; // Scroll to bottom
    }

    // Function to show conversation panel and hide ticket list
    function showConversationPanel(ticketId, subject, messages, requesterUid, status) {
        activeTicketId = ticketId;
        conversationSubject.textContent = subject;
        renderConversationMessages(messages, requesterUid);
        if (ticketConversationPanel) ticketConversationPanel.classList.remove('content-hidden');
        if (userTicketsList.closest('.admin-section')) userTicketsList.closest('.admin-section').classList.add('content-hidden'); // Hide the ticket list section
        if (supportForm.closest('.admin-section')) supportForm.closest('.admin-section').classList.add('content-hidden'); // Hide the create new ticket section

        if (status === 'closed') {
            if (userReplyMessageInput) userReplyMessageInput.disabled = true;
            if (sendUserReplyBtn) sendUserReplyBtn.disabled = true;
            if (conversationMessage) {
                conversationMessage.textContent = 'Bu talep kapatılmıştır. Yeni mesaj gönderemezsiniz.';
                conversationMessage.className = 'info-message';
            }
        } else {
            if (userReplyMessageInput) userReplyMessageInput.disabled = false;
            if (sendUserReplyBtn) sendUserReplyBtn.disabled = false;
            if (conversationMessage) conversationMessage.textContent = '';
        }
    }

    // Function to hide conversation panel and show ticket list
    if (backToTicketsBtn) {
        backToTicketsBtn.addEventListener('click', () => {
            if (ticketConversationPanel) ticketConversationPanel.classList.add('content-hidden');
            if (userTicketsList.closest('.admin-section')) userTicketsList.closest('.admin-section').classList.remove('content-hidden');
            if (supportForm.closest('.admin-section')) supportForm.closest('.admin-section').classList.remove('content-hidden');
            activeTicketId = null;
            if (conversationMessage) conversationMessage.textContent = '';
            loadUserTickets(); // Reload tickets in case status changed
        });
    }

    if (supportForm) {
        supportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subject = document.getElementById('support-subject')?.value.trim();
            const message = document.getElementById('support-message')?.value.trim();
            
            if (!currentUser || !currentUserData) {
                if (formMessage) {
                    formMessage.textContent = 'Lütfen önce giriş yapın ve kullanıcı verilerinizin yüklendiğinden emin olun.';
                    formMessage.className = 'error-message';
                }
                return;
            }
            if (!subject || !message) {
                if (formMessage) {
                    formMessage.textContent = 'Lütfen konu ve mesaj alanlarını doldurun.';
                    formMessage.className = 'error-message';
                }
                return;
            }

            if (formMessage) {
                formMessage.textContent = 'Talep gönderiliyor...';
                formMessage.className = 'info-message';
            }

            try {
                // Firebase'in FieldValue.serverTimestamp() 'ı doğrudan bir dizinin içine kabul etmediği için,
                // timestamp'ı istemci tarafında Date objesi olarak oluşturup Firestore'a gönderiyoruz.
                // Firestore bunu otomatik olarak sunucu zaman damgasına dönüştürecektir.
                const initialMessage = {
                    senderId: currentUser.uid,
                    senderName: currentUserData.username || currentUser.email,
                    message: message,
                    timestamp: new Date() // Use client-side date for array element, Firestore converts it
                };

                await db.collection('tickets').add({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    username: currentUserData.username, // Store username for easier display
                    subject: subject,
                    status: 'open', // open, closed
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), // This is fine for top-level field
                    messages: [initialMessage] // Store initial message in an array
                });
                
                if (supportForm) supportForm.reset();
                if (formMessage) {
                    formMessage.textContent = 'Destek talebiniz başarıyla gönderildi!';
                    formMessage.className = 'success-message';
                }
                loadUserTickets(); // Reload tickets to show the new one
                setTimeout(() => { if (formMessage) formMessage.textContent = ''; }, 4000);

            } catch (error) {
                console.error("Destek talebi hatası: ", error);
                if (formMessage) {
                    formMessage.textContent = `Talep gönderilirken bir hata oluştu: ${error.message}`;
                    formMessage.className = 'error-message';
                }
            }
        });
    }

    if (sendUserReplyBtn) {
        sendUserReplyBtn.addEventListener('click', async () => {
            const replyText = userReplyMessageInput.value.trim();
            if (!replyText || !currentUser || !activeTicketId || !currentUserData) {
                if (conversationMessage) {
                    conversationMessage.textContent = 'Lütfen bir mesaj yazın ve giriş yaptığınızdan emin olun.';
                    conversationMessage.className = 'error-message';
                }
                return;
            }

            if (conversationMessage) {
                conversationMessage.textContent = 'Mesaj gönderiliyor...';
                conversationMessage.className = 'info-message';
            }
            if (sendUserReplyBtn) sendUserReplyBtn.disabled = true;
            if (userReplyMessageInput) userReplyMessageInput.disabled = true;

            try {
                const ticketDocRef = db.collection('tickets').doc(activeTicketId);
                const doc = await ticketDocRef.get();
                if (!doc.exists) throw new Error("Talep bulunamadı.");

                const ticketData = doc.data();
                const newMessage = {
                    senderId: currentUser.uid,
                    senderName: currentUserData.username || currentUser.email,
                    message: replyText,
                    timestamp: new Date() // Use client-side date for array element
                };
                const updatedMessages = [...(ticketData.messages || []), newMessage];

                await ticketDocRef.update({ messages: updatedMessages });

                if (userReplyMessageInput) userReplyMessageInput.value = '';
                if (conversationMessage) {
                    conversationMessage.textContent = 'Mesaj başarıyla gönderildi!';
                    conversationMessage.className = 'success-message';
                }
                setTimeout(() => { if (conversationMessage) conversationMessage.textContent = ''; }, 3000);

            } catch (error) {
                console.error("Mesaj gönderme hatası: ", error);
                if (conversationMessage) {
                    conversationMessage.textContent = `Hata: ${error.message}`;
                    conversationMessage.className = 'error-message';
                }
            } finally {
                if (sendUserReplyBtn) sendUserReplyBtn.disabled = false;
                if (userReplyMessageInput) userReplyMessageInput.disabled = false;
            }
        });
    }

    async function loadUserTickets() {
        if (!currentUser) {
            if (userTicketsLoading) userTicketsLoading.textContent = 'Giriş yapınız.';
            return;
        }
        if (userTicketsList) userTicketsList.innerHTML = '';
        if (userTicketsLoading) {
            userTicketsLoading.textContent = 'Talepleriniz yükleniyor...';
            userTicketsLoading.style.display = 'block';
        }

        try {
            const snapshot = await db.collection('tickets')
                                     .where('uid', '==', currentUser.uid)
                                     .orderBy('createdAt', 'desc')
                                     .get();
            
            if (userTicketsLoading) userTicketsLoading.style.display = 'none';

            if (snapshot.empty) {
                if (userTicketsList) userTicketsList.innerHTML = '<p class="info-message">Henüz bir destek talebiniz bulunmamaktadır.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const ticket = doc.data();
                const ticketId = doc.id;
                const statusText = ticket.status === 'open' ? 'Açık' : 'Kapalı';
                const statusClass = ticket.status === 'open' ? 'btn-info' : 'btn-secondary';

                const ticketItem = document.createElement('div');
                ticketItem.className = 'support-ticket-item';
                ticketItem.innerHTML = `
                    <div class="ticket-item-header">
                        <h4>${ticket.subject}</h4>
                        <span class="btn-small ${statusClass}">${statusText}</span>
                    </div>
                    <p class="ticket-last-message">Son mesaj: ${(ticket.messages && ticket.messages.length > 0) ? ticket.messages[ticket.messages.length - 1].message : 'Yok'}</p>
                    <button class="btn-primary-landing btn-small view-ticket-btn" data-id="${ticketId}" data-subject="${ticket.subject}" data-status="${ticket.status}">Görüntüle</button>
                `;
                if (userTicketsList) userTicketsList.appendChild(ticketItem);
            });

            document.querySelectorAll('.view-ticket-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    const subject = e.target.dataset.subject;
                    const status = e.target.dataset.status;

                    const ticketDoc = await db.collection('tickets').doc(id).get();
                    if (ticketDoc.exists) {
                        const ticketData = ticketDoc.data();
                        showConversationPanel(id, subject, ticketData.messages, ticketData.uid, status);
                    }
                });
            });

        } catch (error) {
            console.error("Kullanıcı talepleri yüklenirken hata oluştu: ", error);
            if (userTicketsLoading) {
                userTicketsLoading.textContent = 'Talepleriniz yüklenirken bir hata oluştu.';
                userTicketsLoading.className = 'error-message';
                userTicketsLoading.style.display = 'block';
            }
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});