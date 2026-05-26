import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error interceptor for global handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message;
    console.error('API Error:', errorMsg);
    
    // Skip toast for 404s if it's just polling or expected behavior
    if (error.response?.status !== 404) {
      toast.error(typeof errorMsg === 'string' ? errorMsg : "An error occurred");
    }
    
    return Promise.reject(error);
  }
);

export const quizApi = {
  fetchExams: async () => {
    const res = await api.get('/api/exams');
    return res.data;
  },
  fetchSubjects: async (examId) => {
    const res = await api.get(`/api/exams/${examId}/subjects`);
    return res.data;
  },
  fetchChapters: async (subjectId) => {
    const res = await api.get(`/api/subjects/${subjectId}/chapters`);
    return res.data;
  },
  fetchQuestions: async (chapterId) => {
    const res = await api.get(`/api/chapters/${chapterId}/questions`);
    return res.data;
  },
  startQuiz: async (userId, chapterId, totalQuestions) => {
    const res = await api.post('/api/quiz/start', {
      user_id: userId,
      chapter_id: chapterId,
      total_questions: totalQuestions  // actual sampled count, NOT full DB count
    });
    return res.data;
  },
  submitAnswer: async (sessionId, questionId, optionId, durationMs) => {
    const res = await api.post(`/api/quiz/${sessionId}/answer`, {
      question_id: questionId,
      selected_option_id: optionId,
      duration_ms: durationMs,
    });
    return res.data;
  },
  completeQuiz: async (sessionId) => {
    const res = await api.post(`/api/quiz/${sessionId}/complete`);
    return res.data;
  },
  fetchAnalytics: async (userId = null) => {
    const url = userId ? `/api/analytics/dashboard?user_id=${userId}` : '/api/analytics/dashboard';
    const res = await api.get(url);
    return res.data;
  },
};
