import axios from 'axios';

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
    console.error('API Error:', error.response?.data || error.message);
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
  startQuiz: async (userId, chapterId) => {
    const res = await api.post('/api/quiz/start', { user_id: userId, chapter_id: chapterId });
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
  fetchAnalytics: async () => {
    const res = await api.get('/api/analytics/dashboard');
    return res.data;
  },
};
