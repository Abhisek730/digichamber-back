const express = require('express');
const DiaryEntry = require('../models/DiaryEntry');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Diary entries are personal — each user only sees their own, even though scoped to the workspace
router.get('/', async (req, res, next) => {
  try {
    const entries = await DiaryEntry.find({ workspace: req.workspaceId, owner: req.user._id }).sort({ date: -1 });
    res.json(entries);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, content, date } = req.body;
    const e = await DiaryEntry.create({
      workspace: req.workspaceId,
      owner: req.user._id,
      title: title || '',
      content: content || '',
      date: date || new Date().toISOString().split('T')[0]
    });
    res.status(201).json(e);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const e = await DiaryEntry.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId, owner: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!e) return res.status(404).json({ message: 'Entry not found' });
    res.json(e);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const e = await DiaryEntry.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId, owner: req.user._id });
    if (!e) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
