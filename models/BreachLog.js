const mongoose = require('mongoose');

const breachLogSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    description: { type: String, required: true },
    dataCategory: { type: String, default: '' },
    discoveredAt: { type: Date, default: null },
    containedAt: { type: Date, default: null },
    boardNotifiedAt: { type: Date, default: null },
    usersNotifiedAt: { type: Date, default: null },
    status: { type: String, enum: ['Open', 'Contained', 'Resolved'], default: 'Open' },
    mitigation: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updated' } }
);

module.exports = mongoose.model('BreachLog', breachLogSchema);
