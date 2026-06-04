import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, CheckCircle, XCircle, ArrowLeft, RotateCcw, 
  Download, FileText
} from 'lucide-react';
import { assessmentApi } from '../services/api';
import toast from 'react-hot-toast';

export default function AssessmentResults() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [results, setResults] = useState(location.state?.results || null);
    const [loading, setLoading] = useState(!results);

    const loadLatestResults = useCallback(async () => {
        try {
            // Load dashboard data to extract latest score for this assessment
            const res = await assessmentApi.list();
            const matching = res.data.find(a => a._id === id);
            if (matching && matching.last_attempt_at) {
                // Mock reconstruction from dashboard aggregated stats for fallback
                setResults({
                    score: matching.latest_score,
                    total_questions: matching.question_count,
                    accuracy: matching.latest_accuracy,
                    duration_ms: 120000, // mock fallback
                    insights: {
                        strengths: ["Security", "Vocabulary"],
                        weak_areas: [],
                        recommended_next_topic: "Security"
                    }
                });
            } else {
                toast.error('No attempt results found.');
                navigate('/assessments');
            }
        } catch (err) {
            console.error('Failed loading results:', err);
            toast.error('Failed to load results.');
            navigate('/assessments');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (!results) {
            let active = true;
            const fetch = async () => {
                await Promise.resolve();
                if (active) {
                    loadLatestResults();
                }
            };
            fetch();
            return () => { active = false; };
        }
    }, [results, loadLatestResults]);

    if (loading) {
        return (
            <div style={{
                color: '#E9EDEF', minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#0B141A'
            }}>
                Loading Attempt results...
            </div>
        );
    }

    if (!results) return null;

    const formatDuration = (ms) => {
        const totalSecs = Math.floor(ms / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        if (m === 0) return `${s}s`;
        return `${m}m ${s}s`;
    };

    // Download assessment exports (Addition 5)
    const handleExport = async (format) => {
        try {
            const res = await assessmentApi.export(id);
            if (res.success) {
                const data = res.data;
                let text = '';
                let filename = `${data.assessment.title}_export`;
                
                if (format === 'markdown') {
                    text = data.markdown;
                    const blob = new Blob([text], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename + '.md';
                    link.click();
                    URL.revokeObjectURL(url);
                } else if (format === 'json') {
                    text = JSON.stringify({ assessment: data.assessment, questions: data.questions }, null, 2);
                    const blob = new Blob([text], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename + '.json';
                    link.click();
                    URL.revokeObjectURL(url);
                } else {
                    window.print();
                    return;
                }
                toast.success(`Exported successfully as ${format.toUpperCase()}`);
            }
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Failed to export assessment.');
        }
    };

    const accuracyPct = Math.round(results.accuracy);

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px', color: '#E9EDEF' }}>
            
            {/* Action Header */}
            <button
                onClick={() => navigate('/assessments')}
                style={{
                    background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '24px'
                }}
            >
                <ArrowLeft size={16} /> Back to Library
            </button>

            {/* Main Scorecard card */}
            <div style={{
                backgroundColor: '#202C33', borderRadius: '16px', padding: '30px 20px',
                border: '1px solid #2A3942', textAlign: 'center', marginBottom: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'inline-flex', position: 'relative', marginBottom: '16px' }}>
                    {/* Visual Meter */}
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: `conic-gradient(#00A884 ${accuracyPct}%, #111B21 0)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '102px', height: '102px', borderRadius: '50%',
                            backgroundColor: '#202C33', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '26px', fontWeight: '800', color: '#E9EDEF' }}>
                                {accuracyPct}%
                            </span>
                            <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', marginTop: '2px' }}>
                                Accuracy
                            </span>
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>Assessment Complete!</h2>
                <p style={{ color: '#8696A0', fontSize: '13px', margin: '0 0 24px' }}>
                    Excellent effort on your learning evaluation! Here are your performance metrics:
                </p>

                {/* Score and time cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{ backgroundColor: '#111B21', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#25D366', display: 'flex', justifyContext: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                            <CheckCircle size={16} />
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>{results.score}</div>
                        <div style={{ fontSize: '10.5px', color: '#8696A0', marginTop: '2px' }}>Correct</div>
                    </div>
                    
                    <div style={{ backgroundColor: '#111B21', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#F28B82', display: 'flex', justifyContext: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                            <XCircle size={16} />
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>
                            {results.total_questions - results.score}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#8696A0', marginTop: '2px' }}>Incorrect</div>
                    </div>

                    <div style={{ backgroundColor: '#111B21', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ color: '#8696A0', display: 'flex', justifyContext: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                            <Clock size={16} />
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>
                            {formatDuration(results.duration_ms)}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#8696A0', marginTop: '2px' }}>Time Spent</div>
                    </div>
                </div>
            </div>

            {/* AI Learning Insights (Addition 8) */}
            {results.insights && (
                <div style={{
                    backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                    padding: '20px', marginBottom: '24px'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#00A884', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        AI Learning Diagnostics
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Strengths */}
                        <div>
                            <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                                Conceptual Strengths
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {results.insights.strengths?.length > 0 ? (
                                    results.insights.strengths.map(s => (
                                        <span key={s} style={{ fontSize: '11px', color: '#25D366', backgroundColor: 'rgba(37,211,102,0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(37,211,102,0.2)' }}>
                                            ✓ {s}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#8696A0' }}>No conceptual strengths registered. Keep practicing!</span>
                                )}
                            </div>
                        </div>

                        {/* Weak Areas */}
                        <div>
                            <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                                Areas for Improvement
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {results.insights.weak_areas?.length > 0 ? (
                                    results.insights.weak_areas.map(w => (
                                        <span key={w} style={{ fontSize: '11px', color: '#F28B82', backgroundColor: 'rgba(242,139,130,0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(242,139,130,0.2)' }}>
                                            ✗ {w}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '11px', color: '#25D366', fontWeight: 'bold' }}>
                                        ★ Flawless! No weak concepts identified.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Next Action recommendation */}
                        {results.insights.recommended_next_topic && (
                            <div style={{
                                backgroundColor: '#111B21', borderRadius: '10px', padding: '12px',
                                borderLeft: '3px solid #00A884', marginTop: '6px'
                            }}>
                                <span style={{ fontSize: '10.5px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '700' }}>
                                    Recommended Next Action
                                </span>
                                <div style={{ fontSize: '13.5px', color: '#E9EDEF', fontWeight: '600', marginTop: '4px' }}>
                                    Focus on practicing the concept: '{results.insights.recommended_next_topic}'
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PDF/Markdown Export actions (Addition 5) */}
            <div style={{
                backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '28px'
            }}>
                <span style={{ fontSize: '13px', color: '#8696A0' }}>Export Assessment Sheet</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => handleExport('markdown')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                            backgroundColor: 'transparent', border: '1px solid #2A3942', borderRadius: '6px',
                            color: '#8696A0', fontSize: '12px', cursor: 'pointer'
                        }}
                    >
                        <FileText size={12} /> Markdown
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                            backgroundColor: 'transparent', border: '1px solid #2A3942', borderRadius: '6px',
                            color: '#8696A0', fontSize: '12px', cursor: 'pointer'
                        }}
                    >
                        <Download size={12} /> JSON
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                            backgroundColor: 'transparent', border: '1px solid #2A3942', borderRadius: '6px',
                            color: '#8696A0', fontSize: '12px', cursor: 'pointer'
                        }}
                    >
                        Print/PDF
                    </button>
                </div>
            </div>

            {/* Bottom Actions Row (Retakes & Back) */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/assessment/${id}`)}
                    style={{
                        flex: 1, padding: '12px', borderRadius: '24px', border: '1px solid #00A884',
                        backgroundColor: 'transparent', color: '#00A884', fontSize: '13.5px',
                        fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px'
                    }}
                >
                    <RotateCcw size={14} /> Retake Assessment
                </motion.button>
                
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/assessments')}
                    style={{
                        flex: 1, padding: '12px', borderRadius: '24px', border: 'none',
                        backgroundColor: '#00A884', color: '#0B141A', fontSize: '13.5px',
                        fontWeight: '700', cursor: 'pointer'
                    }}
                >
                    Assessment Dashboard
                </motion.button>
            </div>
        </div>
    );
}
