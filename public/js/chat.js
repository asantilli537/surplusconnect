/*
  chat.js handles real time messaging for the pickup coordination thread.
  it does two things: sends new messages via fetch() without reloading
  the page (the AJAX submission the course requires), and polls the server
  every 4 seconds to pull in messages from the other party.
*/

const feed          = document.getElementById('message-feed');
const chatForm      = document.getElementById('chat-form');
const messageInput  = document.getElementById('message-input');
const sendBtn       = document.getElementById('chat-send-btn');
const chatError     = document.getElementById('chat-error');
const chatEmpty     = document.getElementById('chat-empty');

if (!feed || !chatForm) {
  // not on the chat page, nothing to do
  throw new Error('chat elements not found');
}

const transactionId = feed.dataset.transactionId;
const currentUser   = feed.dataset.currentUser;
const isReadOnly    = feed.dataset.readonly === 'true';

// tracking the timestamp of the last message we have seen
let lastMessageTime = null;

const getLastTimestamp = () => {
  const bubbles = feed.querySelectorAll('.message-bubble[data-timestamp]');
  if (bubbles.length === 0) return null;
  const last = bubbles[bubbles.length - 1];
  return last.dataset.timestamp;
};

// building a message bubble element from a message object
const buildBubble = (msg) => {
  const isMine = msg.senderId === currentUser;
  const div    = document.createElement('div');

  div.className = `message-bubble ${isMine ? 'message-bubble--mine' : 'message-bubble--theirs'}`;
  div.dataset.messageId  = msg._id;
  div.dataset.timestamp  = msg.timestamp;

  // formatting the timestamp to something readable
  const ts = new Date(msg.timestamp);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  div.innerHTML = `
    <span class="message-sender">${msg.senderName}</span>
    <p class="message-text">${msg.content}</p>
    <span class="message-time">${timeStr}</span>
  `;

  return div;
};

const appendMessage = (msg) => {
  // removing the empty state placeholder if it exists
  if (chatEmpty) chatEmpty.remove();

  const bubble = buildBubble(msg);
  feed.appendChild(bubble);

  // scrolling to the bottom so the newest message is visible
  feed.scrollTop = feed.scrollHeight;
};

// ---- sending a message ----

const sendMessage = async (content) => {
  if (isReadOnly) return;

  sendBtn.disabled = true;
  chatError.textContent = '';

  try {
    const res = await fetch(`/chat/${transactionId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();

    if (!res.ok) {
      chatError.textContent = data.error || 'failed to send message';
      return;
    }

    appendMessage(data.message);
    lastMessageTime = data.message.timestamp;
    messageInput.value = '';
    messageInput.focus();
  } catch (e) {
    chatError.textContent = 'connection error, please try again';
  } finally {
    sendBtn.disabled = false;
  }
};

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const content = messageInput.value.trim();

  if (!content) {
    chatError.textContent = 'message cannot be empty';
    messageInput.focus();
    return;
  }

  if (content.length > 1000) {
    chatError.textContent = 'message is too long';
    return;
  }

  sendMessage(content);
});

// enter to send, shift+enter for new line
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

// ---- polling for new messages ----

const pollForMessages = async () => {
  if (isReadOnly) return;

  lastMessageTime = lastMessageTime || getLastTimestamp();

  try {
    const params = lastMessageTime ? `?since=${encodeURIComponent(lastMessageTime)}` : '';
    const res    = await fetch(`/chat/${transactionId}/poll${params}`);

    if (!res.ok) return;

    const data = await res.json();

    if (data.messages && data.messages.length > 0) {
      data.messages.forEach((msg) => {
        appendMessage(msg);
        lastMessageTime = msg.timestamp;
      });
    }
  } catch (e) {
    // silently failing on poll errors so the UI doesn't break
    console.warn('poll failed:', e.message);
  }
};

// scrolling feed to bottom on load
feed.scrollTop = feed.scrollHeight;
lastMessageTime = getLastTimestamp();

// starting the poll interval, every 4 seconds
const pollInterval = setInterval(pollForMessages, 4000);

// cleaning up the interval if the user navigates away
window.addEventListener('beforeunload', () => {
  clearInterval(pollInterval);
});