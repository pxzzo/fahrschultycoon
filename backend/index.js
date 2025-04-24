const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

// MongoDB verbinden
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB verbunden"))
  .catch((err) => console.error(err));

// Routen
app.use("/api/auth", require("./routes/auth"));
app.use("/api/buildings", require("./routes/buildings"));
app.use("/api/students", require("./routes/students"));

// WebSocket-Handling
io.on("connection", (socket) => {
  console.log("🔌 Ein Client verbunden:", socket.id);

  socket.on("sendMessage", (msg) => {
    console.log("📨 Nachricht erhalten:", msg);
    io.emit("receiveMessage", msg); // an alle senden
  });

  socket.on("disconnect", () => {
    console.log("❌ Client getrennt:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
