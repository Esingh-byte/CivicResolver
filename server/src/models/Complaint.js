const mongoose = require('mongoose');
const crypto = require('crypto');

const timelineEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const generateComplaintId = () => {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CR-CMP-${randomPart}`;
};

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 2000
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Road Damage', 'Pothole', 'Bridge Issue',
      'Garbage', 'Drainage', 'Sewage',
      'Water Leakage', 'Pipeline Burst', 'Water Supply',
      'Street Light', 'Power Outage', 'Electricity Fault',
      'Hospital', 'Medical Emergency', 'Sanitation',
      'Traffic', 'Parking', 'Public Transport',
      'Other'
    ]
  },
  status: {
    type: String,
    enum: ['submitted', 'verified', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  location: {
    address: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  images: [{
    type: String
  }],
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  timeline: [timelineEntrySchema],
  feedback: {
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: '' }
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Generate unique complaintId before validation
complaintSchema.pre('validate', async function() {
  if (!this.complaintId) {
    let candidate = generateComplaintId();
    const ComplaintModel = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
    for (let i = 0; i < 5; i++) {
      const existing = await ComplaintModel.findOne({ complaintId: candidate }).select('_id').lean();
      if (!existing) break;
      candidate = generateComplaintId();
    }
    this.complaintId = candidate;
  }
});

// Add initial timeline entry on create
complaintSchema.pre('save', function() {
  if (this.isNew && (!this.timeline || this.timeline.length === 0)) {
    this.timeline.push({
      status: 'submitted',
      message: 'Complaint submitted by citizen',
      updatedBy: this.citizen,
      timestamp: new Date()
    });
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
Complaint.CATEGORIES = complaintSchema.path('category').enumValues;

module.exports = Complaint;
