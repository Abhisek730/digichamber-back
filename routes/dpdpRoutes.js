const express = require('express');
const Consent = require('../models/Consent');
const ConsentLog = require('../models/ConsentLog');
const RightsRequest = require('../models/RightsRequest');
const Grievance = require('../models/Grievance');
const BreachLog = require('../models/BreachLog');
const PrivacySettings = require('../models/PrivacySettings');
const Activity = require('../models/Activity');
const { protect, advocateOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ---------- Consent ----------
router.get('/consent', async (req, res, next) => {
  try {
    let consent = await Consent.findOne({ workspace: req.workspaceId, user: req.user._id });
    if (!consent) consent = await Consent.create({ workspace: req.workspaceId, user: req.user._id });
    res.json(consent);
  } catch (err) { next(err); }
});

router.put('/consent', async (req, res, next) => {
  try {
    const { reminders, marketing } = req.body;
    let consent = await Consent.findOne({ workspace: req.workspaceId, user: req.user._id });
    if (!consent) consent = new Consent({ workspace: req.workspaceId, user: req.user._id });
    if (reminders !== undefined) consent.purposes.reminders = reminders;
    if (marketing !== undefined) consent.purposes.marketing = marketing;
    consent.updatedAt = new Date();
    await consent.save();

    await ConsentLog.create({ workspace: req.workspaceId, user: req.user._id, purposes: consent.purposes });
    res.json(consent);
  } catch (err) { next(err); }
});

router.get('/consent/log', async (req, res, next) => {
  try {
    const log = await ConsentLog.find({ workspace: req.workspaceId, user: req.user._id }).sort({ time: -1 }).limit(8);
    res.json(log);
  } catch (err) { next(err); }
});

// ---------- Data rights requests (Sections 11-14) ----------
router.get('/rights-requests', async (req, res, next) => {
  try {
    const filter = { workspace: req.workspaceId };
    if (req.user.role !== 'advocate') filter.requestedBy = req.user._id; // employees only see their own
    const requests = await RightsRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { next(err); }
});

router.post('/rights-requests', async (req, res, next) => {
  try {
    const { type, details, onBehalfOf } = req.body;
    if (!details || !details.trim()) return res.status(400).json({ message: 'Please describe your request' });

    const request = await RightsRequest.create({
      workspace: req.workspaceId,
      type: type || 'Access',
      requestedBy: req.user._id,
      requestedByName: onBehalfOf || `${req.user.firstName} ${req.user.lastName}`.trim(),
      filedByStaff: !!onBehalfOf,
      details: details.trim()
    });

    await Activity.create({ workspace: req.workspaceId, user: req.user._id, text: `Data ${(type || 'access').toLowerCase()} request logged${onBehalfOf ? ' for ' + onBehalfOf : ''}` });
    res.status(201).json(request);
  } catch (err) { next(err); }
});

router.patch('/rights-requests/:id/status', advocateOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'Resolved') update.resolvedAt = new Date();
    const request = await RightsRequest.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId },
      { $set: update },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) { next(err); }
});

// ---------- Grievances (Section 8(9), Rule 9) ----------
router.get('/grievances', async (req, res, next) => {
  try {
    const filter = { workspace: req.workspaceId };
    if (req.user.role !== 'advocate') filter.raisedBy = req.user._id;
    const grievances = await Grievance.find(filter).sort({ createdAt: -1 });
    res.json(grievances);
  } catch (err) { next(err); }
});

router.post('/grievances', async (req, res, next) => {
  try {
    const { subject, details } = req.body;
    if (!subject || !details) return res.status(400).json({ message: 'Subject and details are required' });
    const g = await Grievance.create({ workspace: req.workspaceId, raisedBy: req.user._id, subject, details });
    res.status(201).json(g);
  } catch (err) { next(err); }
});

router.patch('/grievances/:id/status', advocateOnly, async (req, res, next) => {
  try {
    const { status, response } = req.body;
    const update = { status };
    if (response !== undefined) update.response = response;
    if (status === 'Resolved') update.resolvedAt = new Date();
    const g = await Grievance.findOneAndUpdate({ _id: req.params.id, workspace: req.workspaceId }, { $set: update }, { new: true });
    if (!g) return res.status(404).json({ message: 'Grievance not found' });
    res.json(g);
  } catch (err) { next(err); }
});

// ---------- Breach log ----------
router.get('/breach-log', advocateOnly, async (req, res, next) => {
  try {
    const log = await BreachLog.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(log);
  } catch (err) { next(err); }
});

router.post('/breach-log', advocateOnly, async (req, res, next) => {
  try {
    const { description, dataCategory, discoveredAt, mitigation } = req.body;
    if (!description) return res.status(400).json({ message: 'Description is required' });
    const b = await BreachLog.create({
      workspace: req.workspaceId,
      reportedBy: req.user._id,
      description, dataCategory: dataCategory || '',
      discoveredAt: discoveredAt || new Date(),
      mitigation: mitigation || ''
    });
    res.status(201).json(b);
  } catch (err) { next(err); }
});

router.patch('/breach-log/:id', advocateOnly, async (req, res, next) => {
  try {
    const b = await BreachLog.findOneAndUpdate(
      { _id: req.params.id, workspace: req.workspaceId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!b) return res.status(404).json({ message: 'Breach record not found' });
    res.json(b);
  } catch (err) { next(err); }
});

// ---------- Privacy settings (DPO contact) ----------
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await PrivacySettings.findOne({ workspace: req.workspaceId });
    if (!settings) settings = await PrivacySettings.create({ workspace: req.workspaceId });
    res.json(settings);
  } catch (err) { next(err); }
});

router.put('/settings', advocateOnly, async (req, res, next) => {
  try {
    const { dpoName } = req.body;
    const settings = await PrivacySettings.findOneAndUpdate(
      { workspace: req.workspaceId },
      { $set: { dpoName: dpoName || '' } },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) { next(err); }
});

module.exports = router;
