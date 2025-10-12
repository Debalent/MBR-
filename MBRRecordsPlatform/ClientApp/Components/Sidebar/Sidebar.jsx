import React from 'react';
import styled from 'styled-components';
import { Home, Music, Users, Heart, Upload, MessageCircle, Settings, Headphones } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const SidebarContainer = styled.aside`
  width: 240px;
  background: var(--color-background-medium);
  border-right: 1px solid var(--color-border-default);
  padding: var(--spacing-lg);
  position: fixed;
  left: 0;
  top: 70px;
  bottom: 0;
  overflow-y: auto;
  transition: transform 0.3s ease-in-out;
  z-index: var(--z-sticky);
  
  ${props => !props.isOpen && `
    transform: translateX(-100%);
  `}
  
  @media (max-width: 991px) {
    transform: translateX(-100%);
    
    ${props => props.isOpen && `
      transform: translateX(0);
    `}
  }
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-primary-orange);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-orange-dark);
  }
`;

const SidebarSection = styled.div`
  margin-bottom: var(--spacing-xl);
`;

const SidebarTitle = styled.h3`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-md);
`;

const SidebarMenu = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SidebarMenuItem = styled.li`
  margin-bottom: var(--spacing-xs);
`;

const SidebarLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
  
  &:hover {
    background: var(--color-background-light);
    color: var(--color-text-primary);
    transform: translateX(2px);
  }
  
  &.active {
    background: rgba(255, 87, 34, 0.1);
    color: var(--color-primary-orange);
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--color-primary-orange);
      border-radius: 0 2px 2px 0;
    }
  }
  
  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

const PlaylistItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background: var(--color-background-light);
    color: var(--color-text-primary);
  }
`;

const PlaylistCover = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-primary-orange), #1976d2);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
`;

const PlaylistInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PlaylistName = styled.div`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlaylistCount = styled.div`
  font-size: 0.75rem;
  color: var(--color-text-muted);
`;

const StatsContainer = styled.div`
  background: var(--color-background-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-top: var(--spacing-lg);
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatLabel = styled.span`
  color: var(--color-text-secondary);
  font-size: 0.85rem;
`;

const StatValue = styled.span`
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 0.85rem;
`;

function Sidebar({ isOpen }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Sample playlists data (would come from API)
  const playlists = [
    { id: 1, name: 'Liked Songs', count: 47, color: '#ff5722' },
    { id: 2, name: 'Recently Played', count: 23, color: '#1976d2' },
    { id: 3, name: 'Hip Hop Vibes', count: 156, color: '#9c27b0' },
    { id: 4, name: 'Chill Sessions', count: 89, color: '#00acc1' },
    { id: 5, name: 'New Releases', count: 34, color: '#4caf50' }
  ];

  // Sample stats (would come from API)
  const stats = {
    totalListens: '2,847',
    followedArtists: '67',
    likedTracks: '234',
    playlists: playlists.length
  };

  return (
    <SidebarContainer isOpen={isOpen}>
      <SidebarSection>
        <SidebarTitle>Discover</SidebarTitle>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarLink 
              to="/" 
              className={isActiveLink('/') ? 'active' : ''}
            >
              <Home />
              Home
            </SidebarLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarLink 
              to="/browse" 
              className={isActiveLink('/browse') ? 'active' : ''}
            >
              <Music />
              Browse Music
            </SidebarLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarLink 
              to="/artists" 
              className={isActiveLink('/artists') ? 'active' : ''}
            >
              <Users />
              Artists
            </SidebarLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarSection>

      {isAuthenticated && (
        <>
          <SidebarSection>
            <SidebarTitle>Your Music</SidebarTitle>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarLink 
                  to="/fanzone" 
                  className={isActiveLink('/fanzone') ? 'active' : ''}
                >
                  <Heart />
                  Fan Zone
                </SidebarLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarLink 
                  to="/submit-demo" 
                  className={isActiveLink('/submit-demo') ? 'active' : ''}
                >
                  <Upload />
                  Submit Demo
                </SidebarLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarLink to="/messages">
                  <MessageCircle />
                  Messages
                </SidebarLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarSection>

          <SidebarSection>
            <SidebarTitle>Your Playlists</SidebarTitle>
            <SidebarMenu>
              {playlists.map((playlist) => (
                <SidebarMenuItem key={playlist.id}>
                  <PlaylistItem>
                    <PlaylistCover style={{ background: playlist.color }}>
                      <Headphones size={16} />
                    </PlaylistCover>
                    <PlaylistInfo>
                      <PlaylistName>{playlist.name}</PlaylistName>
                      <PlaylistCount>{playlist.count} tracks</PlaylistCount>
                    </PlaylistInfo>
                  </PlaylistItem>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarSection>

          <SidebarSection>
            <SidebarTitle>Settings</SidebarTitle>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarLink to="/profile">
                  <Settings />
                  Profile
                </SidebarLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarSection>

          {user && (
            <StatsContainer>
              <SidebarTitle style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 0 }}>
                Your Stats
              </SidebarTitle>
              <StatItem>
                <StatLabel>Total Listens</StatLabel>
                <StatValue>{stats.totalListens}</StatValue>
              </StatItem>
              <StatItem>
                <StatLabel>Following</StatLabel>
                <StatValue>{stats.followedArtists}</StatValue>
              </StatItem>
              <StatItem>
                <StatLabel>Liked Tracks</StatLabel>
                <StatValue>{stats.likedTracks}</StatValue>
              </StatItem>
              <StatItem>
                <StatLabel>Playlists</StatLabel>
                <StatValue>{stats.playlists}</StatValue>
              </StatItem>
            </StatsContainer>
          )}
        </>
      )}
    </SidebarContainer>
  );
}

export default Sidebar;