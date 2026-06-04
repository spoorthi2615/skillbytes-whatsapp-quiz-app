import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, CheckCircle, ArrowLeft, 
  AlertCircle, RefreshCw, Code 
} from 'lucide-react';
import { assessmentApi } from '../services/api';
import toast from 'react-hot-toast';

export default function CodingQuestions() {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Coding editor states
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [solutionCode, setSolutionCode] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('Python');
    const [submitting, setSubmitting] = useState(false);
    const [showHints, setShowHints] = useState(false);

    const loadCodingAssessments = useCallback(async () => {
        try {
            const res = await assessmentApi.list();
            // Filter assessments containing coding questions
            const filtered = res.data.filter(a => a.question_types?.includes('coding'));
            setAssessments(filtered);
            if (filtered.length > 0) {
                setSelectedAssessmentId(filtered[0]._id);
            }
        } catch (err) {
            console.error('Error loading coding assessments:', err);
            toast.error('Failed to load coding challenges.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load coding assessments on mount
    useEffect(() => {
        let active = true;
        const fetch = async () => {
            await Promise.resolve();
            if (active) {
                loadCodingAssessments();
            }
        };
        fetch();
        return () => { active = false; };
    }, [loadCodingAssessments]);

    // Load coding questions when assessment changes
    const loadQuestions = useCallback(async () => {
        if (!selectedAssessmentId) {
            setQuestions([]);
            setSelectedQuestion(null);
            return;
        }
        try {
            const res = await assessmentApi.get(selectedAssessmentId);
            const filtered = res.data.questions.filter(q => q.question_type === 'coding');
            setQuestions(filtered);
            if (filtered.length > 0) {
                setSelectedQuestion(filtered[0]);
                setSolutionCode(filtered[0].draft_solution || '');
                setSelectedLanguage(filtered[0].draft_language || 'Python');
            }
        } catch (err) {
            console.error('Error loading questions:', err);
            toast.error('Failed to load coding questions.');
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

    const handleSelectQuestion = (q) => {
        setSelectedQuestion(q);
        setSolutionCode(q.draft_solution || '');
        setSelectedLanguage(q.draft_language || 'Python');
        setShowHints(false);
    };

    // Save coding draft
    const handleSaveDraft = async () => {
        if (!selectedQuestion) return;
        setSubmitting(true);
        try {
            await assessmentApi.submitCoding({
                question_id: selectedQuestion._id,
                language: selectedLanguage,
                solution: solutionCode
            });
            // Update local questions draft cache
            const updatedQuestion = {
                ...selectedQuestion,
                draft_solution: solutionCode,
                draft_language: selectedLanguage
            };
            setSelectedQuestion(updatedQuestion);
            setQuestions(prev => prev.map(q => q._id === selectedQuestion._id ? updatedQuestion : q));
            toast.success('Coding solution draft saved!');
        } catch (err) {
            console.error('Failed saving solution:', err);
            toast.error('Failed to save code draft.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', color: '#E9EDEF' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>Coding Challenges</h1>
                    <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
                        Practice algorithm drafting and logical problem solving generated from your document notes.
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
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#8696A0' }}>Loading coding materials...</div>
            ) : assessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942' }}>
                    <AlertCircle size={36} color="#8696A0" style={{ marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No coding challenges generated</h3>
                    <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>Go to the Assessments dashboard and generate a new 'Coding Assessment' template.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
                    
                    {/* Left lists */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Assessments Selector */}
                        <div style={{ backgroundColor: '#202C33', borderRadius: '14px', border: '1px solid #2A3942', padding: '12px' }}>
                            <span style={{ fontSize: '10.5px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '8px', paddingLeft: '4px' }}>Material Source</span>
                            <select
                                value={selectedAssessmentId}
                                onChange={e => setSelectedAssessmentId(e.target.value)}
                                style={{
                                    width: '100%', padding: '8px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                                    borderRadius: '6px', color: '#E9EDEF', fontSize: '12px', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                {assessments.map(a => (
                                    <option key={a._id} value={a._id}>{a.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Questions list */}
                        <div style={{ backgroundColor: '#202C33', borderRadius: '14px', border: '1px solid #2A3942', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '10.5px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '4px', paddingLeft: '4px' }}>Challenges List</span>
                            {questions.map((q, idx) => {
                                const isSelected = selectedQuestion?._id === q._id;
                                return (
                                    <button
                                        key={q._id}
                                        onClick={() => handleSelectQuestion(q)}
                                        style={{
                                            width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
                                            backgroundColor: isSelected ? '#111B21' : 'transparent',
                                            color: isSelected ? '#00A884' : '#8696A0', textAlign: 'left', cursor: 'pointer',
                                            borderLeft: isSelected ? '3px solid #00A884' : '3px solid transparent',
                                            fontSize: '13px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {idx + 1}. {q.problem_statement?.substring(0, 18) || 'Challenge'}...
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Editor/QA Workspace */}
                    {selectedQuestion ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Problem Card */}
                            <div style={{ backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Terminal size={18} color="#00A884" /> Coding Challenge Description
                                    </h2>
                                    <span style={{ fontSize: '10.5px', color: '#00A884', backgroundColor: 'rgba(0,168,132,0.1)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                        {selectedQuestion.difficulty}
                                    </span>
                                </div>

                                <p style={{ fontSize: '14.5px', lineHeight: '1.5', margin: '0 0 16px', color: '#E9EDEF', whiteSpace: 'pre-wrap' }}>
                                    {selectedQuestion.problem_statement}
                                </p>

                                {/* Addition 7: time/space complexity and company tags */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', backgroundColor: '#111B21', borderRadius: '10px', padding: '12px', fontSize: '12.5px', marginBottom: '16px' }}>
                                    <div>
                                        <span style={{ color: '#8696A0', display: 'block', fontSize: '10.5px', textTransform: 'uppercase' }}>Time Complexity</span>
                                        <strong style={{ color: '#25D366' }}>{selectedQuestion.time_complexity || 'O(N)'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#8696A0', display: 'block', fontSize: '10.5px', textTransform: 'uppercase' }}>Space Complexity</span>
                                        <strong style={{ color: '#25D366' }}>{selectedQuestion.space_complexity || 'O(1)'}</strong>
                                    </div>
                                </div>

                                {/* Constraints & Sample Input Output */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#8696A0' }}>
                                    {selectedQuestion.constraints && (
                                        <div>
                                            <span style={{ fontWeight: '700', color: '#E9EDEF' }}>Constraints: </span>
                                            <span>{selectedQuestion.constraints}</span>
                                        </div>
                                    )}
                                    {selectedQuestion.sample_input && (
                                        <div>
                                            <span style={{ fontWeight: '700', color: '#E9EDEF' }}>Sample Input: </span>
                                            <code style={{ fontFamily: 'monospace', backgroundColor: '#111B21', padding: '2px 6px', borderRadius: '4px', color: '#E9EDEF' }}>
                                                {selectedQuestion.sample_input}
                                            </code>
                                        </div>
                                    )}
                                    {selectedQuestion.sample_output && (
                                        <div>
                                            <span style={{ fontWeight: '700', color: '#E9EDEF' }}>Sample Output: </span>
                                            <code style={{ fontFamily: 'monospace', backgroundColor: '#111B21', padding: '2px 6px', borderRadius: '4px', color: '#E9EDEF' }}>
                                                {selectedQuestion.sample_output}
                                            </code>
                                        </div>
                                    )}
                                </div>

                                {/* Company & Topic Badges */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                                    {selectedQuestion.company_tags?.map(c => (
                                        <span key={c} style={{ fontSize: '10px', color: '#F4B400', backgroundColor: 'rgba(244,180,0,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(244,180,0,0.2)' }}>
                                            {c}
                                        </span>
                                    ))}
                                    {selectedQuestion.topics?.map(t => (
                                        <span key={t} style={{ fontSize: '10px', color: '#00A884', backgroundColor: 'rgba(0,168,132,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Hints Panel */}
                            {selectedQuestion.hints && selectedQuestion.hints.length > 0 && (
                                <div style={{ backgroundColor: '#202C33', borderRadius: '12px', border: '1px solid #2A3942', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setShowHints(!showHints)}
                                        style={{
                                            width: '100%', padding: '12px 20px', border: 'none', backgroundColor: 'transparent',
                                            color: '#E9EDEF', fontWeight: '700', fontSize: '13px', display: 'flex',
                                            justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                                        }}
                                    >
                                        Need a Hint?
                                        <span style={{ fontSize: '11px', color: '#8696A0' }}>{showHints ? 'Hide' : 'Reveal'}</span>
                                    </button>
                                    <AnimatePresence>
                                        {showHints && (
                                            <motion.div
                                                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                                style={{ overflow: 'hidden', borderTop: '1px solid #2A3942' }}
                                            >
                                                <div style={{ padding: '16px 20px', fontSize: '12.5px', color: '#8696A0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {selectedQuestion.hints.map((h, i) => (
                                                        <div key={i}>• {h}</div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Solution Editor Card */}
                            <div style={{ backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Code size={16} color="#25D366" /> Solution Code Draft
                                    </span>
                                    
                                    <select
                                        value={selectedLanguage}
                                        onChange={e => setSelectedLanguage(e.target.value)}
                                        style={{
                                            backgroundColor: '#0B141A', border: '1px solid #2A3942', borderRadius: '6px',
                                            color: '#E9EDEF', fontSize: '12px', padding: '4px 8px', cursor: 'pointer'
                                        }}
                                    >
                                        {['Python', 'Java', 'C++', 'JavaScript', 'C', 'Go'].map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>

                                <textarea
                                    value={solutionCode}
                                    onChange={e => setSolutionCode(e.target.value)}
                                    placeholder={`# Type your code solution here...\n# Make sure to satisfy complexities...`}
                                    style={{
                                        width: '100%', height: '200px', padding: '14px', backgroundColor: '#0B141A',
                                        border: '1px solid #2A3942', borderRadius: '8px', color: '#25D366', fontSize: '13px',
                                        fontFamily: 'monospace', outline: 'none', resize: 'none', boxSizing: 'border-box',
                                        lineHeight: '1.4'
                                    }}
                                />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <span style={{ fontSize: '11px', color: '#8696A0' }}>
                                        Draft saves automatically on submission. Sandbox execution is coming in Phase 2C.
                                    </span>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSaveDraft}
                                        disabled={submitting}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: '#00A884',
                                            color: '#0B141A', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        {submitting ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                        Save Solution
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#8696A0', textAlign: 'center', padding: '40px 0' }}>Select a challenge from the list.</div>
                    )}
                </div>
            )}
        </div>
    );
}
