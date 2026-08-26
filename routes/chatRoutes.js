const express = require('express');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/chat/conversations — list all conversations the current user is part of
// (the workspace group chat, plus any direct threads involving them)
router.get('/conversations', async (req, res, next) => {
  try {
    const convs = await Conversation.find({
      workspace: req.workspaceId,
      $or: [{ type: 'group' }, { participants: req.user._id }]
    })
      .populate('participants', 'firstName lastName dcId email role employeeRole')
      .sort({ updatedAt: -1 });
    res.json(convs);
  } catch (err) { next(err); }
});

// GET /api/chat/conversations/direct/:otherUserId — get or create a 1:1 thread
router.get('/conversations/direct/:otherUserId', async (req, res, next) => {
  try {
    const otherUser = await User.findOne({ _id: req.params.otherUserId, $or: [{ _id: req.workspaceId }, { workspaceOwner: req.workspaceId }] });
    if (!otherUser) return res.status(404).json({ message: 'User not found in this workspace' });

    let convo = await Conversation.findOne({
      workspace: req.workspaceId,
      type: 'direct',
      participants: { $all: [req.user._id, otherUser._id], $size: 2 }
    });

    if (!convo) {
      convo = await Conversation.create({
        workspace: req.workspaceId,
        type: 'direct',
        participants: [req.user._id, otherUser._id],
        messages: []
      });
    }
    res.json(convo);
  } catch (err) { next(err); }
});

// GET /api/chat/conversations/group — get or create the workspace group chat
router.get('/conversations/group', async (req, res, next) => {
  try {
    let convo = await Conversation.findOne({ workspace: req.workspaceId, type: 'group' });
    if (!convo) {
      convo = await Conversation.create({ workspace: req.workspaceId, type: 'group', participants: [], messages: [] });
    }
    res.json(convo);
  } catch (err) { next(err); }
});

// POST /api/chat/conversations/:id/messages — send a message (also broadcast via socket.io)
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' });

    const convo = await Conversation.findOne({ _id: req.params.id, workspace: req.workspaceId });
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    if (convo.type === 'direct' && !convo.participants.some((p) => p.equals(req.user._id))) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    const message = {
      sender: req.user._id,
      senderName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      text: text.trim(),
      time: new Date()
    };
    convo.messages.push(message);
    await convo.save();

    const saved = convo.messages[convo.messages.length - 1];

    // Real-time push to anyone connected to this conversation's room
    const io = req.app.get('io');
    if (io) io.to(`conversation:${convo._id}`).emit('chat:message', { conversationId: convo._id, message: saved });

    res.status(201).json(saved);
  } catch (err) { next(err); }
});

module.exports = router;
