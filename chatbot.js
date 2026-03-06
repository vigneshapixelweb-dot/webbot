// Configuration - update this with your deployed backend URL
const API_BASE_URL = 'https://demobot-kdmw.onrender.com';
const CHAT_API_URL = `${API_BASE_URL}/api/chat`;
const TICKET_API_URL = `${API_BASE_URL}/api/tickets`;
const USER_ID_STORAGE_KEY = 'bitlon_web_user_id';
const MIN_MESSAGES_FOR_TICKET = 10;
const SUPPORT_INTENT_REGEX = /(live\s*chat|contact\s*support|support)/i;

const userId = getOrCreateUserId();
const conversationHistory = [];

let pendingTicketContext = null;
let isCreatingTicket = false;
let supportRequested = false;
let supportKeywordTriggered = false;

let ticketCenterOpen = false;
let userTickets = [];
let selectedTicket = null;
let isSendingTicketMessage = false;

function getOrCreateUserId() {
    try {
        const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
        if (existing) {
            return existing;
        }

        const generated = 'web_' + Date.now();
        window.localStorage.setItem(USER_ID_STORAGE_KEY, generated);
        return generated;
    } catch (_error) {
        return 'web_' + Date.now();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function formatTicketMessage(text) {
    const normalized = String(text || '')
        .replace(/\r\n/g, '\n')
        .trim()
        .replace(/\n{3,}/g, '\n\n');

    return escapeHtml(normalized).replace(/\n/g, '<br>');
}

function formatDate(value) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString();
}

function toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');

    if (!container || !toggle) return;

    container.classList.toggle('active');
    toggle.classList.toggle('active');
}

function openChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');

    if (!container || !toggle) return;

    container.classList.add('active');
    toggle.classList.add('active');
}

