const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        leftMembers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        isGroupChat: {
            type: Boolean,
            default: false
        },

        groupName: {
            type: String,
            default: ""
        },

        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message"
        },
    
        unreadBy: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
],
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Chat", chatSchema);