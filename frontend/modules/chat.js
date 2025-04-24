let socket;

export function initChat() {
  const messagesContainer = document.getElementById("chat-messages");
  const input = document.getElementById("chat-text");
  const sendButton = document.getElementById("chat-send");

  const username =
    JSON.parse(localStorage.getItem("user"))?.username || "Unbekannt";

  socket = io("http://localhost:5000");

  socket.on("receiveMessage", (msg) => {
    renderMessage(msg);
  });

  sendButton.onclick = sendMessage;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const msg = {
      sender: username,
      text,
      time: new Date().toLocaleTimeString(),
    };

    socket.emit("sendMessage", msg);
    input.value = "";
  }

  function renderMessage(m) {
    const div = document.createElement("div");
    div.innerHTML = `<b>${m.sender}:</b> ${m.text} <span style="font-size:0.7rem;color:gray;">(${m.time})</span>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}
