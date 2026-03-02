// Configuration - update this with your deployed backend URL
const API_BASE_URL = 'https://demobot-kdmw.onrender.com';
const CHAT_API_URL = `${API_BASE_URL}/api/chat`;
const TICKET_API_URL = `${API_BASE_URL}/api/tickets`;
const userId = 'web_' + Date.now();
const conversationHistory = [];
let pendingTicketContext = null;
let isCreatingTicket = false;

// Toggle chatbot
function toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');

    container.classList.toggle('active');
    toggle.classList.toggle('active');
}

// Open chatbot (used for auto-open on page load)
function openChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    if (!container || !toggle) return;
    container.classList.add('active');
    toggle.classList.add('active');
}

// Add message to chat
function addMessage(text, isUser) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');

    messageDiv.appendChild(bubble);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Show typing indicator
function showTyping() {
    const messagesDiv = document.getElementById('chatbot-messages');
    const typing = document.createElement('div');
    typing.className = 'message bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = '<div class="message-bubble">...</div>';
    messagesDiv.appendChild(typing);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Hide typing indicator
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

function clearTicketUI() {
    const summaryInput = document.getElementById('ticket-summary');
    if (summaryInput) summaryInput.value = '';
    setTicketStatus('');
    setTicketPanelActive(false);
}

// Update suggestions
function updateSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('chatbot-suggestions');
    if (suggestions && suggestions.length > 0) {
        suggestionsDiv.innerHTML = suggestions.map(s =>
            `<button class="suggestion" onclick="sendSuggestion('${s}')">${s}</button>`
        ).join('');
    }
}

// Send message
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    if (!text) return;

    // Add user message
    addMessage(text, true);
    input.value = '';

    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: text,
    });

    pendingTicketContext = null;
    clearTicketUI();

    // Show typing
    showTyping();

    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: conversationHistory,
                userId: userId,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const data = await response.json();

        // Hide typing
        hideTyping();

        // Add AI response
        addMessage(data.message, false);

        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: data.message,
        });

        pendingTicketContext = {
            lastUserMessage: text,
            lastAiMessage: data.message,
        };
        setTicketPanelActive(true);
        setTicketStatus('');

        // Update suggestions
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
    if (isCreatingTicket || !pendingTicketContext) {
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

// Send suggestion
function sendSuggestion(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

// Handle enter key
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Initialize chatbot toggle
document.getElementById('chatbot-toggle').addEventListener('click', toggleChatbot);

// Auto-open when the page loads
window.addEventListener('DOMContentLoaded', openChatbot);
