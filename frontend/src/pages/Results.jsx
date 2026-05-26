import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuizStore } from '../store/quizStore';
import { motion } from 'framer-motion';

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { results, currentChapterId, resetQuiz } = useQuizStore();

  useEffect(() => {
    if (!results) {
      // If refreshed, navigate home since results are ephemeral in store, 
      // though could be persisted. But let's route to home if not found.
      navigate('/');
    }
  }, [results, navigate]);

  const handleReturnHome = () => {
    resetQuiz();
    navigate('/');
  };

  const handleRetry = () => {
    const chapterId = currentChapterId;
    resetQuiz();
    if (chapterId) {
      navigate(`/quiz/${chapterId}`);
    } else {
      navigate('/');
    }
  };

  if (!results) return null;

  const formatTime = (ms) => {
    if (!ms) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const motivationalMessage = results.accuracy_percentage >= 80 
    ? "Outstanding! You're ready for the big leagues. 🌟" 
    : results.accuracy_percentage >= 50 
      ? "Good effort! A little more practice and you'll nail it. 👍" 
      : "Don't give up! Review the topics and try again. 💪";

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          backgroundColor: '#202C33',
          padding: '30px',
          borderRadius: '16px',
          textAlign: 'center',
          width: '100%'
        }}
      >
        <h1 style={{ color: '#00A884', fontSize: '28px', marginBottom: '10px' }}>Quiz Completed!</h1>
        <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
          {results.score} / {results.total_questions}
        </div>
        
        <div style={{ fontSize: '14px', color: '#8696A0', marginBottom: '25px' }}>
          {motivationalMessage}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', textAlign: 'left' }}>
          <div style={{ backgroundColor: '#0B141A', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#8696A0', fontSize: '12px' }}>Accuracy</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#25D366' }}>
              {Math.round(results.accuracy_percentage)}%
            </div>
          </div>
          <div style={{ backgroundColor: '#0B141A', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#8696A0', fontSize: '12px' }}>Incorrect</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#F28B82' }}>
              {results.incorrect_answers}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', textAlign: 'left' }}>
          <div style={{ backgroundColor: '#0B141A', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#8696A0', fontSize: '12px' }}>Time Spent</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#E9EDEF' }}>
              {formatTime(results.time_spent_ms)}
            </div>
          </div>
          <div style={{ backgroundColor: '#0B141A', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#8696A0', fontSize: '12px' }}>Avg Response</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#E9EDEF' }}>
              {formatTime(results.average_response_time_ms)}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px', textAlign: 'left' }}>
          <div style={{ backgroundColor: '#0B141A', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#8696A0', fontSize: '12px' }}>Strongest</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00A884', marginTop: '4px' }}>
              {results.strongest_topic || "None"}
            </div>
          </div>
          <div style={{ backgroundColor: '#0B141A', padding: '15px', borderRadius: '8px' }}>
            <div style={{ color: '#8696A0', fontSize: '12px' }}>Weakest</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#F28B82', marginTop: '4px' }}>
              {results.weakest_topic || "None"}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleRetry}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '24px',
              backgroundColor: '#202C33',
              border: '1px solid #00A884',
              color: '#00A884',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            Retry Quiz
          </button>

          <button
            onClick={handleReturnHome}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '24px',
              backgroundColor: '#00A884',
              color: '#111B21',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
