const mongoose = require('mongoose');

const hearingSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    caseTitle: { type: String, default: '' },
    caseNumber: { type: String, default: '' },

    date: { type: String, required: true }, // ISO date string (yyyy-mm-dd) to match frontend
    time: { type: String, default: '' },
    courtRoom: { type: String, default: 'Court Room' },
    judge: { type: String, default: '' },
    purpose: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

module.exports = mongoose.model('Hearing', hearingSchema);
