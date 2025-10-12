const CACHE_NAME = 'mbr-records-v1.0.0';
const STATIC_CACHE = 'mbr-static-v1.0.0';
const DYNAMIC_CACHE = 'mbr-dynamic-v1.0.0';
const AUDIO_CACHE = 'mbr-audio-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/assets/logo/MBR-Logo.svg',
  '/manifest.json',
  // Core pages
  '/browse',
  '/artists',
  '/contact',
  // Critical assets
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== AUDIO_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    // Handle audio files
    if (request.url.includes('/audio/') || 
        request.headers.get('accept')?.includes('audio/')) {
      event.respondWith(handleAudioRequest(request));
    }
    // Handle API requests
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request));
    }
    // Handle static assets and pages
    else {
      event.respondWith(handleStaticRequest(request));
    }
  }
});

// Handle audio file requests with caching
async function handleAudioRequest(request) {
  try {
    // Try network first for audio (always fresh)
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful audio responses
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline audio placeholder
    return new Response('Audio temporarily unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
    
  } catch (error) {
    console.log('Service Worker: Audio request failed', error);
    
    // Try cache first when network is unavailable
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Audio temporarily unavailable - offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Always try network first for API calls
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache GET requests that are successful
      if (request.method === 'GET') {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    // If network request fails and it's a GET request, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Service Worker: API request failed', error);
    
    // For GET requests, try to serve from cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline message for failed API calls
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable',
      offline: true,
      message: 'Please check your internet connection'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Handle static asset and page requests
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response for future use
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Service Worker: Static request failed', error);
    
    // Try cache again in case of network error
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    return new Response('Content temporarily unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle queued actions when back online
  try {
    // Check if we have any queued demo submissions, likes, etc.
    const queuedActions = await getQueuedActions();
    
    for (const action of queuedActions) {
      try {
        await processQueuedAction(action);
        await removeQueuedAction(action.id);
      } catch (error) {
        console.error('Failed to process queued action:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New music available on MBR Records!',
    icon: '/assets/logo/MBR-Logo.svg',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Listen Now',
        icon: '/assets/icons/play-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/close-icon.png'
      }
    ]
  };
  
  if (event.data) {
    const notificationData = event.data.json();
    options.body = notificationData.body || options.body;
    options.title = notificationData.title || 'MBR Records';
  }
  
  event.waitUntil(
    self.registration.showNotification('MBR Records', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/browse')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for IndexedDB operations
async function getQueuedActions() {
  // Implementation would use IndexedDB to store offline actions
  return [];
}

async function processQueuedAction(action) {
  // Process the queued action (API call, etc.)
  return fetch(action.url, action.options);
}

async function removeQueuedAction(actionId) {
  // Remove the action from IndexedDB queue
  return true;
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    const audioUrl = event.data.url;
    event.waitUntil(
      caches.open(AUDIO_CACHE).then(cache => cache.add(audioUrl))
    );
  }
});