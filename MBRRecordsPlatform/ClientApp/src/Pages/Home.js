import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{
      minHeight: 'calc(100vh - 150px)',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          padding: '4rem 0',
          marginBottom: '4rem'
        }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            MBR Records
          </h1>
          
          <p style={{
            fontSize: '1.3rem',
            color: '#b0b0b0',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            Digital Music Label Platform - Discover amazing music from independent artists
          </p>

          {!isAuthenticated ? (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/login" style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1rem'
              }}>
                Get Started
              </Link>
              
              <Link to="/browse" style={{
                padding: '1rem 2rem',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1rem'
              }}>
                Browse Music
              </Link>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <h3 style={{ color: '#ff6b35', marginBottom: '1rem' }}>
                Welcome back, {user?.name}!
              </h3>
              <p style={{ color: '#ffffff', marginBottom: '1.5rem' }}>
                {user?.role === 'admin' ? 'You have admin access to all platform features.' : 'Explore the platform and discover new music.'}
              </p>
              
              {user?.role === 'admin' && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/flash-drive" style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}>
                    💾 Flash Drive Manager
                  </Link>
                  
                  <Link to="/admin" style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}>
                    ⚙️ Admin Dashboard
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎵</div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Discover Music</h3>
            <p style={{ color: '#b0b0b0', fontSize: '0.95rem' }}>
              Explore a vast catalog of music from independent artists and emerging talent.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Connect with Artists</h3>
            <p style={{ color: '#b0b0b0', fontSize: '0.95rem' }}>
              Follow your favorite artists and stay updated with their latest releases.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📤</div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Submit Your Demo</h3>
            <p style={{ color: '#b0b0b0', fontSize: '0.95rem' }}>
              Artists can submit their demos for review and potential record label signing.
            </p>
          </div>
        </div>

        {/* Flash Drive Feature Highlight */}
        {user?.role === 'admin' && (
          <div style={{
            background: 'rgba(255, 107, 53, 0.05)',
            border: '2px solid rgba(255, 107, 53, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💾</div>
            <h2 style={{ color: '#ff6b35', marginBottom: '1rem' }}>Flash Drive Audio Extraction</h2>
            <p style={{ color: '#ffffff', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Advanced system for automatically extracting WAV audio files from flash drives, 
              processing metadata, and importing them directly into the platform.
            </p>
            <Link to="/flash-drive" style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1rem'
            }}>
              Open Flash Drive Manager
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;