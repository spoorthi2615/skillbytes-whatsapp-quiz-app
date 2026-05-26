import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useQuizStore = create(
  persist(
    (set, get) => ({
      userId: localStorage.getItem('anon_user_id') || `user_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: null,
      currentChapterId: null,
      questions: [],
      currentIndex: 0,
      answers: {}, // questionId -> selectedOptionId
      loading: false,
      error: null,
      quizCompleted: false,
      results: null,

      initUser: () => {
        const { userId } = get();
        localStorage.setItem('anon_user_id', userId);
      },

      setSession: (sessionId, chapterId, questions) => set({
        sessionId,
        currentChapterId: chapterId,
        questions,
        currentIndex: 0,
        answers: {},
        quizCompleted: false,
        results: null,
        error: null,
      }),

      submitAnswer: (questionId, optionId) => set((state) => ({
        answers: { ...state.answers, [questionId]: optionId },
      })),

      nextQuestion: () => set((state) => ({
        currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1)
      })),

      completeQuiz: (results) => set({
        quizCompleted: true,
        results
      }),

      resetQuiz: () => set({
        sessionId: null,
        currentChapterId: null,
        questions: [],
        currentIndex: 0,
        answers: {},
        quizCompleted: false,
        results: null,
      }),

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'quiz-storage',
      partialize: (state) => ({
        userId: state.userId,        // persisted so the same user keeps the same ID across sessions
        sessionId: state.sessionId,
        currentChapterId: state.currentChapterId,
        questions: state.questions,
        currentIndex: state.currentIndex,
        answers: state.answers,
        quizCompleted: state.quizCompleted,
      }),
    }
  )
);
