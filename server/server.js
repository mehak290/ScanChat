const dns = require("dns");

dns.setServers(["8.8.8.8","8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv =  require("dotenv");
const connectDB =  require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();

const app =  express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

connectDB();

app.get("/", (req, res) => {
    res.send("ScanChat Backend is Running ");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


