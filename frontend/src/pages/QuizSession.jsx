import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuizStore } from '../store/quizStore';
import { quizApi } from '../services/api';

export default function QuizSession() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  
  const { 
    userId, sessionId, currentChapterId, questions, currentIndex, answers,
    setSession, submitAnswer, nextQuestion, completeQuiz, resetQuiz 
  } = useQuizStore();

  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  
  const [startTime, setStartTime] = useState(Date.now());
  const chatEndRef = useRef(null);

  // Initialize or resume session
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        // If resuming a session for the same chapter, we don't need to fetch new questions
        if (sessionId && currentChapterId === chapterId && questions.length > 0 && currentIndex < questions.length) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 1500);
          setLoading(false);
          return;
        }

        // Otherwise, start a new session
        const qRes = await quizApi.fetchQuestions(chapterId);
        if (qRes.data.length === 0) {
          setError("No questions available for this chapter.");
          setLoading(false);
          return;
        }

        const startRes = await quizApi.startQuiz(userId, chapterId);
        
        setSession(startRes.data.session_id, chapterId, qRes.data);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1500);
      } catch (err) {
        setError('Failed to start quiz session.');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [chapterId, userId, sessionId, currentChapterId, questions.length]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isTyping, currentIndex, selectedOption]);

  const handleNext = async () => {
    if (!selectedOption || !sessionId) return;

    try {
      const durationMs = Date.now() - startTime;
      const currentQ = questions[currentIndex];
      
      // Save answer to store and backend
      submitAnswer(currentQ._id, selectedOption);
      await quizApi.submitAnswer(sessionId, currentQ._id, selectedOption, durationMs);

      if (currentIndex < questions.length - 1) {
        setIsTyping(true);
        setSelectedOption(null);
        setTimeout(() => {
          nextQuestion();
          setStartTime(Date.now());
          setIsTyping(false);
        }, 1000);
      } else {
        // Complete quiz
        const res = await quizApi.completeQuiz(sessionId);
        completeQuiz(res.data);
        navigate(`/results/${sessionId}`);
      }
    } catch (err) {
      setError("Failed to submit answer.");
    }
  };

  if (loading) return <div style={{ color: '#E9EDEF', padding: '20px' }}>Loading session...</div>;
  if (error) return <div style={{ color: '#F28B82', padding: '20px' }}>{error}</div>;

  const currentQuestion = questions[currentIndex];
  
  // To handle the chat UI, we will render previous questions and answers up to current index
  const pastChat = [];
  for (let i = 0; i <= currentIndex; i++) {
    const q = questions[i];
    const ansId = answers[q._id];
    const ansText = q.options.find(o => o.id === ansId)?.text;

    // Show the question if it's past, or if it's current and typing is done
    if (i < currentIndex || (i === currentIndex && !isTyping)) {
      pastChat.push(
        <motion.div
          key={`q-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#202C33',
            padding: '12px 16px',
            borderRadius: '0 8px 8px 8px',
            color: '#E9EDEF',
            marginBottom: '10px',
            maxWidth: '85%',
            fontSize: '15px',
            lineHeight: '1.4'
          }}
        >
          {q.question_text}
        </motion.div>
      );
    }
    
    // Show the user's answer if it's a past question, or if they selected an option for the current one
    // Actually, only show for past questions to keep the flow clean
    if (i < currentIndex && ansText) {
      pastChat.push(
        <motion.div
          key={`a-${i}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            alignSelf: 'flex-end',
            backgroundColor: '#005C4B',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 8px',
            color: '#E9EDEF',
            marginBottom: '20px',
            maxWidth: '85%',
            fontSize: '15px'
          }}
        >
          {ansText}
        </motion.div>
      );
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0B141A' }}>
      <header style={{ 
        padding: '15px 20px', 
        backgroundColor: '#202C33', 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#00A884', marginRight: '15px' }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#E9EDEF' }}>Quiz Bot</h2>
          <span style={{ fontSize: '12px', color: '#25D366' }}>online</span>
        </div>
        <div style={{ fontSize: '12px', color: '#8696A0' }}>
          {currentIndex + 1} / {questions.length}
        </div>
      </header>

      {/* Progress Bar */}
      <div style={{ height: '3px', width: '100%', backgroundColor: '#202C33' }}>
        <div style={{ 
          height: '100%', 
          width: `${((currentIndex + 1) / questions.length) * 100}%`, 
          backgroundColor: '#00A884',
          transition: 'width 0.3s ease-out'
        }} />
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {pastChat}

        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#202C33',
                padding: '12px 16px',
                borderRadius: '0 8px 8px 8px',
                color: '#E9EDEF',
                marginBottom: '15px',
                fontSize: '14px',
                display: 'flex',
                gap: '4px'
              }}
            >
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: 6, height: 6, backgroundColor: '#8696A0', borderRadius: '50%' }} />
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: 6, height: 6, backgroundColor: '#8696A0', borderRadius: '50%' }} />
              <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: 6, height: 6, backgroundColor: '#8696A0', borderRadius: '50%' }} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={chatEndRef} />
      </div>

      {!isTyping && currentQuestion && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          style={{ 
            padding: '20px', 
            backgroundColor: '#202C33', 
            borderTopLeftRadius: '20px', 
            borderTopRightRadius: '20px',
            boxShadow: '0 -4px 10px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQuestion.options.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                style={{
                  padding: '15px',
                  borderRadius: '10px',
                  backgroundColor: selectedOption === option.id ? '#005C4B' : 'transparent',
                  border: `1px solid ${selectedOption === option.id ? '#00A884' : '#8696A0'}`,
                  color: '#E9EDEF',
                  textAlign: 'left',
                  fontSize: '15px',
                  transition: 'all 0.2s'
                }}
              >
                {option.text}
              </button>
            ))}
          </div>
          
          <button
            disabled={!selectedOption}
            onClick={handleNext}
            style={{
              width: '100%',
              padding: '16px',
              marginTop: '20px',
              borderRadius: '24px',
              backgroundColor: selectedOption ? '#00A884' : '#8696A0',
              color: '#111B21',
              fontWeight: 'bold',
              fontSize: '16px',
              opacity: selectedOption ? 1 : 0.5
            }}
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
