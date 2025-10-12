import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const DashboardHeader = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.1rem;
  color: #b0b0b0;
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
`;

const StatIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #ff6b35;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #b0b0b0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatChange = styled.div`
  font-size: 0.8rem;
  color: ${props => props.positive ? '#4ade80' : '#f87171'};
  margin-top: 0.5rem;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ActionCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 107, 53, 0.1);
    border-color: rgba(255, 107, 53, 0.3);
    transform: translateY(-2px);
  }
`;

const ActionIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const ActionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
`;

const ActionDescription = styled.p`
  font-size: 0.9rem;
  color: #b0b0b0;
  margin: 0;
  line-height: 1.5;
`;

const RecentActivitySection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
`;

const ActivityIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityText = styled.div`
  font-size: 0.95rem;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const ActivityTime = styled.div`
  font-size: 0.8rem;
  color: #b0b0b0;
`;

const UpcomingSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
`;

const UpcomingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const UpcomingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border-left: 4px solid #ff6b35;
`;

const UpcomingContent = styled.div`
  flex: 1;
`;

const UpcomingTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const UpcomingDate = styled.div`
  font-size: 0.9rem;
  color: #ff6b35;
`;

const UpcomingBadge = styled.div`
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const ArtistDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPlays: 45600,
    totalFollowers: 1250,
    monthlyListeners: 3400,
    trackCount: 24,
    recentPlaysChange: 12.5,
    followersChange: 8.2,
    listenersChange: -2.1,
    tracksChange: 0
  });

  const [recentActivity] = useState([
    {
      id: 1,
      type: 'play',
      icon: '▶️',
      text: 'Your track "City Lights" was played 150 times today',
      time: '2 hours ago'
    },
    {
      id: 2,
      type: 'follow',
      icon: '👥',
      text: '15 new followers this week',
      time: '1 day ago'
    },
    {
      id: 3,
      type: 'upload',
      icon: '🎵',
      text: 'Track "Late Night Vibes" was successfully uploaded',
      time: '3 days ago'
    },
    {
      id: 4,
      type: 'playlist',
      icon: '📋',
      text: 'Your song was added to "Hip-Hop Favorites" playlist',
      time: '5 days ago'
    }
  ]);

  const [upcoming] = useState([
    {
      id: 1,
      title: 'New single release',
      date: 'March 15, 2024',
      type: 'Release'
    },
    {
      id: 2,
      title: 'Studio session with producer',
      date: 'March 20, 2024',
      type: 'Session'
    },
    {
      id: 3,
      title: 'Fan meet & greet event',
      date: 'March 25, 2024',
      type: 'Event'
    }
  ]);

  const quickActions = [
    {
      icon: '🎵',
      title: 'Upload New Track',
      description: 'Share your latest creation with your fans'
    },
    {
      icon: '👤',
      title: 'Edit Profile',
      description: 'Update your bio, photos, and social links'
    },
    {
      icon: '📊',
      title: 'View Analytics',
      description: 'See detailed stats about your music performance'
    },
    {
      icon: '💬',
      title: 'Fan Messages',
      description: 'Read and respond to fan comments and messages'
    },
    {
      icon: '📢',
      title: 'Promote Track',
      description: 'Create promotional campaigns for your music'
    },
    {
      icon: '🎤',
      title: 'Book Studio Time',
      description: 'Reserve studio time for your next recording session'
    }
  ];

  const handleActionClick = (action) => {
    console.log('Action clicked:', action.title);
    // Navigate to appropriate page
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <WelcomeTitle>Welcome back, {user?.name || 'Artist'}! 🎵</WelcomeTitle>
        <WelcomeSubtitle>
          Your music is making waves. Here's what's happening with your tracks.
        </WelcomeSubtitle>
      </DashboardHeader>

      <StatsGrid>
        <StatCard>
          <StatIcon>🎧</StatIcon>
          <StatValue>{stats.totalPlays.toLocaleString()}</StatValue>
          <StatLabel>Total Plays</StatLabel>
          <StatChange positive={stats.recentPlaysChange > 0}>
            {stats.recentPlaysChange > 0 ? '+' : ''}{stats.recentPlaysChange}% this month
          </StatChange>
        </StatCard>

        <StatCard>
          <StatIcon>👥</StatIcon>
          <StatValue>{stats.totalFollowers.toLocaleString()}</StatValue>
          <StatLabel>Followers</StatLabel>
          <StatChange positive={stats.followersChange > 0}>
            {stats.followersChange > 0 ? '+' : ''}{stats.followersChange}% this month
          </StatChange>
        </StatCard>

        <StatCard>
          <StatIcon>📈</StatIcon>
          <StatValue>{stats.monthlyListeners.toLocaleString()}</StatValue>
          <StatLabel>Monthly Listeners</StatLabel>
          <StatChange positive={stats.listenersChange > 0}>
            {stats.listenersChange > 0 ? '+' : ''}{stats.listenersChange}% vs last month
          </StatChange>
        </StatCard>

        <StatCard>
          <StatIcon>🎵</StatIcon>
          <StatValue>{stats.trackCount}</StatValue>
          <StatLabel>Total Tracks</StatLabel>
          <StatChange positive={stats.tracksChange > 0}>
            {stats.tracksChange > 0 ? '+' : ''}{stats.tracksChange} this month
          </StatChange>
        </StatCard>
      </StatsGrid>

      <QuickActionsGrid>
        {quickActions.map((action, index) => (
          <ActionCard key={index} onClick={() => handleActionClick(action)}>
            <ActionIcon>{action.icon}</ActionIcon>
            <ActionTitle>{action.title}</ActionTitle>
            <ActionDescription>{action.description}</ActionDescription>
          </ActionCard>
        ))}
      </QuickActionsGrid>

      <RecentActivitySection>
        <SectionTitle>
          📈 Recent Activity
        </SectionTitle>
        <ActivityList>
          {recentActivity.map(activity => (
            <ActivityItem key={activity.id}>
              <ActivityIcon>{activity.icon}</ActivityIcon>
              <ActivityContent>
                <ActivityText>{activity.text}</ActivityText>
                <ActivityTime>{activity.time}</ActivityTime>
              </ActivityContent>
            </ActivityItem>
          ))}
        </ActivityList>
      </RecentActivitySection>

      <UpcomingSection>
        <SectionTitle>
          📅 Upcoming Events
        </SectionTitle>
        <UpcomingList>
          {upcoming.map(event => (
            <UpcomingItem key={event.id}>
              <UpcomingContent>
                <UpcomingTitle>{event.title}</UpcomingTitle>
                <UpcomingDate>{event.date}</UpcomingDate>
              </UpcomingContent>
              <UpcomingBadge>{event.type}</UpcomingBadge>
            </UpcomingItem>
          ))}
        </UpcomingList>
      </UpcomingSection>
    </DashboardContainer>
  );
};

export default ArtistDashboard;