const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },

    // Advocates log in with email; employees log in with a DC ID (e.g. EMP-DM01)
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    dcId: { type: String, trim: true, sparse: true, unique: true },

    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ['advocate', 'employee'],
      default: 'advocate'
    },
    employeeRole: { type: String, default: '' }, // e.g. Paralegal, Junior Associate
    access: { type: String, enum: ['full', 'limited'], default: 'full' }, // employee case access level
    assignedCases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case' }], // used when access === 'limited'

    bar: { type: String, default: '' }, // Bar registration number (advocates)

    // For employees: reference to the advocate/workspace they belong to.
    // For advocates: null (they own their own workspace).
    workspaceOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    plan: { type: String, enum: ['solo', 'chamber', 'enterprise'], default: 'solo' },
    subscriptionPlan: { type: Number, default: 199 }, // price point, mirrors frontend

    driveConnected: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// A user must have either an email (advocate) or a dcId (employee)
userSchema.pre('validate', function (next) {
  if (!this.email && !this.dcId) {
    return next(new Error('User must have either an email or a DC ID'));
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Helper: the workspace ID data is scoped under (advocates: their own id; employees: their owner's id)
userSchema.methods.workspaceId = function () {
  return this.role === 'advocate' ? this._id : this.workspaceOwner;
};

module.exports = mongoose.model('User', userSchema);
