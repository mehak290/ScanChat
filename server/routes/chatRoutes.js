const express = require("express");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create or find one-to-one chat
router.post("/create", protect, async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (userId === req.user.toString()) {
            return res.status(400).json({
                message: "You cannot chat with yourself"
            });
        }

        let chat = await Chat.findOne({
            isGroupChat: false,
            participants: { $all: [req.user, userId] }
        });

        if (chat) {
            return res.status(200).json(chat);
        }

        chat = await Chat.create({
            participants: [req.user, userId],
            isGroupChat: false
        });

        res.status(201).json(chat);

    } catch (error) {
        res.status(500).json({
            message: "Failed to create chat",
            error: error.message
        });
    }
});


// Send Message API
router.post("/:chatId/messages", protect, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                message: "Invalid chat ID"
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                message: "Message cannot be empty"
            });
        }

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                message: "Chat not found"
            });
        }

        const isParticipant = chat.participants.some(
            id => id.toString() === req.user.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant of this chat"
            });
        }

        const message = await Message.create({
            chat: chatId,
            sender: req.user,
            content: content.trim()
        });

        chat.lastMessage = message._id;
        await chat.save();

        // Real-time message broadcasting
        const io = req.app.get("io");

        io.to(chatId.toString()).emit("receive-message", message);

        // Notify all chat participants to refresh their chat lists
chat.participants.forEach((participantId) => {
  io.to(participantId.toString()).emit("chat-list-update");
});

        res.status(201).json(message);

    } catch (error) {
        res.status(500).json({
            message: "Failed to send message",
            error: error.message
        });
    }
});

// Get Messages API
router.get("/:chatId/messages", protect, async (req, res) => {
    try {
        const { chatId } = req.params;

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                message: "Invalid chat ID"
            });
        }

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                message: "Chat not found"
            });
        }

        const isParticipant = chat.participants.some(
            id => id.toString() === req.user.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "You are not a participant of this chat"
            });
        }

        const messages = await Message.find({ chat: chatId })
            .sort({ createdAt: 1 });

        res.status(200).json(messages);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch messages",
            error: error.message
        });
    }
});

// Get My Chats API
router.get("/", protect, async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: req.user
        })
            .populate("participants", "name email")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });

        res.status(200).json(chats);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch chats",
            error: error.message
        });
    }
});


// Search Users API
router.get("/users", protect, async (req, res) => {
    try {
        const User = require("../models/User");
        const { search } = req.query;

        if (!search || !search.trim()) {
            return res.status(400).json({
                message: "Search term is required"
            });
        }

        const users = await User.find({
            _id: { $ne: req.user },
            $or: [
                { name: { $regex: search.trim(), $options: "i" } },
                { email: { $regex: search.trim(), $options: "i" } }
            ]
        }).select("name email");

        res.status(200).json(users);

    } catch (error) {
        res.status(500).json({
            message: "Failed to search users",
            error: error.message
        });
    }
});


// Create Group Chat API
router.post("/group", protect, async (req, res) => {
  try {
    const { groupName, users } = req.body;

    // Check group name
    if (!groupName || !groupName.trim()) {
      return res.status(400).json({
        message: "Group name is required"
      });
    }

    // Check users
    if (!users || !Array.isArray(users) || users.length < 2) {
      return res.status(400).json({
        message: "At least 2 other users are required"
      });
    }

    // Validate user IDs
    const allUsers = [...new Set(users.map(id => id.toString()))];

    if (allUsers.length < 2) {
      return res.status(400).json({
        message: "Add at least 2 different users"
      });
    }

    if (allUsers.includes(req.user.toString())) {
      return res.status(400).json({
        message: "Do not include yourself in users"
      });
    }

    const mongoose = require("mongoose");
    const User = require("../models/User");

    const invalidId = allUsers.some(
      id => !mongoose.isValidObjectId(id)
    );

    if (invalidId) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    const existingUsers = await User.find({
      _id: { $in: allUsers }
    }).select("_id");

    if (existingUsers.length !== allUsers.length) {
      return res.status(400).json({
        message: "One or more users do not exist"
      });
    }

    // Create group
    const groupChat = await Chat.create({
      participants: [req.user, ...allUsers],
      isGroupChat: true,
      groupName: groupName.trim(),
      groupAdmin: req.user
    });

    const result = await Chat.findById(groupChat._id)
      .populate("participants", "name email")
      .populate("groupAdmin", "name email");

    res.status(201).json(result);

  } catch (error) {
    res.status(500).json({
      message: "Failed to create group",
      error: error.message
    });
  }
});




// Add Member to Group API
router.put("/:chatId/members", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    // Check IDs
    if (!mongoose.isValidObjectId(chatId) ||
        !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid chat ID or user ID"
      });
    }

    // Find group
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found"
      });
    }

    // Only group admin can add members
    if (!chat.isGroupChat) {
      return res.status(400).json({
        message: "This is not a group chat"
      });
    }

    if (chat.groupAdmin.toString() !== req.user.toString()) {
      return res.status(403).json({
        message: "Only group admin can add members"
      });
    }

    // Check user exists
    const User = require("../models/User");
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Check if already a member
    if (chat.participants.some(
      id => id.toString() === userId
    )) {
      return res.status(400).json({
        message: "User is already in this group"
      });
    }

    // Add member
    chat.participants.push(userId);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("participants", "name email")
      .populate("groupAdmin", "name email");

    res.status(200).json(updatedChat);

  } catch (error) {
    res.status(500).json({
      message: "Failed to add member",
      error: error.message
    });
  }
});


// Remove Member from Group API
router.delete("/:chatId/members/:userId", protect, async (req, res) => {
  try {
    const { chatId, userId } = req.params;

    // Validate IDs
    if (
      !mongoose.isValidObjectId(chatId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        message: "Invalid chat ID or user ID"
      });
    }

    // Find group
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found"
      });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({
        message: "This is not a group chat"
      });
    }

    // Only admin can remove members
    if (chat.groupAdmin.toString() !== req.user.toString()) {
      return res.status(403).json({
        message: "Only group admin can remove members"
      });
    }

    // Admin cannot remove themselves
    if (userId === req.user.toString()) {
      return res.status(400).json({
        message: "Admin cannot remove themselves"
      });
    }

    // Check whether user is a member
    const isMember = chat.participants.some(
      id => id.toString() === userId
    );

    if (!isMember) {
      return res.status(404).json({
        message: "User is not a member of this group"
      });
    }

    // Remove member
    chat.participants = chat.participants.filter(
      id => id.toString() !== userId
    );

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("participants", "name email")
      .populate("groupAdmin", "name email");

    res.status(200).json(updatedChat);

  } catch (error) {
    res.status(500).json({
      message: "Failed to remove member",
      error: error.message
    });
  }
});


module.exports = router;