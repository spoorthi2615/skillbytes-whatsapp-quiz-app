import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuizStore } from '../store/quizStore';
import { motion } from 'framer-motion';

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { results, resetQuiz } = useQuizStore();

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

  if (!results) return null;

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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px', textAlign: 'left' }}>
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
      </motion.div>
    </div>
  );
}
