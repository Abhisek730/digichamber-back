const express = require('express');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, due, priority, caseId, assignedTo } = req.body;
    if (!title) return res.status(400).json({ message: 'Task description is required' });

    const t = await Task.create({
      workspace: req.workspaceId,
      createdBy: req.user._id,
      title, due: due || '', priority: priority || 'medium',
      caseId: caseId || null,
      assignedTo: assignedTo || null
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Task added: ${title}` });
    res.status(201).json(t);
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const t = await Task.findOne({ _id: req.params.id, workspace: req.workspaceId });
    if (!t) return res.status(404).json({ message: 'Task not found' });
    t.done = !t.done;
    await t.save();
    res.json(t);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const t = await Task.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!t) return res.status(404).json({ message: 'Task not found' });
    res.json(t);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const t = await Task.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
    if (!t) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
