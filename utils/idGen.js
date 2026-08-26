const User = require('../models/User');

// Builds an ID like EMP-DM01, EMP-DM02... from initials + an incrementing counter,
// mirroring the pattern already used by the frontend's demo data (EMP-DM01, EMP-DM02).
async function generateEmployeeId(firstName, lastName) {
  const initials = ((firstName || 'X')[0] + (lastName || 'X')[0]).toUpperCase();
  const prefix = `EMP-${initials}`;
  const existing = await User.countDocuments({ dcId: new RegExp('^' + prefix) });
  const num = String(existing + 1).padStart(2, '0');
  return `${prefix}${num}`;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

module.exports = { generateEmployeeId, generateTempPassword };
