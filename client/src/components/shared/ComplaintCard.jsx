import React from 'react';
import StatusBadge from './StatusBadge';

const ComplaintCard = ({ complaint, onClick, statusColors = {}, statusLabels = {}, showUpvotes = true }) => (
  <div className="complaint-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="cc-top">
      <div>
        {complaint.complaintId && (
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
            {complaint.complaintId}
          </span>
        )}
        <h4>{complaint.title}</h4>
      </div>
      <StatusBadge
        status={complaint.status}
        colors={statusColors}
        label={statusLabels[complaint.status] || complaint.status}
      />
    </div>
    <p className="cc-desc">{complaint.description?.substring(0, 100)}...</p>
    <div className="cc-meta">
      <span className="cc-category">{complaint.category}</span>
      {complaint.department?.name && (
        <span
          className="cc-category"
          style={{ background: 'rgba(255,116,38,0.08)', color: 'var(--accent)' }}
        >
          {complaint.department.name}
        </span>
      )}
      <span className="cc-date">
        {complaint.citizen?.name
          ? `${complaint.citizen.name} · ${new Date(complaint.createdAt).toLocaleDateString()}`
          : new Date(complaint.createdAt).toLocaleDateString()}
      </span>
      {showUpvotes && <span className="cc-upvotes">👍 {complaint.upvotes?.length || 0}</span>}
    </div>
  </div>
);

export default ComplaintCard;
