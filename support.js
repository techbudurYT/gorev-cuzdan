
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
        }
    }

    async function checkAdminStatus(uid) {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().isAdmin) {
            adminPanelLink.style.display = 'block';
        }
    }

    // Function to render messages in the chat UI
    function renderConversationMessages(messages, requesterUid) {
        conversationMessageList.innerHTML = '';
        if (!messages || messages.length === 0) {
            conversationMessageList.innerHTML = '<p class="info-message">Henüz mesaj yok.</p>';
            return;
        }

        messages.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble ${msg.senderId === requesterUid ? 'user-message' : 'admin-message'}`;
            
            const senderName = msg.senderName || (msg.senderId === requesterUid ? currentUserData.username || currentUser.email : 'Destek Ekibi');
            const timestamp = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Tarih Yok';

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
        ticketConversationPanel.classList.remove('content-hidden');
        userTicketsList.closest('.admin-section').classList.add('content-hidden'); // Hide the ticket list section
        supportForm.closest('.admin-section').classList.add('content-hidden'); // Hide the create new ticket section

        if (status === 'closed') {
            userReplyMessageInput.disabled = true;
            sendUserReplyBtn.disabled = true;
            conversationMessage.textContent = 'Bu talep kapatılmıştır. Yeni mesaj gönderemezsiniz.';
            conversationMessage.className = 'info-message';
        } else {
            userReplyMessageInput.disabled = false;
            sendUserReplyBtn.disabled = false;
            conversationMessage.textContent = '';
        }
    }

    // Function to hide conversation panel and show ticket list
    backToTicketsBtn.addEventListener('click', () => {
        ticketConversationPanel.classList.add('content-hidden');
        userTicketsList.closest('.admin-section').classList.remove('content-hidden');
        supportForm.closest('.admin-section').classList.remove('content-hidden');
        activeTicketId = null;
        conversationMessage.textContent = '';
        loadUserTickets(); // Reload tickets in case status changed
    });

    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const subject = document.getElementById('support-subject').value;
        const message = document.getElementById('support-message').value;
        
        if (!currentUser || !currentUserData) {
            formMessage.textContent = 'Lütfen önce giriş yapın ve kullanıcı verilerinizin yüklendiğinden emin olun.';
            formMessage.className = 'error-message';
            return;
        }

        formMessage.textContent = 'Talep gönderiliyor...';
        formMessage.className = 'info-message';

        try {
            await db.collection('tickets').add({
                uid: currentUser.uid,
                email: currentUser.email,
                username: currentUserData.username, // Store username for easier display
                subject: subject,
                status: 'open', // open, closed
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                messages: [{ // Store initial message in an array
                    senderId: currentUser.uid,
                    senderName: currentUserData.username || currentUser.email,
                    message: message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }]
            })
            .then(() => {
                supportForm.reset();
                formMessage.textContent = 'Destek talebiniz başarıyla gönderildi!';
                formMessage.className = 'success-message';
                loadUserTickets(); // Reload tickets to show the new one
                setTimeout(() => formMessage.textContent = '', 4000);
            })

        } catch (error) {
            console.error("Destek talebi hatası: ", error);
            formMessage.textContent = 'Talep gönderilirken bir hata oluştu.';
            formMessage.className = 'error-message';
        }
    });

    sendUserReplyBtn.addEventListener('click', async () => {
        const replyText = userReplyMessageInput.value.trim();
        if (!replyText || !currentUser || !activeTicketId || !currentUserData) {
            conversationMessage.textContent = 'Lütfen bir mesaj yazın ve giriş yaptığınızdan emin olun.';
            conversationMessage.className = 'error-message';
            return;
        }

        conversationMessage.textContent = 'Mesaj gönderiliyor...';
        conversationMessage.className = 'info-message';
        sendUserReplyBtn.disabled = true;
        userReplyMessageInput.disabled = true;

        try {
            const ticketDocRef = db.collection('tickets').doc(activeTicketId);
            const doc = await ticketDocRef.get();
            if (!doc.exists) throw new Error("Talep bulunamadı.");

            const ticketData = doc.data();
            const updatedMessages = [...(ticketData.messages || []), {
                senderId: currentUser.uid,
                senderName: currentUserData.username || currentUser.email,
                message: replyText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }];

            await ticketDocRef.update({ messages: updatedMessages });

            userReplyMessageInput.value = '';
            conversationMessage.textContent = 'Mesaj başarıyla gönderildi!';
            conversationMessage.className = 'success-message';
            setTimeout(() => conversationMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Mesaj gönderme hatası: ", error);
            conversationMessage.textContent = `Hata: ${error.message}`;
            conversationMessage.className = 'error-message';
        } finally {
            sendUserReplyBtn.disabled = false;
            userReplyMessageInput.disabled = false;
        }
    });

    async function loadUserTickets() {
        if (!currentUser) {
            userTicketsLoading.textContent = 'Giriş yapınız.';
            return;
        }
        userTicketsList.innerHTML = '';
        userTicketsLoading.textContent = 'Talepleriniz yükleniyor...';
        userTicketsLoading.style.display = 'block';

        try {
            const snapshot = await db.collection('tickets')
                                     .where('uid', '==', currentUser.uid)
                                     .orderBy('createdAt', 'desc')
                                     .get();
            
            userTicketsLoading.style.display = 'none';

            if (snapshot.empty) {
                userTicketsList.innerHTML = '<p class="info-message">Henüz bir destek talebiniz bulunmamaktadır.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const ticket = doc.data();
                const ticketId = doc.id;
                const statusText = ticket.status === 'open' ? 'Açık' : 'Kapalı';
                const statusClass = ticket.status === 'open' ? 'btn-info' : 'btn-secondary'; // Assuming btn-secondary for closed

                const ticketItem = document.createElement('div');
                ticketItem.className = 'support-ticket-item'; // New class for styling
                ticketItem.innerHTML = `
                    <div class="ticket-item-header">
                        <h4>${ticket.subject}</h4>
                        <span class="btn-small ${statusClass}">${statusText}</span>
                    </div>
                    <p class="ticket-last-message">Son mesaj: ${(ticket.messages && ticket.messages.length > 0) ? ticket.messages[ticket.messages.length - 1].message : 'Yok'}</p>
                    <button class="btn-primary-landing btn-small view-ticket-btn" data-id="${ticketId}" data-subject="${ticket.subject}" data-status="${ticket.status}">Görüntüle</button>
                `;
                userTicketsList.appendChild(ticketItem);
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
            userTicketsLoading.textContent = 'Talepleriniz yüklenirken bir hata oluştu.';
            userTicketsLoading.className = 'error-message';
            userTicketsLoading.style.display = 'block';
        }
    }

    logoutBtn.addEventListener('click', () => auth.signOut());
});