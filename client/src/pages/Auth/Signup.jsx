import React, { useState, useEffect } from 'react';
import './Auth.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Users, ShieldCheck, Wrench, ArrowRight, KeyRound, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthField from '../../components/auth/AuthField';

const ACCOUNT_TYPES = [
  {
    id: 'CITIZEN',
    title: 'Citizen',
    badge: 'Self-Registration',
    badgeType: 'public',
    icon: <Users size={22} />,
    purpose:
      'Report civic issues in your ward, attach photos and map coordinates, track resolution progress in real time, and rate completed municipal work.',
    cta: 'Register as Citizen',
  },
  {
    id: 'MUNICIPAL_OFFICER',
    title: 'Municipal Officer',
    badge: 'Invitation Required',
    badgeType: 'invite',
    icon: <ShieldCheck size={22} />,
    purpose:
      'Verify department complaints, coordinate field resolution, manage Field Workers within your assigned department, and monitor ward service delivery.',
    cta: 'Officer Onboarding & Sign In',
  },
  {
    id: 'FIELD_WORKER',
    title: 'Field Worker',
    badge: 'Invitation Required',
    badgeType: 'invite',
    icon: <Wrench size={22} />,
    purpose:
      'Receive on-ground repair assignments from your department officer, update live work status, and mark civic issues resolved in the field.',
    cta: 'Worker Onboarding & Sign In',
  },
];

