const express = require('express');
const Sticky = require('../models/Sticky');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const stickies = await Sticky.find({ workspace: req.workspaceId, owner: req.user._id });
    res.json(stickies);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const s = await Sticky.create({ workspace: req.workspaceId, owner: req.user._id, text: req.body.text || '' });
    res.status(201).json(s);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const s = await Sticky.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId, owner: req.user._id },
      { $set: { text: req.body.text || '' } },
      { new: true }
    );
    if (!s) return res.status(404).json({ message: 'Sticky not found' });
    res.json(s);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const s = await Sticky.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId, owner: req.user._id });
    if (!s) return res.status(404).json({ message: 'Sticky not found' });
    res.json({ message: 'Sticky deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
