import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  uploadAvatar: (formData) => api.post('/auth/upload-avatar', formData),
  deleteAccount: (password) => api.delete('/auth/account', { data: { password } }),
};

// Music API
export const musicAPI = {
  getTracks: (params) => api.get('/music/tracks', { params }),
  getTrack: (id) => api.get(`/music/tracks/${id}`),
  getFeatured: () => api.get('/music/featured'),
  getTrending: () => api.get('/music/trending'),
  getNewReleases: () => api.get('/music/new-releases'),
  searchTracks: (query) => api.get('/music/search', { params: { q: query } }),
  likeTrack: (id) => api.post(`/music/tracks/${id}/like`),
  unlikeTrack: (id) => api.delete(`/music/tracks/${id}/like`),
  getLikedTracks: () => api.get('/music/liked'),
  getGenres: () => api.get('/music/genres'),
  getTracksByGenre: (genre) => api.get(`/music/genres/${genre}`),
  incrementPlay: (id) => api.post(`/music/tracks/${id}/play`),
  getPlayHistory: () => api.get('/music/history'),
};

// Artist API
export const artistAPI = {
  getArtists: (params) => api.get('/artists', { params }),
  getArtist: (id) => api.get(`/artists/${id}`),
  getFeaturedArtists: () => api.get('/artists/featured'),
  followArtist: (id) => api.post(`/artists/${id}/follow`),
  unfollowArtist: (id) => api.delete(`/artists/${id}/follow`),
  getFollowedArtists: () => api.get('/artists/following'),
  getArtistTracks: (id) => api.get(`/artists/${id}/tracks`),
  getArtistAlbums: (id) => api.get(`/artists/${id}/albums`),
  searchArtists: (query) => api.get('/artists/search', { params: { q: query } }),
};

// Demo API
export const demoAPI = {
  submitDemo: (formData) => api.post('/demos', formData),
  getMyDemos: () => api.get('/demos/my'),
  getDemo: (id) => api.get(`/demos/${id}`),
  updateDemo: (id, data) => api.put(`/demos/${id}`, data),
  deleteDemo: (id) => api.delete(`/demos/${id}`),
  getDemoStatus: (id) => api.get(`/demos/${id}/status`),
};

// Playlist API
export const playlistAPI = {
  getPlaylists: () => api.get('/playlists'),
  getPlaylist: (id) => api.get(`/playlists/${id}`),
  createPlaylist: (data) => api.post('/playlists', data),
  updatePlaylist: (id, data) => api.put(`/playlists/${id}`, data),
  deletePlaylist: (id) => api.delete(`/playlists/${id}`),
  addToPlaylist: (id, trackId) => api.post(`/playlists/${id}/tracks`, { trackId }),
  removeFromPlaylist: (id, trackId) => api.delete(`/playlists/${id}/tracks/${trackId}`),
  getPublicPlaylists: () => api.get('/playlists/public'),
  likePlaylist: (id) => api.post(`/playlists/${id}/like`),
  unlikePlaylist: (id) => api.delete(`/playlists/${id}/like`),
};

// Chat API
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/messages`, data),
  markAsRead: (conversationId) => api.put(`/chat/conversations/${conversationId}/read`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
  createConversation: (data) => api.post('/chat/conversations', data),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getDemos: (params) => api.get('/admin/demos', { params }),
  reviewDemo: (id, data) => api.put(`/admin/demos/${id}/review`, data),
  getTracks: (params) => api.get('/admin/tracks', { params }),
  updateTrack: (id, data) => api.put(`/admin/tracks/${id}`, data),
  deleteTrack: (id) => api.delete(`/admin/tracks/${id}`),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getReports: (params) => api.get('/admin/reports', { params }),
};

// Payment API
export const paymentAPI = {
  createPaymentIntent: (data) => api.post('/payment/create-intent', data),
  confirmPayment: (data) => api.post('/payment/confirm', data),
  getPaymentHistory: () => api.get('/payment/history'),
  getPurchases: () => api.get('/payment/purchases'),
  refundPayment: (id) => api.post(`/payment/${id}/refund`),
};

// Notification API
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  updateSettings: (data) => api.put('/notifications/settings', data),
};

// Stats API
export const statsAPI = {
  getUserStats: () => api.get('/stats/user'),
  getTrackStats: (id) => api.get(`/stats/tracks/${id}`),
  getArtistStats: (id) => api.get(`/stats/artists/${id}`),
  getGlobalStats: () => api.get('/stats/global'),
  getListeningHistory: () => api.get('/stats/listening-history'),
};

// Utility functions
export const uploadFile = async (file, endpoint, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

export default api;