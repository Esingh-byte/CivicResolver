const express = require('express');
const router = express.Router();
const {
  getComplaintMeta,
  createComplaint,
  getComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  upvoteComplaint,
  addFeedback
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

router.get('/meta', protect, getComplaintMeta);
router.post('/', protect, authorize('CITIZEN'), createComplaint);
router.get('/', protect, getComplaints);
router.get('/all', protect, authorize('SYSTEM_ADMIN', 'SUPER_ADMIN'), getAllComplaints);
router.get('/:id', protect, getComplaintById);
router.put('/:id/status', protect, authorize('SYSTEM_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_OFFICER', 'FIELD_WORKER'), updateComplaintStatus);
router.put('/:id/upvote', protect, upvoteComplaint);
router.put('/:id/feedback', protect, authorize('CITIZEN'), addFeedback);

module.exports = router;
