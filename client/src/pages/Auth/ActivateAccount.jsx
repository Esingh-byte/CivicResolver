import React, { useState, useEffect, useCallback } from 'react';
import './Auth.css';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../../services/api';
import AuthField from '../../components/auth/AuthField';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const ActivateAccount = () => {
  const navigate = useNavigate();
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const initialToken = paramToken || searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [verifying, setVerifying] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    ward: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [activating, setActivating] = useState(false);

  const handleVerifyToken = useCallback(async (rawToken) => {
    const clean = (rawToken || '').trim();
    if (!clean) {
      setVerifyError('Please enter your invitation token');
      return;
    }

    setVerifying(true);
    setVerifyError('');
    try {
      const { data } = await authAPI.verifyInvitation(clean);
      setInvitation(data.invitation);
      setTokenInput(clean);
      setForm((prev) => ({
        ...prev,
        name: data.invitation.name || '',
        phone: data.invitation.phone || '',
        ward: data.invitation.ward || '',
      }));
    } catch (error) {
      setInvitation(null);
      setVerifyError(
        error.response?.data?.message || 'Invalid or expired invitation link. Please contact your administrator.'
      );
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (initialToken) {
      handleVerifyToken(initialToken);
    }
  }, [initialToken, handleVerifyToken]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (activating) return;

    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 3) {
      errs.name = 'Full Name must be at least 3 characters';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (!STRONG_PASSWORD_REGEX.test(form.password)) {
      errs.password = 'Password must be at least 8 characters with uppercase, lowercase, and a number';
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setActivating(true);
    try {
      const { data } = await authAPI.activateInvitation({
        token: tokenInput.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        ward: form.ward.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      toast.success('Staff account activated! Please sign in.');
      navigate('/staff/login', {
        state: {
          registered: true,
          email: data.email,
          citizenId: data.userId,
          message: `Your ${
            data.role === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'
          } account is now active! Sign in with your email or Staff ID (${data.userId}).`,
        },
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to activate account';
      setErrors({ form: msg });
      toast.error(msg);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="auth-page">
      <button onClick={() => navigate('/register')} className="auth-back-btn">
        ← Back to Join CivicResolver
      </button>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-logo">🏛️</span>
            <span className="auth-tagline-pill">Staff Onboarding</span>
            <h2>
              Activate <span className="text-gradient">Staff Account</span>
            </h2>
            <p>Verify your official invitation and set your password</p>
          </div>

          {!invitation ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyToken(tokenInput);
              }}
              noValidate
            >
              {verifyError && (
                <div className="auth-banner warning" role="alert">
                  {verifyError}
                </div>
              )}

              <AuthField
                label="Invitation Token"
                name="token"
                value={tokenInput}
                placeholder="Enter your single-use invitation token"
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setVerifyError('');
                }}
                required
              />

              <button type="submit" className="auth-submit-btn" disabled={verifying}>
                {verifying && <span className="btn-inline-spinner" />}
                {verifying ? 'Verifying Invitation...' : 'Verify Invitation'}
              </button>
            </form>
          ) : (
            <>
              <div className="auth-banner success">
                <div>
                  <strong>Verified Invitation:</strong> {invitation.email}
                </div>
                <div>
                  <strong>Assigned Role:</strong>{' '}
                  {invitation.role === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'}
                </div>
                {invitation.department && (
                  <div>
                    <strong>Department:</strong> {invitation.department.name} ({invitation.department.code})
                  </div>
                )}
              </div>

              {errors.form && (
                <div className="auth-banner warning" role="alert">
                  {errors.form}
                </div>
              )}

              <form onSubmit={handleActivate} noValidate>
                <AuthField
                  label="Full Name"
                  name="name"
                  value={form.name}
                  placeholder="Enter your full name"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={errors.name}
                  required
                />

                <div className="form-row-2">
                  <AuthField
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    placeholder="+91 9876543210"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <AuthField
                    label="Assigned Ward / Zone"
                    name="ward"
                    value={form.ward}
                    placeholder="e.g. Ward 12"
                    onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  />
                </div>

                <AuthField
                  label="Set Password"
                  type="password"
                  name="password"
                  value={form.password}
                  placeholder="Min. 8 chars (A-z, 0-9)"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  error={errors.password}
                  required
                />

                <AuthField
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  placeholder="Re-enter your password"
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  error={errors.confirmPassword}
                  required
                />

                <button type="submit" className="auth-submit-btn" disabled={activating}>
                  {activating && <span className="btn-inline-spinner" />}
                  {activating ? 'Activating Account...' : 'Activate Account & Continue'}
                </button>
              </form>
            </>
          )}

          <div className="auth-footer">
            <p>
              Already activated your staff account?{' '}
              <span onClick={() => navigate('/staff/login')} className="auth-link">
                Staff Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivateAccount;
