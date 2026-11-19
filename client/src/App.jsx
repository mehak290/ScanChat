import { useState, useEffect, useRef } from "react";import ChatWindow from "./ChatWindow";
import { QRCodeSVG } from "qrcode.react";
import QRScanner from "./QRScanner";
import "./App.css";
import { io } from "socket.io-client";


function getChatTitle(chat) {
  if (chat.isGroupChat) {
    return `👥 ${chat.groupName || "Group Chat"}`;
  }

  const currentUserId = localStorage.getItem("userId");

  const otherUser = chat.participants?.find(
    (person) =>
      String(person._id || person) !== String(currentUserId)
  );

  return otherUser?.name || "Chat";
}

function getLastMessage(chat) {
  return chat.lastMessage?.content || "No messages yet";
}

function getChatTime(chat) {
  const date =
    chat.lastMessage?.createdAt ||
    chat.updatedAt ||
    chat.createdAt;

  if (!date) return "";

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}


function App() {
  const isOpeningChat = useRef(false);
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
  const [groupName, setGroupName] = useState("");
const [selectedUsers, setSelectedUsers] = useState([]);
const [showGroupForm, setShowGroupForm] = useState(false);

const [chatRefresh, setChatRefresh] = useState(0);

// PERSISTENT SOCKET CONNECTION
// useEffect(() => {
//   if (!isLoggedIn) return;

//   const token = localStorage.getItem("token");

//   const socket = io("http://localhost:5000", {
//     auth: { token }
//   });

//   socket.on("chat-list-update", () => {
//     setChatRefresh((prev) => prev + 1);
//   });

//   socket.on("connect_error", (error) => {
//     console.error("Socket connection error:", error.message);
//   });

//   return () => {
//     socket.disconnect();
//   };
// }, [isLoggedIn]);

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

  // Prevent duplicate scans
  if (isOpeningChat.current) return;

  isOpeningChat.current = true;

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

  } finally {
    isOpeningChat.current = false;
  }
}

async function createGroup() {
  if (!groupName.trim()) {
    alert("Enter group name");
    return;
  }

  if (selectedUsers.length < 2) {
    alert("Select at least 2 members");
    return;
  }

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/chats/group",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          groupName,
          users: selectedUsers
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Group creation failed");
    }

    setChats((previous) => [data, ...previous]);
    setSelectedChat(data);

    setGroupName("");
    setSelectedUsers([]);
    setShowGroupForm(false);

    alert("Group created successfully!");
  } catch (error) {
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
  }, [isLoggedIn, chatRefresh]);

 //chat list 
 useEffect(() => {
  const handleChatRefresh = () => {
    setChatRefresh((previous) => previous + 1);
  };

  window.addEventListener("chat-list-refresh", handleChatRefresh);

  return () => {
    window.removeEventListener("chat-list-refresh", handleChatRefresh);
  };
}, []);

  // TWO COLUMN DASHBOARD
  if (isLoggedIn) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>ScanChat 💬</h1>
            <p>Connect instantly. Chat freely.</p>
          </div>

          <div className="qr-section">
            <h3>My QR Code 📱</h3>
            <QRCodeSVG
              value={localStorage.getItem("userId") || "ScanChat"}
              size={120}
            />
            <p>Scan to connect!</p>
            <QRScanner onScan={openChatWithScannedUser} />
          </div>

          <button
            className="create-group-btn"
            onClick={() => setShowGroupForm(!showGroupForm)}
          >
            {showGroupForm ? "Cancel" : "+ Create Group"}
          </button>

          {showGroupForm && (
            <div className="group-form">
              <h3>Create New Group</h3>
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />

              <p>Select at least 2 members:</p>

              {users.map((user) => (
                <label key={user._id}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={(e) => {
                      setSelectedUsers((previous) =>
                        e.target.checked
                          ? [...previous, user._id]
                          : previous.filter((id) => id !== user._id)
                      );
                    }}
                  />
                  {user.name}
                </label>
              ))}

              <button onClick={createGroup}>Create Group</button>
            </div>
          )}

          <form
            className="user-search"
            onSubmit={(e) => {
              e.preventDefault();
              searchUsers();
            }}
          >
            <input
              placeholder="Find people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          {users.length > 0 && (
            <div className="search-results">
              {users.map((user) => (
                <div key={user._id}>
                  <span>{user.name}</span>
                  <small>{user.email}</small>
                </div>
              ))}
            </div>
          )}

          <h3 className="chats-heading">Your Conversations</h3>

          <div className="chat-list">
            {chatLoading ? (
              <p>Loading chats...</p>
            ) : chats.length === 0 ? (
              <p>No chats yet. Start a conversation!</p>
            ) : (
              [...chats]
                .sort((a, b) => {
                  const dateA = new Date(
                    a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0
                  ).getTime();

                  const dateB = new Date(
                    b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0
                  ).getTime();

                  return dateB - dateA;
                })
                .
map((chat) => {
  const currentUserId = localStorage.getItem("userId");

  const isUnread = chat.unreadBy?.some(
    (id) => String(id._id || id) === String(currentUserId)
  );

  return (
    <div
      key={chat._id}
      className={`chat-list-item ${
        selectedChat?._id === chat._id ? "active-chat" : ""
      }`}
      onClick={() => setSelectedChat(chat)}
    >
      <div>
        <h4>
          {getChatTitle(chat)}
          {isUnread && <span className="unread-dot"></span>}
        </h4>
        <p>{getLastMessage(chat)}</p>
      </div>
      <small>{getChatTime(chat)}</small>
    </div>
  );
})

            )}
          </div>

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("userId");
              localStorage.removeItem("userName");
              setIsLoggedIn(false);
              setSelectedChat(null);
              setChats([]);
              setUsers([]);
            }}
          >
            Logout
          </button>
        </aside>

        <main className="main-panel">
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              onBack={() => setSelectedChat(null)}
            />
          ) : (
            <div className="welcome-panel">
              <h1>Welcome to ScanChat 💬</h1>
              <p>Select a conversation to start chatting.</p>
              <p>Or scan someone's QR code to connect instantly.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // LOGIN / REGISTER PAGE
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>ScanChat</h1>
        <p className="subtitle">Connect instantly. Chat freely.</p>

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
