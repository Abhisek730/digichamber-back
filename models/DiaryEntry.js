const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // diary is personal to the author

    title: { type: String, default: '' },
    content: { type: String, default: '' },
    date: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created', updatedAt: 'updated' } }
);

module.exports = mongoose.model('DiaryEntry', diarySchema);
