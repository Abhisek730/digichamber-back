const express = require('express');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect, advocateOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const PLAN_PRICES = { solo: 199, chamber: 499, enterprise: 999 };

router.get('/', async (req, res, next) => {
  try {
    res.json({ plan: req.user.plan, price: req.user.subscriptionPlan });
  } catch (err) { next(err); }
});

// PUT /api/subscription  { plan: 'solo' | 'chamber' | 'enterprise' }
router.put('/', advocateOnly, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLAN_PRICES[plan]) return res.status(400).json({ message: 'Invalid plan' });

    req.user.plan = plan;
    req.user.subscriptionPlan = PLAN_PRICES[plan];
    await req.user.save();

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Subscription changed to ${plan} plan` });
    res.json({ plan: req.user.plan, price: req.user.subscriptionPlan });
  } catch (err) { next(err); }
});

module.exports = router;
