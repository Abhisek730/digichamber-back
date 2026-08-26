const mongoose = require('mongoose');

const clientMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['client', 'advocate'], required: true },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
    channel: { type: String, enum: ['chat', 'sms', 'email'], default: 'chat' }
  },
  { _id: true }
);

const clientChatSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientName: { type: String, required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
    messages: [clientMessageSchema]
  },
  { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

clientChatSchema.index({ workspace: 1, clientName: 1 }, { unique: true });

module.exports = mongoose.model('ClientChat', clientChatSchema);
