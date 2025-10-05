// --- ELEMENTS ---
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");
const endBtn = document.getElementById("endBtn");
const shareBtn = document.getElementById("shareBtn");

// --- LOCAL MEMORY ---
let conversation = []; // stores full chat log {role, text}

// --- FUNCTIONS ---

function appendMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
  msgDiv.innerHTML = `<p>${text}</p>`;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Send message to backend ---
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  conversation.push({ role: "user", text: message });
  userInput.value = "";

  // Typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("message", "bot-message");
  typingDiv.innerHTML = `<p><em>Typing...</em></p>`;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation }),
    });

    const data = await response.json();
    chatMessages.removeChild(typingDiv);

    if (data.reply) {
      appendMessage(data.reply, "bot");
      conversation.push({ role: "model", text: data.reply });
    } else if (data.error) {
      appendMessage("⚠️ " + data.error, "bot");
    }
  } catch (err) {
    chatMessages.removeChild(typingDiv);
    appendMessage("⚠️ Error: Could not connect to server.", "bot");
  }
}

// --- Save chat to database ---
async function saveChat(shared = false, mood = "Neutral") {
  try {
    const response = await fetch("http://127.0.0.1:5000/save_chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_log: conversation,
        shared: shared,
        mood: mood,
      }),
    });
    const data = await response.json();
    console.log("💾", data.message || data.error);
  } catch (err) {
    console.error("Error saving chat:", err);
  }
}

// --- EVENT LISTENERS ---

sendBtn.addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage();
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// END SESSION button
endBtn.addEventListener("click", async () => {
  await saveChat(false); // shared = false
  conversation = [];
  chatMessages.innerHTML = "";
  appendMessage("Session saved and reset. What's been on your mind today?", "bot");
});

// SHARE TO THERAPIST button
shareBtn.addEventListener("click", async () => {
  await saveChat(true); // shared = true
  appendMessage("I've saved your chat and shared it with your therapist.", "bot");
});
