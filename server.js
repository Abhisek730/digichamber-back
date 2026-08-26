require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const initSocket = require('./sockets/socket');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Allow requests from any origin. `origin: true` reflects back whatever
// Origin header the browser sent (rather than a literal '*'), which is what
// makes this work correctly together with `credentials: true` below —
// browsers reject a literal '*' on credentialed requests, but a reflected
// origin is accepted from anywhere.
const corsOptions = {
  origin: true,
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});
app.set('io', io); // so route handlers can do req.app.get('io').emit(...)

// ---------- Core middleware ----------
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic protection against brute-force login attempts
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Too many attempts, please try again later' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/employee-login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Serve uploaded files' folder statically is disabled on purpose — downloads go through
// the authenticated /api/files/:id/download route instead, so files aren't publicly guessable.

// ---------- Routes ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/hearings', require('./routes/hearingRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/diary', require('./routes/diaryRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/client-chats', require('./routes/clientChatRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/dpdp', require('./routes/dpdpRoutes'));
app.use('/api/stickies', require('./routes/stickyRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));

app.use(notFound);
app.use(errorHandler);

// ---------- Socket.io ----------
initSocket(io);

// ---------- Start ----------
const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`DigiChamber API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
});

module.exports = { app, server, io };
