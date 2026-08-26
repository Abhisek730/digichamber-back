const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    purposes: {
      reminders: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Consent', consentSchema);
