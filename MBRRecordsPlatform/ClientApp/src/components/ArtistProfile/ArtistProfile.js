import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

const ProfileContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const ProfileHeader = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255, 107, 53, 0.1), rgba(247, 147, 30, 0.1));
    z-index: 1;
  }
`;

const ProfileContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const AvatarSection = styled.div`
  flex-shrink: 0;
`;

const Avatar = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 768px) {
    width: 150px;
    height: 150px;
    font-size: 3rem;
  }
`;

const AvatarUpload = styled.label`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
  
  input {
    display: none;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ArtistName = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Genre = styled.p`
  font-size: 1.2rem;
  color: #ff6b35;
  margin: 0 0 1rem 0;
  font-weight: 500;
`;

const Bio = styled.p`
  font-size: 1rem;
  color: #b0b0b0;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  max-width: 600px;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #ffffff;
  text-decoration: none;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 107, 53, 0.3);
    transform: translateY(-2px);
  }
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 2rem;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const Stat = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ff6b35;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #b0b0b0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TabsContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 1rem;
  margin-bottom: 2rem;
`;

const TabsList = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 107, 53, 0.5);
    border-radius: 2px;
  }
`;

const Tab = styled.button`
  background: ${props => props.active ? 'linear-gradient(45deg, #ff6b35, #f7931e)' : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: 500;
  
  &:hover {
    background: ${props => props.active ? 'linear-gradient(45deg, #ff6b35, #f7931e)' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

const TabContent = styled.div`
  min-height: 300px;
`;

const TrackGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
`;

const TrackItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

const TrackArtwork = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
`;

const TrackInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TrackTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const TrackMeta = styled.div`
  font-size: 0.9rem;
  color: #b0b0b0;
  display: flex;
  gap: 1rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const PlayButton = styled.button`
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const EditButton = styled.button`
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 107, 53, 0.3);
  }
