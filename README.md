<div align="center">
  <img src="./assets/logo.svg" alt="MBR Records Logo" width="150" height="150" />
  
  # MBR Records - Digital Music Label Platform
  
  <p align="center">
    <strong>A sophisticated, cross-platform digital record label platform with SoundCloud-inspired design</strong>
  </p>
  
  <p align="center">
    Built with React and Node.js
  </p>
  
  <p align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#deployment">Deployment</a> •
    <a href="#contributing">Contributing</a>
  </p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/React-18.0+-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-16.0+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/MongoDB-4.4+-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  </p>
</div>

---

## 🎵 Platform Overview

MBR Records is a complete digital music platform that provides everything needed to run a modern record label, from artist management and music distribution to fan engagement and analytics.

<div align="center">
  <img src="https://raw.githubusercontent.com/Debalent/MBR-/main/MBRRecordsPlatform/ClientApp/public/screenshots/dashboard.png" alt="MBR Records Dashboard" width="600" style="border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p><em>MBR Records Dashboard - Modern SoundCloud-inspired interface</em></p>
</div>

### ✨ Key Features

<table>
<tr>
<td width="50%">

**🎧 Advanced Music Player**
- Professional-grade player with queue management
- Built-in visualizer and full playback controls
- Shuffle/repeat modes and volume control

**📱 Cross-Platform PWA**
- Mobile app-like experience
- Offline functionality with service worker
- Install on any device

**👤 Artist Management**
- Comprehensive artist profiles and dashboards
- Performance analytics and insights
- Social media integration

**💾 Flash Drive Integration**
- Automated WAV file extraction
- Studio workflow integration
- Batch processing capabilities

</td>
<td width="50%">

**🎨 Professional UI**
- SoundCloud-inspired design
- Modern, responsive interface
- Mobile-first approach

**⚡ Real-time Features**
- Live chat and notifications
- Music synchronization
- Socket.IO powered

**📊 Analytics Dashboard**
- Detailed streaming statistics
- Performance insights
- Revenue tracking

**🔧 Admin Panel**
- Complete platform management
- Content moderation tools
- User management system

</td>
</tr>
</table>

## 🚀 Quick Start

### Prerequisites

- Node.js 16.0+ and npm 8.0+
- MongoDB 4.4+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Debalent/MBR-.git
   cd MBR-/MBRRecordsPlatform
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ClientApp && npm install
   cd ../ServerApp && npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the platform**
   ```bash
   # Development mode (both client and server)
   npm run dev
   
   # Or start components separately
   npm run server  # Backend on http://localhost:5000
   npm run client  # Frontend on http://localhost:3000
   ```

## 🏗️ Architecture

### Frontend (React 18)
- **Framework**: React 18 with modern hooks and Context API
- **Styling**: Styled-components with responsive design
- **State Management**: Context API + useReducer
- **PWA**: Service worker, offline caching, and app manifest
- **Audio**: Howler.js for professional audio playback
- **UI Components**: Custom component library with mobile optimization

### Backend (Node.js/Express)
- **API**: RESTful API with comprehensive route structure
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **File Upload**: Multer with Cloudinary integration
- **Real-time**: Socket.IO for live features
- **Security**: Helmet, CORS, rate limiting, and validation

### Database Schema
- **Users**: Artist profiles, authentication, preferences
- **Tracks**: Audio files, metadata, analytics, comments
- **Demo Submissions**: Artist demo review workflow
- **Chat**: Real-time messaging and conversations
- **Analytics**: Streaming data, user engagement metrics

## 📁 Project Structure

```
MBRRecordsPlatform/
├── ClientApp/                 # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── Pages/            # Page components
│   │   ├── contexts/         # React Context providers
│   │   ├── styles/           # Global styles and themes
│   │   └── utils/            # Helper functions and utilities
│   ├── public/               # Static assets and PWA files
│   └── package.json
├── ServerApp/                # Node.js backend application
│   ├── Routes/               # API route handlers
│   ├── Models/               # MongoDB schemas
│   ├── Middleware/           # Express middleware
│   ├── Utils/                # Server utilities
│   ├── Config/               # Configuration files
│   └── server.js             # Main server file
├── extracted-audio/          # Flash drive extraction output
├── Database/                 # Database schemas and migrations
└── package.json              # Root package configuration
```

