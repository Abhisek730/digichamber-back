const express = require('express');
const User = require('../models/User');
const Consent = require('../models/Consent');
const PrivacySettings = require('../models/PrivacySettings');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || null,
    dcId: user.dcId || null,
    role: user.role,
    employeeRole: user.employeeRole,
    access: user.access,
    bar: user.bar,
    plan: user.plan,
    subscriptionPlan: user.subscriptionPlan,
    driveConnected: user.driveConnected,
    workspaceOwner: user.workspaceOwner
  };
}

// @route  POST /api/auth/signup
// @desc   Register a new advocate (creates their own workspace)
router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, bar, plan } = req.body;
    if (!firstName || !email || !password) {
      return res.status(400).json({ message: 'First name, email and password are required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      bar: bar || '',
      role: 'advocate',
      plan: plan || 'solo'
    });

    // Bootstrap default DPDP records for the new workspace
    await Consent.create({ workspace: user._id, user: user._id });
    await PrivacySettings.create({ workspace: user._id, dpoName: '' });

    const token = generateToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// @route  POST /api/auth/login
// @desc   Advocate login via email + password
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase(), role: 'advocate' }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// @route  POST /api/auth/employee-login
// @desc   Employee/intern login via DC ID + password
router.post('/employee-login', async (req, res, next) => {
  try {
    const { dcId, password } = req.body;
    if (!dcId || !password) return res.status(400).json({ message: 'DC ID and password are required' });

    const user = await User.findOne({ dcId, role: 'employee' }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid DC ID or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// @route  POST /api/auth/demo
// @desc   Log in (or create, if missing) the built-in demo advocate account
router.post('/demo', async (req, res, next) => {
  try {
    const demoEmail = 'demo@digichamber.in';
    let user = await User.findOne({ email: demoEmail });
    if (!user) {
      user = await User.create({
        firstName: 'Arjun',
        lastName: 'Sharma',
        email: demoEmail,
        password: 'demo',
        bar: 'DL/2018/12345',
        role: 'advocate',
        plan: 'chamber'
      });
      await Consent.create({ workspace: user._id, user: user._id });
      await PrivacySettings.create({ workspace: user._id, dpoName: '' });
    }
    const token = generateToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// @route  GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
