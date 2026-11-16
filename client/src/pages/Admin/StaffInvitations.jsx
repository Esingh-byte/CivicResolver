import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { authAPI, adminAPI } from '../../services/api';
import { useAuth, normalizeRole } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { UserPlus, Copy, Check, ExternalLink, Shield, Mail } from 'lucide-react';
import './Admin.css';

const StaffInvitations = () => {
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);
  const isOfficer = userRole === 'MUNICIPAL_OFFICER';

  const [departments, setDepartments] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: isOfficer ? 'FIELD_WORKER' : 'MUNICIPAL_OFFICER',
    departmentId: user?.department?._id || user?.department || '',
    ward: user?.ward || '',
    phone: '',
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deptRes, invRes] = await Promise.all([
          adminAPI.getDepartments(),
          authAPI.getInvitations(),
        ]);
        setDepartments(deptRes.data || []);
        setInvitations(invRes.data || []);
        if (isOfficer && user?.department) {
          setForm((prev) => ({
            ...prev,
            role: 'FIELD_WORKER',
            departmentId: user.department._id || user.department,
          }));
        } else if (deptRes.data?.length > 0) {
          setForm((prev) => ({
            ...prev,
            departmentId: prev.departmentId || deptRes.data[0]._id,
          }));
        }
      } catch {
        toast.error('Failed to load invitation data');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [isOfficer, user]);

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim() || !form.email.trim() || !form.departmentId) {
      toast.error('Please fill in staff name, email, and department');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authAPI.createInvitation({
        name: form.name.trim(),
        email: form.email.trim(),
        role: isOfficer ? 'FIELD_WORKER' : form.role,
        departmentId: form.departmentId,
        ward: form.ward.trim(),
        phone: form.phone.trim(),
      });

      toast.success('Single-use staff invitation generated!');
      const fullLink = `${window.location.origin}${data.inviteLink}`;
      setGeneratedInvite({
        token: data.inviteToken,
        link: fullLink,
        email: data.invitation.email,
        role: data.invitation.role,
      });
      setInvitations((prev) => [data.invitation, ...prev]);
      setForm((prev) => ({ ...prev, name: '', email: '', phone: '' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.info('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="welcome-section">
          <h2>
            <UserPlus size={24} style={{ verticalAlign: 'middle' }} /> Staff{' '}
            <span className="text-gradient">Onboarding & Invitations</span>
          </h2>
          <p>
            {isOfficer
              ? `Invite Field Workers to your assigned department (${user?.department?.name || 'Department'})`
              : 'Issue secure, single-use, expiring invitations for Municipal Officers and Field Workers'}
          </p>
        </div>

        <div className="admin-content-grid">
          <div className="admin-card">
            <h3>
              <Mail size={18} /> Issue New Staff Invitation
            </h3>
            <form onSubmit={handleCreateInvite} style={{ marginTop: 16 }}>
              <div className="form-group">
                <label>Staff Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Priya Deshmukh"
                />
              </div>

              <div className="form-group">
                <label>Official Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. priya.officer@civicresolver.gov.in"
                />
              </div>

              <div className="form-group">
                <label>Assigned Role *</label>
                <select
                  className="auth-select"
                  value={isOfficer ? 'FIELD_WORKER' : form.role}
                  disabled={isOfficer}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {!isOfficer && <option value="MUNICIPAL_OFFICER">Municipal Officer</option>}
                  <option value="FIELD_WORKER">Field Worker</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assigned Department *</label>
                <select
                  className="auth-select"
                  value={form.departmentId}
                  disabled={isOfficer}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
                {isOfficer && (
                  <span className="field-hint">
                    Municipal Officers can only invite Field Workers within their own department.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Ward / Zone (Optional)</label>
                <input
                  value={form.ward}
                  onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  placeholder="e.g. Ward 8 - East Zone"
                />
              </div>

              <button
                type="submit"
                className="action-btn primary"
                disabled={submitting}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                {submitting ? 'Generating Invitation...' : 'Generate Single-Use Invitation'}
              </button>
            </form>

            {generatedInvite && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <p style={{ fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
                  ✅ Invitation Created for {generatedInvite.email}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginBottom: 8 }}>
                  Share this single-use activation link or token with the invited staff member:
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <code
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid var(--gray-200)',
                      fontSize: '0.78rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {generatedInvite.link}
                  </code>
                  <button
                    type="button"
                    className="action-btn outline"
                    onClick={() => copyLink(generatedInvite.link)}
                    style={{ padding: '8px 12px' }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />} Copy
                  </button>
                  <a
                    href={generatedInvite.link}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn primary"
                    style={{ padding: '8px 12px' }}
                  >
                    <ExternalLink size={16} /> Open
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="admin-card">
            <h3>
              <Shield size={18} /> Recent Staff Invitations ({invitations.length})
            </h3>
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
              </div>
            ) : invitations.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginTop: 16 }}>
                No staff invitations issued yet.
              </p>
            ) : (
              <div className="complaints-list" style={{ marginTop: 16 }}>
                {invitations.map((inv) => (
                  <div key={inv._id} className="complaint-card" style={{ cursor: 'default' }}>
                    <div className="cc-top">
                      <h4>{inv.name}</h4>
                      <span
                        className="status-badge"
                        style={{
                          background:
                            inv.status === 'accepted'
                              ? 'rgba(16,185,129,0.15)'
                              : 'rgba(245,158,11,0.15)',
                          color: inv.status === 'accepted' ? '#10b981' : '#d97706',
                        }}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="cc-desc" style={{ marginBottom: 8 }}>
                      {inv.email} ·{' '}
                      <strong>
                        {inv.role === 'MUNICIPAL_OFFICER' ? 'Municipal Officer' : 'Field Worker'}
                      </strong>
                    </p>
                    <div className="cc-meta">
                      {inv.department && (
                        <span className="cc-category">{inv.department.name}</span>
                      )}
                      <span className="cc-date">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffInvitations;
