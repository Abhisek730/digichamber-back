const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT, attaches req.user (Mongoose doc) and req.workspaceId (ObjectId
// that all workspace-scoped data should be filtered/created against).
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized, user not found or inactive' });
    }

    req.user = user;
    req.workspaceId = user.workspaceId();
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
}

// Restrict a route to advocates only (workspace owners / admins)
function advocateOnly(req, res, next) {
  if (req.user.role !== 'advocate') {
    return res.status(403).json({ message: 'This action is restricted to the workspace owner (advocate)' });
  }
  next();
}

module.exports = { protect, advocateOnly };
