import React, { useState } from 'react';
import './Auth.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../../services/api';
import AuthField from '../../components/auth/AuthField';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState(urlToken);
  const [step, setStep] = useState(urlToken ? 'reset' : 'request');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setError('Please enter a valid registered email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.forgotPassword({ email: trimmed });
      setInfoMessage(data.message);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      setStep('reset');
      toast.info('Password reset token generated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!resetToken.trim()) {
      setError('Reset token is required');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.resetPassword(resetToken.trim(), {
        password,
        confirmPassword,
      });
      toast.success(data.message || 'Password reset successfully!');
      navigate('/login', {
        state: {
          message: 'Your password has been updated. Please sign in with your new password.',
          email,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button onClick={() => navigate('/login')} className="auth-back-btn">
        ← Back to Sign In
      </button>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-logo">🏛️</span>
            <span className="auth-tagline-pill">Account Recovery</span>
            <h2>
              {step === 'request' ? 'Forgot ' : 'Reset '}
              <span className="text-gradient">Password</span>
            </h2>
            <p>
              {step === 'request'
                ? 'Enter your email address to request a password reset token'
                : 'Enter your reset token and choose a strong new password'}
            </p>
          </div>

          {infoMessage && <div className="auth-banner info">{infoMessage}</div>}
          {error && (
            <div className="auth-banner warning" role="alert">
              {error}
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} noValidate>
              <AuthField
                label="Registered Email Address"
                type="email"
                name="email"
                value={email}
                placeholder="e.g. citizen@email.com"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
              />

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading && <span className="btn-inline-spinner" />}
                {loading ? 'Sending Reset Request...' : 'Send Reset Instructions'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} noValidate>
              <AuthField
                label="Reset Token"
                name="resetToken"
                value={resetToken}
                placeholder="Paste your password reset token"
                onChange={(e) => {
                  setResetToken(e.target.value);
                  setError('');
                }}
                required
              />

              <AuthField
                label="New Password"
                type="password"
                name="password"
                value={password}
                placeholder="Min. 8 chars (A-z, 0-9)"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
              />

              <AuthField
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                placeholder="Re-enter new password"
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                required
              />

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading && <span className="btn-inline-spinner" />}
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p>
              Remembered your password?{' '}
              <span onClick={() => navigate('/login')} className="auth-link">
                Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
