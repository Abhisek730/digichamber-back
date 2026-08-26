const mongoose = require('mongoose');

const rightsRequestSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: { type: String, enum: ['Access', 'Correction', 'Erasure', 'Nomination'], required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByName: { type: String, default: '' },
    filedByStaff: { type: Boolean, default: false }, // true if an admin filed this on behalf of someone (e.g. a client) outside the app

    details: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updated' } }
);

module.exports = mongoose.model('RightsRequest', rightsRequestSchema);
