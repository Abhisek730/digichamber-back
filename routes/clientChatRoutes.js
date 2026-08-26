const express = require('express');
const ClientChat = require('../models/ClientChat');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/client-chats — list all client threads for the workspace
router.get('/', async (req, res, next) => {
  try {
    const chats = await ClientChat.find({ workspace: req.workspaceId }).sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) { next(err); }
});

// GET /api/client-chats/:clientName — get or create a thread with a client
router.get('/:clientName', async (req, res, next) => {
  try {
    let chat = await ClientChat.findOne({ workspace: req.workspaceId, clientName: req.params.clientName });
    if (!chat) {
      chat = await ClientChat.create({ workspace: req.workspaceId, clientName: req.params.clientName, messages: [] });
    }
    res.json(chat);
  } catch (err) { next(err); }
});

// POST /api/client-chats/:clientName/messages
router.post('/:clientName/messages', async (req, res, next) => {
  try {
    const { text, sender, channel } = req.body; // sender: 'client' | 'advocate'
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' });

    let chat = await ClientChat.findOne({ workspace: req.workspaceId, clientName: req.params.clientName });
    if (!chat) {
      chat = await ClientChat.create({ workspace: req.workspaceId, clientName: req.params.clientName, messages: [] });
    }

    chat.messages.push({
      sender: sender === 'client' ? 'client' : 'advocate',
      text: text.trim(),
      channel: channel || 'chat',
      time: new Date()
    });
    await chat.save();

    const io = req.app.get('io');
    if (io) io.to(`client-chat:${chat._id}`).emit('client-chat:message', { chatId: chat._id, message: chat.messages[chat.messages.length - 1] });

    res.status(201).json(chat.messages[chat.messages.length - 1]);
  } catch (err) { next(err); }
});

module.exports = router;
