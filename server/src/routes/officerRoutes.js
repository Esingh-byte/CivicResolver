const express = require('express');
const router = express.Router();
const {
  getAssignedComplaints,
  getOfficerStats,
  updateProgress,
  resolveComplaint,
  getDepartmentStaff
} = require('../controllers/officerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('MUNICIPAL_OFFICER', 'FIELD_WORKER'));

router.get('/complaints', getAssignedComplaints);
router.get('/stats', getOfficerStats);
router.get('/staff', authorize('MUNICIPAL_OFFICER'), getDepartmentStaff);
router.put('/progress/:id', updateProgress);
router.put('/resolve/:id', resolveComplaint);

module.exports = router;
