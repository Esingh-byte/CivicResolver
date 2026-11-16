const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Staff member name is required'],
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: [true, 'Staff email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  role: {
    type: String,
    required: [true, 'Staff role is required'],
    enum: ['MUNICIPAL_OFFICER', 'FIELD_WORKER']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  ward: {
    type: String,
    default: '',
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  inviteCode: {
    type: String,
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'revoked', 'expired'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invitation', invitationSchema);
