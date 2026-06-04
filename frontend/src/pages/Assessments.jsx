import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Search, Play, Award, List, 
  HelpCircle, X, BookOpen, Clock, AlertCircle
} from 'lucide-react';
import { assessmentApi, assetsApi, jobsApi } from '../services/api';
import toast from 'react-hot-toast';

export default function Assessments() {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [masteryList, setMasteryList] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search, filter, and sorting states
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest'); // newest, attempts, best_score
    const [activeTab, setActiveTab] = useState('all_assessments'); // all_assessments, mastery
    
    // Modal states
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [questionCount, setQuestionCount] = useState(10);
    const [questionTypes, setQuestionTypes] = useState(['mcq']);
    const [customDifficulty, setCustomDifficulty] = useState('medium');
    const [customMode, setCustomMode] = useState('Exam Preparation');
    const [generating, setGenerating] = useState(false);
    
    // Active jobs tracking
    const [activeJobs, setActiveJobs] = useState({}); // job_id -> { progress, current_step, status, title }

    const loadData = useCallback(async () => {
        try {
            const [aRes, mRes, assetRes] = await Promise.all([
                assessmentApi.list(),
                assessmentApi.mastery(),
                assetsApi.list()
            ]);
            setAssessments(aRes.data || []);
            setMasteryList(mRes.data || []);
            setAssets(assetRes.data || []);
        } catch (err) {
            console.error('Failed to load assessments dashboard:', err);
            toast.error('Failed to load assessments.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch dashboard statistics on mount
    useEffect(() => {
        let active = true;
        const fetch = async () => {
            await Promise.resolve();
            if (active) {
                loadData();
            }
        };
        fetch();
        return () => { active = false; };
    }, [loadData]);

    // Background jobs polling
    useEffect(() => {
        const jobIds = Object.keys(activeJobs).filter(
            id => activeJobs[id].status === 'pending' || activeJobs[id].status === 'processing'
        );
        if (jobIds.length === 0) return;

        const interval = setInterval(async () => {
            for (const id of jobIds) {
                try {
                    const res = await jobsApi.getStatus(id);
                    const job = res.data;
                    setActiveJobs(prev => {
                        const next = { ...prev };
                        next[id] = {
                            ...next[id],
                            status: job.status,
                            progress: job.progress || 0,
                            current_step: job.current_step || 'processing'
                        };
                        if (job.status === 'completed') {
                            toast.success(`Completed generation for '${next[id].title}'!`);
                            loadData(); // Reload listings to show the new assessment
                            // Cleanup active job entry
                            delete next[id];
                        } else if (job.status === 'failed') {
                            toast.error(`Assessment generation failed for '${next[id].title}'.`);
                            delete next[id];
                        }
                        return next;
                    });
                } catch (err) {
                    console.error('Error polling status:', err);
                }
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [activeJobs, loadData]);

    // One-click template trigger handler (Addition 1)
    const handleTemplateTrigger = async (templateName, assetId, assetTitle) => {
        if (!assetId) {
            toast.error('Please upload a material document first.');
            return;
        }
        try {
            setGenerating(true);
            const res = await assessmentApi.generate({
                asset_id: assetId,
                template_name: templateName,
                title: `${templateName}: ${assetTitle}`
            });
            if (res.success) {
                const job = res.data;
                setActiveJobs(prev => ({
                    ...prev,
                    [job.job_id]: {
                        status: 'pending',
                        progress: 0,
                        current_step: 'extracting',
                        title: `${templateName}: ${assetTitle}`
                    }
                }));
                toast.success('Queued template generation!');
            }
        } catch (err) {
            console.error('Failed to trigger template:', err);
            toast.error('Failed to queue template generation.');
        } finally {
            setGenerating(false);
        }
    };

    // Custom assessment trigger handler (Step 10)
    const handleCustomTrigger = async () => {
        if (!selectedAssetId) {
            toast.error('Please select a material source file.');
            return;
        }
        if (questionTypes.length === 0) {
            toast.error('Please select at least one question type.');
            return;
        }
        const asset = assets.find(a => a._id === selectedAssetId);
        const title = customTitle.trim() || `Assessment: ${asset?.title || 'Material'}`;

        try {
            setGenerating(true);
            const res = await assessmentApi.generate({
                asset_id: selectedAssetId,
                title: title,
                question_count: questionCount,
                question_types: questionTypes,
                difficulty: customDifficulty,
                generation_mode: customMode
            });
            
            if (res.success) {
                const job = res.data;
                setActiveJobs(prev => ({
                    ...prev,
                    [job.job_id]: {
                        status: 'pending',
                        progress: 0,
                        current_step: 'extracting',
                        title: title
                    }
                }));
                toast.success('Queued custom generation!');
                setShowCustomModal(false);
            }
        } catch (err) {
            console.error('Failed to trigger custom generation:', err);
            toast.error('Failed to start AI generation.');
        } finally {
            setGenerating(false);
        }
    };

    // Toggle question type selection
    const toggleQuestionType = (type) => {
        if (questionTypes.includes(type)) {
            setQuestionTypes(prev => prev.filter(t => t !== type));
        } else {
            setQuestionTypes(prev => [...prev, type]);
        }
    };

    // Filter, search, and sort lists
    const filteredAssessments = assessments.filter(a => {
        const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             a.asset_title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDiff = difficultyFilter === 'all' || a.difficulty === difficultyFilter;
        const matchesType = typeFilter === 'all' || a.question_types?.includes(typeFilter);
        return matchesSearch && matchesDiff && matchesType;
    }).sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'attempts') {
            return (b.total_attempts || 0) - (a.total_attempts || 0);
        } else if (sortBy === 'best_score') {
            return (b.best_score || 0) - (a.best_score || 0);
        }
        return 0;
    });

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', color: '#E9EDEF' }}>
            
            {/* Header banner */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>AI Assessments</h1>
                <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
                    Create dynamic assessments, coding challenges, and mock viva evaluations directly from your study materials.
                </p>
            </div>

            {/* Quick Templates Row (Addition 1) */}
            {assets.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '12px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        One-Click Templates
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        {[
                            { name: 'Quick Quiz', desc: '10 MCQ/TF questions', icon: <HelpCircle size={18} /> },
                            { name: 'Placement Prep', desc: 'MCQ & Coding', icon: <Sparkles size={18} /> },
                            { name: 'Interview Prep', desc: 'Scenario & Viva Qs', icon: <Award size={18} /> },
                            { name: 'Revision Test', desc: 'Comprehensive Qs', icon: <List size={18} /> },
                            { name: 'Coding Assessment', desc: '5 Coding Challenges', icon: <BookOpen size={18} /> }
                        ].map(t => (
                            <motion.button
                                key={t.name}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleTemplateTrigger(t.name, assets[0]?._id, assets[0]?.title)}
                                disabled={generating}
                                style={{
                                    backgroundColor: '#202C33', border: '1px solid #2A3942', borderRadius: '12px',
                                    padding: '16px', cursor: 'pointer', textAlign: 'left', display: 'flex',
                                    flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                                }}
                            >
                                <div style={{ color: '#00A884' }}>{t.icon}</div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#E9EDEF' }}>{t.name}</div>
                                    <div style={{ fontSize: '11px', color: '#8696A0', marginTop: '2px' }}>{t.desc}</div>
                                </div>
                                <span style={{ fontSize: '9px', color: '#8696A0', position: 'absolute', bottom: '6px', right: '10px' }}>
                                    Source: {assets[0]?.title?.substring(0, 10)}...
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Generation Jobs list */}
            {Object.keys(activeJobs).length > 0 && (
                <div style={{ marginBottom: '24px', backgroundColor: '#202C33', borderRadius: '12px', padding: '16px', border: '1px solid #2A3942' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} color="#00A884" /> Generating AI Assessment
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(activeJobs).map(([jobId, job]) => (
                            <div key={jobId} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#111B21', padding: '10px 12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContext: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{job.title}</span>
                                    <span style={{ fontSize: '11px', color: '#00A884', fontWeight: 'bold' }}>
                                        {job.status === 'processing' ? `${job.current_step}...` : job.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, height: '4px', backgroundColor: '#2A3942', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${job.progress}%`, backgroundColor: '#00A884', transition: 'width 0.3s ease-out' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#8696A0' }}>{job.progress}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Tabs Selection */}
            <div style={{ display: 'flex', borderBottom: '1px solid #2A3942', marginBottom: '20px', gap: '20px' }}>
                <button
                    onClick={() => setActiveTab('all_assessments')}
                    style={{
                        padding: '10px 4px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'all_assessments' ? '3px solid #00A884' : '3px solid transparent',
                        color: activeTab === 'all_assessments' ? '#00A884' : '#8696A0',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Assessment Library
                </button>
                <button
                    onClick={() => setActiveTab('mastery')}
                    style={{
                        padding: '10px 4px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'mastery' ? '3px solid #00A884' : '3px solid transparent',
                        color: activeTab === 'mastery' ? '#00A884' : '#8696A0',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Concept Mastery Track
                </button>
            </div>

            {/* 1. Assessment Library Tab */}
            {activeTab === 'all_assessments' && (
                <div>
                    {/* Controls Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        
                        {/* Search and Filters */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {/* Search box */}
                            <div style={{ position: 'relative', width: '220px' }}>
                                <input
                                    type="text"
                                    placeholder="Search assessments..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%', padding: '8px 12px 8px 34px', backgroundColor: '#202C33',
                                        border: '1px solid #2A3942', borderRadius: '20px', color: '#E9EDEF', fontSize: '13px',
                                        outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                                <Search size={13} color="#8696A0" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                            </div>

                            {/* Difficulty Filter */}
                            <select
                                value={difficultyFilter}
                                onChange={e => setDifficultyFilter(e.target.value)}
                                style={{
                                    backgroundColor: '#202C33', border: '1px solid #2A3942', borderRadius: '20px',
                                    color: '#E9EDEF', padding: '8px 12px', fontSize: '12px', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Difficulties</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                                <option value="mixed">Mixed</option>
                            </select>

                            {/* Type Filter */}
                            <select
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value)}
                                style={{
                                    backgroundColor: '#202C33', border: '1px solid #2A3942', borderRadius: '20px',
                                    color: '#E9EDEF', padding: '8px 12px', fontSize: '12px', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Formats</option>
                                <option value="mcq">MCQ</option>
                                <option value="true_false">True/False</option>
                                <option value="fill_blank">Fill in the Blank</option>
                                <option value="scenario">Scenario</option>
                                <option value="interview">Interview QA</option>
                                <option value="coding">Coding</option>
                            </select>

                            {/* Sort By */}
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                style={{
                                    backgroundColor: '#202C33', border: '1px solid #2A3942', borderRadius: '20px',
                                    color: '#E9EDEF', padding: '8px 12px', fontSize: '12px', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                <option value="newest">Sort: Newest</option>
                                <option value="attempts">Sort: Most Attempts</option>
                                <option value="best_score">Sort: High Score</option>
                            </select>
                        </div>

                        {/* Custom Generator Trigger */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowCustomModal(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                                borderRadius: '20px', border: 'none', backgroundColor: '#00A884',
                                color: '#0B141A', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            <Sparkles size={14} /> Custom Assessment
                        </motion.button>
                    </div>

                    {/* Listings */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8696A0' }}>Loading assessments...</div>
                    ) : filteredAssessments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942' }}>
                            <AlertCircle size={36} color="#8696A0" style={{ marginBottom: '12px' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No assessments found</h3>
                            <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>Try adjusting your filters or build a new custom assessment above.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredAssessments.map(a => (
                                <motion.div
                                    key={a._id}
                                    whileHover={{ y: -2 }}
                                    style={{
                                        backgroundColor: '#202C33', borderRadius: '14px', border: '1px solid #2A3942',
                                        padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {a.title}
                                            </h3>
                                            <span style={{ fontSize: '10px', color: '#00A884', backgroundColor: 'rgba(0,168,132,0.1)', padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize', fontWeight: 'bold' }}>
                                                {a.difficulty}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#8696A0' }}>
                                            <span>Source: <strong>{a.asset_title}</strong></span>
                                            <span>•</span>
                                            <span>{a.question_count} questions</span>
                                            <span>•</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Clock size={11} /> {a.estimated_duration} mins
                                            </span>
                                        </div>
                                        
                                        {/* Attempts statistics (Addition 3) */}
                                        {a.total_attempts > 0 && (
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '11px', color: '#8696A0', backgroundColor: '#111B21', padding: '4px 10px', borderRadius: '6px', width: 'fit-content' }}>
                                                <span>Attempts: <strong>{a.total_attempts}</strong></span>
                                                <span>Best: <strong style={{ color: '#25D366' }}>{a.best_score}/{a.question_count}</strong></span>
                                                <span>Latest: <strong>{a.latest_score}/{a.question_count}</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action button */}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/assessment/${a._id}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContext: 'center', justifyContent: 'center',
                                            width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                                            backgroundColor: 'rgba(0,168,132,0.15)', color: '#00A884', cursor: 'pointer'
                                        }}
                                    >
                                        <Play size={16} fill="#00A884" style={{ marginLeft: '2px' }} />
                                    </motion.button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 2. Mastery Track Tab (Addition 4) */}
            {activeTab === 'mastery' && (
                <div style={{ backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Award size={20} color="#F4B400" />
                        <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Subject Knowledge Mastery Scorecard</h2>
                    </div>
                    <p style={{ color: '#8696A0', fontSize: '13px', marginTop: 0, marginBottom: '24px' }}>
                        Scores are updated dynamically after completing assessments. Correct solutions increase mastery; wrong answers decrease it.
                    </p>

                    {masteryList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#8696A0' }}>
                            No mastery analytics registered yet. Complete assessments to start charting progress.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {masteryList.map(m => {
                                const scorePct = Math.round(m.mastery_score * 100);
                                const isWeak = scorePct < 60;
                                return (
                                    <div key={m._id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                            <span style={{ fontWeight: '600' }}>{m.concept}</span>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: '#8696A0' }}>({m.attempts} attempts)</span>
                                                <span style={{ fontWeight: '700', color: isWeak ? '#F28B82' : '#25D366' }}>{scorePct}% Mastery</span>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div style={{ width: '100%', height: '8px', backgroundColor: '#111B21', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div 
                                                style={{ 
                                                    height: '100%', 
                                                    width: `${scorePct}%`, 
                                                    backgroundColor: isWeak ? '#F28B82' : '#00A884',
                                                    transition: 'width 0.4s ease-out'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Custom Assessment Generation Modal */}
            <AnimatePresence>
                {showCustomModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 200, padding: '16px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                                padding: '24px', maxWidth: '460px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)', boxSizing: 'border-box'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sparkles size={16} color="#00A884" /> Build Custom Assessment
                                </h3>
                                <button 
                                    onClick={() => setShowCustomModal(false)} 
                                    style={{ background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer', padding: '4px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Source Material Dropdown */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                                    Select Source Document
                                </label>
                                <select
                                    value={selectedAssetId}
                                    onChange={e => setSelectedAssetId(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                                        borderRadius: '8px', color: '#E9EDEF', fontSize: '13px', outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- Choose Material --</option>
                                    {assets.map(asset => (
                                        <option key={asset._id} value={asset._id}>{asset.title || asset.file_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Title text input */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                                    Assessment Title (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="DBMS Unit 4 Quiz, etc."
                                    value={customTitle}
                                    onChange={e => setCustomTitle(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                                        borderRadius: '8px', color: '#E9EDEF', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Question Count Selector */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                                    Question Count: {questionCount}
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[10, 20, 50].map(cnt => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => setQuestionCount(cnt)}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${questionCount === cnt ? '#00A884' : '#2A3942'}`,
                                                backgroundColor: questionCount === cnt ? 'rgba(0,168,132,0.1)' : 'transparent',
                                                color: questionCount === cnt ? '#00A884' : '#E9EDEF', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                                            }}
                                        >
                                            {cnt} Qs
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Question Types Checkboxes (Step 10) */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                                    Question Formats (Select Multiple)
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                    {[
                                        { id: 'mcq', label: 'Multiple Choice' },
                                        { id: 'true_false', label: 'True / False' },
                                        { id: 'fill_blank', label: 'Fill the Blank' },
                                        { id: 'scenario', label: 'Scenario-Based' },
                                        { id: 'interview', label: 'Interview QA' },
                                        { id: 'coding', label: 'Coding Challenge' }
                                    ].map(t => {
                                        const isSelected = questionTypes.includes(t.id);
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => toggleQuestionType(t.id)}
                                                style={{
                                                    padding: '8px 10px', borderRadius: '8px', border: `1px solid ${isSelected ? '#00A884' : '#2A3942'}`,
                                                    backgroundColor: isSelected ? 'rgba(0,168,132,0.1)' : 'transparent',
                                                    color: isSelected ? '#00A884' : '#E9EDEF', fontSize: '11.5px', fontWeight: '600',
                                                    cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Difficulty Selector */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                                    Difficulty
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                    {['easy', 'medium', 'hard', 'mixed'].map(diff => (
                                        <button
                                            key={diff}
                                            type="button"
                                            onClick={() => setCustomDifficulty(diff)}
                                            style={{
                                                padding: '8px 4px', borderRadius: '8px', border: `1px solid ${customDifficulty === diff ? '#00A884' : '#2A3942'}`,
                                                backgroundColor: customDifficulty === diff ? 'rgba(0,168,132,0.1)' : 'transparent',
                                                color: customDifficulty === diff ? '#00A884' : '#E9EDEF', fontSize: '11px',
                                                textTransform: 'capitalize', fontWeight: 'bold', cursor: 'pointer'
                                            }}
                                        >
                                            {diff}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mode Option */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                                    Prep Template Mode
                                </label>
                                <select
                                    value={customMode}
                                    onChange={e => setCustomMode(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                                        borderRadius: '8px', color: '#E9EDEF', fontSize: '13px', outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="Exam Preparation">Exam Preparation</option>
                                    <option value="Placement Preparation">Placement Preparation</option>
                                    <option value="Interview Preparation">Interview Preparation</option>
                                </select>
                            </div>

                            {/* Submit button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCustomTrigger}
                                disabled={generating}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '24px', border: 'none',
                                    background: 'linear-gradient(135deg, #00A884, #25D366)',
                                    color: '#0B141A', fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                                }}
                            >
                                Generate AI Assessment
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
