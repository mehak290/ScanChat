import React from "react";
import { io } from "socket.io-client";
import { useState, useEffect, useRef } from "react";

function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDateLabel(date) {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (sameDay(messageDate, today)) return "Today";
  if (sameDay(messageDate, yesterday)) return "Yesterday";

  return messageDate.toLocaleDateString();
}


function ChatWindow({ chat, onBack }) {
  const [currentChat, setCurrentChat] = useState(chat);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [showMembers, setShowMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [hasLeftGroup, setHasLeftGroup] = useState(false);
  const messagesEndRef = useRef(null);


  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");

  useEffect(() => {
    setCurrentChat(chat);
  }, [chat]);

  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth"
  });
}, [messages]);

  const isGroup = currentChat.isGroupChat;
  const chatTitle = isGroup
  ? currentChat.groupName || "Group Chat"
  : currentChat.participants?.find(
      (member) =>
        String(member._id || member) !== String(currentUserId)
    )?.name || "Chat";

  const adminId =
    currentChat.groupAdmin?._id || currentChat.groupAdmin;

  const isAdmin =
    String(adminId) === String(currentUserId);

  // SOCKET CONNECTION
  
// SOCKET CONNECTION
useEffect(() => {
  if (!currentChat?._id) return;

  const socket = io("http://localhost:5000", {
    auth: { token }
  });

  socket.on("connect", () => {
  socket.emit("join-chat", currentChat._id);
  socket.emit("active-chat", currentChat._id);
});

  socket.on("connect_error", (error) => {
    console.error("Socket error:", error.message);
  });

  socket.on("receive-message", (message) => {
    setMessages((previous) =>
      previous.some((item) => item._id === message._id)
        ? previous
        : [...previous, message]
    );
  });

  // Chat list update listener
  socket.on("chat-list-update", () => {
    window.dispatchEvent(new Event("chat-list-refresh"));
  });

  return () => {
  socket.emit("leave-active-chat", currentChat._id);
  socket.disconnect();
};

}, [currentChat?._id, token]);



  // LOAD MESSAGES
  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);

        const response = await fetch(
          `http://localhost:5000/api/chats/${currentChat._id}/messages`,
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

        setMessages(
          Array.isArray(data) ? data : data.messages || []
        );
        window.dispatchEvent(new Event("chat-list-refresh"));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (currentChat?._id) loadMessages();
  }, [currentChat?._id, token]);

  // SEND MESSAGE
  async function sendMessage(event) {
    event.preventDefault();

    if (!newMessage.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/chats/${currentChat._id}/messages`,
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

      setMessages((previous) =>
        previous.some((item) => item._id === data._id)
          ? previous
          : [...previous, data]
      );

      setNewMessage("");
    } catch (error) {
      alert(error.message);
    }
  }

  // SEARCH USERS FOR GROUP
  async function searchGroupUsers(event) {
    event.preventDefault();

    if (!searchTerm.trim()) return;

    try {
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
        throw new Error(data.message || "Search failed");
      }

      const members = currentChat.participants || [];

      setSearchResults(
        data.filter(
          (user) =>
            !members.some(
              (member) => String(member._id || member) === String(user._id)
            )
        )
      );
    } catch (error) {
      alert(error.message);
    }
  }

  // ADD MEMBER
  async function addMember(userId) {
    try {
      const response = await fetch(
        `http://localhost:5000/api/chats/${currentChat._id}/members`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add member");
      }

      setCurrentChat(data);
      setSearchResults([]);
      setSearchTerm("");

      alert("Member added successfully!");
    } catch (error) {
      alert(error.message);
    }
  }

  async function leaveGroup() {
  const confirmLeave = window.confirm(
    "Are you sure you want to leave this group?"
  );

  if (!confirmLeave) return;

  try {
    const response = await fetch(
      `http://localhost:5000/api/chats/${currentChat._id}/leave`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to leave group");
    }

    alert("You left the group successfully!");

    setHasLeftGroup(true);
    window.dispatchEvent(new Event("chat-list-refresh"));
    onBack();

  } catch (error) {
    alert(error.message);
  }
}


  // REMOVE MEMBER
  async function removeMember(userId) {
    if (!window.confirm("Remove this member from group?")) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/chats/${currentChat._id}/members/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove member");
      }

      setCurrentChat(data);

      alert("Member removed successfully!");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="chat-window">

      <button onClick={onBack}>← Back</button>

      <h2>
  {isGroup ? "👥 " : "💬 "}
  {chatTitle}
