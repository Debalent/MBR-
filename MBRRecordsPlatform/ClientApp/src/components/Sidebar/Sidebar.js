import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { path: '/', icon: '🏠', label: 'Home', public: true },
    { path: '/browse', icon: '🎵', label: 'Browse Music', public: true },
    { path: '/artists', icon: '👥', label: 'Artists', public: true },
    { path: '/fanzone', icon: '🎪', label: 'Fan Zone', protected: true },
    { path: '/submit-demo', icon: '📤', label: 'Submit Demo', protected: true },
    { path: '/profile', icon: '👤', label: 'Profile', protected: true },
    { path: '/contact', icon: '📧', label: 'Contact', public: true },
  ];

  const adminItems = [
    { path: '/admin', icon: '⚙️', label: 'Admin Dashboard', admin: true },
    { path: '/flash-drive', icon: '💾', label: 'Flash Drive Manager', admin: true },
  ];

  const isActiveRoute = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const shouldShowItem = (item) => {
    if (item.admin && (!isAuthenticated || user?.role !== 'admin')) {
      return false;
    }
    if (item.protected && !isAuthenticated) {
      return false;
    }
    return true;
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
      <div className="sidebar__content">
        <div className="sidebar__logo">
          <div className="sidebar__logo-fallback">
            <span className="sidebar__logo-text-large">MBR</span>
            <span className="sidebar__logo-text-small">RECORDS</span>
          </div>
          <img 
            src="/assets/logo/MBR-Logo.svg" 
            alt="MBR Records" 
            className="sidebar__logo-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span className="sidebar__logo-text">MBR Records</span>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section">
            <h3 className="sidebar__section-title">Navigation</h3>
            <ul className="sidebar__menu">
              {navigationItems.map((item) => 
                shouldShowItem(item) && (
                  <li key={item.path} className="sidebar__menu-item">
                    <Link
                      to={item.path}
                      className={`sidebar__menu-link ${
                        isActiveRoute(item.path) ? 'sidebar__menu-link--active' : ''
                      }`}
                    >
                      <span className="sidebar__menu-icon">{item.icon}</span>
                      <span className="sidebar__menu-label">{item.label}</span>
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {isAuthenticated && user?.role === 'admin' && (
            <div className="sidebar__section">
              <h3 className="sidebar__section-title">Administration</h3>
              <ul className="sidebar__menu">
                {adminItems.map((item) => (
                  <li key={item.path} className="sidebar__menu-item">
                    <Link
                      to={item.path}
                      className={`sidebar__menu-link ${
                        isActiveRoute(item.path) ? 'sidebar__menu-link--active' : ''
                      }`}
                    >
                      <span className="sidebar__menu-icon">{item.icon}</span>
                      <span className="sidebar__menu-label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user-info">
            {isAuthenticated ? (
              <>
                <div className="sidebar__user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="sidebar__user-details">
                  <span className="sidebar__user-name">{user?.name || 'User'}</span>
                  <span className="sidebar__user-role">{user?.role || 'Member'}</span>
                </div>
              </>
            ) : (
              <div className="sidebar__auth-links">
                <Link to="/login" className="sidebar__auth-link">Login</Link>
                <Link to="/signup" className="sidebar__auth-link">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;