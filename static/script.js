document.addEventListener("DOMContentLoaded", () => {
  const chat = document.getElementById("chat");
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  resetBtn.addEventListener("click", resetChat);

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    chat.innerHTML += `<div class='user'><b>You:</b> ${message}</div>`;
    input.value = "";

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      console.log("Server response:", data);

      // Use data.reply (not data.response)
      const reply = data.reply || "⚠️ No reply from server.";
      chat.innerHTML += `<div class='bot'><b>Bot:</b> ${reply}</div>`;
    } catch (error) {
      chat.innerHTML += `<div class='bot'><b>Bot:</b> ⚠️ Error connecting to backend</div>`;
    }

    chat.scrollTop = chat.scrollHeight;
  }

  async function resetChat() {
    await fetch("/reset", { method: "POST" });
    chat.innerHTML = "";
  }
});
