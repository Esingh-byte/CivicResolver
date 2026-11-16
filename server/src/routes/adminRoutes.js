const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  verifyComplaint,
  assignComplaint,
  getAllOfficers,
  getAllDepartments
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/departments', authorize('SYSTEM_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_OFFICER'), getAllDepartments);
router.get('/stats', authorize('SYSTEM_ADMIN', 'SUPER_ADMIN'), getDashboardStats);
router.put('/verify/:id', authorize('SYSTEM_ADMIN', 'SUPER_ADMIN'), verifyComplaint);
router.put('/assign/:id', authorize('SYSTEM_ADMIN', 'SUPER_ADMIN'), assignComplaint);
router.get('/officers', authorize('SYSTEM_ADMIN', 'SUPER_ADMIN'), getAllOfficers);

module.exports = router;
