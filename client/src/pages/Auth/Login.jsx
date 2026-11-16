import React, { useState, useEffect } from 'react';
import './Auth.css';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth, getDashboardRoute } from '../../context/AuthContext';
import AuthField from '../../components/auth/AuthField';

const Login = ({ isStaffPortal = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const initialEmail =
    location.state?.email || searchParams.get('email') || '';

  const [identifier, setIdentifier] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ identifier: '', password: '', form: '' });

  useEffect(() => {
    const emailFromStateOrQuery =
      location.state?.email || searchParams.get('email') || '';
    if (emailFromStateOrQuery) {
      setIdentifier(emailFromStateOrQuery);
    }
  }, [location.state, searchParams]);

  const confirmationBanner = location.state?.message || null;
  const generatedCitizenId = location.state?.citizenId || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const trimmedId = identifier.trim();
    const nextErrors = { identifier: '', password: '', form: '' };

    if (!trimmedId) {
      nextErrors.identifier = 'Please enter your Email Address or User ID';
    }
    if (!password) {
      nextErrors.password = 'Please enter your password';
    }

    setErrors(nextErrors);
    if (nextErrors.identifier || nextErrors.password) return;

    setLoading(true);
    try {
      const data = await login(trimmedId, password, rememberMe);
      toast.success(`Welcome back, ${data.name}!`);
      // Role comes strictly from the authenticated database user
      const targetRoute = getDashboardRoute(data.role);
      navigate(targetRoute, { replace: true });
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid email/User ID or password';
      setErrors((prev) => ({ ...prev, form: msg }));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button onClick={() => navigate('/')} className="auth-back-btn">
        ← Back to Home
      </button>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-logo">🏛️</span>
            <span className="auth-tagline-pill">
              {isStaffPortal ? 'Municipal Staff & Admin Portal' : 'Report • Track • Resolve'}
            </span>
            <h2>
              {isStaffPortal ? (
                <>
                  Staff <span className="text-gradient">Sign In</span>
                </>
              ) : (
                <>
                  Welcome to <span className="text-gradient">CivicResolver</span>
                </>
              )}
            </h2>
            <p>
              {isStaffPortal
                ? 'Sign in with your Municipal Officer, Field Worker, or Administrator credentials'
                : 'Sign in with your Citizen Email Address or Citizen ID to access your dashboard'}
            </p>
          </div>

          {confirmationBanner && (
            <div className="auth-banner success" role="status" data-testid="registration-confirmation">
              <div>{confirmationBanner}</div>
              {generatedCitizenId && (
                <div style={{ marginTop: 6 }}>
                  <strong>Your User ID:</strong> <code>{generatedCitizenId}</code>
                </div>
              )}
            </div>
          )}

          {errors.form && (
            <div className="auth-banner warning" role="alert">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <AuthField
              label={isStaffPortal ? 'Staff Email or Staff ID' : 'Email Address or Citizen ID'}
              type="text"
              name="identifier"
              value={identifier}
              placeholder={
                isStaffPortal
                  ? 'e.g. officer@civicresolver.com or CR-OFF-XXXXXX'
                  : 'e.g. citizen@email.com or CR-CIT-XXXXXX'
              }
              onChange={(e) => {
                setIdentifier(e.target.value);
                setErrors({ ...errors, identifier: '', form: '' });
              }}
              error={errors.identifier}
              required
              autoComplete="username"
            />

            <AuthField
              label="Password"
              type="password"
              name="password"
              value={password}
              placeholder="Enter your password"
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: '', form: '' });
              }}
              error={errors.password}
              required
              autoComplete="current-password"
            />

            <div className="auth-options-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                className="forgot-link"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading && <span className="btn-inline-spinner" />}
              {loading ? 'Signing in...' : isStaffPortal ? 'Sign In to Staff Portal' : 'Sign In'}
            </button>
          </form>

          {!isStaffPortal ? (
            <div className="auth-footer">
              <p>
                Don&apos;t have an account?{' '}
                <span onClick={() => navigate('/register')} className="auth-link">
                  Create Account
                </span>
              </p>
              <p style={{ marginTop: 10, fontSize: '0.82rem' }}>
                Municipal Officer, Field Worker, or Admin?{' '}
                <span onClick={() => navigate('/staff/login')} className="auth-link">
                  Staff Sign In →
                </span>
              </p>
            </div>
          ) : (
            <>
              <div className="auth-footer">
                <p>
                  Received a staff invitation link or token?{' '}
                  <span onClick={() => navigate('/activate')} className="auth-link">
                    Activate Staff Account
                  </span>
                </p>
                <p style={{ marginTop: 10, fontSize: '0.84rem' }}>
                  Are you a Citizen?{' '}
                  <span onClick={() => navigate('/login')} className="auth-link">
                    ← Return to Citizen Sign In
                  </span>
                </p>
              </div>

              <div className="demo-creds">
                <p className="demo-title">🔑 CivicResolver Demo Staff Credentials</p>
                <div className="demo-row">
                  <span className="demo-role-tag">System Admin:</span>
                  <code>admin@civicresolver.com</code>
                  <code>Admin@123</code>
                </div>
                <div className="demo-row">
                  <span className="demo-role-tag">Officer (PWD):</span>
                  <code>officer@civicresolver.com</code>
                  <code>Officer@123</code>
                </div>
                <div className="demo-row">
                  <span className="demo-role-tag">Field Worker:</span>
                  <code>worker@civicresolver.com</code>
                  <code>Worker@123</code>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
