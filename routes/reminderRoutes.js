const express = require('express');
const Reminder = require('../models/Reminder');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ workspace: req.workspaceId }).sort({ date: 1 });
    res.json(reminders);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, date, type, desc } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'Title and date are required' });

    const r = await Reminder.create({
      workspace: req.workspaceId,
      createdBy: req.user._id,
      title, date, type: type || 'general', desc: desc || ''
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Reminder set: ${title}` });
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await Reminder.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
    if (!r) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Reminder deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
