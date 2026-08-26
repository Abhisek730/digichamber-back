const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const FileRecord = require('../models/FileRecord');
const Case = require('../models/Case');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB cap

// GET /api/files
router.get('/', async (req, res, next) => {
  try {
    const files = await FileRecord.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) { next(err); }
});

// POST /api/files/upload  (multipart/form-data: file, caseId, desc)
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { caseId, desc } = req.body;

    let caseTitle = null;
    if (caseId) {
      const c = await Case.findOne({ _id: caseId, workspace: req.workspaceId });
      caseTitle = c ? c.title : null;
    }

    const record = await FileRecord.create({
      workspace: req.workspaceId,
      uploadedBy: req.user._id,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      storedFilename: req.file.filename,
      caseId: caseId || null,
      caseTitle,
      desc: desc || '',
      source: 'local'
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `File "${req.file.originalname}" uploaded` });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// GET /api/files/:id/download
router.get('/:id/download', async (req, res, next) => {
  try {
    const record = await FileRecord.findOne({ _id: req.params.id, workspace: req.workspaceId });
    if (!record) return res.status(404).json({ message: 'File not found' });
    const filePath = path.join(uploadDir, record.storedFilename);
    if (!fs.existsSync(filePath)) return res.status(410).json({ message: 'File missing from storage' });
    res.download(filePath, record.name);
  } catch (err) { next(err); }
});

// DELETE /api/files/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const record = await FileRecord.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
    if (!record) return res.status(404).json({ message: 'File not found' });
    const filePath = path.join(uploadDir, record.storedFilename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
