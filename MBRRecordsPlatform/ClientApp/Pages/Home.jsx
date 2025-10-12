import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Star, Clock, Users } from 'lucide-react';
import { useAudioContext } from '../contexts/AudioContext';

const HomeContainer = styled.div`
  min-height: calc(100vh - 140px);
  padding-bottom: var(--spacing-2xl);
`;

const HeroSection = styled.section`
  position: relative;
  height: 60vh;
  min-height: 400px;
  background: linear-gradient(135deg, var(--color-background-dark) 0%, var(--color-background-medium) 100%);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.02"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    pointer-events: none;
  }
`;

const HeroContent = styled.div`
  text-align: center;
  z-index: 2;
  max-width: 800px;
  padding: 0 var(--spacing-lg);
`;

const HeroTitle = styled(motion.h1)`
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  margin-bottom: var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2xl);
  line-height: 1.6;
`;

const HeroButton = styled(motion.button)`
  padding: var(--spacing-md) var(--spacing-2xl);
  background: linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-lg);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
  }
`;

const Section = styled.section`
  margin-bottom: var(--spacing-3xl);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  svg {
    color: var(--color-primary-orange);
  }
`;

const ViewAllLink = styled.a`
  color: var(--color-primary-orange);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    color: var(--color-primary-orange-light);
    transform: translateX(2px);
  }
`;

const TrackGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

const TrackCard = styled(motion.div)`
  background: var(--color-background-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid var(--color-border-default);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--color-primary-orange);
  }
`;

const TrackImage = styled.div`
  position: relative;
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
`;

const PlayOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${TrackCard}:hover & {
    opacity: 1;
  }
`;

const PlayButton = styled.button`
  width: 60px;
  height: 60px;
  background: var(--color-primary-orange);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-lg);
  
  &:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-glow);
  }
`;

const TrackInfo = styled.div`
  padding: var(--spacing-lg);
`;

const TrackTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TrackArtist = styled.p`
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TrackStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
`;

const StatCard = styled(motion.div)`
  background: var(--color-background-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  border: 1px solid var(--color-border-default);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary-orange);
  }
`;

const StatIcon = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md) auto;
  color: white;
  font-size: 1.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
`;

const StatLabel = styled.div`
  color: var(--color-text-secondary);
  font-size: 0.9rem;
`;

