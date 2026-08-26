const express = require('express');
const Hearing = require('../models/Hearing');
const Case = require('../models/Case');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const hearings = await Hearing.find({ workspace: req.workspaceId }).sort({ date: 1 });
    res.json(hearings);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { caseId, date, time, courtRoom, judge, purpose, notes } = req.body;
    if (!caseId || !date) return res.status(400).json({ message: 'Case and date are required' });

    const caseObj = await Case.findOne({ _id: caseId, workspace: req.workspaceId });
    if (!caseObj) return res.status(404).json({ message: 'Case not found' });

    const h = await Hearing.create({
      workspace: req.workspaceId,
      createdBy: req.user._id,
      caseId,
      caseTitle: caseObj.title,
      caseNumber: caseObj.number,
      date, time: time || '',
      courtRoom: courtRoom || 'Court Room',
      judge: judge || '',
      purpose: purpose || '',
      notes: notes || ''
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Hearing scheduled: ${caseObj.title} on ${date}` });
    res.status(201).json(h);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const h = await Hearing.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!h) return res.status(404).json({ message: 'Hearing not found' });
    res.json(h);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const h = await Hearing.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
    if (!h) return res.status(404).json({ message: 'Hearing not found' });
    res.json({ message: 'Hearing deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