function addMessage(text, isUser) {
    const messagesDiv = document.getElementById('chatbot-messages');
    if (!messagesDiv) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = String(text || '').replace(/\n/g, '<br>');

    messageDiv.appendChild(bubble);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTyping() {
    const messagesDiv = document.getElementById('chatbot-messages');
    if (!messagesDiv) return;

    const typing = document.createElement('div');
    typing.className = 'message bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = '<div class="message-bubble">...</div>';
    messagesDiv.appendChild(typing);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

function setTicketPanelActive(isActive) {
    const panel = document.getElementById('ticket-panel');
    if (!panel) return;

    if (isActive) {
        panel.classList.add('active');
    } else {
        panel.classList.remove('active');
    }
}

function setTicketStatus(message, isError = false) {
    const ticketStatus = document.getElementById('ticket-status');
    if (!ticketStatus) return;

    ticketStatus.textContent = message;
    ticketStatus.style.color = isError ? '#b91c1c' : '#0f766e';
}

function setCreateTicketEnabled(isEnabled) {
    const createButton = document.querySelector('.ticket-btn');
    if (createButton) {
        createButton.disabled = !isEnabled;
    }
}

function setTicketButtonActive(isActive) {
    const button = document.getElementById('chatbot-ticket-btn');
    if (!button) return;

    if (isActive) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}

function getConversationMessageCount() {
    return conversationHistory.length;
}

function hasSupportIntent(text) {
    return SUPPORT_INTENT_REGEX.test(text || '');
}

function updateSupportVisibility() {
    const supportRow = document.getElementById('support-request-row');
    if (!supportRow) return;

    if (ticketCenterOpen) {
        supportRow.classList.add('hidden');
        return;
    }

    const supportUnlocked = (
        getConversationMessageCount() >= MIN_MESSAGES_FOR_TICKET || supportKeywordTriggered
    );

    if (supportUnlocked && !supportRequested) {
        supportRow.classList.remove('hidden');
    } else {
        supportRow.classList.add('hidden');
    }
}

function clearTicketUI() {
    const summaryInput = document.getElementById('ticket-summary');
    if (summaryInput) summaryInput.value = '';

    setTicketStatus('');
    setTicketPanelActive(false);
    setCreateTicketEnabled(false);
}

function canShowTicketPanel() {
    return !!pendingTicketContext && supportRequested && !ticketCenterOpen;
}

function updateSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('chatbot-suggestions');
    if (!suggestionsDiv) return;

    if (suggestions && suggestions.length > 0) {
        suggestionsDiv.innerHTML = suggestions.map((suggestion) =>
            `<button class="suggestion" onclick='sendSuggestion(${JSON.stringify(suggestion)})'>${escapeHtml(suggestion)}</button>`
        ).join('');
    }
}

function requestSupport() {
    const supportUnlocked = (
        getConversationMessageCount() >= MIN_MESSAGES_FOR_TICKET || supportKeywordTriggered
    );

    if (!supportUnlocked) {
        return;
    }

    supportRequested = true;
    updateSupportVisibility();

    if (!pendingTicketContext) {
        setTicketPanelActive(true);
        setTicketStatus('Support requested. Send one message and wait for AI reply to create a ticket.');
        setCreateTicketEnabled(false);
        return;
    }

    setTicketPanelActive(true);
    setCreateTicketEnabled(true);
    setTicketStatus('Support requested. You can now create a ticket.');
}

function setChatSectionsHidden(isHidden) {
    const ids = [
        'chatbot-messages',
        'chatbot-suggestions',
        'support-request-row',
        'ticket-panel',
        'chatbot-input-row',
    ];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        if (isHidden) {
            el.classList.add('hidden');
        } else {
            el.classList.remove('hidden');
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    addMessage(text, true);
    input.value = '';

    conversationHistory.push({
        role: 'user',
        content: text,
    });

    if (hasSupportIntent(text)) {
        supportKeywordTriggered = true;
    }

    updateSupportVisibility();

    pendingTicketContext = null;
    setTicketPanelActive(false);
    setCreateTicketEnabled(false);
    setTicketStatus('');

    showTyping();

    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: conversationHistory,
                userId,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const data = await response.json();

        hideTyping();
        addMessage(data.message, false);

        conversationHistory.push({
            role: 'assistant',
            content: data.message,
        });

        updateSupportVisibility();

        pendingTicketContext = {
            lastUserMessage: text,
            lastAiMessage: data.message,
        };

        const showPanel = canShowTicketPanel();
        setTicketPanelActive(showPanel);
        setCreateTicketEnabled(showPanel);
        setTicketStatus('');

        if (data.suggestions) {
            updateSuggestions(data.suggestions);
        }
    } catch (error) {
        hideTyping();
        addMessage('Sorry, I\'m having trouble connecting. Please try again.', false);
        console.error('Chat error:', error);
    }
}

async function raiseTicket() {
    if (isCreatingTicket || !pendingTicketContext || !canShowTicketPanel()) {
        return;
    }

    const summaryInput = document.getElementById('ticket-summary');
    const createButton = document.querySelector('.ticket-btn');
    const issueSummary = summaryInput ? summaryInput.value.trim() : '';

    isCreatingTicket = true;
    if (createButton) createButton.disabled = true;
    setTicketStatus('Creating ticket...');

    try {
        const response = await fetch(TICKET_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                source: 'website',
                issueSummary: issueSummary || undefined,
                lastUserMessage: pendingTicketContext.lastUserMessage,
                lastAiMessage: pendingTicketContext.lastAiMessage,
                messages: conversationHistory,
            }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            let parsedError = '';

            try {
                const parsed = JSON.parse(responseText);
                parsedError = parsed.error || parsed.message || '';
            } catch (_error) {
                parsedError = responseText;
            }

            if (response.status === 404) {
                throw new Error('Tickets API is not deployed on this backend (404 /api/tickets).');
            }

            throw new Error(parsedError || `Ticket API failed with status ${response.status}`);
        }

        const data = await response.json();
        setTicketStatus(`Ticket created: ${data.ticketCode}`);

        pendingTicketContext = null;
        supportRequested = false;
        setTicketPanelActive(false);
        setCreateTicketEnabled(false);
        updateSupportVisibility();

        if (ticketCenterOpen) {
            await loadTicketList(true);
        }
    } catch (error) {
        console.error('Ticket error:', error);
        const message = error && error.message
            ? error.message
            : 'Unable to create ticket right now. Please try again.';
        setTicketStatus(message, true);
    } finally {
        isCreatingTicket = false;
        if (createButton) createButton.disabled = false;
    }
}

