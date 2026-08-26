const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('Activity', activitySchema);
