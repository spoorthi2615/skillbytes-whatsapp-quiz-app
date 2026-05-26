import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { quizApi } from '../services/api';
import { useQuizStore } from '../store/quizStore';
import { motion } from 'framer-motion';

export default function ExamSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const examId = query.get('id');

  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initUser = useQuizStore(state => state.initUser);

  useEffect(() => {
    initUser();
    if (!examId) {
      navigate('/');
      return;
    }

    const loadHierarchy = async () => {
      try {
        setLoading(true);
        const subjRes = await quizApi.fetchSubjects(examId);
        setSubjects(subjRes.data);

        // Fetch chapters for all subjects
        const chaps = {};
        for (const sub of subjRes.data) {
          const chapRes = await quizApi.fetchChapters(sub._id);
          chaps[sub._id] = chapRes.data;
        }
        setChapters(chaps);
      } catch (err) {
        setError('Failed to load subjects and chapters.');
      } finally {
        setLoading(false);
      }
    };

    loadHierarchy();
  }, [examId, navigate, initUser]);

  const handleStartQuiz = (chapterId) => {
    navigate(`/quiz/${chapterId}`);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ paddingBottom: '20px', borderBottom: '1px solid #202C33', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Subjects</h1>
      </header>

      {error && <div style={{ color: '#F28B82', marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--wa-meta-text-dark)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {subjects.map(subject => (
            <div key={subject._id}>
              <h2 style={{ fontSize: '18px', color: '#00A884', marginBottom: '10px' }}>{subject.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px', borderLeft: '2px solid #202C33' }}>
                {chapters[subject._id]?.map(chapter => (
                  <motion.div
                    key={chapter._id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleStartQuiz(chapter._id)}
                    style={{
                      backgroundColor: 'var(--wa-chat-bubble-received-dark)',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{chapter.name}</span>
                    <span style={{ color: '#00A884', fontSize: '12px' }}>Start →</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
