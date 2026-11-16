const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('node:path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../server');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const Invitation = require('../src/models/Invitation');
const Complaint = require('../src/models/Complaint');
const seedDepartments = require('../src/config/seedDepartments');

let server;
let baseUrl;

// Helper for HTTP requests
const request = (method, urlPath, { body, token, cookie } = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let data = raw;
        try {
          data = JSON.parse(raw);
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

describe('CivicResolver Authentication, Registration, RBAC & Complaint Workflow Suite', () => {
  const testRunId = Date.now();
  const citizenEmail = `citizen.${testRunId}@civicresolver.test`;
  const secondCitizenEmail = `citizen2.${testRunId}@civicresolver.test`;
  const citizenPassword = 'Citizen@123';
  let citizenUserId = null;
  let citizenToken = null;
  let citizenCookie = null;
  let secondCitizenToken = null;
  let createdComplaintId = null;
  let createdComplaintCode = null;

  before(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicresolver';
    await mongoose.connect(mongoUri);
    await seedDepartments();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up only temporary test artifacts created during this run
    if (createdComplaintId) {
      await Complaint.deleteOne({ _id: createdComplaintId });
    }
    await User.deleteMany({ email: new RegExp(`${testRunId}@civicresolver\\.test$`, 'i') });
    await Invitation.deleteMany({ email: new RegExp(`${testRunId}@civicresolver\\.test$`, 'i') });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  test('1. Valid citizen registration succeeds and returns CITIZEN role & unique Citizen ID', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: {
        name: 'Aarav Kulkarni',
        email: citizenEmail,
        password: citizenPassword,
        confirmPassword: citizenPassword,
        phone: '+91 9876543210',
        ward: 'Ward 5 - Shivaji Nagar'
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.role, 'CITIZEN');
    assert.equal(res.data.email, citizenEmail);
    assert.equal(res.data.ward, 'Ward 5 - Shivaji Nagar');
    assert.match(res.data.userId, /^CR-CIT-[A-Z0-9]{6}$/);
    assert.equal(res.data.citizenId, res.data.userId);
    citizenUserId = res.data.userId;
  });

  test('2. Empty required fields are rejected with 400 and field errors', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: { name: '', email: '', password: '' }
    });

    assert.equal(res.status, 400);
    assert.ok(res.data.errors);
    assert.ok(res.data.errors.name);
    assert.ok(res.data.errors.email);
    assert.ok(res.data.errors.password);
  });

  test('3. Invalid email format is rejected with 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: {
        name: 'Test User',
        email: 'not-an-email-address',
        password: 'ValidPass@123',
        confirmPassword: 'ValidPass@123'
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.data.message, /valid email/i);
  });

  test('4. Duplicate email registration is prevented with 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: {
        name: 'Duplicate User',
        email: citizenEmail.toUpperCase(),
        password: citizenPassword,
        confirmPassword: citizenPassword
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.data.message, /already exists/i);
  });

  test('5. Password mismatch is rejected with 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: {
        name: 'Mismatch User',
        email: `mismatch.${testRunId}@civicresolver.test`,
        password: 'ValidPass@123',
        confirmPassword: 'DifferentPass@123'
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.data.message, /do not match/i);
  });

  test('6. Weak password is rejected with 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: {
        name: 'Weak Password User',
        email: `weak.${testRunId}@civicresolver.test`,
        password: 'weak1',
        confirmPassword: 'weak1'
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.data.message, /at least 8 characters/i);
  });

  test('7. Database persistence & bcrypt password hashing verified in MongoDB', async () => {
    const dbUser = await User.findOne({ email: citizenEmail }).select('+password');
    assert.ok(dbUser, 'Citizen user must exist in MongoDB');
    assert.equal(dbUser.role, 'CITIZEN');
    assert.equal(dbUser.userId, citizenUserId);
    assert.notEqual(dbUser.password, citizenPassword, 'Password must be hashed in database');
    assert.match(dbUser.password, /^\$2[aby]\$\d{2}\$/);
  });

  test('8. Successful citizen login works with Email AND with Citizen User ID, setting HttpOnly cookie', async () => {
    const emailLogin = await request('POST', '/api/auth/login', {
      body: { identifier: citizenEmail, password: citizenPassword, rememberMe: true }
    });
    assert.equal(emailLogin.status, 200);
    assert.equal(emailLogin.data.role, 'CITIZEN');
    assert.ok(emailLogin.data.token);
    const setCookieHeader = emailLogin.headers['set-cookie'];
    assert.ok(setCookieHeader && setCookieHeader.some((c) => c.includes('cr_token=') && c.includes('HttpOnly')));

    const idLogin = await request('POST', '/api/auth/login', {
      body: { identifier: citizenUserId, password: citizenPassword }
    });
    assert.equal(idLogin.status, 200);
    assert.equal(idLogin.data.email, citizenEmail);
    citizenToken = idLogin.data.token;
    citizenCookie = idLogin.headers['set-cookie'][0].split(';')[0];
  });

  test('9. Incorrect password fails login with 401 and generic message', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { identifier: citizenEmail, password: 'WrongPassword@999' }
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.message, 'Invalid email/User ID or password');
  });

  test('10. Unknown email fails login with 401 and generic message', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { identifier: `unknown.${testRunId}@civicresolver.test`, password: 'SomePassword@123' }
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.message, 'Invalid email/User ID or password');
  });

  test('11. Invalid, expired, and already-used staff invitations are rejected', async () => {
    const invalidRes = await request('GET', '/api/auth/invitations/verify/invalid_token_12345');
    assert.equal(invalidRes.status, 400);
    assert.match(invalidRes.data.message, /Invalid invitation/i);

    const adminLogin = await request('POST', '/api/auth/login', {
      body: { identifier: 'admin@civicresolver.com', password: 'Admin@123' }
    });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.data.token;

    const pwdDept = await Department.findOne({ code: 'PWD' });
    const inviteEmail = `staff.invite.${testRunId}@civicresolver.test`;

    const createInviteRes = await request('POST', '/api/auth/invitations', {
      token: adminToken,
      body: {
        name: 'Invited Officer',
        email: inviteEmail,
        role: 'MUNICIPAL_OFFICER',
        departmentId: pwdDept._id.toString(),
        ward: 'Ward 3'
      }
    });
    assert.equal(createInviteRes.status, 201);
    const rawInviteToken = createInviteRes.data.inviteToken;

    const verifyRes = await request('GET', `/api/auth/invitations/verify/${rawInviteToken}`);
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.data.invitation.role, 'MUNICIPAL_OFFICER');

    const activateRes = await request('POST', '/api/auth/invitations/activate', {
      body: {
        token: rawInviteToken,
        name: 'Invited Officer',
        password: 'StaffPassword@123',
        confirmPassword: 'StaffPassword@123',
        phone: '+91 9876511111'
      }
    });
    assert.equal(activateRes.status, 201);
    assert.equal(activateRes.data.role, 'MUNICIPAL_OFFICER');

    const reuseRes = await request('POST', '/api/auth/invitations/activate', {
      body: {
        token: rawInviteToken,
        name: 'Invited Officer',
        password: 'StaffPassword@123',
        confirmPassword: 'StaffPassword@123'
      }
    });
    assert.equal(reuseRes.status, 400);
    assert.match(reuseRes.data.message, /already been used/i);
  });

  test('12. Unauthorized staff registration and cross-department invitation attempts are blocked', async () => {
    const spoofEmail = `spoof.${testRunId}@civicresolver.test`;
    const spoofRes = await request('POST', '/api/auth/register', {
      body: {
        name: 'Role Spoofer',
        email: spoofEmail,
        password: 'SpoofPassword@123',
        confirmPassword: 'SpoofPassword@123',
        role: 'SUPER_ADMIN'
      }
    });
    assert.equal(spoofRes.status, 201);
    assert.equal(spoofRes.data.role, 'CITIZEN', 'Public registration must ignore browser-supplied role');

    const citizenInviteAttempt = await request('POST', '/api/auth/invitations', {
      token: citizenToken,
      body: {
        name: 'Unauthorized Invite',
        email: `unauth.${testRunId}@civicresolver.test`,
        role: 'FIELD_WORKER'
      }
    });
    assert.equal(citizenInviteAttempt.status, 403);

    const officerLogin = await request('POST', '/api/auth/login', {
      body: { identifier: 'officer@civicresolver.com', password: 'Officer@123' }
    });
    assert.equal(officerLogin.status, 200);
    const officerToken = officerLogin.data.token;

    const otherDept = await Department.findOne({ code: 'SAN' });
    const crossDeptAttempt = await request('POST', '/api/auth/invitations', {
      token: officerToken,
      body: {
        name: 'Cross Dept Worker',
        email: `crossdept.${testRunId}@civicresolver.test`,
        role: 'FIELD_WORKER',
        departmentId: otherDept._id.toString()
      }
    });
    assert.equal(crossDeptAttempt.status, 403);
    assert.match(crossDeptAttempt.data.message, /outside your authorized department/i);

    const elevateRoleAttempt = await request('POST', '/api/auth/invitations', {
      token: officerToken,
      body: {
        name: 'Another Officer',
        email: `elevate.${testRunId}@civicresolver.test`,
        role: 'MUNICIPAL_OFFICER'
      }
    });
    assert.equal(elevateRoleAttempt.status, 403);
  });

  test('13. Correct database roles returned for all 5 roles on login for role-based redirection', async () => {
    const roleAccounts = [
      { id: citizenEmail, pass: citizenPassword, expectedRole: 'CITIZEN' },
      { id: 'officer@civicresolver.com', pass: 'Officer@123', expectedRole: 'MUNICIPAL_OFFICER' },
      { id: 'worker@civicresolver.com', pass: 'Worker@123', expectedRole: 'FIELD_WORKER' },
      { id: 'admin@civicresolver.com', pass: 'Admin@123', expectedRole: 'SYSTEM_ADMIN' },
      { id: 'superadmin@civicresolver.com', pass: 'Admin@123', expectedRole: 'SUPER_ADMIN' }
    ];

    for (const acct of roleAccounts) {
      const res = await request('POST', '/api/auth/login', {
        body: { identifier: acct.id, password: acct.pass }
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.role, acct.expectedRole);
    }
  });

  test('14. Unauthorized dashboard / API endpoint access is blocked with 401 / 403', async () => {
    const unauthRes = await request('GET', '/api/admin/stats');
    assert.equal(unauthRes.status, 401);

    const citizenAdminRes = await request('GET', '/api/admin/stats', { token: citizenToken });
    assert.equal(citizenAdminRes.status, 403);

    const citizenOfficerRes = await request('GET', '/api/officer/stats', { token: citizenToken });
    assert.equal(citizenOfficerRes.status, 403);
  });

  test('15. Complaint Workflow: Load categories & departments via /api/complaints/meta', async () => {
    const metaRes = await request('GET', '/api/complaints/meta', { token: citizenToken });
    assert.equal(metaRes.status, 200);
    assert.ok(Array.isArray(metaRes.data.categories));
    assert.ok(metaRes.data.categories.includes('Road Damage'));
    assert.ok(Array.isArray(metaRes.data.departments));
    assert.ok(metaRes.data.departments.length >= 6);
  });

  test('16. Complaint Workflow: Reject invalid complaint submission with 400', async () => {
    const invalidRes = await request('POST', '/api/complaints', {
      token: citizenToken,
      body: { title: '', description: '', category: '' }
    });
    assert.equal(invalidRes.status, 400);
    assert.ok(invalidRes.data.errors);
  });

  test('17. Complaint Workflow: Submit valid complaint, verify MongoDB persistence & generated CR-CMP-XXXXXX ID', async () => {
    const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const createRes = await request('POST', '/api/complaints', {
      token: citizenToken,
      body: {
        title: 'Severe Pothole Near Shivaji Nagar Metro Station',
        description: 'Large pothole causing traffic hazard and waterlogging on the main carriageway.',
        category: 'Pothole',
        priority: 'high',
        location: {
          address: 'Shivaji Nagar Metro Road, Ward 5',
          lat: 18.5308,
          lng: 73.8475
        },
        images: [sampleImage]
      }
    });

    assert.equal(createRes.status, 201);
    assert.match(createRes.data.complaintId, /^CR-CMP-[A-Z0-9]{6}$/);
    assert.equal(createRes.data.status, 'submitted');
    assert.equal(createRes.data.department.code, 'PWD');
    assert.equal(createRes.data.images.length, 1);

    createdComplaintId = createRes.data._id;
    createdComplaintCode = createRes.data.complaintId;

    // Verify in MongoDB
    const dbComplaint = await Complaint.findById(createdComplaintId);
    assert.ok(dbComplaint);
    assert.equal(dbComplaint.complaintId, createdComplaintCode);
  });

  test('18. Complaint Workflow: My Complaints lists citizen complaints & Complaint Details opens by ID and complaintId', async () => {
    const listRes = await request('GET', '/api/complaints', { token: citizenToken });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.data.complaints.some((c) => c.complaintId === createdComplaintCode));

    const detailById = await request('GET', `/api/complaints/${createdComplaintId}`, { token: citizenToken });
    assert.equal(detailById.status, 200);
    assert.equal(detailById.data.complaintId, createdComplaintCode);

    const detailByCode = await request('GET', `/api/complaints/${createdComplaintCode}`, { token: citizenToken });
    assert.equal(detailByCode.status, 200);
    assert.equal(String(detailByCode.data._id), String(createdComplaintId));
  });

  test('19. Complaint Workflow: Citizen ownership enforced (another citizen cannot view or update status)', async () => {
    await request('POST', '/api/auth/register', {
      body: {
        name: 'Second Citizen',
        email: secondCitizenEmail,
        password: citizenPassword,
        confirmPassword: citizenPassword
      }
    });
    const login2 = await request('POST', '/api/auth/login', {
      body: { identifier: secondCitizenEmail, password: citizenPassword }
    });
    secondCitizenToken = login2.data.token;

    // Second citizen's /api/complaints list must NOT include first citizen's complaint
    const list2 = await request('GET', '/api/complaints', { token: secondCitizenToken });
    assert.equal(list2.status, 200);
    assert.ok(!list2.data.complaints.some((c) => String(c._id) === String(createdComplaintId)));

    // Second citizen attempting to view first citizen's complaint details -> 403
    const detail2 = await request('GET', `/api/complaints/${createdComplaintId}`, { token: secondCitizenToken });
    assert.equal(detail2.status, 403);

    // Citizen attempting to update complaint status -> 403
    const statusAttempt = await request('PUT', `/api/complaints/${createdComplaintId}/status`, {
      token: citizenToken,
      body: { status: 'resolved' }
    });
    assert.equal(statusAttempt.status, 403);
  });

  test('20. Logout invalidates token/session server-side and clears HttpOnly cookie', async () => {
    const profileBefore = await request('GET', '/api/auth/profile', { cookie: citizenCookie });
    assert.equal(profileBefore.status, 200);

    const logoutRes = await request('POST', '/api/auth/logout', { token: citizenToken, cookie: citizenCookie });
    assert.equal(logoutRes.status, 200);

    const profileAfter = await request('GET', '/api/auth/profile', { token: citizenToken });
    assert.equal(profileAfter.status, 401);
  });

  test('21. Forgot Password and Reset Password workflow updates password and allows login', async () => {
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      body: { email: citizenEmail }
    });
    assert.equal(forgotRes.status, 200);
    assert.ok(forgotRes.data.resetToken, 'Reset token returned in development environment');

    const newPassword = 'NewCitizenPass@456';
    const resetRes = await request('POST', `/api/auth/reset-password/${forgotRes.data.resetToken}`, {
      body: { password: newPassword, confirmPassword: newPassword }
    });
    assert.equal(resetRes.status, 200);

    const oldLogin = await request('POST', '/api/auth/login', {
      body: { identifier: citizenEmail, password: citizenPassword }
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request('POST', '/api/auth/login', {
      body: { identifier: citizenEmail, password: newPassword }
    });
    assert.equal(newLogin.status, 200);
  });
});
