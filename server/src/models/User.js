const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ROLES = [
  'CITIZEN',
  'MUNICIPAL_OFFICER',
  'FIELD_WORKER',
  'SYSTEM_ADMIN',
  'SUPER_ADMIN'
];

const ROLE_PREFIX = {
  CITIZEN: 'CR-CIT',
  MUNICIPAL_OFFICER: 'CR-OFF',
  FIELD_WORKER: 'CR-FWK',
  SYSTEM_ADMIN: 'CR-ADM',
  SUPER_ADMIN: 'CR-SUP'
};

const normalizeRole = (role) => {
  if (!role) return 'CITIZEN';
  const upper = String(role).trim().toUpperCase();
  if (upper === 'CITIZEN') return 'CITIZEN';
  if (upper === 'OFFICER' || upper === 'MUNICIPAL_OFFICER') return 'MUNICIPAL_OFFICER';
  if (upper === 'FIELD_WORKER' || upper === 'WORKER') return 'FIELD_WORKER';
  if (upper === 'ADMIN' || upper === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (upper === 'SUPER_ADMIN' || upper === 'SUPERADMIN') return 'SUPER_ADMIN';
  return ROLES.includes(upper) ? upper : 'CITIZEN';
};

const generateUniqueUserId = (role) => {
  const prefix = ROLE_PREFIX[normalizeRole(role)] || 'CR-USR';
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
};

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  citizenId: {
    type: String,
    default: null,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [3, 'Full name must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: [...ROLES, 'citizen', 'officer', 'admin'],
    default: 'CITIZEN'
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  ward: {
    type: String,
    default: '',
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  resetPasswordToken: {
    type: String,
    select: false,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
    default: null
  }
}, {
  timestamps: true
});

// Normalize role and generate userId / citizenId before validation
userSchema.pre('validate', async function() {
  this.role = normalizeRole(this.role);

  if (!this.userId) {
    let candidate = generateUniqueUserId(this.role);
    const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
    for (let i = 0; i < 5; i++) {
      const existing = await UserModel.findOne({ userId: candidate }).select('_id').lean();
      if (!existing) break;
      candidate = generateUniqueUserId(this.role);
    }
    this.userId = candidate;
  }

  if (this.role === 'CITIZEN' && !this.citizenId) {
    this.citizenId = this.userId;
  }
});

// Hash password before saving (Mongoose 9: no next() in async hooks)
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;
User.normalizeRole = normalizeRole;

module.exports = User;
