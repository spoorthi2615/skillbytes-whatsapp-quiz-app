import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, CheckCircle, ArrowLeft, AlertCircle, RefreshCw
} from 'lucide-react';
import { assessmentApi } from '../services/api';
import toast from 'react-hot-toast';

export default function InterviewQuestions() {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // QA states
    const [revealed, setRevealed] = useState({}); // question_id -> boolean
    const [ratings, setRatings] = useState({}); // question_id -> star index
    const [notes, setNotes] = useState({}); // question_id -> note text
    const [submitting, setSubmitting] = useState({}); // question_id -> boolean

    const loadInterviewAssessments = useCallback(async () => {
        try {
            const res = await assessmentApi.list();
            // Filter assessments containing interview questions
            const filtered = res.data.filter(a => a.question_types?.includes('interview'));
            setAssessments(filtered);
            if (filtered.length > 0) {
                setSelectedAssessmentId(filtered[0]._id);
            }
        } catch (err) {
            console.error('Error loading interview assessments:', err);
            toast.error('Failed to load interview materials.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load list of assessments on mount
    useEffect(() => {
        let active = true;
        const fetch = async () => {
            await Promise.resolve();
            if (active) {
                loadInterviewAssessments();
            }
        };
        fetch();
        return () => { active = false; };
    }, [loadInterviewAssessments]);

    // Load questions when selected assessment changes
    const loadQuestions = useCallback(async () => {
        if (!selectedAssessmentId) {
            setQuestions([]);
            return;
        }
        try {
            const res = await assessmentApi.get(selectedAssessmentId);
            const filteredQuestions = res.data.questions.filter(q => q.question_type === 'interview');
            setQuestions(filteredQuestions);
            
            // Populate notes and ratings if present
            const prefillNotes = {};
            const prefillRatings = {};
            filteredQuestions.forEach(q => {
                if (q.notes) prefillNotes[q._id] = q.notes;
                if (q.self_rating) prefillRatings[q._id] = q.self_rating;
            });
            setNotes(prefillNotes);
            setRatings(prefillRatings);
        } catch (err) {
            console.error('Error loading questions:', err);
            toast.error('Failed to load interview questions.');
        }
    }, [selectedAssessmentId]);

    useEffect(() => {
        let active = true;
        const fetch = async () => {
            await Promise.resolve();
            if (active) {
                loadQuestions();
            }
        };
        fetch();
        return () => { active = false; };
    }, [loadQuestions]);

    const handleSaveFeedback = async (questionId) => {
        setSubmitting(prev => ({ ...prev, [questionId]: true }));
        try {
            // Mock individual question submission by pushing updates to assessments
            // Since submit endpoints are assessment-wide, we can save notes draft 
            // inside coding submission or log attempt locally.
            // For interview notes, we'll save draft notes by triggering submission with rating
            const qRating = ratings[questionId] || 3;
            const qNotes = notes[questionId] || '';
            
            const answersPayload = {
                [questionId]: {
                    notes: qNotes,
                    rating: qRating
                }
            };
            
            await assessmentApi.submit(selectedAssessmentId, {
                answers: answersPayload,
                duration_ms: 1000 // quick save
            });
            toast.success('Interview QA progress saved!');
        } catch (err) {
            console.error('Failed to save interview QA progress:', err);
            toast.error('Failed to save progress.');
        } finally {
            setSubmitting(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const toggleReveal = (qId) => {
        setRevealed(prev => ({ ...prev, [qId]: !prev[qId] }));
    };

    const setQuestionRating = (qId, r) => {
        setRatings(prev => ({ ...prev, [qId]: r }));
    };

    const setQuestionNote = (qId, txt) => {
        setNotes(prev => ({ ...prev, [qId]: txt }));
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', color: '#E9EDEF' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>Interview Preparation</h1>
                    <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
                        Practice technical concepts, system design viva, and scenario questions generated from your study materials.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/assessments')}
                    style={{
                        background: 'none', border: '1px solid #2A3942', color: '#8696A0',
                        borderRadius: '20px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                >
                    <ArrowLeft size={14} /> Back
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#8696A0' }}>Loading prep materials...</div>
            ) : assessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942' }}>
                    <AlertCircle size={36} color="#8696A0" style={{ marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No interview questions generated</h3>
                    <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>Go to the Assessments dashboard and generate a new 'Interview Prep' template.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
                    
                    {/* Left menu selection */}
                    <div style={{ backgroundColor: '#202C33', borderRadius: '14px', border: '1px solid #2A3942', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '700', paddingLeft: '4px' }}>Materials Library</span>
                        {assessments.map(a => {
                            const isSelected = selectedAssessmentId === a._id;
                            return (
                                <button
                                    key={a._id}
                                    onClick={() => setSelectedAssessmentId(a._id)}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
                                        backgroundColor: isSelected ? '#111B21' : 'transparent',
                                        color: isSelected ? '#00A884' : '#8696A0', textAlign: 'left', cursor: 'pointer',
                                        borderLeft: isSelected ? '3px solid #00A884' : '3px solid transparent',
                                        fontSize: '13px', fontWeight: '600'
                                    }}
                                >
                                    {a.title}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Question Cards Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {questions.map((q, index) => {
                            const isRevealed = revealed[q._id];
                            const noteText = notes[q._id] || '';
                            const rating = ratings[q._id] || 0;
                            const isSaving = submitting[q._id];

                            return (
                                <div 
                                    key={q._id}
                                    style={{
                                        backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                                        padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
                                    }}
                                >
                                    {/* Question Header */}
                                    <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: '#00A884', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            Question {index + 1}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#8696A0', backgroundColor: '#111B21', padding: '2px 8px', borderRadius: '10px' }}>
                                            {q.difficulty}
                                        </span>
                                    </div>

                                    {/* Problem Statement */}
                                    <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px', lineHeight: '1.4' }}>
                                        {q.question}
                                    </p>

                                    {/* Concept Chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {q.concept_tags?.map(t => (
                                            <span key={t} style={{ fontSize: '10px', color: '#8696A0', backgroundColor: '#111B21', padding: '2px 8px', borderRadius: '10px' }}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>

                                    <hr style={{ border: 'none', borderBottom: '1px solid #2A3942', margin: '8px 0' }} />

                                    {/* Answer Block */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#E9EDEF' }}>Model Answer Framework</span>
                                            <button
                                                onClick={() => toggleReveal(q._id)}
                                                style={{
                                                    backgroundColor: 'transparent', border: '1px solid #2A3942', borderRadius: '6px',
                                                    color: '#E9EDEF', padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                            >
                                                <Eye size={12} /> {isRevealed ? 'Hide Answer' : 'Reveal Answer'}
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {isRevealed && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div style={{ backgroundColor: '#111B21', borderRadius: '10px', padding: '12px', fontSize: '13.5px', lineHeight: '1.5', color: '#E9EDEF', borderLeft: '3px solid #00A884', marginBottom: '10px' }}>
                                                        {q.correct_answer}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Interactive self rating */}
                                    <div>
                                        <span style={{ display: 'block', fontSize: '11px', color: '#8696A0', marginBottom: '4px' }}>Self-Assessment Confidence:</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => setQuestionRating(q._id, star)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: star <= rating ? '#F4B400' : '#8696A0' }}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes input */}
                                    <div>
                                        <span style={{ display: 'block', fontSize: '11px', color: '#8696A0', marginBottom: '4px' }}>My study notes:</span>
                                        <textarea
                                            placeholder="Write summary notes or answers draft here..."
                                            value={noteText}
                                            onChange={e => setQuestionNote(q._id, e.target.value)}
                                            style={{
                                                width: '100%', height: '56px', padding: '8px', backgroundColor: '#0B141A',
                                                border: '1px solid #2A3942', borderRadius: '6px', color: '#E9EDEF', fontSize: '12.5px',
                                                outline: 'none', resize: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    {/* Save progress button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSaveFeedback(q._id)}
                                        disabled={isSaving}
                                        style={{
                                            alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#00A884',
                                            color: '#0B141A', fontSize: '11.5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px'
                                        }}
                                    >
                                        {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                        Save Progress
                                    </motion.button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
