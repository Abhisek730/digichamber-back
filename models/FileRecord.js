const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    name: { type: String, required: true },
    type: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 }, // bytes; format on the frontend for display
    storedFilename: { type: String, required: true }, // actual filename on disk (uploads/<storedFilename>)
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
    caseTitle: { type: String, default: null },
    desc: { type: String, default: '' },
    source: { type: String, default: 'local' } // 'local' now that Drive is replaced by real disk storage
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: 'updated' } }
);

module.exports = mongoose.model('FileRecord', fileSchema);
