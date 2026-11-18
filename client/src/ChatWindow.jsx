
import { io } from "socket.io-client";
import { useState, useEffect } from "react";

function ChatWindow({ chat, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Socket.IO connection
  useEffect(() => {
    if (!chat?._id) return;

    const token = localStorage.getItem("token");

const socket = io("http://localhost:5000", {
  auth: {
    token: token
  }
});

socket.on("connect_error", (error) => {
  console.error("Socket authentication failed:", error.message);
});

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
      socket.emit("join-chat", chat._id);
    });

    socket.on("receive-message", (message) => {
      setMessages((previousMessages) =>
        previousMessages.some((item) => item._id === message._id)
          ? previousMessages
          : [...previousMessages, message]
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [chat?._id]);

  // 2. Load old messages
  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        const response = await fetch(
          `http://localhost:5000/api/chats/${chat._id}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load messages");
        }

        setMessages(Array.isArray(data) ? data : data.messages || []);
      } catch (error) {
        console.error("Load messages error:", error);
      } finally {
        setLoading(false);
      }
    }

    if (chat?._id) {
      loadMessages();
    }
  }, [chat?._id]);

  // 3. Send message
  async function sendMessage(event) {
    event.preventDefault();

    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/chats/${chat._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            content: newMessage
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      setMessages((previousMessages) =>
        previousMessages.some((item) => item._id === data._id)
          ? previousMessages
          : [...previousMessages, data]
      );

      setNewMessage("");
    } catch (error) {
      console.error("Send message error:", error);
      alert(error.message);
    }
  }

  return (
    <div className="chat-window">
      <button onClick={onBack}>← Back</button>

      <h2>Chat 💬</h2>

      <div className="messages">
        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No messages yet. Say hello!</p>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={
                String(message.sender?._id || message.sender) ===
                localStorage.getItem("userId")
                  ? "sent-message"
                  : "received-message"
              }
            >
              <p>{message.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
        />

        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatWindow;
