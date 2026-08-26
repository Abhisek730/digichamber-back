const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    number: { type: String, required: true },
    year: { type: Number },
    title: { type: String, required: true },
    client: { type: String, required: true },
    clientEmail: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    court: { type: String, default: '' },
    type: { type: String, default: '' },
    status: { type: String, enum: ['active', 'pending', 'closed', 'disposed'], default: 'active' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    notes: { type: String, default: '' },
    documents: [{ type: mongoose.Schema.Types.Mixed }], // file metadata refs

    // Simple access control: employees assigned to a case can see it; advocate sees all
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

module.exports = mongoose.model('Case', caseSchema);
