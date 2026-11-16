const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get complaint categories and departments for the Report Issue form
// @route   GET /api/complaints/meta
const getComplaintMeta = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    const categories = Complaint.CATEGORIES || [
      'Road Damage', 'Pothole', 'Bridge Issue',
      'Garbage', 'Drainage', 'Sewage',
      'Water Leakage', 'Pipeline Burst', 'Water Supply',
      'Street Light', 'Power Outage', 'Electricity Fault',
      'Hospital', 'Medical Emergency', 'Sanitation',
      'Traffic', 'Parking', 'Public Transport',
      'Other'
    ];
    res.json({ categories, departments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load categories and departments' });
  }
};

// @desc    Create complaint
// @route   POST /api/complaints
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, images, priority, departmentId } = req.body || {};

    const trimmedTitle = (title || '').trim();
    const trimmedDesc = (description || '').trim();
    const trimmedCategory = (category || '').trim();

    const errors = {};
    if (!trimmedTitle) {
      errors.title = 'Issue title is required';
    } else if (trimmedTitle.length < 5) {
      errors.title = 'Issue title must be at least 5 characters';
    }

    if (!trimmedCategory) {
      errors.category = 'Please select an issue category';
    } else if (Complaint.CATEGORIES && !Complaint.CATEGORIES.includes(trimmedCategory)) {
      errors.category = 'Please select a valid issue category';
    }

    if (!trimmedDesc) {
      errors.description = 'Issue description is required';
    } else if (trimmedDesc.length < 10) {
      errors.description = 'Please provide a description of at least 10 characters';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: Object.values(errors)[0],
        errors
      });
    }

    // Resolve department: explicit departmentId if valid, otherwise auto-match by category
    let resolvedDepartmentId = null;
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      const explicitDept = await Department.findById(departmentId);
      if (explicitDept) resolvedDepartmentId = explicitDept._id;
    }
    if (!resolvedDepartmentId) {
      const dept = await Department.findOne({ categories: trimmedCategory });
      if (dept) {
        resolvedDepartmentId = dept._id;
      }
    }

    const sanitizedLocation = {
      address: (location?.address || '').trim(),
      lat: Number(location?.lat) || 0,
      lng: Number(location?.lng) || 0
    };

    const sanitizedImages = Array.isArray(images) ? images.slice(0, 5) : [];

    const complaint = await Complaint.create({
      title: trimmedTitle,
      description: trimmedDesc,
      category: trimmedCategory,
      location: sanitizedLocation,
      images: sanitizedImages,
      priority: ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium',
      citizen: req.user._id,
      department: resolvedDepartmentId
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email userId citizenId')
      .populate('department', 'name code description contactEmail contactPhone');

    res.status(201).json(populated);
  } catch (error) {
    console.error('CREATE COMPLAINT ERROR:', error.message);
    res.status(500).json({ message: error.message || 'Failed to submit complaint' });
  }
};

// @desc    Get all complaints (filtered by role)
// @route   GET /api/complaints
const getComplaints = async (req, res) => {
  try {
    let filter = {};
    const { status, category, page = 1, limit = 20 } = req.query;
    const role = User.normalizeRole(req.user.role);

    // Role-based filtering
    if (role === 'CITIZEN') {
      filter.citizen = req.user._id;
    } else if (role === 'MUNICIPAL_OFFICER' || role === 'FIELD_WORKER') {
      filter.assignedOfficer = req.user._id;
    }
    // SYSTEM_ADMIN and SUPER_ADMIN see all

    if (status) filter.status = status;
    if (category) filter.category = category;

    const complaints = await Complaint.find(filter)
      .populate('citizen', 'name email userId citizenId')
      .populate('department', 'name code')
      .populate('assignedOfficer', 'name email role userId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Backfill complaintId on any legacy complaints missing it
    for (const c of complaints) {
      if (!c.complaintId) {
        await c.save();
      }
    }

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all complaints for admin view
// @route   GET /api/complaints/all
const getAllComplaints = async (req, res) => {
  try {
    const { status, category } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const complaints = await Complaint.find(filter)
      .populate('citizen', 'name email userId citizenId')
      .populate('department', 'name code')
      .populate('assignedOfficer', 'name email role userId')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single complaint by MongoDB _id or complaintId
// @route   GET /api/complaints/:id
const getComplaintById = async (req, res) => {
  try {
    const paramId = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(paramId)
      ? { _id: paramId }
      : { complaintId: String(paramId).toUpperCase() };

    const complaint = await Complaint.findOne(query)
      .populate('citizen', 'name email phone userId citizenId')
      .populate('department', 'name code description contactEmail contactPhone')
      .populate('assignedOfficer', 'name email phone role userId')
      .populate('timeline.updatedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Enforce citizen ownership so a citizen cannot access another citizen's private complaint
    const role = User.normalizeRole(req.user.role);
    const ownerId = complaint.citizen?._id ? complaint.citizen._id.toString() : complaint.citizen?.toString();
    if (role === 'CITIZEN' && ownerId && ownerId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to view this complaint' });
    }

    if (!complaint.complaintId) {
      await complaint.save();
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update complaint status  
// @route   PUT /api/complaints/:id/status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, message } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    complaint.timeline.push({
      status,
      message: message || `Status updated to ${status}`,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    // Notify citizen
    await Notification.create({
      user: complaint.citizen,
      title: 'Complaint Status Updated',
      message: `Your complaint "${complaint.title}" status changed to ${status.replace('_', ' ')}`,
      type: 'status_update',
      complaint: complaint._id
    });

    const updated = await Complaint.findById(complaint._id)
      .populate('citizen', 'name email userId')
      .populate('department', 'name code')
      .populate('assignedOfficer', 'name email role userId')
      .populate('timeline.updatedBy', 'name role');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upvote complaint
// @route   PUT /api/complaints/:id/upvote
const upvoteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const userId = req.user._id;
    const index = complaint.upvotes.indexOf(userId);

    if (index === -1) {
      complaint.upvotes.push(userId);
    } else {
      complaint.upvotes.splice(index, 1);
    }

    await complaint.save();
    res.json({ upvotes: complaint.upvotes.length, hasUpvoted: index === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add feedback to resolved complaint
// @route   PUT /api/complaints/:id/feedback
const addFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (complaint.citizen.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the filing citizen can give feedback' });
    }

    complaint.feedback = { rating, comment };
    if (rating) {
      complaint.status = 'closed';
      complaint.timeline.push({
        status: 'closed',
        message: `Complaint closed with ${rating}-star feedback`,
        updatedBy: req.user._id,
        timestamp: new Date()
      });
    }

    await complaint.save();
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getComplaintMeta,
  createComplaint,
  getComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  upvoteComplaint,
  addFeedback
};
