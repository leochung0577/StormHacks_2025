document.addEventListener("DOMContentLoaded", () => {
  const chat = document.getElementById("chat");
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");
  const themeToggle = document.getElementById("themeToggle");

  // --- Theme toggle (remember choice)
  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme);
  themeToggle.addEventListener("click", () => {
    const mode = document.body.classList.contains("theme-dark") ? "light" : "dark";
    setTheme(mode);
  });
  function setTheme(mode){
    document.body.classList.toggle("theme-dark", mode === "dark");
    document.body.classList.toggle("theme-light", mode === "light");
    localStorage.setItem("theme", mode);
    themeToggle.textContent = mode === "dark" ? "☾" : "☀";
  }

  // Auto-grow textarea like ChatGPT
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  });

  // Enter to send, Shift+Enter newline
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener("click", sendMessage);
  resetBtn.addEventListener("click", resetChat);

  function appendMessage(role, text, isTyping=false){
    const row = document.createElement("div");
    row.className = `row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${role === "bot" ? "bot" : ""}`;
    avatar.textContent = role === "user" ? "U" : "S";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (isTyping) {
      bubble.innerHTML = `<span class="typing">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </span>`;
    } else {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;

    return bubble; // so we can replace typing later
  }

  async function sendMessage(){
    const message = (input.value || "").trim();
    if (!message) return;

    appendMessage("user", message);
    input.value = "";
    input.style.height = "auto";

    const typingBubble = appendMessage("bot", "", true);

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await res.json();
      const reply = data.reply || "⚠️ No reply from server.";
      typingBubble.textContent = reply;
    } catch (err) {
      typingBubble.textContent = `⚠️ Network error: ${err.message}`;
    }

    chat.scrollTop = chat.scrollHeight;
  }

  async function resetChat(){
    // Your current backend supports POST /reset without payload or with any body.
    // If it needs a body later (after SQLite), we’ll adjust here.
    try{
      const res = await fetch("/reset", { method:"POST" });
      const data = await res.json();
      appendMessage("bot", data.reply || "Conversation reset.");
      chat.scrollTop = chat.scrollHeight;
    }catch(e){
      appendMessage("bot", `⚠️ Could not reset: ${e.message}`);
    }
  }
});
