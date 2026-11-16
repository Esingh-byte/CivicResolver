const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const Department = require('../models/Department');
const { extractToken } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z\s.'-]{3,80}$/;
// Strong password: >= 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Generate JWT Token
const generateToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(
    {
      id: user._id,
      role: User.normalizeRole(user.role),
      tokenVersion: user.tokenVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// Set secure HttpOnly cookie
const setAuthCookie = (res, token, rememberMe = false) => {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('cr_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
};

const clearAuthCookie = (res) => {
  res.cookie('cr_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  });
};

const formatUserResponse = (user, token) => {
  const canonicalRole = User.normalizeRole(user.role);
  const payload = {
    _id: user._id,
    userId: user.userId,
    citizenId: canonicalRole === 'CITIZEN' ? (user.citizenId || user.userId) : user.citizenId,
    name: user.name,
    email: user.email,
    role: canonicalRole,
    phone: user.phone || '',
    ward: user.ward || '',
    department: user.department || null
  };
  if (token) {
    payload.token = token;
  }
  return payload;
};

// @desc    Public Citizen Registration (ALWAYS creates a CITIZEN account)
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, ward } = req.body || {};
    const errors = {};

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const rawPassword = password || '';
    const trimmedPhone = (phone || '').trim();
    const trimmedWard = (ward || '').trim();

    if (!trimmedName) {
      errors.name = 'Full name is required';
    } else if (!NAME_REGEX.test(trimmedName)) {
      errors.name = 'Full name must be at least 3 characters and contain valid letters';
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!rawPassword) {
      errors.password = 'Password is required';
    } else if (!STRONG_PASSWORD_REGEX.test(rawPassword)) {
      errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
    }

    if (confirmPassword !== undefined && rawPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (trimmedPhone && !/^[+\d][\d\s-]{7,18}$/.test(trimmedPhone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({ message: firstError, errors });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({
        message: 'An account with this email address already exists',
        errors: { email: 'An account with this email address already exists' }
      });
    }

    // SECURITY: Public registration ALWAYS creates a CITIZEN account, ignoring req.body.role
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: rawPassword,
      role: 'CITIZEN',
      phone: trimmedPhone,
      ward: trimmedWard
    });

    const responseData = formatUserResponse(user);
    return res.status(201).json({
      ...responseData,
      message: 'Citizen account created successfully! Please sign in with your credentials.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An account with this email address already exists',
        errors: { email: 'An account with this email address already exists' }
      });
    }
    console.error('REGISTER ERROR:', error.message);
    return res.status(500).json({ message: 'Registration failed due to a server error' });
  }
};

// @desc    Login user with Email or User ID
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, email, userId, password, rememberMe } = req.body || {};
    const rawIdentifier = (identifier || email || userId || '').trim();
    const rawPassword = password || '';

    if (!rawIdentifier || !rawPassword) {
      return res.status(400).json({
        message: 'Please provide both your Email / User ID and password'
      });
    }

    // Lookup by email (case-insensitive) OR by userId / citizenId (case-insensitive)
    const isEmailInput = rawIdentifier.includes('@');
    const query = isEmailInput
      ? { email: rawIdentifier.toLowerCase() }
      : {
          $or: [
            { userId: rawIdentifier.toUpperCase() },
            { citizenId: rawIdentifier.toUpperCase() },
            { email: rawIdentifier.toLowerCase() }
          ]
        };

    const user = await User.findOne(query)
      .select('+password')
      .populate('department', 'name code');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email/User ID or password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
    }

    const isMatch = await user.matchPassword(rawPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email/User ID or password' });
    }

    // Ensure legacy roles and missing userIds are normalized on login
    const canonicalRole = User.normalizeRole(user.role);
    if (user.role !== canonicalRole || !user.userId) {
      user.role = canonicalRole;
      await user.save();
    }

    const token = generateToken(user, Boolean(rememberMe));
    setAuthCookie(res, token, Boolean(rememberMe));

    return res.json(formatUserResponse(user, token));
  } catch (error) {
    console.error('LOGIN ERROR:', error.message);
    return res.status(500).json({ message: 'Sign in failed due to a server error' });
  }
};