</h2>

      {isGroup && (
        <div>
          <button onClick={() => setShowMembers(!showMembers)}>
            {showMembers ? "Hide Group Details" : "Group Members"}
          </button>

          {showMembers && (
            <div>
              <h3>Members</h3>

              
<div className="group-members">
  {currentChat.participants?.map((member) => {
    const memberId = member._id || member;
    const memberName = member.name || "Member";

    return (
      <div className="member-row" key={memberId}>
        <span>
          {memberName}
          {String(memberId) === String(adminId) && " 👑 Admin"}
        </span>

        {isAdmin &&
          String(memberId) !== String(adminId) && (
            <button
              type="button"
              onClick={() => removeMember(memberId)}
            >
              Remove
            </button>
          )}
      </div>
    );
  })}
</div>

{currentChat.isGroupChat &&
  !hasLeftGroup &&
  currentChat.participants?.some(
    (member) =>
      String(member._id || member) ===
      String(localStorage.getItem("userId"))
  ) && (
    <button
      type="button"
      className="leave-group-btn"
      onClick={leaveGroup}
    >
      Leave Group
    </button>
  )}


              {isAdmin && (
  <div className="add-members-section">
    <h3>Add New Members</h3>

    <form className="add-member-search" onSubmit={searchGroupUsers}>
      <input
        type="text"
        placeholder="Search users by name or email"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <button type="submit">Search</button>
    </form>

    <div className="search-results">
      {searchResults.map((user) => (
        <div className="member-row" key={user._id}>
          <span>{user.name} ({user.email})</span>

          <button type="button" onClick={() => addMember(user._id)}>
            + Add
          </button>
        </div>
      ))}
    </div>
  </div>
)}

              {!isAdmin && (
                <p>Only the group admin can manage members.</p>
              )}
            </div>
          )}
        </div>
      )}

<div className="messages">
  {loading ? (
    <p>Loading messages...</p>
  ) : messages.length === 0 ? (
    <p>No messages yet. Say hello!</p>
  ) : (
    messages.map((message, index) => {
      const showDate =
        index === 0 ||
        getDateLabel(message.createdAt) !==
          getDateLabel(messages[index - 1].createdAt);

      return (
  <div key={message._id}>
    {showDate && (
      <div className="date-separator">
        <span>{getDateLabel(message.createdAt)}</span>
      </div>
    )}

    {message.messageType === "system" ? (
      <div className="system-message">
        <span>{message.content}</span>
        <small className="message-time">
          {formatMessageTime(message.createdAt)}
        </small>
      </div>
    ) : (
      <div
        className={
          String(message.sender?._id || message.sender) ===
          String(currentUserId)
            ? "message-row sent-row"
            : "message-row received-row"
        }
      >
        <div
          className={
            String(message.sender?._id || message.sender) ===
            String(currentUserId)
              ? "sent-message"
              : "received-message"
          }
        >
          <p>{message.content}</p>
          <small className="message-time">
            {formatMessageTime(message.createdAt)}
          </small>
        </div>
      </div>
    )}
  </div>
);
    })
  )}

  <div ref={messagesEndRef}></div>
</div>

{!hasLeftGroup &&
  (!currentChat.isGroupChat ||
    currentChat.participants?.some(
      (member) =>
        String(member._id || member) ===
        String(localStorage.getItem("userId"))
    )) && (
    <form onSubmit={sendMessage}>
      <input
        type="text"
        placeholder="Type a message..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
      />
      <button type="submit">Send</button>
    </form>
  )}
</div>
);
}

export default ChatWindow;