const jwt = require('jsonwebtoken');
const User = require('../models/User');

function initSocket(io) {
  // Authenticate every socket connection using the same JWT as the REST API
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      socket.workspaceId = user.workspaceId().toString();
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Everyone auto-joins their workspace's presence room
    socket.join(`workspace:${socket.workspaceId}`);

    // Client explicitly joins the internal-chat conversation room(s) it's viewing
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Client-chat threads (advocate/employee <-> client) work the same way
    socket.on('client-chat:join', (chatId) => {
      socket.join(`client-chat:${chatId}`);
    });
    socket.on('client-chat:leave', (chatId) => {
      socket.leave(`client-chat:${chatId}`);
    });

    // Typing indicators (optional, matches the kind of UX the frontend chat UI implies)
    socket.on('conversation:typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
        conversationId,
        userId: socket.user._id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`.trim(),
        isTyping
      });
    });

    socket.on('disconnect', () => {
      // no-op; rooms are cleaned up automatically
    });
  });
}

module.exports = initSocket;