## 🎯 Core Features

### 🎵 Music Platform
- **Advanced Audio Player**: Queue management, shuffle/repeat, visualizer
- **Track Management**: Upload, metadata extraction, waveform generation
- **Playlist System**: Create and share custom playlists
- **Social Features**: Comments, likes, follows, and sharing

### 👨‍🎤 Artist Tools
- **Artist Dashboard**: Performance analytics and insights
- **Demo Submission**: Professional demo review workflow
- **Profile Management**: Comprehensive artist profiles with social links
- **Revenue Tracking**: Streaming analytics and engagement metrics

### 📱 Mobile Experience
- **PWA Capabilities**: App-like experience with offline functionality
- **Responsive Design**: Mobile-first design with touch optimization
- **Mobile Navigation**: Bottom tab bar and hamburger menu
- **Offline Playback**: Service worker caching for audio files

### 🔧 Admin Features
- **Platform Management**: User management and content moderation
- **Analytics Dashboard**: Platform-wide statistics and insights
- **Flash Drive Manager**: Automated audio file extraction and processing
- **Demo Review System**: Streamlined artist submission workflow

## 💾 Flash Drive Integration

One of MBR Records' unique features is its integration with studio workflows through automated flash drive processing:

### Features
- **Automatic Detection**: Scans connected flash drives for audio files
- **WAV Processing**: Extracts and processes WAV files with metadata
- **Batch Processing**: Handles multiple files with progress tracking
- **Organized Output**: Structured folder system for originals, processed files, and metadata

### Usage
```bash
# Method 1: Command line
cd ServerApp
node extractWavFiles.js

# Method 2: Windows batch file
double-click extract-wav-files.bat

# Method 3: Web interface
Use the Flash Drive Manager in the admin panel
```

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run dev          # Start both client and server in development mode
npm run server       # Start backend server only
npm run client       # Start frontend client only

# Production
npm run build        # Build client for production
npm start           # Start production server

# Utilities
npm test            # Run test suite
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/mbr-records
MONGODB_TEST_URI=mongodb://localhost:27017/mbr-records-test

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Service
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@mbrrecords.com

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

## 🔒 Security Features

- **Authentication**: JWT-based authentication with secure password hashing
- **Authorization**: Role-based access control (user, artist, admin)
- **Rate Limiting**: API rate limiting to prevent abuse
- **Data Validation**: Input validation and sanitization
- **CORS Protection**: Configured CORS for secure cross-origin requests
- **Helmet Security**: Security headers and best practices

## 📊 Analytics & Insights

### User Analytics
- Play counts and listening patterns
- Geographic listening data
- Device and platform statistics
- Engagement metrics (likes, comments, shares)

### Artist Analytics
- Track performance metrics
- Follower growth and demographics
- Revenue tracking and projections
- Fan engagement insights

### Platform Analytics
- User growth and retention
- Content consumption patterns
- Popular genres and trends
- Platform health monitoring

## 🚀 Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=your-production-mongodb-uri
   # Set other production environment variables
   ```

3. **Start the server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
# Dockerfile included for containerized deployment
docker build -t mbr-records .
docker run -p 3000:3000 mbr-records
```

### Cloud Deployment
- **Heroku**: Ready for Heroku deployment with Procfile
- **Vercel**: Frontend deployment with API routes
- **AWS/Digital Ocean**: Full-stack deployment with database

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure responsive design for all UI components

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- Inspired by SoundCloud's interface design
- Built with modern web technologies and best practices
- Designed for independent record labels and artists
- Community-driven feature development

## 📞 Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Contact: support@mbrrecords.com
- Documentation: [MBR Records Docs](https://docs.mbrrecords.com)

---

<div align="center">
  <img src="./assets/logo.svg" alt="MBR Records Logo" width="80" height="80" />
  
  **MBR Records** - Empowering independent artists and record labels with professional digital music platform technology.

  Built with ❤️ for the music community.
  
  <p>
    <a href="https://github.com/Debalent/MBR-">🌟 Star on GitHub</a> •
    <a href="https://github.com/Debalent/MBR-/issues">🐛 Report Bug</a> •
    <a href="https://github.com/Debalent/MBR-/issues">💡 Request Feature</a>
  </p>
</div>
