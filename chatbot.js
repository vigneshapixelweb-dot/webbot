// Configuration - UPDATE THIS with your Render URL
const API_URL = 'https://demobot-kdmw.onrender.com/api/chat';
const userId = 'web_' + Date.now();
const conversationHistory = [];

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
        content: text
    });
    
    // Show typing
    showTyping();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory,
                userId: userId
            })
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
            content: data.message
        });
        
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
