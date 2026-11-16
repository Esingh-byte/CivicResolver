import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaMapMarkerAlt, FaClipboardCheck, FaUsers, FaBell, FaChartLine } from 'react-icons/fa';
import FeatureCard from '../../components/landing/FeatureCard';
import StepCard from '../../components/landing/StepCard';
import SectionHeader from '../../components/shared/SectionHeader';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: <FaMapMarkerAlt />, title: 'Location-Based Reporting', desc: 'Pin exact issue locations on an interactive map for precise reporting.' },
    { icon: <FaClipboardCheck />, title: 'Real-Time Tracking', desc: 'Track your complaint through every stage from submission to resolution.' },
    { icon: <FaShieldAlt />, title: 'Role-Based Access', desc: 'Dedicated workflows for Citizens, Municipal Officers, Field Workers, and Administrators.' },
    { icon: <FaUsers />, title: 'Community Upvoting', desc: 'Upvote issues that matter to you and help prioritize civic problems.' },
    { icon: <FaBell />, title: 'Smart Notifications', desc: 'Get notified at every step — verification, assignment, and resolution.' },
    { icon: <FaChartLine />, title: 'Analytics Dashboard', desc: 'Municipal leaders get powerful insights on complaint trends and performance.' }
  ];

  const steps = [
    { num: '01', title: 'Report Issue', desc: 'Citizens report civic issues with details, photos, and exact location.' },
    { num: '02', title: 'Admin Verifies', desc: 'Municipal admin verifies the complaint and prioritizes it.' },
    { num: '03', title: 'Assign Department', desc: 'Complaint is assigned to the right department officer and field worker.' },
    { num: '04', title: 'Issue Resolved', desc: 'Field team resolves the issue and citizen provides feedback.' }
  ];

  const categories = ['Road Damage', 'Garbage', 'Water Leakage', 'Street Light', 'Drainage', 'Traffic'];

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="brand-icon">🏛️</span>
            <span className="brand-text">Civic<span className="brand-highlight">Resolver</span></span>
          </div>
          <div className="nav-actions">
            <button onClick={() => navigate('/login')} className="nav-btn nav-btn-outline">Login</button>
            <button onClick={() => navigate('/register')} className="nav-btn nav-btn-primary">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-pattern"></div>
        <div className="hero-content">
          <div className="hero-badge">Report • Track • Resolve</div>
          <h1 className="hero-title">
            A Cleaner, Better <span className="text-gradient">City Together</span>
          </h1>
          <p className="hero-subtitle">
            Report civic issues, track progress and help build a cleaner, safer and smarter city.
          </p>
          <div className="hero-buttons">
            <button onClick={() => navigate('/register')} className="btn-hero-primary">
              Get Started <span className="btn-arrow">→</span>
            </button>
            <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} className="btn-hero-secondary">
              How it Works
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item"><span className="stat-number">10K+</span><span className="stat-label">Issues Reported</span></div>
            <div className="stat-divider"></div>
            <div className="stat-item"><span className="stat-number">85%</span><span className="stat-label">Resolution Rate</span></div>
            <div className="stat-divider"></div>
            <div className="stat-item"><span className="stat-number">50+</span><span className="stat-label">Departments</span></div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section">
        <div className="categories-marquee">
          <div className="marquee-track">
            {[...categories, ...categories, ...categories].map((cat, i) => (
              <span key={i} className="category-tag">{cat}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-container">
          <SectionHeader
            badge="Features"
            title="Everything You Need for Smart Civic Governance"
            description="A comprehensive platform designed to streamline municipal complaint management"
          />
          <div className="features-grid">
            {features.map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} description={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-section" id="how-it-works">
        <div className="section-container">
          <SectionHeader
            badge="Process"
            title="How CivicResolver Works"
            description="Report • Track • Resolve — a transparent and accountable complaint lifecycle"
          />
          <div className="steps-grid">
            {steps.map((s, i) => (
              <StepCard
                key={i}
                number={s.num}
                title={s.title}
                description={s.desc}
                showConnector={i < steps.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Make Your City Better?</h2>
          <p>Join thousands of citizens who are actively improving their neighbourhoods through CivicResolver.</p>
          <button onClick={() => navigate('/register')} className="btn-hero-primary btn-cta">
            Join CivicResolver <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="brand-icon">🏛️</span> Civic<span className="brand-highlight">Resolver</span>
            <p>Report • Track • Resolve — building a cleaner, safer and smarter city together.</p>
          </div>
          <div className="footer-links">
            <div><h4>Platform</h4><a href="#how-it-works">How it Works</a><a href="#features">Features</a></div>
            <div><h4>Account Access</h4><a href="/login">Sign In</a><a href="/register">Join CivicResolver</a></div>
            <div><h4>Contact</h4><p>support@civicresolver.gov.in</p><p>1800-CIVIC-01</p></div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 CivicResolver · Report • Track • Resolve</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
