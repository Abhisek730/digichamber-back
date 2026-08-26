const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    resolvedAt: { type: Date, default: null },
    response: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updated' } }
);

module.exports = mongoose.model('Grievance', grievanceSchema);
