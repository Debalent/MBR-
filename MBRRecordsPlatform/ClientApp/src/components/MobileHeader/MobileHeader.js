import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MobileHeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
    height: 60px;
    padding: 0 1rem;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
`;

const LogoImage = styled.img`
  width: 32px;
  height: 32px;
`;

const LogoText = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffffff;
  text-decoration: none;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #ffffff;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SearchButton = styled(ActionButton)`
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  color: white;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
`;

const MenuOverlay = styled.div`
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: ${props => props.isOpen ? 'block' : 'none'};
`;

const MobileMenu = styled.div`
  position: fixed;
  top: 60px;
  right: 0;
  width: 280px;
  height: calc(100vh - 60px);
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateX(${props => props.isOpen ? '0' : '100%'});
  transition: transform 0.3s ease;
  z-index: 1000;
  overflow-y: auto;
`;

const MenuSection = styled.div`
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const MenuTitle = styled.h3`
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  background: none;
  border: none;
  color: #ffffff;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
  text-align: left;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const MenuItemIcon = styled.span`
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
`;

const MenuItemText = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
`;

const UserSection = styled.div`
  padding: 1rem;
  background: rgba(255, 107, 53, 0.1);
  border-bottom: 1px solid rgba(255, 107, 53, 0.2);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
`;

const UserName = styled.div`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
`;

const UserEmail = styled.div`
  color: #b0b0b0;
  font-size: 0.8rem;
`;

const MobileHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleNavigation = (path) => {
    navigate(path);
    closeMenu();
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  const mainMenuItems = [
    { icon: '🏠', text: 'Home', path: '/' },
    { icon: '🎵', text: 'Browse Music', path: '/browse' },
    { icon: '👥', text: 'Artists', path: '/artists' },
    { icon: '📞', text: 'Contact', path: '/contact' }
  ];

  const userMenuItems = isAuthenticated ? [
    { icon: '💫', text: 'Fan Zone', path: '/fanzone' },
    { icon: '🎤', text: 'Submit Demo', path: '/submit-demo' },
    { icon: '👤', text: 'Profile', path: '/profile' }
  ] : [];

  const adminMenuItems = isAuthenticated && user?.role === 'admin' ? [
    { icon: '📊', text: 'Admin Dashboard', path: '/admin' },
    { icon: '💾', text: 'Flash Drive Manager', path: '/flash-drive' }
  ] : [];

  return (
    <>
      <MobileHeaderContainer>
        <HeaderContent>
          <Logo onClick={() => navigate('/')}>
            <LogoImage src="/logo.svg" alt="MBR Records" />
            <LogoText>MBR</LogoText>
          </Logo>
          
          <Actions>
            <SearchButton onClick={() => setSearchOpen(!searchOpen)}>
              🔍 Search
            </SearchButton>
            <ActionButton onClick={toggleMenu}>
              ☰
            </ActionButton>
          </Actions>
        </HeaderContent>
      </MobileHeaderContainer>

      <MenuOverlay isOpen={menuOpen} onClick={closeMenu} />
      
      <MobileMenu isOpen={menuOpen}>
        {isAuthenticated && (
          <UserSection>
            <UserInfo>
              <UserAvatar>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </UserAvatar>
              <div>
                <UserName>{user?.name || 'User'}</UserName>
                <UserEmail>{user?.email}</UserEmail>
              </div>
            </UserInfo>
          </UserSection>
        )}

        <MenuSection>
          <MenuTitle>Navigation</MenuTitle>
          {mainMenuItems.map((item, index) => (
            <MenuItem key={index} onClick={() => handleNavigation(item.path)}>
              <MenuItemIcon>{item.icon}</MenuItemIcon>
              <MenuItemText>{item.text}</MenuItemText>
            </MenuItem>
          ))}
        </MenuSection>

        {isAuthenticated && userMenuItems.length > 0 && (
          <MenuSection>
            <MenuTitle>Your Account</MenuTitle>
            {userMenuItems.map((item, index) => (
              <MenuItem key={index} onClick={() => handleNavigation(item.path)}>
                <MenuItemIcon>{item.icon}</MenuItemIcon>
                <MenuItemText>{item.text}</MenuItemText>
              </MenuItem>
            ))}
          </MenuSection>
        )}

        {adminMenuItems.length > 0 && (
          <MenuSection>
            <MenuTitle>Admin</MenuTitle>
            {adminMenuItems.map((item, index) => (
              <MenuItem key={index} onClick={() => handleNavigation(item.path)}>
                <MenuItemIcon>{item.icon}</MenuItemIcon>
                <MenuItemText>{item.text}</MenuItemText>
              </MenuItem>
            ))}
          </MenuSection>
        )}

        <MenuSection>
          <MenuTitle>Account</MenuTitle>
          {isAuthenticated ? (
            <MenuItem onClick={handleLogout}>
              <MenuItemIcon>🚪</MenuItemIcon>
              <MenuItemText>Sign Out</MenuItemText>
            </MenuItem>
          ) : (
            <>
              <MenuItem onClick={() => handleNavigation('/login')}>
                <MenuItemIcon>🔑</MenuItemIcon>
                <MenuItemText>Sign In</MenuItemText>
              </MenuItem>
              <MenuItem onClick={() => handleNavigation('/signup')}>
                <MenuItemIcon>📝</MenuItemIcon>
                <MenuItemText>Sign Up</MenuItemText>
              </MenuItem>
            </>
          )}
        </MenuSection>
      </MobileMenu>
    </>
  );
};

export default MobileHeader;