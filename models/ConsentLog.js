const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purposes: {
      reminders: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    time: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

module.exports = mongoose.model('ConsentLog', consentLogSchema);
