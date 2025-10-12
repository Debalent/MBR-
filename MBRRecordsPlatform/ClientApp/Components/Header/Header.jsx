import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Search, Menu, Notifications, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-fixed);
  background: ${props => props.scrolled ? 'rgba(15, 15, 15, 0.98)' : 'rgba(15, 15, 15, 0.95)'};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border-default);
  transition: all 0.3s ease-in-out;
  
  ${props => props.scrolled && `
    box-shadow: var(--shadow-lg);
  `}
  
  @supports not (backdrop-filter: blur(20px)) {
    background: rgba(15, 15, 15, 0.95);
  }
`;

const Navbar = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) 0;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: var(--spacing-md);
  padding-right: var(--spacing-md);
`;

const NavbarBrand = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-orange);
  text-decoration: none;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.02);
  }
  
  img {
    height: 40px;
    width: auto;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
`;

const NavbarNav = styled.ul`
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  list-style: none;
  margin: 0;
  padding: 0;
  
  @media (max-width: 991px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  position: relative;
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-secondary);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  border-radius: var(--radius-md);
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    width: 0;
    height: 2px;
    background: var(--color-primary-orange);
    transition: all 0.3s ease;
    transform: translateX(-50%);
  }
  
  &:hover,
  &.active {
    color: var(--color-text-primary);
    background: rgba(255, 87, 34, 0.1);
  }
  
  &:hover::after,
  &.active::after {
    width: 80%;
  }
`;

const NavbarSearch = styled.div`
  position: relative;
  max-width: 400px;
  flex: 1;
  margin: 0 var(--spacing-xl);
  
  @media (max-width: 991px) {
    display: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 3rem;
  background: var(--color-background-light);
  border: 1px solid var(--color-border-default);
  border-radius: 25px;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-orange);
    box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.1);
    background: var(--color-background-medium);
  }
  
  &::placeholder {
    color: var(--color-text-muted);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  font-size: 1.1rem;
  pointer-events: none;
`;

const NavbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    color: var(--color-text-primary);
    background: var(--color-background-light);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background: var(--color-primary-orange);
  color: white;
  border-radius: 50%;
  width: 8px;
  height: 8px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-primary-orange);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-glow);
  }
`;

const MenuToggle = styled.button`
  display: none;
  background: none;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--color-background-light);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
  
  @media (max-width: 991px) {
    display: block;
  }
`;

const AuthButtons = styled.div`
  display: flex;
  gap: var(--spacing-sm);
`;

const AuthButton = styled(Link)`
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  
  &.login {
    color: var(--color-text-primary);
    background: transparent;
    border: 1px solid var(--color-border-default);
    
    &:hover {
      background: var(--color-background-light);
      border-color: var(--color-primary-orange);
    }
  }
  
  &.signup {
    color: white;
    background: linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%);
    border: none;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
  }
`;

function Header({ onToggleSidebar }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <HeaderContainer scrolled={scrolled}>
      <Navbar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <MenuToggle onClick={onToggleSidebar}>
            <Menu />
          </MenuToggle>
          
          <NavbarBrand to="/">
            <img 
              src="C:\Users\Admin\OneDrive\Desktop\PeoplePayLogo\MBR logo.png" 
              alt="MBR Records Logo"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline';
              }}
            />
            <span style={{ display: 'none' }}>MBR Records</span>
          </NavbarBrand>
        </div>

        <NavbarNav>
          <li>
            <NavLink to="/" className={isActiveLink('/') ? 'active' : ''}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/browse" className={isActiveLink('/browse') ? 'active' : ''}>
              Browse Music
            </NavLink>
          </li>
          <li>
            <NavLink to="/artists" className={isActiveLink('/artists') ? 'active' : ''}>
              Artists
            </NavLink>
          </li>
          {isAuthenticated && (
            <>
              <li>
                <NavLink to="/fanzone" className={isActiveLink('/fanzone') ? 'active' : ''}>
                  Fan Zone
                </NavLink>
              </li>
              <li>
                <NavLink to="/submit-demo" className={isActiveLink('/submit-demo') ? 'active' : ''}>
                  Submit Demo
                </NavLink>
              </li>
            </>
          )}
        </NavbarNav>

        <NavbarSearch>
          <form onSubmit={handleSearch}>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search for tracks, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </NavbarSearch>

        <NavbarActions>
          {isAuthenticated ? (
            <>
              <ActionButton>
                <Notifications />
                <NotificationBadge />
              </ActionButton>
              
              <ActionButton>
                <Settings />
              </ActionButton>
              
              <UserMenu>
                <UserAvatar
                  src={user?.avatar || '/default-avatar.png'}
                  alt={user?.name || 'User'}
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
              </UserMenu>
            </>
          ) : (
            <AuthButtons>
              <AuthButton to="/login" className="login">
                Login
              </AuthButton>
              <AuthButton to="/signup" className="signup">
                Sign Up
              </AuthButton>
            </AuthButtons>
          )}
        </NavbarActions>
      </Navbar>
    </HeaderContainer>
  );
}

export default Header;