function Home() {
  const { playTrack } = useAudioContext();
  const [featuredTracks, setFeaturedTracks] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API calls with sample data
    const loadData = async () => {
      // Sample data - replace with actual API calls
      const sampleTracks = [
        {
          id: 1,
          title: "Electric Dreams",
          artist: "Neon Pulse",
          artwork: "/sample-artwork-1.jpg",
          audioUrl: "/sample-audio-1.mp3",
          plays: 15420,
          duration: "3:45",
          genre: "Electronic"
        },
        {
          id: 2,
          title: "Midnight Journey",
          artist: "Luna Nova",
          artwork: "/sample-artwork-2.jpg",
          audioUrl: "/sample-audio-2.mp3",
          plays: 8930,
          duration: "4:12",
          genre: "Ambient"
        },
        {
          id: 3,
          title: "Urban Vibes",
          artist: "Street Symphony",
          artwork: "/sample-artwork-3.jpg",
          audioUrl: "/sample-audio-3.mp3",
          plays: 22150,
          duration: "3:28",
          genre: "Hip Hop"
        },
        {
          id: 4,
          title: "Ocean Waves",
          artist: "Calm Collective",
          artwork: "/sample-artwork-4.jpg",
          audioUrl: "/sample-audio-4.mp3",
          plays: 6780,
          duration: "5:33",
          genre: "Chill"
        }
      ];

      setFeaturedTracks(sampleTracks.slice(0, 2));
      setTrendingTracks(sampleTracks.slice(1, 3));
      setNewReleases(sampleTracks);
      setLoading(false);
    };

    loadData();
  }, []);

  const handlePlayTrack = (track, queue = [track]) => {
    playTrack(track, queue);
  };

  const stats = [
    { icon: <Users />, value: "500+", label: "Artists" },
    { icon: <Play />, value: "10K+", label: "Tracks" },
    { icon: <TrendingUp />, value: "1M+", label: "Plays" },
    { icon: <Star />, value: "4.9", label: "Rating" }
  ];

  if (loading) {
    return (
      <HomeContainer>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="animate-pulse">Loading...</div>
        </div>
      </HomeContainer>
    );
  }

  return (
    <HomeContainer>
      <Helmet>
        <title>MBR Records - Discover Amazing Music</title>
        <meta name="description" content="Discover the latest tracks from independent artists on MBR Records. Stream, like, and support emerging talent." />
      </Helmet>

      <HeroSection>
        <HeroContent>
          <HeroTitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Welcome to MBR Records
          </HeroTitle>
          <HeroSubtitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Discover amazing music from independent artists around the world. 
            Stream, support, and connect with emerging talent.
          </HeroSubtitle>
          <HeroButton
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Exploring
          </HeroButton>
        </HeroContent>
      </HeroSection>

      <StatsGrid>
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <StatIcon>{stat.icon}</StatIcon>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
          </StatCard>
        ))}
      </StatsGrid>

      <Section>
        <SectionHeader>
          <SectionTitle>
            <Star />
            Featured Tracks
          </SectionTitle>
          <ViewAllLink href="/browse">View All</ViewAllLink>
        </SectionHeader>
        <TrackGrid>
          {featuredTracks.map((track, index) => (
            <TrackCard
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handlePlayTrack(track, featuredTracks)}
            >
              <TrackImage>
                <img 
                  src={track.artwork} 
                  alt={track.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = 'linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%)';
                  }}
                />
                <PlayOverlay>
                  <PlayButton>
                    <Play />
                  </PlayButton>
                </PlayOverlay>
              </TrackImage>
              <TrackInfo>
                <TrackTitle>{track.title}</TrackTitle>
                <TrackArtist>{track.artist}</TrackArtist>
                <TrackStats>
                  <span>{track.plays.toLocaleString()} plays</span>
                  <span>{track.duration}</span>
                </TrackStats>
              </TrackInfo>
            </TrackCard>
          ))}
        </TrackGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>
            <TrendingUp />
            Trending Now
          </SectionTitle>
          <ViewAllLink href="/browse?sort=trending">View All</ViewAllLink>
        </SectionHeader>
        <TrackGrid>
          {trendingTracks.map((track, index) => (
            <TrackCard
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handlePlayTrack(track, trendingTracks)}
            >
              <TrackImage>
                <img 
                  src={track.artwork} 
                  alt={track.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = 'linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%)';
                  }}
                />
                <PlayOverlay>
                  <PlayButton>
                    <Play />
                  </PlayButton>
                </PlayOverlay>
              </TrackImage>
              <TrackInfo>
                <TrackTitle>{track.title}</TrackTitle>
                <TrackArtist>{track.artist}</TrackArtist>
                <TrackStats>
                  <span>{track.plays.toLocaleString()} plays</span>
                  <span>{track.duration}</span>
                </TrackStats>
              </TrackInfo>
            </TrackCard>
          ))}
        </TrackGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>
            <Clock />
            New Releases
          </SectionTitle>
          <ViewAllLink href="/browse?sort=latest">View All</ViewAllLink>
        </SectionHeader>
        <TrackGrid>
          {newReleases.map((track, index) => (
            <TrackCard
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handlePlayTrack(track, newReleases)}
            >
              <TrackImage>
                <img 
                  src={track.artwork} 
                  alt={track.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = 'linear-gradient(135deg, var(--color-primary-orange) 0%, #1976d2 100%)';
                  }}
                />
                <PlayOverlay>
                  <PlayButton>
                    <Play />
                  </PlayButton>
                </PlayOverlay>
              </TrackImage>
              <TrackInfo>
                <TrackTitle>{track.title}</TrackTitle>
                <TrackArtist>{track.artist}</TrackArtist>
                <TrackStats>
                  <span>{track.plays.toLocaleString()} plays</span>
                  <span>{track.duration}</span>
                </TrackStats>
              </TrackInfo>
            </TrackCard>
          ))}
        </TrackGrid>
      </Section>
    </HomeContainer>
  );
}

export default Home;