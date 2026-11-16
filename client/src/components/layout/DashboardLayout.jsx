import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth, normalizeRole } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';
import { Home, PlusCircle, FileText, LogOut, Bell, Menu, X, User, UserPlus } from 'lucide-react';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = normalizeRole(user?.role);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore background poll error
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      try {
        const { data } = await notificationAPI.getAll();
        if (active) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // ignore background poll error
      }
    };
    loadInitial();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore error
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (role === 'SUPER_ADMIN') {
      return [
        { to: '/super-admin/dashboard', icon: <Home size={20} />, label: 'Super Admin Dashboard' },
        { to: '/admin/verify', icon: <FileText size={20} />, label: 'Verify Issues' },
        { to: '/admin/assign', icon: <User size={20} />, label: 'Assign Staff' },
        { to: '/admin/invitations', icon: <UserPlus size={20} />, label: 'Staff Onboarding' },
      ];
    }
    if (role === 'SYSTEM_ADMIN') {
      return [
        { to: '/admin/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
        { to: '/admin/verify', icon: <FileText size={20} />, label: 'Verify Issues' },
        { to: '/admin/assign', icon: <User size={20} />, label: 'Assign Officers' },
        { to: '/admin/invitations', icon: <UserPlus size={20} />, label: 'Staff Onboarding' },
      ];
    }
    if (role === 'MUNICIPAL_OFFICER') {
      return [
        { to: '/officer/dashboard', icon: <Home size={20} />, label: 'Officer Dashboard' },
        { to: '/officer/work', icon: <FileText size={20} />, label: 'My Assignments' },
        { to: '/officer/invitations', icon: <UserPlus size={20} />, label: 'Invite Field Workers' },
      ];
    }
    if (role === 'FIELD_WORKER') {
      return [
        { to: '/field-worker/dashboard', icon: <Home size={20} />, label: 'Worker Dashboard' },
        { to: '/field-worker/work', icon: <FileText size={20} />, label: 'Field Assignments' },
      ];
    }
    return [
      { to: '/citizen/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
      { to: '/citizen/report', icon: <PlusCircle size={20} />, label: 'Report Issue' },
      { to: '/citizen/complaints', icon: <FileText size={20} />, label: 'My Complaints' },
    ];
  };

  const getPageTitle = () => {
    const titles = {
      '/citizen/dashboard': 'Citizen Dashboard',
      '/citizen/report': 'Report Issue',
      '/citizen/complaints': 'My Complaints',
      '/admin/dashboard': 'System Administrator Dashboard',
      '/super-admin/dashboard': 'Super Admin Dashboard',
      '/admin/verify': 'Verify Issues',
      '/admin/assign': 'Assign Staff',
      '/admin/invitations': 'Staff Onboarding',
      '/officer/dashboard': 'Municipal Officer Dashboard',
      '/officer/work': 'My Assignments',
      '/officer/invitations': 'Department Field Workers',
      '/field-worker/dashboard': 'Field Worker Dashboard',
      '/field-worker/work': 'Field Work Assignments',
    };
    return titles[location.pathname] || 'CivicResolver';
  };

  const roleLabel = {
    CITIZEN: 'Citizen',
    MUNICIPAL_OFFICER: 'Municipal Officer',
    FIELD_WORKER: 'Field Worker',
    SYSTEM_ADMIN: 'System Admin',
    SUPER_ADMIN: 'Super Admin',
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`dl-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dl-sidebar-header">
          <span className="dl-brand">
            🏛️ Civic<span>Resolver</span>
          </span>
          <button className="dl-close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="dl-sidebar-nav">
          {getNavItems().map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `dl-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="dl-sidebar-footer">
          <div className="dl-user-info">
            <div className="dl-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <p className="dl-user-name">{user?.name}</p>
              <p className="dl-user-role">
                {roleLabel[role] || role}
                {user?.userId ? ` · ${user.userId}` : ''}
              </p>
            </div>
          </div>
          <button className="dl-logout-btn" onClick={handleLogout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="dl-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="dl-main">
        <header className="dl-topbar">
          <div className="dl-topbar-left">
            <button className="dl-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <h1 className="dl-page-title">{getPageTitle()}</h1>
          </div>
          <div className="dl-topbar-right">
            <div className="dl-notif-wrapper">
              <button className="dl-notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="dl-notif-badge">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="dl-notif-dropdown">
                  <div className="dl-notif-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && <button onClick={handleMarkAllRead}>Mark all read</button>}
                  </div>
                  <div className="dl-notif-list">
                    {notifications.length === 0 ? (
                      <p className="dl-notif-empty">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n._id}
                          className={`dl-notif-item ${!n.read ? 'unread' : ''}`}
                          onClick={() => {
                            if (n.complaint) navigate(`/complaint/${n.complaint}`);
                            setShowNotifs(false);
                          }}
                        >
                          <p className="dl-notif-title">{n.title}</p>
                          <p className="dl-notif-msg">{n.message}</p>
                          <span className="dl-notif-time">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="dl-content">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
