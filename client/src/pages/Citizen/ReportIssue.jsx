import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { complaintAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Upload, MapPin, CheckCircle, FileText, PlusCircle, Building2 } from 'lucide-react';
import LocationPicker from '../../components/map/LocationPicker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Citizen.css';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CATEGORIES = [
  'Road Damage', 'Pothole', 'Bridge Issue', 'Garbage', 'Drainage', 'Sewage',
  'Water Leakage', 'Pipeline Burst', 'Water Supply', 'Street Light', 'Power Outage',
  'Electricity Fault', 'Hospital', 'Medical Emergency', 'Sanitation', 'Traffic', 'Parking', 'Public Transport', 'Other'
];

const ReportIssue = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    departmentId: '',
    address: '',
    priority: 'medium',
  });
  const [errors, setErrors] = useState({});
  const [position, setPosition] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const { data } = await complaintAPI.getMeta();
        if (Array.isArray(data?.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
        if (Array.isArray(data?.departments)) {
          setDepartments(data.departments);
        }
      } catch {
        // Fallback to default categories if meta request fails
      }
    };
    loadMeta();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-select matching department when category changes
      if (name === 'category' && departments.length > 0) {
        const matchedDept = departments.find((d) =>
          Array.isArray(d.categories) && d.categories.includes(value)
        );
        if (matchedDept) {
          updated.departmentId = matchedDept._id;
        }
      }
      return updated;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.slice(0, 5 - images.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result].slice(0, 5));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const validateForm = () => {
    const nextErrors = {};
    if (!form.title.trim()) {
      nextErrors.title = 'Issue Title is required';
    } else if (form.title.trim().length < 5) {
      nextErrors.title = 'Issue Title must be at least 5 characters';
    }

    if (!form.category) {
      nextErrors.category = 'Please select an issue category';
    }

    if (!form.description.trim()) {
      nextErrors.description = 'Description is required';
    } else if (form.description.trim().length < 10) {
      nextErrors.description = 'Please enter at least 10 characters describing the issue';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) {
      toast.error('Please complete all required fields correctly');
      return;
    }

    setLoading(true);
    try {
      const { data } = await complaintAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        departmentId: form.departmentId || undefined,
        priority: form.priority,
        location: {
          address: form.address.trim(),
          lat: position ? position[0] : 0,
          lng: position ? position[1] : 0,
        },
        images,
      });
      toast.success(`Complaint ${data.complaintId || ''} submitted successfully!`);
      setSubmittedComplaint(data);
    } catch (error) {
      const apiErrors = error.response?.data?.errors;
      const msg = error.response?.data?.message || 'Failed to submit complaint';
      if (apiErrors) {
        setErrors(apiErrors);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedComplaint(null);
    setForm({
      title: '',
      description: '',
      category: '',
      departmentId: '',
      address: '',
      priority: 'medium',
    });
    setPosition(null);
    setImages([]);
    setErrors({});
  };

  if (submittedComplaint) {
    return (
      <DashboardLayout>
        <div className="citizen-page report-form">
          <div className="form-card" data-testid="complaint-success-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>
              Complaint Submitted Successfully!
            </h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
              Your civic issue has been logged and routed to the appropriate municipal department.
            </p>

            <div
              style={{
                background: 'var(--cream)',
                border: '1px solid rgba(77, 44, 94, 0.12)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                textAlign: 'left',
                marginBottom: 28,
              }}
            >
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Complaint ID</span>
                  <code
                    data-testid="submitted-complaint-id"
                    style={{
                      background: 'var(--white)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      border: '1px solid var(--gray-200)',
                    }}
                  >
                    {submittedComplaint.complaintId || submittedComplaint._id}
                  </code>
                </div>
                <div className="info-item">
                  <span className="info-label">Issue Title</span>
                  <span className="info-value">{submittedComplaint.title}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Category</span>
                  <span className="info-value">{submittedComplaint.category}</span>
                </div>
                {submittedComplaint.department && (
                  <div className="info-item">
                    <span className="info-label">Assigned Department</span>
                    <span className="info-value">
                      {submittedComplaint.department.name} ({submittedComplaint.department.code})
                    </span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Priority</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>
                    {submittedComplaint.priority}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Current Status</span>
                  <span
                    className="status-badge"
                    style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}
                  >
                    Submitted
                  </span>
                </div>
                {submittedComplaint.location?.address && (
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value">{submittedComplaint.location.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="quick-actions" style={{ justifyContent: 'center', marginBottom: 0 }}>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => navigate(`/complaint/${submittedComplaint._id}`)}
              >
                <FileText size={18} /> View Complaint Details
              </button>
              <button
                type="button"
                className="action-btn outline"
                onClick={() => navigate('/citizen/complaints')}
              >
                Go to My Complaints
              </button>
              <button type="button" className="action-btn outline" onClick={handleResetForm}>
                <PlusCircle size={18} /> Report Another Issue
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="citizen-page report-form">
        <div className="welcome-section">
          <h2>
            Report a <span className="text-gradient">Civic Issue</span>
          </h2>
          <p>Fill in the details below to submit your complaint for municipal resolution</p>
        </div>

        <form onSubmit={handleSubmit} className="form-card" noValidate>
          <div className="form-group">
            <label htmlFor="complaint-title">Issue Title *</label>
            <input
              id="complaint-title"
              name="title"
              placeholder="e.g. Broken road near main market"
              value={form.title}
              onChange={handleChange}
              className={errors.title ? 'input-error' : ''}
            />
            {errors.title && <span className="error-msg">{errors.title}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="complaint-category">Category *</label>
              <select
                id="complaint-category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className={errors.category ? 'input-error' : ''}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-msg">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="complaint-priority">Priority</label>
              <select
                id="complaint-priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {departments.length > 0 && (
            <div className="form-group">
              <label htmlFor="complaint-department">
                <Building2 size={16} style={{ verticalAlign: 'middle' }} /> Municipal Department
                (Auto-selected by Category)
              </label>
              <select
                id="complaint-department"
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
              >
                <option value="">Auto-assign based on category</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="complaint-description">Description *</label>
            <textarea
              id="complaint-description"
              name="description"
              placeholder="Describe the civic issue, landmarks, and severity in detail..."
              value={form.description}
              onChange={handleChange}
              rows={4}
              className={errors.description ? 'input-error' : ''}
            />
            {errors.description && <span className="error-msg">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="complaint-address">Address / Location Details</label>
            <input
              id="complaint-address"
              name="address"
              placeholder="e.g. Near City Mall, MG Road, Ward 12"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>
              <MapPin size={16} style={{ verticalAlign: 'middle' }} /> Pin Location on Map
            </label>
            <div className="map-container">
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />
                <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>
            <p className="map-hint">
              {position
                ? `📍 Selected Coordinates: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`
                : 'Click on the map to pin the exact issue location'}
            </p>
          </div>

          <div className="form-group">
            <label>
              <Upload size={16} style={{ verticalAlign: 'middle' }} /> Upload Photos (Optional)
            </label>
            <div
              className="image-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <p>Click to upload evidence photos (max 5)</p>
            </div>
            {images.length > 0 && (
              <div className="image-previews">
                {images.map((img, i) => (
                  <div key={i} className="image-preview">
                    <img src={img} alt={`Preview ${i + 1}`} />
                    <button type="button" onClick={() => removeImage(i)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="action-btn primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Submitting Complaint...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ReportIssue;
