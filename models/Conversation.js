const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now }
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // 'group' = whole-workspace team chat. 'direct' = 1:1 between two members.
    type: { type: String, enum: ['group', 'direct'], default: 'direct' },

    // For direct chats: exactly the two participant user IDs. For group: all workspace members (informational).
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    messages: [messageSchema]
  },
  { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

// Fast lookup of the single group conversation per workspace, and of direct threads between two people
conversationSchema.index({ workspace: 1, type: 1 });
conversationSchema.index({ workspace: 1, participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
