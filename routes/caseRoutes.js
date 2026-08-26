const express = require('express');
const Case = require('../models/Case');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Helper: is this case visible to the current user?
function visibleFilter(req) {
  const base = { workspace: req.workspaceId };
  if (req.user.role === 'employee' && req.user.access === 'limited') {
    return { ...base, _id: { $in: req.user.assignedCases } };
  }
  return base;
}

// GET /api/cases
router.get('/', async (req, res, next) => {
  try {
    const cases = await Case.find(visibleFilter(req)).sort({ createdAt: -1 });
    res.json(cases);
  } catch (err) { next(err); }
});

// GET /api/cases/:id
router.get('/:id', async (req, res, next) => {
  try {
    const c = await Case.findOne({ _id: req.params.id, ...visibleFilter(req) });
    if (!c) return res.status(404).json({ message: 'Case not found' });
    res.json(c);
  } catch (err) { next(err); }
});

// POST /api/cases
router.post('/', async (req, res, next) => {
  try {
    const { number, year, title, client, clientEmail, clientPhone, court, type, status, priority, notes, documents } = req.body;
    if (!title || !client) return res.status(400).json({ message: 'Case title and client name are required' });

    const count = await Case.countDocuments({ workspace: req.workspaceId });
    const c = await Case.create({
      workspace: req.workspaceId,
      createdBy: req.user._id,
      number: number || `CS/${new Date().getFullYear()}/${String(count + 1).padStart(3, '0')}`,
      year: year || new Date().getFullYear(),
      title, client,
      clientEmail: clientEmail || '',
      clientPhone: clientPhone || '',
      court: court || '',
      type: type || '',
      status: status || 'active',
      priority: priority || 'medium',
      notes: notes || '',
      documents: documents || []
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `New case added: ${title}` });
    res.status(201).json(c);
  } catch (err) { next(err); }
});

// PUT /api/cases/:id
router.put('/:id', async (req, res, next) => {
  try {
    const c = await Case.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!c) return res.status(404).json({ message: 'Case not found' });
    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Case updated: ${c.title}` });
    res.json(c);
  } catch (err) { next(err); }
});

// DELETE /api/cases/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const c = await Case.findOneAndDelete({ _id: req.params.id, workspace: req.workspaceId });
    if (!c) return res.status(404).json({ message: 'Case not found' });
    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Case deleted: ${c.title}` });
    res.json({ message: 'Case deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
