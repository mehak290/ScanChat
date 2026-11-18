const jwt = require("jsonwebtoken");
const Chat = require("./models/Chat");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

connectDB();

app.get("/", (req, res) => {
  res.send("ScanChat Backend is Running");
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
app.set("io", io);

// Socket connection

// Authenticate every Socket.IO connection
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.userId = decoded.userId;

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});

// Socket connection
io.on("connection", (socket) => {
  console.log("Authenticated user connected:", socket.userId);

  socket.on("join-chat", async (chatId) => {
    try {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        socket.emit("chat-error", "Chat not found");
        return;
      }

      const isParticipant = chat.participants.some(
        (id) => id.toString() === socket.userId.toString()
      );

      if (!isParticipant) {
        socket.emit("chat-error", "Access denied");
        return;
      }

      socket.join(chatId.toString());
      console.log("User joined authorized chat:", chatId);
    } catch (error) {
      console.error("Socket join error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
