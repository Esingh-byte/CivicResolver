const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  createInvitation,
  getInvitations,
  verifyInvitation,
  activateInvitation
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/invitations/verify/:token', verifyInvitation);
router.post('/invitations/activate', activateInvitation);
router.post('/invitations', protect, authorize('SYSTEM_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_OFFICER'), createInvitation);
router.get('/invitations', protect, authorize('SYSTEM_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_OFFICER'), getInvitations);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