`;

const ArtistProfile = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tracks');
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock artist data - replace with API call
  const mockArtist = {
    id: id || 'current',
    name: user?.name || 'Artist Name',
    genre: 'Hip-Hop / R&B',
    bio: 'Passionate musician creating soulful beats and meaningful lyrics. Born and raised in the city, bringing authentic street vibes to every track.',
    avatar: null,
    social: {
      instagram: '#',
      twitter: '#',
      spotify: '#',
      youtube: '#'
    },
    stats: {
      tracks: 24,
      followers: 1250,
      plays: 45600
    },
    tracks: [
      {
        id: 1,
        title: 'City Lights',
        duration: '3:45',
        plays: 12500,
        artwork: null
      },
      {
        id: 2,
        title: 'Late Night Vibes',
        duration: '4:12',
        plays: 8900,
        artwork: null
      },
      {
        id: 3,
        title: 'Summer Dreams',
        duration: '3:28',
        plays: 15600,
        artwork: null
      }
    ]
  };

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setArtist(mockArtist);
      setLoading(false);
    }, 1000);
  }, [id]);

  const isOwnProfile = !id || id === 'current' || (user && artist && user.id === artist.id);

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Handle avatar upload
      console.log('Upload avatar:', file);
    }
  };

  const handleTrackPlay = (track) => {
    console.log('Play track:', track);
    // Integrate with music player
  };

  if (loading) {
    return (
      <ProfileContainer>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '2rem', color: '#ff6b35' }}>🎵</div>
          <p style={{ color: '#b0b0b0', marginTop: '1rem' }}>Loading artist profile...</p>
        </div>
      </ProfileContainer>
    );
  }

  if (!artist) {
    return (
      <ProfileContainer>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '2rem', color: '#ff6b35' }}>❌</div>
          <p style={{ color: '#b0b0b0', marginTop: '1rem' }}>Artist not found</p>
        </div>
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer>
      <ProfileHeader>
        <ProfileContent>
          <AvatarSection>
            <Avatar>
              {artist.avatar ? (
                <img src={artist.avatar} alt={artist.name} />
              ) : (
                artist.name.charAt(0).toUpperCase()
              )}
              {isOwnProfile && (
                <AvatarUpload>
                  <span>📷</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </AvatarUpload>
              )}
            </Avatar>
          </AvatarSection>
          
          <ProfileInfo>
            <ArtistName>{artist.name}</ArtistName>
            <Genre>{artist.genre}</Genre>
            <Bio>{artist.bio}</Bio>
            
            <SocialLinks>
              <SocialLink href={artist.social.instagram} target="_blank">📷</SocialLink>
              <SocialLink href={artist.social.twitter} target="_blank">🐦</SocialLink>
              <SocialLink href={artist.social.spotify} target="_blank">🎵</SocialLink>
              <SocialLink href={artist.social.youtube} target="_blank">📺</SocialLink>
            </SocialLinks>
            
            <StatsContainer>
              <Stat>
                <StatNumber>{artist.stats.tracks}</StatNumber>
                <StatLabel>Tracks</StatLabel>
              </Stat>
              <Stat>
                <StatNumber>{artist.stats.followers.toLocaleString()}</StatNumber>
                <StatLabel>Followers</StatLabel>
              </Stat>
              <Stat>
                <StatNumber>{artist.stats.plays.toLocaleString()}</StatNumber>
                <StatLabel>Total Plays</StatLabel>
              </Stat>
            </StatsContainer>
            
            {isOwnProfile && (
              <div style={{ marginTop: '1.5rem' }}>
                <EditButton onClick={() => navigate('/profile/edit')}>
                  Edit Profile
                </EditButton>
              </div>
            )}
          </ProfileInfo>
        </ProfileContent>
      </ProfileHeader>

      <TabsContainer>
        <TabsList>
          <Tab
            active={activeTab === 'tracks'}
            onClick={() => setActiveTab('tracks')}
          >
            Tracks
          </Tab>
          <Tab
            active={activeTab === 'albums'}
            onClick={() => setActiveTab('albums')}
          >
            Albums
          </Tab>
          <Tab
            active={activeTab === 'playlists'}
            onClick={() => setActiveTab('playlists')}
          >
            Playlists
          </Tab>
          <Tab
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
          >
            About
          </Tab>
        </TabsList>

        <TabContent>
          {activeTab === 'tracks' && (
            <TrackGrid>
              {artist.tracks.map(track => (
                <TrackItem key={track.id}>
                  <TrackArtwork>
                    {track.artwork ? (
                      <img src={track.artwork} alt={track.title} />
                    ) : (
                      '🎵'
                    )}
                  </TrackArtwork>
                  
                  <TrackInfo>
                    <TrackTitle>{track.title}</TrackTitle>
                    <TrackMeta>
                      <span>{track.duration}</span>
                      <span>{track.plays.toLocaleString()} plays</span>
                    </TrackMeta>
                  </TrackInfo>
                  
                  <PlayButton onClick={() => handleTrackPlay(track)}>
                    ▶️
                  </PlayButton>
                </TrackItem>
              ))}
            </TrackGrid>
          )}
          
          {activeTab === 'albums' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#b0b0b0' }}>
              No albums yet. Stay tuned for upcoming releases!
            </div>
          )}
          
          {activeTab === 'playlists' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#b0b0b0' }}>
              No playlists available.
            </div>
          )}
          
          {activeTab === 'about' && (
            <div style={{ color: '#b0b0b0', lineHeight: 1.6 }}>
              <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>About {artist.name}</h3>
              <p>{artist.bio}</p>
              
              <h4 style={{ color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>Contact</h4>
              <p>For bookings and collaborations, reach out through social media or the contact form.</p>
              
              <h4 style={{ color: '#ffffff', marginTop: '2rem', marginBottom: '1rem' }}>Equipment</h4>
              <p>Using industry-standard equipment to deliver professional quality music.</p>
            </div>
          )}
        </TabContent>
      </TabsContainer>
    </ProfileContainer>
  );
};

export default ArtistProfile;