const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting MBR Records Platform...\n');

// Check if environment files exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found. Creating from template...');
  const envTemplatePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(envTemplatePath)) {
    fs.copyFileSync(envTemplatePath, envPath);
    console.log('✅ .env file created. Please update it with your configuration.\n');
  }
}

// Function to start a process
const startProcess = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    process.on('error', reject);
    
    return process;
  });
};

// Check if this is development or production
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

async function startPlatform() {
  try {
    console.log('📦 Installing dependencies...\n');
    
    // Install server dependencies
    console.log('Installing ServerApp dependencies...');
    await startProcess('npm', ['install'], { 
      cwd: path.join(__dirname, 'ServerApp')
    });
    
    // Install client dependencies
    console.log('Installing ClientApp dependencies...');
    await startProcess('npm', ['install'], { 
      cwd: path.join(__dirname, 'ClientApp')
    });
    
    console.log('\n✅ Dependencies installed successfully!\n');
    
    if (isDev) {
      console.log('🔧 Starting in development mode...\n');
      
      // Start both server and client in development mode
      const concurrently = require('concurrently');
      
      concurrently([
        {
          command: 'npm run dev',
          name: 'server',
          cwd: path.join(__dirname, 'ServerApp'),
          prefixColor: 'blue'
        },
        {
          command: 'npm start',
          name: 'client',
          cwd: path.join(__dirname, 'ClientApp'),
          prefixColor: 'green'
        }
      ], {
        prefix: 'name',
        killOthers: ['failure', 'success'],
        restartTries: 3
      }).then(
        () => console.log('🎉 All processes completed successfully!'),
        (error) => console.error('❌ Error running processes:', error)
      );
      
    } else {
      console.log('🏭 Starting in production mode...\n');
      
      // Build client for production
      console.log('Building client application...');
      await startProcess('npm', ['run', 'build'], { 
        cwd: path.join(__dirname, 'ClientApp')
      });
      
      // Start server in production mode
      console.log('Starting server...');
      await startProcess('npm', ['start'], { 
        cwd: path.join(__dirname, 'ServerApp')
      });
    }
    
  } catch (error) {
    console.error('❌ Error starting platform:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MBR Records Platform...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down MBR Records Platform...');
  process.exit(0);
});

// Display startup information
console.log(`
🎵 MBR Records Platform
=======================
Environment: ${isDev ? 'Development' : 'Production'}
Node Version: ${process.version}
Platform: ${process.platform}
Architecture: ${process.arch}

Starting components:
- 🖥️  Client App (React)
- 🔧 Server App (Node.js/Express)
- 🗄️  Database (MongoDB)
- 🔌 Socket.IO (Real-time features)

`);

// Start the platform
startPlatform();