
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import QRScanner from "./QRScanner";
import "./App.css";

function App() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [chats, setChats] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [selectedChat, setSelectedChat] = useState(null);

  // LOGIN AND REGISTER
  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);

      const endpoint = isRegister
        ? "http://localhost:5000/api/auth/register"
        : "http://localhost:5000/api/auth/login";

      const body = isRegister
        ? { name, email, password }
        : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      if (isRegister) {
        alert("Registration successful! Please login.");
        setIsRegister(false);
        setName("");
        setPassword("");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("userName", data.user.name);

        setIsLoggedIn(true);
      }
    } catch (error) {
      alert(error.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  // SEARCH USERS
  async function searchUsers() {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/chats/users?search=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to search users");
      }

      setUsers(data);
    } catch (error) {
      console.error("Search users error:", error);
      alert(error.message || "Unable to search users");
    }
  }

  async function openChatWithScannedUser(userId) {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/chats/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to open chat");
    }

    setSelectedChat(data);
    alert("Chat opened successfully!");

  } catch (error) {
    console.error("Chat error:", error);
    alert(error.message);
  }
}

  // LOAD CHATS
  useEffect(() => {
    if (!isLoggedIn) return;

    async function loadChats() {
      try {
        setChatLoading(true);

        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/chats",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load chats");
        }

        setChats(data);
      } catch (error) {
        console.error("Load chats error:", error);
      } finally {
        setChatLoading(false);
      }
    }

    loadChats();
  }, [isLoggedIn]);

  // DASHBOARD
  if (isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>ScanChat 💬</h1>

<h3>My QR Code 📱</h3>

<QRCodeSVG
  value={localStorage.getItem("userId") || "ScanChat"}
  size={200}
/>

<p>Let others scan your QR code to connect!</p>

<QRScanner onScan={openChatWithScannedUser} />

<p className="subtitle">
  Welcome! You are logged in.
</p>

<h3>Find People 🔍</h3>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              searchUsers();
            }}
          >
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <button type="submit">Search</button>
          </form>

          {users.length > 0 && (
            <div>
              {users.map((user) => (
                <div key={user._id}>
                  <p>{user.name}</p>
                  <p>{user.email}</p>
                </div>
              ))}
            </div>
          )}

          {chatLoading ? (
            <p>Loading chats...</p>
          ) : chats.length === 0 ? (
            <p>No chats yet. Start a conversation soon!</p>
          ) : (
            <div>
              {chats.map((chat) => (
                <div key={chat._id}>
                  <h4>
                    {chat.isGroup
                      ? chat.chatName
                      : chat.participants
                          ?.map((person) => person.name)
                          .join(", ") || "Chat"}
                  </h4>

                  <p>
                    {chat.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("userId");
              localStorage.removeItem("userName");

              setIsLoggedIn(false);
              setChats([]);
              setUsers([]);
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // LOGIN / REGISTER PAGE
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>ScanChat</h1>

        <p className="subtitle">
          Connect instantly. Chat freely.
        </p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegister
              ? "Register"
              : "Login"}
          </button>
        </form>

        <p className="signup-text">
          {isRegister
            ? "Already have an account? "
            : "Don't have an account? "}

          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setName("");
              setEmail("");
              setPassword("");
            }}
          >
            {isRegister ? "Login" : "Register"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;
