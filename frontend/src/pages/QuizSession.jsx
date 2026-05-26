import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuizStore } from '../store/quizStore';
import { quizApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import TypingIndicator from '../components/TypingIndicator';

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
  const [feedback, setFeedback] = useState(null);
  
  const [startTime, setStartTime] = useState(Date.now());
  const [globalTime, setGlobalTime] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const chatEndRef = useRef(null);

  // Timer intervals
  useEffect(() => {
    let interval;
    if (!loading && !error && currentChapterId && currentIndex < questions.length) {
      interval = setInterval(() => {
        setGlobalTime(prev => prev + 1);
        if (!feedback && !isTyping) {
          setQuestionTime(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading, error, currentChapterId, currentIndex, questions.length, feedback, isTyping]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Initialize or resume session
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        if (sessionId && currentChapterId === chapterId && questions.length > 0 && currentIndex < questions.length) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 1500);
          setLoading(false);
          return;
        }

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

  const handleOptionSelect = (optionId) => {
    if (feedback) return;
    setSelectedOption(optionId);
  };

  const handleCheck = async () => {
    if (!selectedOption || !sessionId) return;
    try {
      const durationMs = Date.now() - startTime;
      const currentQ = questions[currentIndex];
      
      const res = await quizApi.submitAnswer(sessionId, currentQ._id, selectedOption, durationMs);
      submitAnswer(currentQ._id, selectedOption);
      setFeedback({
        is_correct: res.data.is_correct,
        correct_option_id: res.data.correct_option_id,
        explanation: res.data.explanation
      });
    } catch (err) {
      setError("Failed to submit answer.");
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setIsTyping(true);
      setSelectedOption(null);
      setFeedback(null);
      setQuestionTime(0);
      setTimeout(() => {
        nextQuestion();
        setStartTime(Date.now());
        setIsTyping(false);
      }, 1000);
    } else {
      try {
        const res = await quizApi.completeQuiz(sessionId);
        completeQuiz(res.data);
        navigate(`/results/${sessionId}`);
      } catch (err) {
        setError("Failed to complete quiz.");
      }
    }
  };

  if (loading) return <div style={{ color: '#E9EDEF', padding: '20px' }}>Loading session...</div>;
  if (error) return <div style={{ color: '#F28B82', padding: '20px' }}>{error}</div>;

  const currentQ = questions[currentIndex];
  
  const pastChat = [];
  for (let i = 0; i <= currentIndex; i++) {
    const q = questions[i];
    const ansId = answers[q._id];
    const ansText = q.options.find(o => o.id === ansId)?.text;

    if (i < currentIndex || (i === currentIndex && !isTyping)) {
      pastChat.push(
        <motion.div
          key={`q-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative',
            alignSelf: 'flex-start',
            backgroundColor: '#202C33',
            padding: '20px 16px 12px 16px',
            borderRadius: '0 8px 8px 8px',
            color: '#E9EDEF',
            marginBottom: '10px',
            maxWidth: '85%',
            fontSize: '15px',
            lineHeight: '1.4'
          }}
        >
          {q.difficulty && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              left: '10px',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              backgroundColor: q.difficulty === 'hard' ? '#F28B82' : q.difficulty === 'medium' ? '#F4B400' : '#81C995',
              color: '#0B141A'
            }}>
              {q.difficulty}
            </span>
          )}
          {q.question_text}
        </motion.div>
      );
    }
    
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
          <span style={{ fontSize: '12px', color: '#25D366' }}>{formatTime(globalTime)} elapsed</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px', color: '#8696A0' }}>
          <span>{currentIndex + 1} / {questions.length}</span>
          <span style={{ color: questionTime > 60 ? '#F28B82' : '#8696A0' }}>⏱ {formatTime(questionTime)}</span>
        </div>
      </header>

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
              style={{ alignSelf: 'flex-start' }}
            >
              <TypingIndicator />
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
            {currentQuestion.options.map(option => {
              const isSelected = selectedOption === option.id;
              let bgColor = isSelected ? '#005C4B' : 'transparent';
              let borderColor = isSelected ? '#00A884' : '#8696A0';
              let textColor = '#E9EDEF';
              
              if (feedback) {
                if (option.id === feedback.correct_option_id) {
                  bgColor = 'rgba(37, 211, 102, 0.2)';
                  borderColor = '#25D366';
                  textColor = '#25D366';
                } else if (isSelected && !feedback.is_correct) {
                  bgColor = 'rgba(242, 139, 130, 0.2)';
                  borderColor = '#F28B82';
                  textColor = '#F28B82';
                }
              }

              return (
                <motion.button
                  key={option.id}
                  disabled={!!feedback}
                  onClick={() => setSelectedOption(option.id)}
                  whileHover={!feedback ? { scale: 1.02 } : {}}
                  whileTap={!feedback ? { scale: 0.98 } : {}}
                  style={{
                    padding: '15px',
                    borderRadius: '10px',
                    backgroundColor: bgColor,
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                    textAlign: 'left',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    opacity: (!feedback || option.id === feedback.correct_option_id || isSelected) ? 1 : 0.5,
                    cursor: feedback ? 'default' : 'pointer'
                  }}
                >
                  {option.text}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  marginTop: '15px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: feedback.is_correct ? 'rgba(37, 211, 102, 0.1)' : 'rgba(242, 139, 130, 0.1)',
                  color: feedback.is_correct ? '#25D366' : '#F28B82',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <span>{feedback.is_correct ? "Correct Answer ✅" : "Wrong Answer ❌"}</span>
                {feedback.explanation && (
                  <span style={{ fontSize: '13px', color: '#E9EDEF', fontWeight: 'normal', lineHeight: '1.4' }}>
                    {feedback.explanation}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.button
            disabled={!selectedOption}
            onClick={feedback ? handleNext : handleCheck}
            whileHover={selectedOption ? { scale: 1.02 } : {}}
            whileTap={selectedOption ? { scale: 0.98 } : {}}
            style={{
              width: '100%',
              padding: '16px',
              marginTop: '20px',
              borderRadius: '24px',
              backgroundColor: selectedOption ? '#00A884' : '#8696A0',
              color: '#111B21',
              fontWeight: 'bold',
              fontSize: '16px',
              opacity: selectedOption ? 1 : 0.5,
              cursor: selectedOption ? 'pointer' : 'default',
              border: 'none'
            }}
          >
            {!feedback ? "Submit" : (currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz')}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
