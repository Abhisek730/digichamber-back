const express = require('express');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const activity = await Activity.find({ workspace: req.workspaceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'firstName lastName');
    res.json(activity);
  } catch (err) { next(err); }
});

module.exports = router;
