import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const res = await quizApi.fetchExams();
        setExams(res.data);
      } catch (err) {
        setError('Failed to load exams.');
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  const greetings = [
    "Welcome back 👋",
    "Ready for another challenge?",
    "Let's continue your learning streak 🚀",
    "Time to level up your skills 🧠",
    "Welcome to SkillBytes!"
  ];
  const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ paddingBottom: '20px', borderBottom: '1px solid #202C33', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{greeting}</h1>
        <p style={{ color: 'var(--wa-meta-text-dark)', fontSize: '14px' }}>Select an exam to begin</p>
      </header>

      {error && <div style={{ color: '#F28B82', marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--wa-meta-text-dark)' }}>Loading exams...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {exams.map(exam => (
            <motion.div 
              key={exam._id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/exams?id=${exam._id}`)}
              style={{
                backgroundColor: 'var(--wa-chat-bubble-received-dark)',
                padding: '15px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <h3 style={{ margin: '0 0 5px 0' }}>{exam.name}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--wa-meta-text-dark)' }}>{exam.description}</p>
            </motion.div>
          ))}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/analytics')}
            style={{
              marginTop: 'auto',
              padding: '15px',
              borderRadius: '8px',
              backgroundColor: '#202C33',
              color: '#00A884',
              border: '1px solid #00A884',
              fontWeight: 'bold'
            }}
          >
            View Analytics Dashboard
          </motion.button>
        </div>
      )}
    </div>
  );
}
