import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const Header = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="header__container">
        <div className="header__left">
          <button 
            className="header__menu-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar menu"
          >
            <span className="header__menu-icon">☰</span>
          </button>
          
          <Link to="/" className="header__logo">
            <div className="header__logo-fallback">
              <span className="header__logo-text-large">MBR</span>
              <span className="header__logo-text-small">RECORDS</span>
            </div>
            <img 
              src="/assets/logo/MBR-Logo.svg" 
              alt="MBR Records" 
              className="header__logo-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <span className="header__logo-text">MBR Records</span>
          </Link>
        </div>

        <div className="header__center">
          <div className="header__search">
            <input 
              type="text" 
              placeholder="Search artists, tracks, albums..."
              className="header__search-input"
            />
            <button className="header__search-button">
              <span>🔍</span>
            </button>
          </div>
        </div>

        <div className="header__right">
          {isAuthenticated ? (
            <div className="header__user-menu">
              <div className="header__user-info">
                <div className="header__user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="header__user-name">{user?.name || 'User'}</span>
              </div>
              <div className="header__user-dropdown">
                <Link to="/profile" className="header__dropdown-item">
                  <span>👤</span> Profile
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link to="/admin" className="header__dropdown-item">
                      <span>⚙️</span> Admin Dashboard
                    </Link>
                    <Link to="/flash-drive" className="header__dropdown-item">
                      <span>💾</span> Flash Drive Manager
                    </Link>
                  </>
                )}
                <button onClick={handleLogout} className="header__dropdown-item header__logout">
                  <span>🚪</span> Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="header__auth-buttons">
              <Link to="/login" className="header__auth-button header__auth-button--login">
                Login
              </Link>
              <Link to="/signup" className="header__auth-button header__auth-button--signup">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;