const VALID_TYPES = ['CITIZEN', 'MUNICIPAL_OFFICER', 'FIELD_WORKER'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z\s.'-]{3,80}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { register } = useAuth();

  const queryType = searchParams.get('type')?.toUpperCase() || null;
  const [selectedType, setSelectedType] = useState(
    VALID_TYPES.includes(queryType) ? queryType : null
  );

  // Keep selectedType synchronized with URL query so clicking "Register" / "/register"
  // always shows the Account Type Selection screen cleanly.
  useEffect(() => {
    const nextType = searchParams.get('type')?.toUpperCase() || null;
    setSelectedType(VALID_TYPES.includes(nextType) ? nextType : null);
    setErrors({});
    setInviteError('');
    setDuplicateAccountEmail('');
  }, [searchParams]);

  const selectAccountType = (typeId) => {
    if (!typeId) {
      setSearchParams({});
    } else {
      setSearchParams({ type: typeId.toLowerCase() });
    }
  };

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    ward: '',
  });
  const [errors, setErrors] = useState({});
  const [duplicateAccountEmail, setDuplicateAccountEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.form) {
      setErrors((prev) => ({ ...prev, [name]: '', form: '' }));
    }
    if (name === 'email') {
      setDuplicateAccountEmail('');
    }
  };

  const validateCitizenForm = () => {
    const errs = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();

    if (!trimmedName) {
      errs.name = 'Full Name is required';
    } else if (!NAME_REGEX.test(trimmedName)) {
      errs.name = 'Full Name must be at least 3 characters';
    }

    if (!trimmedEmail) {
      errs.email = 'Email Address is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      errs.password = 'Password is required';
    } else if (!STRONG_PASSWORD_REGEX.test(form.password)) {
      errs.password = 'Password must be at least 8 characters with uppercase, lowercase, and a number';
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = 'Confirm Password is required';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (trimmedPhone && !/^[+\d][\d\s-]{7,18}$/.test(trimmedPhone)) {
      errs.phone = 'Please enter a valid phone number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCitizenSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateCitizenForm()) return;

    setLoading(true);
    setDuplicateAccountEmail('');
    try {
      const data = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone.trim(),
        ward: form.ward.trim(),
      });

      const citizenId = data.citizenId || data.userId;
      toast.success(
        `Registration successful! Your Citizen ID is ${citizenId}. Please sign in.`
      );
      navigate('/login', {
        state: {
          registered: true,
          email: data.email,
          citizenId,
          message: `Account created for ${data.name}! Your Citizen ID is ${citizenId}. Sign in below to access your Citizen Dashboard.`,
        },
      });
    } catch (error) {
      const apiErrors = error.response?.data?.errors;
      const apiMsg = error.response?.data?.message || 'Registration failed. Please check your details.';
      if (apiMsg.toLowerCase().includes('already exists')) {
        setDuplicateAccountEmail(form.email.trim());
      }
      if (apiErrors) {
        setErrors((prev) => ({ ...prev, ...apiErrors, form: apiMsg }));
      } else {
        setErrors((prev) => ({ ...prev, form: apiMsg }));
      }
      toast.error(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToActivation = (e) => {
    e.preventDefault();
    const cleaned = inviteTokenInput.trim();
    if (!cleaned) {
      setInviteError('Please enter your invitation token or paste your invitation link');
      return;
    }
    let extractedToken = cleaned;
    if (cleaned.includes('token=')) {
      extractedToken = cleaned.split('token=')[1].split('&')[0];
    } else if (cleaned.includes('/activate/')) {
      extractedToken = cleaned.split('/activate/')[1].split('?')[0];
    }
    navigate(`/activate?token=${encodeURIComponent(extractedToken)}`);
  };

  return (
    <div className="auth-page">
      <button onClick={() => navigate('/')} className="auth-back-btn">
        ← Back to Home
      </button>

      <div className={`auth-container ${!selectedType ? 'wide' : ''}`}>
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-logo">🏛️</span>
            <span className="auth-tagline-pill">Report • Track • Resolve</span>
            <h2>
              Join <span className="text-gradient">CivicResolver</span>
            </h2>
            <p>
              {!selectedType
                ? 'Select your account type to get started with our civic issue resolution platform'
                : selectedType === 'CITIZEN'
                ? 'Create your Citizen account to report and track neighbourhood issues'
                : `Authorized ${
                    selectedType === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'
                  } Onboarding`}
            </p>
          </div>

          {/* STEP 1: ACCOUNT TYPE SELECTION SCREEN */}
          {!selectedType && (
            <>
              <div className="account-type-grid" data-testid="account-type-grid">
                {ACCOUNT_TYPES.map((acct) => (
                  <div
                    key={acct.id}
                    role="button"
                    tabIndex={0}
                    data-testid={`account-option-${acct.id.toLowerCase()}`}
                    className="account-type-card"
                    onClick={() => selectAccountType(acct.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        selectAccountType(acct.id);
                      }
                    }}
                  >
                    <div>
                      <span className={`account-type-badge ${acct.badgeType}`}>
                        {acct.badgeType === 'invite' && <Lock size={12} />}
                        {acct.badge}
                      </span>
                      <div className="account-type-icon">{acct.icon}</div>
                      <h3>{acct.title}</h3>
                      <p>{acct.purpose}</p>
                    </div>
                    <span className="account-type-cta">
                      {acct.cta} <ArrowRight size={16} />
                    </span>
                  </div>
                ))}
              </div>

              <div className="auth-footer">
                <p>
                  Already have a Citizen account?{' '}
                  <span onClick={() => navigate('/login')} className="auth-link">
                    Citizen Sign In
                  </span>
                </p>
                <p style={{ marginTop: 8, fontSize: '0.82rem' }}>
                  Existing Municipal Officer, Field Worker, or Admin?{' '}
                  <span onClick={() => navigate('/staff/login')} className="auth-link">
                    Staff Sign In →
                  </span>
                </p>
              </div>
            </>
          )}

          {/* STEP 2A: CITIZEN PUBLIC REGISTRATION */}
          {selectedType === 'CITIZEN' && (
            <>
              <div className="role-context-bar">
                <span>
                  Account Type: <strong>Citizen (Public Registration)</strong>
                </span>
                <button
                  type="button"
                  className="role-switch-btn"
                  onClick={() => selectAccountType(null)}
                >
                  Change Account Type
                </button>
              </div>

              {errors.form && (
                <div className="auth-banner warning" role="alert">
                  <div>{errors.form}</div>
                  {duplicateAccountEmail && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="auth-secondary-btn"
                        onClick={() =>
                          navigate(`/login?email=${encodeURIComponent(duplicateAccountEmail)}`, {
                            state: { email: duplicateAccountEmail },
                          })
                        }
                      >
                        <LogIn size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Sign In as {duplicateAccountEmail}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleCitizenSubmit} noValidate>
                <AuthField
                  label="Full Name"
                  name="name"
                  value={form.name}
                  placeholder="Enter your full name"
                  onChange={handleChange}
                  error={errors.name}
                  required
                  autoComplete="name"
                />

                <AuthField
                  label="Email Address"
                  type="email"
                  name="email"
                  value={form.email}
                  placeholder="e.g. citizen@email.com"
                  onChange={handleChange}
                  error={errors.email}
                  required
                  autoComplete="email"
                />

                <div className="form-row-2">
                  <AuthField
                    label="Password"
                    type="password"
                    name="password"
                    value={form.password}
                    placeholder="Min. 8 chars (A-z, 0-9)"
                    onChange={handleChange}
                    error={errors.password}
                    required
                    autoComplete="new-password"
                  />

                  <AuthField
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    placeholder="Re-enter password"
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-row-2">
                  <AuthField
                    label="Phone Number (Optional)"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    placeholder="+91 9876543210"
                    onChange={handleChange}
                    error={errors.phone}
                    autoComplete="tel"
                  />

                  <AuthField
                    label="Ward / Neighbourhood (Optional)"
                    name="ward"
                    value={form.ward}
                    placeholder="e.g. Ward 12 - MG Road"
                    onChange={handleChange}
                    error={errors.ward}
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading && <span className="btn-inline-spinner" />}
                  {loading ? 'Creating Citizen Account...' : 'Create Citizen Account'}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  Already have a Citizen account?{' '}
                  <span onClick={() => navigate('/login')} className="auth-link">
                    Sign In
                  </span>
                </p>
              </div>
            </>
          )}

          {/* STEP 2B: MUNICIPAL OFFICER / FIELD WORKER INVITATION INFORMATION */}
          {(selectedType === 'MUNICIPAL_OFFICER' || selectedType === 'FIELD_WORKER') && (
            <>
              <div className="role-context-bar">
                <span>
                  Account Type:{' '}
                  <strong>
                    {selectedType === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'}
                  </strong>
                </span>
                <button
                  type="button"
                  className="role-switch-btn"
                  onClick={() => selectAccountType(null)}
                >
                  Change Account Type
                </button>
              </div>

              <div className="auth-banner info">
                <strong>Restricted Staff Account:</strong> To protect municipal operations,{' '}
                {selectedType === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'} accounts
                cannot be registered publicly. New staff accounts must be invited by an authorized{' '}
                {selectedType === 'MUNICIPAL_OFFICER'
                  ? 'System Administrator'
                  : 'Department Municipal Officer or System Administrator'}
                .
              </div>

              <ul className="staff-steps-list">
                <li>
                  <span className="staff-step-num">1</span>
                  <span>
                    Receive an official single-use invitation token or link from your department
                    administrator.
                  </span>
                </li>
                <li>
                  <span className="staff-step-num">2</span>
                  <span>
                    Verify your invitation below to confirm your assigned department and role.
                  </span>
                </li>
                <li>
                  <span className="staff-step-num">3</span>
                  <span>
                    Set your secure password to activate your account and sign in to your dashboard.
                  </span>
                </li>
              </ul>

              <form onSubmit={handleProceedToActivation} noValidate>
                <AuthField
                  label="Have an Invitation Token or Link?"
                  name="inviteToken"
                  value={inviteTokenInput}
                  placeholder="Paste your invitation token or link here"
                  onChange={(e) => {
                    setInviteTokenInput(e.target.value);
                    setInviteError('');
                  }}
                  error={inviteError}
                  required
                />

                <button type="submit" className="auth-submit-btn">
                  <KeyRound size={18} /> Verify Invitation & Activate Account
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  Already have an active{' '}
                  {selectedType === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'}{' '}
                  account?{' '}
                  <span onClick={() => navigate('/staff/login')} className="auth-link">
                    Staff Sign In →
                  </span>
                </p>
                <p style={{ marginTop: 8, fontSize: '0.82rem' }}>
                  Looking to register as a Citizen instead?{' '}
                  <span onClick={() => selectAccountType('CITIZEN')} className="auth-link">
                    Switch to Citizen Registration
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
