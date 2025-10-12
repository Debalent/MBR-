import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div style={{
      padding: '2rem',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '2rem',
          background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          Admin Dashboard
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#ff6b35', marginBottom: '1rem' }}>Total Users</h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>1,247</p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#ff6b35', marginBottom: '1rem' }}>Total Tracks</h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>3,456</p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#ff6b35', marginBottom: '1rem' }}>Active Artists</h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>89</p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: '#ff6b35', marginBottom: '1rem' }}>Pending Demos</h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>23</p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ marginBottom: '2rem', color: '#ffffff' }}>Quick Actions</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <Link to="/flash-drive" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: '8px',
              color: '#ff6b35',
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '1.5rem' }}>💾</span>
              <span>Flash Drive Manager</span>
            </Link>

            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: '8px',
              color: '#ff6b35',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <span>View Analytics</span>
            </button>

            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: '8px',
              color: '#ff6b35',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '1.5rem' }}>👥</span>
              <span>Manage Users</span>
            </button>

            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: '8px',
              color: '#ff6b35',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🎵</span>
              <span>Review Demos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;