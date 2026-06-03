import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, List, HelpCircle, Search, Star, Trash2, 
  RotateCw, ChevronLeft, ChevronRight, Eye, CornerUpLeft, 
  Download, AlertCircle, X, ExternalLink
} from 'lucide-react';
import { contentApi, favoritesApi, sessionApi } from '../services/api';
import toast from 'react-hot-toast';

export default function GeneratedContent() {
  const [tab, setTab] = useState('summary'); // summary, revision_notes, flashcards
  const [contentList, setContentList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Detail views & interactive states
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailedSummary, setShowDetailedSummary] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Session tracking start time
  const [sessionStart, setSessionStart] = useState(null);

  // Source mapping modal state
  const [sourceChunk, setSourceChunk] = useState(null);
  
  // Feedback rating modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  
  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contentRes, favRes] = await Promise.all([
        contentApi.list(tab),
        favoritesApi.list()
      ]);
      setContentList(contentRes.data || []);
      setFavorites(favRes.data || []);
      
      // Auto-select first item if list is not empty
      if (contentRes.data && contentRes.data.length > 0) {
        setSelectedContent(contentRes.data[0]);
        setCardIndex(0);
        setIsFlipped(false);
        setSessionStart(Date.now());
      } else {
        setSelectedContent(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load study aids.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

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

  // Log session duration when changing content or unmounting
  useEffect(() => {
    if (!selectedContent || !sessionStart) return;
    
    return () => {
      const durationMs = Date.now() - sessionStart;
      if (durationMs > 2000) { // Only log meaningful sessions (> 2 seconds)
        sessionApi.log({
          content_id: selectedContent._id,
          content_type: selectedContent.content_type,
          action: selectedContent.content_type === 'flashcards' ? 'study' : 'view',
          duration_ms: durationMs
        }).catch(err => console.error('Failed to log learning session:', err));
      }
    };
  }, [selectedContent, sessionStart]);

  const handleContentChange = useCallback((item) => {
    setSelectedContent(item);
    setCardIndex(0);
    setIsFlipped(false);
    setShowDetailedSummary(false);
    setSessionStart(Date.now());
  }, []);

  const handleFavoriteToggle = async (item) => {
    const isFav = favorites.some(f => f.content_id === item._id);
    try {
      if (isFav) {
        await favoritesApi.remove(item._id);
        setFavorites(prev => prev.filter(f => f.content_id !== item._id));
        toast.success('Removed from bookmarks');
      } else {
        await favoritesApi.add({
          content_id: item._id,
          content_type: item.content_type,
          title: item.title
        });
        setFavorites(prev => [...prev, { content_id: item._id, content_type: item.content_type, title: item.title }]);
        toast.success('Saved to bookmarks');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update bookmarks');
    }
  };

  const handleDeleteContent = async (item) => {
    if (!confirm(`Are you sure you want to delete this ${item.content_type.replace('_', ' ')}?`)) return;
    try {
      const res = await contentApi.delete(item._id);
      if (res.success) {
        toast.success('Deleted study aid.');
        setContentList(prev => prev.filter(c => c._id !== item._id));
        if (selectedContent?._id === item._id) {
          setSelectedContent(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete content');
    }
  };

  // Source mapping handler (Show Source)
  const handleShowSource = async (chunkId) => {
    if (!chunkId) return;
    try {
      const res = await contentApi.getChunk(chunkId);
      setSourceChunk(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load original text source.');
    }
  };

  // Feedback Submission handler
  const openFeedbackModal = () => {
    setRating(selectedContent?.rating || 5);
    setFeedbackText(selectedContent?.feedback || '');
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!selectedContent) return;
    try {
      const res = await contentApi.submitFeedback(selectedContent._id, rating, feedbackText);
      if (res.success) {
        toast.success('Feedback recorded!');
        setSelectedContent(prev => ({ ...prev, rating, feedback: feedbackText }));
        setShowFeedbackModal(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit feedback.');
    }
  };

  // Version history handler
  const loadVersionHistory = async () => {
    if (!selectedContent) return;
    setLoadingHistory(true);
    setShowVersionHistory(true);
    try {
      const res = await contentApi.getHistory(selectedContent._id);
      setVersionHistory(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load version history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const restoreVersion = async (vContentId) => {
    if (!confirm('Are you sure you want to restore this version as the active configuration?')) return;
    try {
      const res = await contentApi.restoreVersion(vContentId);
      if (res.success) {
        toast.success('Version restored!');
        setShowVersionHistory(false);
        loadData(); // Reload list to see restored content at top
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to restore version.');
    }
  };

  // Export content function
  const exportContent = (format) => {
    if (!selectedContent) return;
    
    let filename = `${selectedContent.title}_${selectedContent.content_type}`;
    let text = '';
    
    if (selectedContent.content_type === 'summary') {
      text = `# Summary of ${selectedContent.title}\n\n`;
      text += `### Generation Mode\n${selectedContent.generation_mode}\n\n`;
      text += `### Quick Summary\n${selectedContent.data.short_summary}\n\n`;
      text += `### Detailed Summary\n${selectedContent.data.detailed_summary}\n\n`;
      text += `### Key Concepts\n`;
      selectedContent.data.key_concepts.forEach(c => {
        text += `- **${c.concept}**: ${c.explanation}\n`;
      });
    } else if (selectedContent.content_type === 'revision_notes') {
      text = `# Revision Notes: ${selectedContent.title}\n\n`;
      text += `### Exam Overview Notes\n${selectedContent.data.exam_notes}\n\n`;
      text += `### Quick Takeaways\n${selectedContent.data.quick_notes}\n\n`;
      text += `### Important Topics\n`;
      selectedContent.data.important_topics.forEach(t => {
        text += `#### ${t.topic}\n${t.notes}\n\n`;
      });
    } else if (selectedContent.content_type === 'flashcards') {
      text = `# Flashcards for ${selectedContent.title}\n\n`;
      selectedContent.data.cards.forEach((card, i) => {
        text += `Card ${i+1}\nQ: ${card.question}\nA: ${card.answer}\n\n`;
      });
    }

    if (format === 'pdf') {
      window.print();
      return;
    }

    const mime = format === 'markdown' ? 'text/markdown' : 'text/plain';
    const ext = format === 'markdown' ? '.md' : '.txt';
    
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename + ext;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}!`);
  };

  // Filter content list
  const filteredList = contentList.filter(item => {
    const term = search.toLowerCase();
    const matchesTitle = item.title?.toLowerCase().includes(term);
    const matchesTopic = item.generation_mode?.toLowerCase().includes(term);
    return matchesTitle || matchesTopic;
  });

  const isFav = selectedContent && favorites.some(f => f.content_id === selectedContent._id);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', color: '#E9EDEF' }}>
      
      {/* Search and Navigation Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#202C33', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          {[
            { id: 'summary', icon: <FileText size={14} />, label: 'Summaries' },
            { id: 'revision_notes', icon: <List size={14} />, label: 'Revision Notes' },
            { id: 'flashcards', icon: <HelpCircle size={14} />, label: 'Flashcards' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                border: 'none', backgroundColor: tab === t.id ? '#0B141A' : 'transparent',
                color: tab === t.id ? '#00A884' : '#8696A0', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            placeholder="Search study aids..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', backgroundColor: '#202C33',
              border: '1px solid #2A3942', borderRadius: '24px', color: '#E9EDEF', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
          <Search size={14} color="#8696A0" style={{ position: 'absolute', left: '14px', top: '13px' }} />
        </div>
      </div>

      {/* Main Grid Layout */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#8696A0' }}>Loading Study Dashboard...</div>
      ) : filteredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942' }}>
          <AlertCircle size={36} color="#8696A0" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No study aids found</h3>
          <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>Generate content first in the Upload Materials tab.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Side List Panel */}
          <div style={{ backgroundColor: '#202C33', borderRadius: '14px', border: '1px solid #2A3942', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
            <span style={{ fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '700', paddingLeft: '4px' }}>Study Materials</span>
            {filteredList.map(item => {
              const isSelected = selectedContent?._id === item._id;
              return (
                <button
                  key={item._id}
                  onClick={() => handleContentChange(item)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
                    backgroundColor: isSelected ? '#111B21' : 'transparent',
                    color: isSelected ? '#E9EDEF' : '#8696A0', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: isSelected ? '3px solid #00A884' : '3px solid transparent'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? '#00A884' : '#E9EDEF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', width: '100%' }}>
                    {item.title}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8696A0', width: '100%' }}>
                    <span>v{item.version} • {item.generation_mode}</span>
                    <span>{favorites.some(f => f.content_id === item._id) && <Star size={10} fill="#F4B400" color="#F4B400" />}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Core Content Viewer Panel */}
          {selectedContent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Content Header Card */}
              <div style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '16px', border: '1px solid #2A3942', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{selectedContent.title}</h2>
                    <span style={{ fontSize: '11px', color: '#8696A0', backgroundColor: '#111B21', padding: '2px 8px', borderRadius: '12px' }}>
                      Version {selectedContent.version}
                    </span>
                  </div>
                  <span style={{ color: '#8696A0', fontSize: '12px' }}>
                    Generated via <strong>{selectedContent.generation_mode}</strong> template
                  </span>
                </div>
                
                {/* Actions row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Bookmark Button */}
                  <button 
                    onClick={() => handleFavoriteToggle(selectedContent)}
                    style={{ background: 'none', border: '1px solid #2A3942', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: isFav ? '#F4B400' : '#8696A0' }}
                  >
                    <Star size={14} fill={isFav ? '#F4B400' : 'none'} />
                  </button>
                  
                  {/* Rating / Feedback Button */}
                  <button 
                    onClick={openFeedbackModal}
                    style={{ background: 'none', border: '1px solid #2A3942', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: selectedContent.rating ? '#00A884' : '#8696A0', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    {selectedContent.rating ? `★ ${selectedContent.rating}` : 'Rate'}
                  </button>

                  {/* Version History Button */}
                  <button 
                    onClick={loadVersionHistory}
                    style={{ background: 'none', border: '1px solid #2A3942', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#8696A0', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <RotateCw size={12} /> History
                  </button>

                  {/* Export Options */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button 
                      onClick={() => exportContent('markdown')}
                      style={{ background: 'none', border: '1px solid #2A3942', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#8696A0', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                    >
                      <Download size={12} /> Export
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteContent(selectedContent)}
                    style={{ background: 'none', border: '1px solid #2A3942', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#F28B82' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              <div style={{ minHeight: '380px' }}>
                
                {/* 1. Summaries Render */}
                {tab === 'summary' && selectedContent.data && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Short Summary Card */}
                    <div style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '20px', border: '1px solid #2A3942' }}>
                      <h3 style={{ fontSize: '14px', color: '#00A884', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Summary
                      </h3>
                      <p style={{ fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
                        {selectedContent.data.short_summary}
                      </p>
                    </div>

                    {/* Detailed Summary Expandable Drawer */}
                    <div style={{ backgroundColor: '#202C33', borderRadius: '14px', border: '1px solid #2A3942', overflow: 'hidden' }}>
                      <button
                        onClick={() => setShowDetailedSummary(!showDetailedSummary)}
                        style={{
                          width: '100%', padding: '16px 20px', border: 'none', backgroundColor: 'transparent',
                          color: '#E9EDEF', fontWeight: '700', fontSize: '14px', display: 'flex',
                          justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                        }}
                      >
                        Detailed Outline
                        <span style={{ fontSize: '12px', color: '#8696A0' }}>{showDetailedSummary ? 'Hide' : 'Expand'}</span>
                      </button>
                      <AnimatePresence>
                        {showDetailedSummary && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            style={{ overflow: 'hidden', borderTop: '1px solid #2A3942' }}
                          >
                            <div style={{ padding: '20px', fontSize: '14px', lineHeight: '1.6', color: '#E9EDEF' }}>
                              {selectedContent.data.detailed_summary}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Key Concepts Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h3 style={{ fontSize: '13px', color: '#8696A0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '4px' }}>
                        Key Concepts
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        {selectedContent.data.key_concepts?.map((c, idx) => (
                          <div key={idx} style={{ backgroundColor: '#202C33', borderRadius: '12px', padding: '16px', border: '1px solid #2A3942' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#00A884', margin: 0 }}>{c.concept}</h4>
                              <button 
                                onClick={() => handleShowSource(c.source_chunk_id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
                                  color: '#8696A0', border: 'none', background: 'none', cursor: 'pointer'
                                }}
                              >
                                <Eye size={12} /> Show Source
                              </button>
                            </div>
                            <p style={{ fontSize: '13.5px', color: '#E9EDEF', lineHeight: '1.4', margin: 0 }}>{c.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. Revision Notes Render */}
                {tab === 'revision_notes' && selectedContent.data && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Exam takeaways */}
                    <div style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '20px', border: '1px solid #2A3942' }}>
                      <h3 style={{ fontSize: '14px', color: '#00A884', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Core Exam Takeaways
                      </h3>
                      <div 
                        style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#E9EDEF', whiteSpace: 'pre-line' }}
                        dangerouslySetInnerHTML={{ __html: selectedContent.data.exam_notes?.replace(/- /g, '• ') }}
                      />
                    </div>

                    {/* Quick bullet summaries */}
                    <div style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '20px', border: '1px solid #2A3942' }}>
                      <h3 style={{ fontSize: '14px', color: '#8696A0', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Quick Study Snippets
                      </h3>
                      <div 
                        style={{ fontSize: '14px', lineHeight: '1.5', color: '#8696A0', whiteSpace: 'pre-line' }}
                        dangerouslySetInnerHTML={{ __html: selectedContent.data.quick_notes?.replace(/- /g, '• ') }}
                      />
                    </div>

                    {/* Important topics list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h3 style={{ fontSize: '13px', color: '#8696A0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '4px' }}>
                        Crucial Syllabus Topics
                      </h3>
                      {selectedContent.data.important_topics?.map((topic, idx) => (
                        <div key={idx} style={{ backgroundColor: '#202C33', borderRadius: '12px', padding: '16px', border: '1px solid #2A3942' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#00A884', margin: 0 }}>{topic.topic}</h4>
                            <button 
                              onClick={() => handleShowSource(topic.source_chunk_id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
                                color: '#8696A0', border: 'none', background: 'none', cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} /> Show Source
                            </button>
                          </div>
                          <p style={{ fontSize: '13.5px', color: '#E9EDEF', lineHeight: '1.4', margin: 0 }}>{topic.notes}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 3. Flashcards Render */}
                {tab === 'flashcards' && selectedContent.data.cards && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    
                    {/* Interactive Flip Card */}
                    {selectedContent.data.cards.length > 0 ? (
                      <>
                        <div 
                          onClick={() => setIsFlipped(!isFlipped)}
                          style={{
                            perspective: '1000px',
                            width: '100%',
                            maxWidth: '480px',
                            height: '240px',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          <motion.div
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                              width: '100%',
                              height: '100%',
                              transformStyle: 'preserve-3d',
                              position: 'relative'
                            }}
                          >
                            {/* Card Front (Question) */}
                            <div style={{
                              position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                              backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                              padding: '24px', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                            }}>
                              <span style={{ fontSize: '11px', color: '#00A884', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                                Question
                              </span>
                              <p style={{ fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: 0, color: '#E9EDEF' }}>
                                {selectedContent.data.cards[cardIndex]?.question}
                              </p>
                              <span style={{ fontSize: '11px', color: '#8696A0', marginTop: '24px' }}>Tap to view answer</span>
                            </div>

                            {/* Card Back (Answer) */}
                            <div style={{
                              position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                              backgroundColor: '#005C4B', borderRadius: '16px', border: '1px solid #00A884',
                              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                              padding: '24px', boxSizing: 'border-box', textAlign: 'center', transform: 'rotateY(180deg)',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                            }}>
                              <span style={{ fontSize: '11px', color: '#25D366', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                                Answer
                              </span>
                              <p style={{ fontSize: '16px', fontWeight: '500', lineHeight: '1.4', margin: 0, color: '#E9EDEF' }}>
                                {selectedContent.data.cards[cardIndex]?.answer}
                              </p>
                              <span style={{ fontSize: '11px', color: '#8696A0', marginTop: '24px' }}>Tap to flip back</span>
                            </div>
                          </motion.div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <button
                            disabled={cardIndex === 0}
                            onClick={() => { setCardIndex(cardIndex - 1); setIsFlipped(false); }}
                            style={{
                              background: '#202C33', border: '1px solid #2A3942', borderRadius: '50%',
                              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: cardIndex === 0 ? 'not-allowed' : 'pointer', color: cardIndex === 0 ? '#30363d' : '#E9EDEF'
                            }}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          
                          <span style={{ fontSize: '13px', color: '#8696A0' }}>
                            {cardIndex + 1} / {selectedContent.data.cards.length}
                          </span>

                          <button
                            disabled={cardIndex === selectedContent.data.cards.length - 1}
                            onClick={() => { setCardIndex(cardIndex + 1); setIsFlipped(false); }}
                            style={{
                              background: '#202C33', border: '1px solid #2A3942', borderRadius: '50%',
                              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: cardIndex === selectedContent.data.cards.length - 1 ? 'not-allowed' : 'pointer',
                              color: cardIndex === selectedContent.data.cards.length - 1 ? '#30363d' : '#E9EDEF'
                            }}
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>

                        {/* Show Source Citation next to card */}
                        <button
                          onClick={() => handleShowSource(selectedContent.data.cards[cardIndex]?.source_chunk_id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px',
                            color: '#00A884', border: 'none', background: 'none', cursor: 'pointer', marginTop: '4px'
                          }}
                        >
                          <Eye size={12} /> View originating source text
                        </button>
                      </>
                    ) : (
                      <div style={{ color: '#8696A0' }}>No cards available.</div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source Citation Modal */}
      <AnimatePresence>
        {sourceChunk && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '16px'
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                padding: '24px', maxWidth: '500px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#00A884', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ExternalLink size={16} /> Originating Citation Source
                </h3>
                <button 
                  onClick={() => setSourceChunk(null)}
                  style={{ background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Assessment Readiness Info inside Modal */}
              <div style={{ marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px' }}>
                <span style={{ backgroundColor: '#111B21', color: '#8696A0', padding: '3px 8px', borderRadius: '10px' }}>
                  Difficulty: {sourceChunk.difficulty_score}
                </span>
                {sourceChunk.concept_tags?.map((tag, idx) => (
                  <span key={idx} style={{ backgroundColor: 'rgba(0,168,132,0.1)', color: '#00A884', padding: '3px 8px', borderRadius: '10px' }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{
                maxHeight: '200px', overflowY: 'auto', backgroundColor: '#0B141A', padding: '16px',
                borderRadius: '10px', fontSize: '13.5px', lineHeight: '1.5', color: '#E9EDEF', border: '1px solid #2A3942',
                marginBottom: '16px'
              }}>
                "{sourceChunk.chunk_text}"
              </div>

              {sourceChunk.learning_objectives && (
                <div>
                  <h4 style={{ fontSize: '12px', color: '#8696A0', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>
                    Learning Objectives Met
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#8696A0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sourceChunk.learning_objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ratings Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '16px'
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: '#202C33', borderRadius: '16px', border: '1px solid #2A3942',
                padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Rate study aid</h3>
                <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: star <= rating ? '#F4B400' : '#8696A0' }}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Submit your comments to improve future AI prompt generation models..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                style={{
                  width: '100%', height: '80px', padding: '10px', backgroundColor: '#0B141A', border: '1px solid #2A3942',
                  borderRadius: '8px', color: '#E9EDEF', fontSize: '13px', outline: 'none', resize: 'none',
                  boxSizing: 'border-box', marginBottom: '16px'
                }}
              />

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={submitFeedback}
                style={{
                  width: '100%', padding: '10px', borderRadius: '20px', border: 'none',
                  backgroundColor: '#00A884', color: '#111B21', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer'
                }}
              >
                Submit Feedback
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version History Drawer Panel */}
      <AnimatePresence>
        {showVersionHistory && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end',
            zIndex: 100
          }}>
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                width: '320px', height: '100%', backgroundColor: '#202C33', borderLeft: '1px solid #2A3942',
                padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Version History</h3>
                <button onClick={() => setShowVersionHistory(false)} style={{ background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {loadingHistory ? (
                <div style={{ color: '#8696A0', textAlign: 'center', padding: '20px' }}>Loading history...</div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {versionHistory.map(item => {
                    const isActive = item._id === selectedContent._id;
                    return (
                      <div 
                        key={item._id} 
                        style={{ 
                          backgroundColor: '#111B21', padding: '12px', borderRadius: '8px', 
                          border: `1px solid ${isActive ? '#00A884' : '#2A3942'}` 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: isActive ? '#00A884' : '#E9EDEF' }}>
                            Version {item.version} {isActive && '(Active)'}
                          </span>
                          {!isActive && (
                            <button
                              onClick={() => restoreVersion(item._id)}
                              style={{
                                border: 'none', background: 'none', color: '#00A884', fontSize: '11px',
                                fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                              }}
                            >
                              <CornerUpLeft size={10} /> Restore
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8696A0' }}>
                          Mode: {item.generation_mode}<br />
                          Created: {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
