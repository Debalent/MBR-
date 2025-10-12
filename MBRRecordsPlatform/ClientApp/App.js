import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';

import Header from './src/components/Header/Header';
import MobileHeader from './src/components/MobileHeader/MobileHeader';
import MobileNavigation from './src/components/MobileNavigation/MobileNavigation';
import Sidebar from './src/components/Sidebar/Sidebar';
import AdvancedMusicPlayer from './src/components/AdvancedMusicPlayer/AdvancedMusicPlayer';
import LoadingSpinner from './src/components/LoadingSpinner/LoadingSpinner';
import ErrorBoundary from './src/components/ErrorBoundary/ErrorBoundary';
import { useAuth } from './src/contexts/AuthContext';

// Import mobile styles
import './src/styles/mobile.css';

// Lazy load pages for better performance
const Home = lazy(() => import('./Pages/Home'));
const BrowseMusic = lazy(() => import('./Pages/BrowseMusic'));
const ArtistDirectory = lazy(() => import('./Pages/ArtistDirectory'));
const FanZone = lazy(() => import('./Pages/FanZone'));
const SubmitDemo = lazy(() => import('./Pages/SubmitDemo'));
const ContactUs = lazy(() => import('./Pages/ContactUs'));
const Login = lazy(() => import('./Pages/Login'));
const Signup = lazy(() => import('./Pages/Signup'));
const Profile = lazy(() => import('./Pages/Profile'));
const AdminDashboard = lazy(() => import('./src/components/AdminDashboard/AdminDashboard'));
const FlashDriveManager = lazy(() => import('./src/components/FlashDriveManager/FlashDriveManager'));

const AppContainer = styled.div`
  min-height: 100vh;
  background: var(--color-background-dark);
  color: var(--color-text-primary);
`;

const MainLayout = styled.div`
  display: flex;
  min-height: calc(100vh - 70px);
  padding-top: 70px;
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${props => props.sidebarOpen ? '240px' : '0'};
  padding: var(--spacing-lg);
  padding-bottom: calc(var(--spacing-lg) + 80px); /* Account for music player */
  transition: margin-left 0.3s ease-in-out;
  
  @media (max-width: 991px) {
    margin-left: 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
`;

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('home');

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle mobile navigation
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Navigate based on tab
    const routes = {
      home: '/',
      browse: '/browse',
      artists: '/artists',
      fanzone: '/fanzone',
      profile: '/profile'
    };
    window.location.href = routes[tab] || '/';
  };

  if (loading) {
    return (
      <AppContainer>
        <LoadingContainer>
          <LoadingSpinner size="large" />
        </LoadingContainer>
      </AppContainer>
    );
  }

  return (
    <ErrorBoundary>
      <AppContainer>
        <Helmet>
          <title>MBR Records - Digital Music Label Platform</title>
          <meta name="description" content="Discover amazing music from independent artists on MBR Records. Stream, purchase, and connect with emerging talent." />
          <meta name="keywords" content="music, record label, streaming, independent artists, demos, digital music" />
          <meta property="og:title" content="MBR Records - Digital Music Label Platform" />
          <meta property="og:description" content="Discover amazing music from independent artists on MBR Records." />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>

        {/* Desktop Header */}
        <Header onToggleSidebar={toggleSidebar} />
        
        {/* Mobile Header */}
        <MobileHeader />
        
        <MainLayout>
          <Sidebar isOpen={sidebarOpen} />
          
          <MainContent sidebarOpen={sidebarOpen} className="main-content app-container">
            <Suspense fallback={
              <LoadingContainer>
                <LoadingSpinner />
              </LoadingContainer>
            }>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<BrowseMusic />} />
                <Route path="/artists" element={<ArtistDirectory />} />
                <Route path="/contact" element={<ContactUs />} />
                
                {/* Auth Routes */}
                <Route 
                  path="/login" 
                  element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} 
                />
                <Route 
                  path="/signup" 
                  element={!isAuthenticated ? <Signup /> : <Navigate to="/" replace />} 
                />
                
                {/* Protected Routes */}
                <Route 
                  path="/fanzone" 
                  element={isAuthenticated ? <FanZone /> : <Navigate to="/login" replace />} 
                />
                <Route 
                  path="/submit-demo" 
                  element={isAuthenticated ? <SubmitDemo /> : <Navigate to="/login" replace />} 
                />
                <Route 
                  path="/profile" 
                  element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} 
                />
                
                {/* Admin Routes */}
                <Route 
                  path="/admin/*" 
                  element={
                    isAuthenticated && user?.role === 'admin' ? 
                    <AdminDashboard /> : 
                    <Navigate to="/" replace />
                  } 
                />
                
                {/* Flash Drive Manager - Admin Only */}
                <Route 
                  path="/flash-drive" 
                  element={
                    isAuthenticated && user?.role === 'admin' ? 
                    <FlashDriveManager /> : 
                    <Navigate to="/" replace />
                  } 
                />
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </MainContent>
        </MainLayout>
        
        {/* Mobile Navigation */}
        <MobileNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        <AdvancedMusicPlayer />
      </AppContainer>
    </ErrorBoundary>
  );
}

export default App;