// @desc    Logout user & invalidate current token/session
// @route   POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, { $inc: { tokenVersion: 1 } });
      } catch (e) {
        // Token already expired or invalid
      }
    }
    clearAuthCookie(res);
    return res.json({ message: 'Signed out successfully' });
  } catch (error) {
    clearAuthCookie(res);
    return res.json({ message: 'Signed out successfully' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('department', 'name code');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(formatUserResponse(user));
  } catch (error) {
    console.error('GET PROFILE ERROR:', error.message);
    return res.status(500).json({ message: 'Failed to load profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password').populate('department', 'name code');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.name) {
      const trimmedName = req.body.name.trim();
      if (!NAME_REGEX.test(trimmedName)) {
        return res.status(400).json({ message: 'Full name must be at least 3 characters' });
      }
      user.name = trimmedName;
    }

    if (req.body.phone !== undefined) user.phone = String(req.body.phone).trim();
    if (req.body.ward !== undefined) user.ward = String(req.body.ward).trim();

    if (req.body.password) {
      if (!STRONG_PASSWORD_REGEX.test(req.body.password)) {
        return res.status(400).json({
          message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
        });
      }
      user.password = req.body.password;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    const updatedUser = await user.save();
    const token = generateToken(updatedUser);
    setAuthCookie(res, token);

    return res.json(formatUserResponse(updatedUser, token));
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error.message);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

// @desc    Forgot Password - generate single-use reset token
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email: trimmedEmail }).select('+resetPasswordToken +resetPasswordExpire');
    const genericMsg = 'If an account with that email exists, password reset instructions have been generated.';

    if (!user) {
      return res.json({ message: genericMsg });
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawResetToken);
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const response = { message: genericMsg };
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = rawResetToken;
      response.resetLink = `/reset-password?token=${rawResetToken}`;
    }

    return res.json(response);
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error.message);
    return res.status(500).json({ message: 'Unable to process password reset request' });
  }
};

// @desc    Reset Password with single-use token
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const rawToken = req.params.token || req.body.token;
    const { password, confirmPassword } = req.body || {};

    if (!rawToken) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    if (!password || !STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: new Date() }
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    clearAuthCookie(res);
    return res.json({ message: 'Password has been reset successfully. Please sign in with your new password.' });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error.message);
    return res.status(500).json({ message: 'Unable to reset password' });
  }
};