function sendSuggestion(text) {
    const input = document.getElementById('chat-input');
    if (!input) return;

    input.value = text;
    sendMessage();
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function loadTicketList(showLoading = false) {
    const content = document.getElementById('ticket-center-content');
    if (!content) return;

    if (showLoading) {
        content.innerHTML = '<div class="ticket-loading">Loading tickets...</div>';
    }

    try {
        const response = await fetch(`${TICKET_API_URL}/user/${encodeURIComponent(userId)}`);
        if (!response.ok) {
            throw new Error('Unable to load tickets');
        }

        userTickets = await response.json();
        renderTicketList();
    } catch (error) {
        console.error('Load tickets error:', error);
        content.innerHTML = '<div class="ticket-empty">Unable to load tickets right now.</div>';
    }
}

function syncTicketInList(ticket) {
    if (!ticket || !ticket.ticketCode) return;

    const updatedSummary = {
        ticketCode: ticket.ticketCode,
        userId: ticket.userId || userId,
        source: ticket.source || 'website',
        status: ticket.status || 'open',
        issueSummary: ticket.issueSummary || ticket.lastUserMessage || 'No issue summary',
        lastUserMessage: ticket.lastUserMessage || '',
        lastAiMessage: ticket.lastAiMessage || '',
        createdAt: ticket.createdAt || null,
        updatedAt: ticket.updatedAt || new Date().toISOString(),
    };

    const index = userTickets.findIndex((item) => item.ticketCode === updatedSummary.ticketCode);
    if (index >= 0) {
        userTickets[index] = {
            ...userTickets[index],
            ...updatedSummary,
        };
    } else {
        userTickets.unshift(updatedSummary);
    }

    userTickets.sort((a, b) => {
        const aTime = new Date(a.updatedAt || 0).getTime();
        const bTime = new Date(b.updatedAt || 0).getTime();
        return bTime - aTime;
    });
}

function renderTicketList() {
    const content = document.getElementById('ticket-center-content');
    if (!content) return;

    if (!userTickets.length) {
        content.innerHTML = '<div class="ticket-empty">No tickets found yet.</div>';
        return;
    }

    content.innerHTML = userTickets.map((ticket) => {
        const code = ticket.ticketCode || '';
        const isClosed = ticket.status === 'closed';
        const issue = ticket.issueSummary || ticket.lastUserMessage || 'No issue summary';

        return `
            <div class="ticket-card" onclick='openTicketDetail(${JSON.stringify(code)})'>
                <div class="ticket-card-head">
                    <div class="ticket-code">${escapeHtml(code)}</div>
                    <div class="ticket-badge ${isClosed ? 'closed' : 'open'}">${isClosed ? 'Closed' : 'Open'}</div>
                </div>
                <div class="ticket-issue">${escapeHtml(issue)}</div>
                <div class="ticket-meta">Updated: ${escapeHtml(formatDate(ticket.updatedAt))}</div>
            </div>
        `;
    }).join('');
}

async function openTicketDetail(ticketCode) {
    const content = document.getElementById('ticket-center-content');
    if (!content || !ticketCode) return;

    content.innerHTML = '<div class="ticket-loading">Loading ticket chat...</div>';

    try {
        const response = await fetch(`${TICKET_API_URL}/${encodeURIComponent(ticketCode)}?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || 'Unable to load ticket');
        }

        selectedTicket = await response.json();
        renderTicketDetail();
    } catch (error) {
        console.error('Ticket detail error:', error);
        content.innerHTML = '<div class="ticket-empty">Unable to load ticket detail.</div>';
    }
}

function renderTicketDetail() {
    const content = document.getElementById('ticket-center-content');
    const backBtn = document.getElementById('ticket-center-back');
    const title = document.getElementById('ticket-center-title');
    const chatInputRow = document.getElementById('ticket-center-chat-input');

    if (!content || !selectedTicket || !backBtn || !title || !chatInputRow) return;

    backBtn.classList.remove('hidden');
    title.textContent = selectedTicket.ticketCode || 'Ticket Chat';

    const history = Array.isArray(selectedTicket.history) ? selectedTicket.history : [];

    if (!history.length) {
        content.innerHTML = '<div class="ticket-empty">No chat messages in this ticket yet.</div>';
    } else {
        content.innerHTML = `
            <div class="ticket-thread">
                ${history.map((message) => {
                    const role = message.role === 'admin'
                        ? 'admin'
                        : message.role === 'user'
                            ? 'user'
                            : 'assistant';
                    const roleLabel = role === 'admin'
                        ? `Admin${message.adminName ? ` (${escapeHtml(message.adminName)})` : ''}`
                        : role === 'user'
                            ? 'You'
                            : 'AI';

                    return `
                        <div class="ticket-thread-msg ${role}">
                            <div class="ticket-thread-role">${roleLabel}</div>
                            <div class="ticket-thread-text">${formatTicketMessage(message.content)}</div>
                            <div class="ticket-thread-time">${escapeHtml(formatDate(message.timestamp))}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    if (selectedTicket.status === 'closed') {
        chatInputRow.classList.add('hidden');
        content.innerHTML += '<div class="ticket-closed-note">This ticket is closed. You can view chat history only.</div>';
    } else {
        chatInputRow.classList.remove('hidden');
    }

    requestAnimationFrame(() => {
        content.scrollTop = content.scrollHeight;
    });
}

function backToTicketList() {
    selectedTicket = null;

    const backBtn = document.getElementById('ticket-center-back');
    const title = document.getElementById('ticket-center-title');
    const chatInputRow = document.getElementById('ticket-center-chat-input');

    if (backBtn) backBtn.classList.add('hidden');
    if (title) title.textContent = 'My Tickets';
    if (chatInputRow) chatInputRow.classList.add('hidden');

    renderTicketList();
}

async function sendTicketMessage() {
    const input = document.getElementById('ticket-chat-input');
    if (!input || !selectedTicket || isSendingTicketMessage) return;

    const text = input.value.trim();
    if (!text) return;

    if (selectedTicket.status === 'closed') {
        return;
    }

    isSendingTicketMessage = true;

    try {
        const response = await fetch(`${TICKET_API_URL}/${encodeURIComponent(selectedTicket.ticketCode)}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                message: text,
            }),
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || 'Unable to send ticket message');
        }

        const data = await response.json();
        selectedTicket = data.ticket;
        input.value = '';
        renderTicketDetail();
        syncTicketInList(data.ticket);
    } catch (error) {
        console.error('Ticket chat send error:', error);
        alert(error.message || 'Unable to send message right now.');
    } finally {
        isSendingTicketMessage = false;
    }
}

function handleTicketChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendTicketMessage();
    }
}

