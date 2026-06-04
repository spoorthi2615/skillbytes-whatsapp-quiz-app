import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Send, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, X
} from 'lucide-react';
import { assessmentApi } from '../services/api';
import toast from 'react-hot-toast';

export default function AssessmentPlayer() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // question_id -> value (string or interview object)
    
    // Stopwatch state
    const [timeElapsed, setTimeElapsed] = useState(0);
    
    // Learning Mode state per question
    const [submittedQuestions, setSubmittedQuestions] = useState({}); // question_id -> true/false
    const [gradedDetails, setGradedDetails] = useState({}); // question_id -> { is_correct, explanation }
    
    // Interview prep modes (reveal / self rating)
    const [revealedAnswers, setRevealedAnswers] = useState({}); // question_id -> boolean
    const [selfRatings, setSelfRatings] = useState({}); // question_id -> int (1-5)
    const [interviewNotes, setInterviewNotes] = useState({}); // question_id -> string
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showNavDrawer, setShowNavDrawer] = useState(false);
    
    const timerRef = useRef(null);

    // Load assessment data
    const loadAssessment = useCallback(async () => {
        try {
            const res = await assessmentApi.get(id);
            setAssessment(res.data.assessment);
            setQuestions(res.data.questions || []);
            
            // Prefill with stored draft coding answers if any
            const prefill = {};
            
            res.data.questions.forEach(q => {
                if (q.question_type === 'coding' && q.draft_solution) {
                    prefill[q._id] = { solution: q.draft_solution, language: q.draft_language || 'Python' };
                } else if (q.question_type === 'true_false') {
                    // Defaults
                }
            });
            setAnswers(prefill);
        } catch (err) {
            console.error('Failed to load assessment:', err);
            toast.error('Failed to load assessment.');
            navigate('/assessments');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        let active = true;
        const fetch = async () => {
            await Promise.resolve();
            if (active) {
                loadAssessment();
            }
        };
        fetch();
        return () => { active = false; };
    }, [loadAssessment]);

    // Timer trigger
    useEffect(() => {
        if (!loading && !submitting) {
            timerRef.current = setInterval(() => {
                setTimeElapsed(t => t + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [loading, submitting]);

    if (loading) {
        return (
            <div style={{
                color: '#E9EDEF', minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#0B141A'
            }}>
                Loading Assessment...
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return null;

    const qId = currentQuestion._id;
    const qType = currentQuestion.question_type;

    // Format timer
    const formatTime = (totalSecs) => {
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Submits answer in Learning Mode
    const handleGradeSingle = () => {
        const studentAns = answers[qId] || '';
        let isCorrect = false;
        
        if (qType === 'mcq' || qType === 'true_false' || qType === 'fill_blank') {
            isCorrect = (String(studentAns).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase());
        } else {
            // Text or coding questions count as correct if filled
            const textVal = typeof studentAns === 'object' ? studentAns.solution : studentAns;
            isCorrect = (String(textVal).trim().length > 0);
        }

        setGradedDetails(prev => ({
            ...prev,
            [qId]: {
                is_correct: isCorrect,
                explanation: currentQuestion.explanation
            }
        }));
        setSubmittedQuestions(prev => ({
            ...prev,
            [qId]: true
        }));
        
        // Save drafts for coding questions on trigger
        if (qType === 'coding') {
            const codeObj = answers[qId] || {};
            assessmentApi.submitCoding({
                question_id: qId,
                language: codeObj.language || 'Python',
                solution: codeObj.solution || ''
            }).catch(err => console.error('Failed saving solution draft:', err));
        }
    };

    // Answer change handlers
    const setAnswerValue = (val) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    // Submit full assessment
    const handleCompleteAssessment = async () => {
        if (!confirm('Are you sure you want to submit your answers and complete the assessment?')) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            // Form payload. Map interview rating details if needed
            const formattedAnswers = {};
            questions.forEach(q => {
                const ans = answers[q._id];
                if (q.question_type === 'interview') {
                    formattedAnswers[q._id] = {
                        notes: interviewNotes[q._id] || '',
                        rating: selfRatings[q._id] || 3
                    };
                } else {
                    formattedAnswers[q._id] = ans || '';
                }
            });

            const res = await assessmentApi.submit(id, {
                answers: formattedAnswers,
                duration_ms: timeElapsed * 1000
            });
            
            if (res.success) {
                toast.success('Assessment submitted successfully!');
                // Navigate to results
                navigate(`/assessment/${id}/results`, { state: { results: res.data } });
            }
        } catch (err) {
            console.error('Failed to submit assessment:', err);
            toast.error('Failed to submit assessment.');
            setSubmitting(false);
        }
    };

    const isStepSubmitted = submittedQuestions[qId];
    const stepGrading = gradedDetails[qId];

    return (
        <div style={{ backgroundColor: '#0B141A', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Top Toolbar Bar */}
            <div style={{
                backgroundColor: '#202C33', borderBottom: '1px solid #2A3942',
                padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', height: '52px', boxSizing: 'border-box'
            }}>
                <button
                    onClick={() => navigate('/assessments')}
                    style={{ background: 'none', border: 'none', color: '#E9EDEF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                >
                    <ChevronLeft size={16} /> Exit
                </button>
                
                <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#E9EDEF' }}>
                    {assessment.title}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8696A0', fontSize: '13px' }}>
                        <Clock size={14} />
                        <span>{formatTime(timeElapsed)}</span>
                    </div>
                    <button 
                        onClick={() => setShowNavDrawer(true)}
                        style={{
                            padding: '4px 10px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                            borderRadius: '12px', color: '#00A884', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        Questions
                    </button>
                </div>
            </div>

            {/* Progress Bar (Step 12) */}
            <div style={{ width: '100%', height: '3px', backgroundColor: '#111B21' }}>
                <div 
                    style={{ 
                        height: '100%', 
                        width: `${((currentIndex + 1) / questions.length) * 100}%`,
                        backgroundColor: '#00A884',
                        transition: 'width 0.3s ease-out'
                    }} 
                />
            </div>

            {/* Chat Area Scroll Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
                
                {/* AI Tutor Greeting */}
                <div style={{ display: 'flex', gap: '8px', maxWidth: '85%' }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        backgroundColor: '#00A884', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0B141A', fontSize: '11px', fontWeight: 'bold'
                    }}>
                        AI
                    </div>
                    <div style={{
                        backgroundColor: '#202C33', borderRadius: '12px', borderTopLeftRadius: '0',
                        padding: '12px 14px', border: '1px solid #2A3942', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                    }}>
                        <span style={{ fontSize: '11px', color: '#00A884', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            AI Assessment Assistant
                        </span>
                        <span style={{ fontSize: '14px', lineHeight: '1.4' }}>
                            Let's proceed with Question {currentIndex + 1} of {questions.length}. Read the question details and input your response.
                        </span>
                    </div>
                </div>

                {/* The Question Chat Bubble */}
                <div style={{ display: 'flex', gap: '8px', maxWidth: '85%', alignSelf: 'flex-start' }}>
                    <div style={{ width: '28px' }} /> {/* Spacer */}
                    <div style={{
                        backgroundColor: '#202C33', borderRadius: '12px', borderTopLeftRadius: '0',
                        padding: '14px 16px', border: '1px solid #2A3942', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                Question {currentIndex + 1} · {qType.replace('_', ' ').toUpperCase()}
                            </span>
                            <span style={{ fontSize: '10px', color: '#00A884', backgroundColor: 'rgba(0,168,132,0.1)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                                {currentQuestion.difficulty}
                            </span>
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: '500', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                            {qType === 'coding' ? currentQuestion.problem_statement : currentQuestion.question}
                        </span>
                        
                        {/* Constraints view for coding (Addition 7) */}
                        {qType === 'coding' && (
                            <div style={{ backgroundColor: '#111B21', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#8696A0', marginTop: '6px' }}>
                                <div style={{ fontWeight: 'bold', color: '#E9EDEF', marginBottom: '4px' }}>Constraints:</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{currentQuestion.constraints}</div>
                                <div style={{ fontWeight: 'bold', color: '#E9EDEF', margin: '8px 0 4px' }}>Sample Input:</div>
                                <div style={{ fontFamily: 'monospace' }}>{currentQuestion.sample_input}</div>
                                <div style={{ fontWeight: 'bold', color: '#E9EDEF', margin: '8px 0 4px' }}>Sample Output:</div>
                                <div style={{ fontFamily: 'monospace' }}>{currentQuestion.sample_output}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Student's answer preview (if submitted) */}
                {isStepSubmitted && (
                    <div style={{ display: 'flex', gap: '8px', maxWidth: '85%', alignSelf: 'flex-end' }}>
                        <div style={{
                            backgroundColor: '#005C4B', borderRadius: '12px', borderTopRightRadius: '0',
                            padding: '12px 14px', border: '1px solid #00A884', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }}>
                            <span style={{ fontSize: '11px', color: '#25D366', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                Your Answer
                            </span>
                            <span style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                {qType === 'coding' ? (answers[qId]?.solution || '') : String(answers[qId] || '')}
                            </span>
                        </div>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            backgroundColor: '#00A884', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#0B141A', fontSize: '11px', fontWeight: 'bold'
                        }}>
                            U
                        </div>
                    </div>
                )}

                {/* AI Learning Mode Details (Step 13) */}
                {isStepSubmitted && stepGrading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', gap: '8px', maxWidth: '85%' }}
                    >
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            backgroundColor: '#00A884', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#0B141A', fontSize: '11px', fontWeight: 'bold'
                        }}>
                            AI
                        </div>
                        <div style={{
                            backgroundColor: '#202C33', borderRadius: '12px', borderTopLeftRadius: '0',
                            padding: '16px', border: '1px solid #2A3942', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            display: 'flex', flexDirection: 'column', gap: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {stepGrading.is_correct ? (
                                    <>
                                        <CheckCircle size={16} color="#25D366" />
                                        <span style={{ color: '#25D366', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Correct Solution</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={16} color="#F28B82" />
                                        <span style={{ color: '#F28B82', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Incorrect</span>
                                    </>
                                )}
                            </div>
                            
                            <p style={{ fontSize: '13.5px', margin: 0, lineHeight: '1.4' }}>
                                {stepGrading.explanation}
                            </p>
                            
                            {/* Related Concept Chips */}
                            <div>
                                <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                                    Concepts Tested
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {currentQuestion.concept_tags?.map(tag => (
                                        <span key={tag} style={{ fontSize: '10.5px', color: '#00A884', backgroundColor: 'rgba(0,168,132,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Interview Prep: Notes and rating form (Addition 6) */}
                {qType === 'interview' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#202C33', borderRadius: '12px', padding: '16px', border: '1px solid #2A3942', maxWidth: '85%' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00A884' }}>Interview Mode Controls</span>
                            <button
                                onClick={() => setRevealedAnswers(prev => ({ ...prev, [qId]: !prev[qId] }))}
                                style={{
                                    border: '1px solid #2A3942', background: 'none', color: '#E9EDEF',
                                    borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer'
                                }}
                            >
                                {revealedAnswers[qId] ? 'Hide Answer' : 'Reveal Answer'}
                            </button>
                        </div>

                        {/* Revealed Answer Box */}
                        {revealedAnswers[qId] && (
                            <div style={{ backgroundColor: '#111B21', borderRadius: '8px', padding: '12px', fontSize: '13px', borderLeft: '3px solid #F4B400' }}>
                                <div style={{ fontWeight: '700', color: '#F4B400', marginBottom: '4px' }}>Expected Answer:</div>
                                <div style={{ lineHeight: '1.4' }}>{currentQuestion.correct_answer}</div>
                            </div>
                        )}

                        {/* Self Rating (1-5) */}
                        <div>
                            <span style={{ display: 'block', fontSize: '11px', color: '#8696A0', marginBottom: '4px' }}>Self Assessment Rating:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setSelfRatings(prev => ({ ...prev, [qId]: star }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: star <= (selfRatings[qId] || 0) ? '#F4B400' : '#8696A0' }}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div>
                            <span style={{ display: 'block', fontSize: '11px', color: '#8696A0', marginBottom: '4px' }}>My Answer Notes / Comments:</span>
                            <textarea
                                placeholder="Type notes here to reference during reviews..."
                                value={interviewNotes[qId] || ''}
                                onChange={e => setInterviewNotes(prev => ({ ...prev, [qId]: e.target.value }))}
                                style={{
                                    width: '100%', height: '60px', padding: '8px', backgroundColor: '#0B141A',
                                    border: '1px solid #2A3942', borderRadius: '6px', color: '#E9EDEF', fontSize: '12px',
                                    outline: 'none', resize: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Bottom Controls / Response Input Area */}
            <div style={{
                backgroundColor: '#202C33', borderTop: '1px solid #2A3942',
                padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
                
                {/* Dynamic Inputs depending on type */}
                {!isStepSubmitted ? (
                    <div>
                        {/* 1. MCQ Selection */}
                        {qType === 'mcq' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {currentQuestion.options?.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setAnswerValue(opt)}
                                        style={{
                                            width: '100%', padding: '12px 16px', borderRadius: '8px',
                                            border: `1px solid ${answers[qId] === opt ? '#00A884' : '#2A3942'}`,
                                            backgroundColor: answers[qId] === opt ? 'rgba(0, 168, 132, 0.1)' : '#0B141A',
                                            color: answers[qId] === opt ? '#00A884' : '#E9EDEF',
                                            fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 2. True / False Selection */}
                        {qType === 'true_false' && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['True', 'False'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setAnswerValue(opt)}
                                        style={{
                                            flex: 1, padding: '14px', borderRadius: '8px',
                                            border: `1px solid ${answers[qId] === opt ? '#00A884' : '#2A3942'}`,
                                            backgroundColor: answers[qId] === opt ? 'rgba(0, 168, 132, 0.1)' : '#0B141A',
                                            color: answers[qId] === opt ? '#00A884' : '#E9EDEF',
                                            fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 3. Fill in Blank */}
                        {qType === 'fill_blank' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Type correct term..."
                                    value={answers[qId] || ''}
                                    onChange={e => setAnswerValue(e.target.value)}
                                    style={{
                                        flex: 1, padding: '12px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                                        borderRadius: '8px', color: '#E9EDEF', fontSize: '13.5px', outline: 'none'
                                    }}
                                />
                            </div>
                        )}

                        {/* 4. Scenario-Based Textbox */}
                        {qType === 'scenario' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea
                                    placeholder="Explain your approach or answer details..."
                                    value={answers[qId] || ''}
                                    onChange={e => setAnswerValue(e.target.value)}
                                    style={{
                                        width: '100%', height: '100px', padding: '12px', backgroundColor: '#0B141A',
                                        border: '1px solid #2A3942', borderRadius: '8px', color: '#E9EDEF', fontSize: '13.5px',
                                        outline: 'none', resize: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}

                        {/* 5. Interview note submission */}
                        {qType === 'interview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#8696A0' }}>Type your brief answer concept summary:</span>
                                <textarea
                                    placeholder="Notes/Answer framework draft..."
                                    value={answers[qId] || ''}
                                    onChange={e => setAnswerValue(e.target.value)}
                                    style={{
                                        width: '100%', height: '80px', padding: '12px', backgroundColor: '#0B141A',
                                        border: '1px solid #2A3942', borderRadius: '8px', color: '#E9EDEF', fontSize: '13px',
                                        outline: 'none', resize: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}

                        {/* 6. Coding solution draft editor */}
                        {qType === 'coding' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#8696A0' }}>Code Editor ( rispettando il linguaggio di preferenza )</span>
                                    <select
                                        value={answers[qId]?.language || 'Python'}
                                        onChange={e => setAnswerValue({ solution: answers[qId]?.solution || '', language: e.target.value })}
                                        style={{
                                            backgroundColor: '#0B141A', border: '1px solid #2A3942', borderRadius: '6px',
                                            color: '#E9EDEF', fontSize: '11px', padding: '2px 6px'
                                        }}
                                    >
                                        {['Python', 'Java', 'C++', 'JavaScript', 'C', 'Go'].map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <textarea
                                    placeholder={`# Write your solution code here...`}
                                    value={answers[qId]?.solution || ''}
                                    onChange={e => setAnswerValue({ solution: e.target.value, language: answers[qId]?.language || 'Python' })}
                                    style={{
                                        width: '100%', height: '140px', padding: '12px', backgroundColor: '#0B141A',
                                        border: '1px solid #2A3942', borderRadius: '8px', color: '#25D366', fontSize: '13px',
                                        fontFamily: 'monospace', outline: 'none', resize: 'none', boxSizing: 'border-box',
                                        lineHeight: '1.4'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ padding: '8px 12px', backgroundColor: '#111B21', borderRadius: '8px', color: '#8696A0', fontSize: '12px', textAlign: 'center' }}>
                        Answer Submitted in Learning Mode. Review explanation above.
                    </div>
                )}

                {/* Grader / Navigation Row */}
                <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(currentIndex - 1)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px',
                                borderRadius: '8px', border: '1px solid #2A3942', backgroundColor: 'transparent',
                                color: currentIndex === 0 ? '#30363d' : '#E9EDEF', fontSize: '12.5px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <ChevronLeft size={14} /> Back
                        </button>
                        
                        {currentIndex < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIndex(currentIndex + 1)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px',
                                    borderRadius: '8px', border: '1px solid #2A3942', backgroundColor: 'transparent',
                                    color: '#E9EDEF', fontSize: '12.5px', cursor: 'pointer'
                                }}
                            >
                                Skip <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={handleCompleteAssessment}
                                disabled={submitting}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    backgroundColor: '#00A884', color: '#0B141A', fontSize: '12.5px',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                Finish Assessment
                            </button>
                        )}
                    </div>

                    {!isStepSubmitted && (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleGradeSingle}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                                borderRadius: '20px', border: 'none', backgroundColor: '#00A884',
                                color: '#0B141A', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            Submit Answer <Send size={12} />
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Questions Grid Overlay Drawer */}
            <AnimatePresence>
                {showNavDrawer && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end',
                        zIndex: 200
                    }}>
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
                            style={{
                                width: '280px', height: '100%', backgroundColor: '#202C33', borderLeft: '1px solid #2A3942',
                                padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Questions Outline</h3>
                                <button onClick={() => setShowNavDrawer(false)} style={{ background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {questions.map((q, idx) => {
                                        const isCurrent = currentIndex === idx;
                                        const isSubmitted = submittedQuestions[q._id];
                                        const grading = gradedDetails[q._id];
                                        
                                        let bg = '#0B141A';
                                        let color = '#8696A0';
                                        let border = '1px solid #2A3942';
                                        
                                        if (isCurrent) {
                                            border = '2px solid #00A884';
                                            color = '#00A884';
                                        }
                                        if (isSubmitted) {
                                            bg = grading?.is_correct ? '#005C4B' : 'rgba(242, 139, 130, 0.15)';
                                            color = grading?.is_correct ? '#25D366' : '#F28B82';
                                            border = grading?.is_correct ? '1px solid #00A884' : '1px solid #F28B82';
                                        }

                                        return (
                                            <button
                                                key={q._id}
                                                onClick={() => { setCurrentIndex(idx); setShowNavDrawer(false); }}
                                                style={{
                                                    height: '42px', borderRadius: '8px', border, backgroundColor: bg,
                                                    color, fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
