import React from 'react';
import styled from 'styled-components';

const MobileNavContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 999;
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    height: 60px;
    align-items: center;
    justify-content: space-around;
    padding: 0 1rem;
  }
`;

const NavItem = styled.button`
  background: none;
  border: none;
  color: ${props => props.active ? '#ff6b35' : '#ffffff'};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  flex: 1;
  max-width: 80px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const Icon = styled.span`
  font-size: 1.2rem;
`;

const Label = styled.span`
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
`;

const MobileNavigation = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'browse', icon: '🎵', label: 'Browse' },
    { id: 'artists', icon: '👥', label: 'Artists' },
    { id: 'fanzone', icon: '💫', label: 'Fan Zone' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ];

  return (
    <MobileNavContainer>
      {navItems.map(item => (
        <NavItem
          key={item.id}
          active={activeTab === item.id}
          onClick={() => onTabChange(item.id)}
        >
          <Icon>{item.icon}</Icon>
          <Label>{item.label}</Label>
        </NavItem>
      ))}
    </MobileNavContainer>
  );
};

export default MobileNavigation;