async function openTicketCenter() {
    ticketCenterOpen = true;
    setTicketButtonActive(true);

    const center = document.getElementById('ticket-center');
    if (center) center.classList.remove('hidden');

    setChatSectionsHidden(true);
    clearTicketUI();

    selectedTicket = null;

    const backBtn = document.getElementById('ticket-center-back');
    const title = document.getElementById('ticket-center-title');
    const chatInputRow = document.getElementById('ticket-center-chat-input');

    if (backBtn) backBtn.classList.add('hidden');
    if (title) title.textContent = 'My Tickets';
    if (chatInputRow) chatInputRow.classList.add('hidden');

    await loadTicketList(true);
}

function closeTicketCenter() {
    ticketCenterOpen = false;
    selectedTicket = null;

    setTicketButtonActive(false);

    const center = document.getElementById('ticket-center');
    if (center) center.classList.add('hidden');

    setChatSectionsHidden(false);
    updateSupportVisibility();

    const showPanel = canShowTicketPanel();
    setTicketPanelActive(showPanel);
    setCreateTicketEnabled(showPanel);
}

function toggleTicketCenter() {
    if (ticketCenterOpen) {
        closeTicketCenter();
        return;
    }

    openTicketCenter();
}

async function refreshTicketCenter() {
    if (!ticketCenterOpen) return;

    if (selectedTicket && selectedTicket.ticketCode) {
        await openTicketDetail(selectedTicket.ticketCode);
    } else {
        await loadTicketList(true);
    }
}

const chatbotToggle = document.getElementById('chatbot-toggle');
if (chatbotToggle) {
    chatbotToggle.addEventListener('click', toggleChatbot);
}

window.addEventListener('DOMContentLoaded', () => {
    openChatbot();
    updateSupportVisibility();
});
