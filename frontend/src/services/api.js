import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from authStore on every request
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('Failed parsing auth-storage:', err);
  }
  return config;
});

// On 401: attempt refresh, retry once, then logout
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token from sessionStorage (set by login flow)
        const refreshToken = sessionStorage.getItem('refresh_token');

        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefresh } = res.data.data;
        sessionStorage.setItem('refresh_token', newRefresh);

        // Update authStore token in localStorage
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const storeData = JSON.parse(raw);
          storeData.state.accessToken = access_token;
          localStorage.setItem('auth-storage', JSON.stringify(storeData));
        }

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Force logout — clear all auth state
        localStorage.removeItem('auth-storage');
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message;
    if (status !== 404 && status !== 401) {
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'An error occurred');
    }
    return Promise.reject(error);
  }
);

// ---- Quiz API (existing — preserved) ----
export const quizApi = {
  fetchExams: () => api.get('/api/exams').then(r => r.data),
  fetchSubjects: (examId) => api.get(`/api/exams/${examId}/subjects`).then(r => r.data),
  fetchChapters: (subjectId) => api.get(`/api/subjects/${subjectId}/chapters`).then(r => r.data),
  fetchQuestions: (chapterId) => api.get(`/api/chapters/${chapterId}/questions`).then(r => r.data),
  startQuiz: (userId, chapterId, totalQuestions) =>
    api.post('/api/quiz/start', { user_id: userId, chapter_id: chapterId, total_questions: totalQuestions }).then(r => r.data),
  submitAnswer: (sessionId, questionId, optionId, durationMs) =>
    api.post(`/api/quiz/${sessionId}/answer`, {
      question_id: questionId,
      selected_option_id: optionId,
      duration_ms: durationMs,
    }).then(r => r.data),
  completeQuiz: (sessionId) => api.post(`/api/quiz/${sessionId}/complete`).then(r => r.data),
  fetchAnalytics: (userId = null) => {
    const url = userId ? `/api/analytics/dashboard?user_id=${userId}` : '/api/analytics/dashboard';
    return api.get(url).then(r => r.data);
  },
};

// ---- Auth API ----
export const authApi = {
  register: (data) => api.post('/api/auth/register', data).then(r => r.data),
  login: (data) => api.post('/api/auth/login', data).then(r => r.data),
  logout: (refreshToken) => api.post('/api/auth/logout', { refresh_token: refreshToken }).then(r => r.data),
  me: () => api.get('/api/auth/me').then(r => r.data),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refresh_token: refreshToken }).then(r => r.data),
  verifyEmail: (token) => api.post('/api/auth/verify-email', { token }).then(r => r.data),
  resendVerification: (email) => api.post('/api/auth/resend-verification', { email }).then(r => r.data),
};

// ---- Profile API (Sprint 2) ----
export const profileApi = {
  getProfile: () => api.get('/api/profile').then(r => r.data),
  updateProfile: (data) => api.put('/api/profile', data).then(r => r.data),
  getPublicProfile: (username) => api.get(`/api/u/${username}`).then(r => r.data),
};

// ---- XP API (Sprint 3) ----
export const xpApi = {
  getHistory: () => api.get('/api/xp/history').then(r => r.data),
};

// ---- Achievements API (Sprint 3) ----
export const achievementApi = {
  getAll: () => api.get('/api/achievements').then(r => r.data),
  getMine: () => api.get('/api/achievements/mine').then(r => r.data),
};

// ---- Notifications API (Sprint 3) ----
export const notificationApi = {
  getFeed: () => api.get('/api/notifications').then(r => r.data),
  markAllRead: () => api.put('/api/notifications/read').then(r => r.data),
  markOneRead: (id) => api.put(`/api/notifications/${id}/read`).then(r => r.data),
};

// ---- Tracks API (Sprint 4) ----
export const trackApi = {
  getTracks: () => api.get('/api/tracks').then(r => r.data),
  getModules: (trackId) => api.get(`/api/tracks/${trackId}/modules`).then(r => r.data),
};

// ---- History API (Sprint 4) ----
export const historyApi = {
  getHistory: () => api.get('/api/history').then(r => r.data),
};

// ---- Recommendations API (Sprint 4) ----
export const recommendationApi = {
  getRecommendations: () => api.get('/api/recommendations').then(r => r.data),
};

// ---- Daily Challenge API (Sprint 4) ----
export const challengeApi = {
  getToday: () => api.get('/api/daily-challenge').then(r => r.data),
};

// ---- Preferences API (Sprint 2) ----
export const preferencesApi = {
  get: () => api.get('/api/preferences').then(r => r.data),
  update: (data) => api.put('/api/preferences', data).then(r => r.data),
};

// ---- Assets API (Phase 2A) ----
export const assetsApi = {
  upload: (formData, onUploadProgress) =>
    api.post('/api/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    }).then(r => r.data),
  list: () => api.get('/api/assets').then(r => r.data),
  delete: (id) => api.delete(`/api/assets/${id}`).then(r => r.data),
};

// ---- Jobs API (Phase 2A) ----
export const jobsApi = {
  trigger: (data) => api.post('/api/jobs', data).then(r => r.data),
  getStatus: (id) => api.get(`/api/jobs/${id}`).then(r => r.data),
  list: () => api.get('/api/jobs').then(r => r.data),
};

// ---- Content API (Phase 2A) ----
export const contentApi = {
  list: (type = '') => api.get(type ? `/api/content?content_type=${type}` : '/api/content').then(r => r.data),
  get: (id) => api.get(`/api/content/${id}`).then(r => r.data),
  delete: (id) => api.delete(`/api/content/${id}`).then(r => r.data),
  submitFeedback: (id, rating, feedback) => api.post(`/api/content/${id}/feedback`, { rating, feedback }).then(r => r.data),
  getHistory: (id) => api.get(`/api/content/${id}/history`).then(r => r.data),
  restoreVersion: (id) => api.post(`/api/content/${id}/restore`).then(r => r.data),
  getChunk: (id) => api.get(`/api/content/chunks/${id}`).then(r => r.data),
};

// ---- Favorites API (Phase 2A) ----
export const favoritesApi = {
  list: () => api.get('/api/favorites').then(r => r.data),
  add: (data) => api.post('/api/favorites', data).then(r => r.data),
  remove: (contentId) => api.delete(`/api/favorites/${contentId}`).then(r => r.data),
};

// ---- Session API (Phase 2A) ----
export const sessionApi = {
  log: (data) => api.post('/api/learning-sessions', data).then(r => r.data),
};

export default api;
