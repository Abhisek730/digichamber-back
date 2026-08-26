const mongoose = require('mongoose');

const privacySettingsSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    dpoName: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

module.exports = mongoose.model('PrivacySettings', privacySettingsSchema);