// @desc    Create staff invitation (Authorized Admin or Municipal Officer for their own department)
// @route   POST /api/auth/invitations
const createInvitation = async (req, res) => {
  try {
    const { name, email, role, departmentId, ward, phone } = req.body || {};
    const inviterRole = User.normalizeRole(req.user.role);

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const targetRole = String(role || '').trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 3) {
      return res.status(400).json({ message: 'Staff member name must be at least 3 characters' });
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid staff email address' });
    }
    if (!['MUNICIPAL_OFFICER', 'FIELD_WORKER'].includes(targetRole)) {
      return res.status(400).json({ message: 'Invited role must be MUNICIPAL_OFFICER or FIELD_WORKER' });
    }

    // Department-level & Role-level Authorization Enforcement
    let resolvedDeptId = departmentId || (req.user.department?._id || req.user.department);

    if (inviterRole === 'MUNICIPAL_OFFICER') {
      // Municipal Officers cannot invite other Municipal Officers or Admins — only Field Workers
      if (targetRole !== 'FIELD_WORKER') {
        return res.status(403).json({
          message: 'Municipal Officers are only authorized to invite Field Workers'
        });
      }

      const officerDeptId = req.user.department?._id
        ? String(req.user.department._id)
        : req.user.department
          ? String(req.user.department)
          : null;

      if (!officerDeptId) {
        return res.status(403).json({
          message: 'You are not assigned to a department and cannot issue staff invitations'
        });
      }

      if (departmentId && String(departmentId) !== officerDeptId) {
        return res.status(403).json({
          message: 'You cannot invite or manage staff outside your authorized department'
        });
      }

      resolvedDeptId = officerDeptId;
    } else if (!['SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(inviterRole)) {
      return res.status(403).json({ message: 'Not authorized to issue staff invitations' });
    }

    if (!resolvedDeptId) {
      return res.status(400).json({ message: 'Department is required for staff invitations' });
    }

    const department = await Department.findById(resolvedDeptId);
    if (!department) {
      return res.status(404).json({ message: 'Selected department was not found' });
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user account already exists with this email address' });
    }

    // Revoke any existing pending invitations for this email
    await Invitation.updateMany(
      { email: trimmedEmail, status: 'pending' },
      { $set: { status: 'revoked' } }
    );

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(rawToken);
    const inviteCode = `INV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const invitation = await Invitation.create({
      name: trimmedName,
      email: trimmedEmail,
      role: targetRole,
      department: department._id,
      ward: (ward || '').trim(),
      phone: (phone || '').trim(),
      tokenHash,
      inviteCode,
      invitedBy: req.user._id,
      expiresAt,
      status: 'pending'
    });

    const populated = await Invitation.findById(invitation._id)
      .populate('department', 'name code')
      .populate('invitedBy', 'name email role');

    return res.status(201).json({
      message: 'Staff invitation created successfully',
      invitation: populated,
      inviteToken: rawToken,
      inviteLink: `/activate?token=${rawToken}`
    });
  } catch (error) {
    console.error('CREATE INVITATION ERROR:', error.message);
    return res.status(500).json({ message: 'Failed to create staff invitation' });
  }
};

// @desc    Get staff invitations (scoped by role/department)
// @route   GET /api/auth/invitations
const getInvitations = async (req, res) => {
  try {
    const inviterRole = User.normalizeRole(req.user.role);
    const filter = {};

    if (inviterRole === 'MUNICIPAL_OFFICER') {
      const officerDeptId = req.user.department?._id || req.user.department;
      if (!officerDeptId) {
        return res.json([]);
      }
      filter.department = officerDeptId;
      filter.role = 'FIELD_WORKER';
    }

    const invitations = await Invitation.find(filter)
      .populate('department', 'name code')
      .populate('invitedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json(invitations);
  } catch (error) {
    console.error('GET INVITATIONS ERROR:', error.message);
    return res.status(500).json({ message: 'Failed to fetch invitations' });
  }
};

// @desc    Verify an invitation token
// @route   GET /api/auth/invitations/verify/:token
const verifyInvitation = async (req, res) => {
  try {
    const rawToken = (req.params.token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ message: 'Invitation token is required' });
    }

    const tokenHash = hashToken(rawToken);
    const invitation = await Invitation.findOne({ tokenHash })
      .populate('department', 'name code description')
      .populate('invitedBy', 'name role');

    if (!invitation) {
      return res.status(400).json({ message: 'Invalid invitation link or token' });
    }

    if (invitation.status === 'accepted' || invitation.usedAt) {
      return res.status(400).json({ message: 'This invitation has already been used to activate an account' });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({ message: 'This invitation has been revoked by an administrator' });
    }

    if (invitation.expiresAt <= new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({ message: 'This invitation has expired. Please request a new invitation.' });
    }

    return res.json({
      valid: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        ward: invitation.ward,
        phone: invitation.phone,
        inviteCode: invitation.inviteCode,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy
      }
    });
  } catch (error) {
    console.error('VERIFY INVITATION ERROR:', error.message);
    return res.status(500).json({ message: 'Failed to verify invitation' });
  }
};

// @desc    Activate staff account using single-use invitation token
// @route   POST /api/auth/invitations/activate
const activateInvitation = async (req, res) => {
  try {
    const { token, name, password, confirmPassword, phone, ward } = req.body || {};
    const rawToken = (token || '').trim();

    if (!rawToken) {
      return res.status(400).json({ message: 'Invitation token is required' });
    }

    const tokenHash = hashToken(rawToken);
    const invitation = await Invitation.findOne({ tokenHash }).populate('department', 'name code');

    if (!invitation) {
      return res.status(400).json({ message: 'Invalid invitation token' });
    }

    if (invitation.status === 'accepted' || invitation.usedAt) {
      return res.status(400).json({ message: 'This invitation has already been used' });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({ message: 'This invitation has been revoked' });
    }

    if (invitation.expiresAt <= new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({ message: 'This invitation has expired' });
    }

    if (!password || !STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email is already active' });
    }

    const finalName = (name || invitation.name || '').trim();
    if (!NAME_REGEX.test(finalName)) {
      return res.status(400).json({ message: 'Full name must be at least 3 characters' });
    }

    // SECURITY: Role and department come strictly from the server-side Invitation document
    const user = await User.create({
      name: finalName,
      email: invitation.email,
      password,
      role: invitation.role,
      department: invitation.department._id || invitation.department,
      phone: (phone !== undefined ? phone : invitation.phone || '').trim(),
      ward: (ward !== undefined ? ward : invitation.ward || '').trim(),
      isActive: true
    });

    invitation.status = 'accepted';
    invitation.usedAt = new Date();
    await invitation.save();

    const populatedUser = await User.findById(user._id).populate('department', 'name code');

    return res.status(201).json({
      ...formatUserResponse(populatedUser),
      message: 'Staff account activated successfully! Please sign in to access your dashboard.'
    });
  } catch (error) {
    console.error('ACTIVATE INVITATION ERROR:', error.message);
    return res.status(500).json({ message: 'Failed to activate staff account' });
  }
};

module.exports = {
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
};
