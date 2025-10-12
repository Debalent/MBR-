import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { login, loginAsAdmin, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleAdminLogin = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate login delay
    loginAsAdmin();
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px',
        padding: '3rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          MBR Records
        </h1>
        
        <p style={{
          color: '#b0b0b0',
          marginBottom: '2rem'
        }}>
          Digital Music Label Platform
        </p>

        <div style={{
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            color: '#ff6b35',
            marginBottom: '1rem',
            fontSize: '1.1rem'
          }}>
            Demo Access
          </h3>
          <p style={{
            color: '#ffffff',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            Click below to login as an admin and test the Flash Drive Manager feature.
          </p>
          
          <button
            onClick={handleAdminLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              color: 'white',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Logging in...' : 'Login as Admin (Demo)'}
          </button>
        </div>

        <div style={{
          color: '#888',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}>
          <p>This is a demo environment.</p>
          <p>Flash Drive Manager requires admin access.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;