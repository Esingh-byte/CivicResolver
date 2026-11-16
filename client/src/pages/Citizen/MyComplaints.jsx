import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { complaintAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, Filter } from 'lucide-react';
import './Citizen.css';

const statusColors = { submitted: '#f59e0b', verified: '#3b82f6', assigned: '#8b5cf6', in_progress: '#ff7426', resolved: '#10b981', closed: '#6b7280' };
const statusLabels = { submitted: 'Submitted', verified: 'Verified', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

const MyComplaints = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await complaintAPI.getAll(params);
      setComplaints(data.complaints || []);
    } catch {
      // handled by api interceptor
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return (
    <DashboardLayout>
      <div className="citizen-page">
        <div className="welcome-section">
          <h2>My <span className="text-gradient">Complaints</span></h2>
          <p>Track and manage all your reported civic issues</p>
        </div>

        <div className="filter-bar">
          <Filter size={18} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? <div className="loading-state"><div className="loading-spinner"></div></div> :
          complaints.length === 0 ? (
            <div className="empty-state">
              <p>No complaints found. {statusFilter ? 'Try a different filter.' : 'Report your first civic issue!'}</p>
              <button onClick={() => navigate('/citizen/report')} className="action-btn primary">Report Issue</button>
            </div>
          ) : (
            <div className="complaints-list">
              {complaints.map(c => (
                <div key={c._id} className="complaint-card" onClick={() => navigate(`/complaint/${c._id}`)}>
                  <div className="cc-top">
                    <div>
                      {c.complaintId && (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'rgba(77, 44, 94, 0.08)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            marginBottom: 4,
                          }}
                        >
                          {c.complaintId}
                        </span>
                      )}
                      <h4>{c.title}</h4>
                    </div>
                    <span className="status-badge" style={{ background: `${statusColors[c.status]}15`, color: statusColors[c.status] }}>
                      {statusLabels[c.status]}
                    </span>
                  </div>
                  <p className="cc-desc">{c.description?.substring(0, 120)}...</p>
                  <div className="cc-meta">
                    <span className="cc-category">{c.category}</span>
                    {c.department && <span className="cc-category" style={{background:'rgba(255,116,38,0.08)',color:'var(--accent)'}}>{c.department.name}</span>}
                    <span className="cc-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <span className="cc-upvotes"><ThumbsUp size={14} /> {c.upvotes?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </DashboardLayout>
  );
};

export default MyComplaints;
