import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Trash2, Clock, 
  Sparkles, List, HelpCircle, RefreshCw, X
} from 'lucide-react';
import { assetsApi, jobsApi } from '../services/api';
import toast from 'react-hot-toast';

export default function UploadMaterial() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // Job trigger state
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [jobType, setJobType] = useState('summary'); // summary, revision_notes, flashcards
  const [genMode, setGenMode] = useState('Quick Study'); // Quick Study, Exam Revision, Interview Preparation
  
  // Active jobs tracking state
  const [activeJobs, setActiveJobs] = useState({}); // job_id -> { progress, current_step, status, title }

  const loadAssets = useCallback(async () => {
    try {
      const res = await assetsApi.list();
      setAssets(res.data || []);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll status of active jobs
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
              loadAssets(); // Refresh assets to see updated metadata if any
            } else if (job.status === 'failed') {
              toast.error(`Generation failed for '${next[id].title}'.`);
            }
            return next;
          });
        } catch (err) {
          console.error(`Error polling status for job ${id}:`, err);
        }
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [activeJobs, loadAssets]);

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      await Promise.resolve();
      if (active) {
        loadAssets();
      }
    };
    fetch();
    return () => { active = false; };
  }, [loadAssets]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    // 1. Quota check
    if (assets.length >= 100) {
      toast.error('Upload quota exceeded (max 100 files).');
      return;
    }
    
    // 2. Validate file size (25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size exceeds the 25 MB limit.');
      return;
    }

    // 3. Validate extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.pptx', '.docx', '.txt'];
    if (!allowed.includes(ext)) {
      toast.error('Unsupported file format. Please upload PDF, PPTX, DOCX, or TXT.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setProgress(0);
    
    try {
      const res = await assetsApi.upload(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percent);
      });
      if (res.success) {
        toast.success('Material uploaded successfully!');
        loadAssets();
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload file.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this study material?')) return;
    try {
      const res = await assetsApi.delete(id);
      if (res.success) {
        toast.success('Material deleted.');
        setAssets(prev => prev.filter(a => a._id !== id));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete material.');
    }
  };

  const openJobModal = (asset) => {
    setSelectedAsset(asset);
    setShowJobModal(true);
  };

  const triggerJob = async () => {
    if (!selectedAsset) return;
    try {
      const res = await jobsApi.trigger({
        asset_id: selectedAsset._id,
        job_type: jobType,
        generation_mode: genMode
      });
      
      if (res.success) {
        const job = res.data;
        setActiveJobs(prev => ({
          ...prev,
          [job.job_id]: {
            status: 'pending',
            progress: 0,
            current_step: 'upload',
            title: selectedAsset.title
          }
        }));
        toast.success('AI generation queued!');
        setShowJobModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start AI generation.');
    }
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px', color: '#E9EDEF' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px', color: '#E9EDEF' }}>Upload Study Material</h1>
        <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
          Upload PDFs, Slides, Word documents or text notes to automatically generate interactive summaries, revision notes, and flashcards.
        </p>
      </div>

      {/* Upload Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#00A884' : '#2A3942'}`,
          backgroundColor: dragActive ? 'rgba(0, 168, 132, 0.05)' : '#202C33',
          borderRadius: '16px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          marginBottom: '24px'
        }}
      >
        <input 
          type="file" 
          id="file-upload" 
          disabled={uploading}
          accept=".pdf,.docx,.pptx,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        {uploading ? (
          <div style={{ padding: '10px 0' }}>
            <RefreshCw className="animate-spin" size={32} color="#00A884" style={{ margin: '0 auto 16px', animation: 'spin 2s linear infinite' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Uploading file...</h3>
            <div style={{ width: '240px', height: '6px', backgroundColor: '#2A3942', borderRadius: '3px', margin: '0 auto', overflow: 'hidden' }}>
              <motion.div 
                animate={{ width: `${progress}%` }} 
                transition={{ duration: 0.1 }}
                style={{ height: '100%', backgroundColor: '#00A884' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#8696A0', marginTop: '6px', display: 'block' }}>{progress}% uploaded</span>
          </div>
        ) : (
          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <Upload size={36} color="#8696A0" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#E9EDEF' }}>
              Drag and drop your file here, or <span style={{ color: '#00A884' }}>browse</span>
            </h3>
            <p style={{ color: '#8696A0', fontSize: '12px', margin: 0 }}>
              Supports PDF, DOCX, PPTX, TXT (Max 25MB) • Upload quota: {assets.length}/100 files
            </p>
          </label>
        )}
      </div>

      {/* Active Jobs Section */}
      {Object.keys(activeJobs).length > 0 && (
        <div style={{ marginBottom: '24px', backgroundColor: '#202C33', borderRadius: '12px', padding: '16px', border: '1px solid #2A3942' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="#00A884" /> Active AI Generations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(activeJobs).map(([jobId, job]) => (
              <div key={jobId} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#111B21', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{job.title}</span>
                  <span style={{ fontSize: '11px', color: job.status === 'failed' ? '#F28B82' : job.status === 'completed' ? '#81C995' : '#00A884', fontWeight: 'bold' }}>
                    {job.status === 'processing' ? `${job.current_step}...` : job.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', backgroundColor: '#2A3942', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${job.progress}%`, 
                      backgroundColor: job.status === 'failed' ? '#F28B82' : '#00A884',
                      transition: 'width 0.3s ease-out' 
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#8696A0' }}>{job.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials List */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '14px' }}>My Uploads</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8696A0' }}>Loading material dashboard...</div>
        ) : assets.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            backgroundColor: '#202C33', 
            borderRadius: '16px', 
            border: '1px solid #2A3942' 
          }}>
            <FileText size={40} color="#8696A0" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No study materials uploaded</h3>
            <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>Upload note slides or docs to start generating customized summaries and interactive cards.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assets.map((asset) => (
              <motion.div 
                key={asset._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  backgroundColor: '#202C33', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  border: '1px solid #2A3942',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 6px', color: '#E9EDEF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {asset.title || asset.file_name}
                  </h3>
                  
                  {/* Metadata Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#8696A0' }}>
                    <span>{formatBytes(asset.file_size)}</span>
                    {asset.page_count !== undefined && (
                      <>
                        <span>•</span>
                        <span>{asset.page_count} {asset.page_count === 1 ? 'page' : 'pages'}</span>
                      </>
                    )}
                    {asset.word_count !== undefined && (
                      <>
                        <span>•</span>
                        <span>{asset.word_count} words</span>
                      </>
                    )}
                    {asset.estimated_read_time !== undefined && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> {asset.estimated_read_time} min read
                        </span>
                      </>
                    )}
                    {asset.detected_topic && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#00A884', fontWeight: '500' }}>{asset.detected_topic}</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Generate Button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openJobModal(asset)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,168,132,0.15)',
                      border: '1px solid rgba(0,168,132,0.3)',
                      color: '#00A884',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={13} /> Study Aids
                  </motion.button>
                  
                  {/* Delete Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(asset._id)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #30363d',
                      color: '#F28B82',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Generation Settings Modal */}
      <AnimatePresence>
        {showJobModal && selectedAsset && (
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
                padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}
            >
              {/* Modal Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#00A884" /> Generate Study Aid
                </h3>
                <button 
                  onClick={() => setShowJobModal(false)}
                  style={{ background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
              
              <div style={{ fontSize: '13px', color: '#8696A0', marginBottom: '16px' }}>
                Select the output study aid format and target template options for: <strong>{selectedAsset.title}</strong>
              </div>

              {/* Job Type Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                  AI Output Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { type: 'summary', icon: <FileText size={14} />, label: 'Summary' },
                    { type: 'revision_notes', icon: <List size={14} />, label: 'Revision Notes' },
                    { type: 'flashcards', icon: <HelpCircle size={14} />, label: 'Flashcards' }
                  ].map(item => (
                    <button
                      key={item.type}
                      onClick={() => setJobType(item.type)}
                      style={{
                        padding: '10px 8px', borderRadius: '8px', border: `1px solid ${jobType === item.type ? '#00A884' : '#2A3942'}`,
                        backgroundColor: jobType === item.type ? 'rgba(0,168,132,0.1)' : 'transparent',
                        color: jobType === item.type ? '#00A884' : '#E9EDEF', fontSize: '12px', fontWeight: '600',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#8696A0', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>
                  Generation Template Mode
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { mode: 'Quick Study', title: 'Quick Study', desc: 'Concise summary & essential cards' },
                    { mode: 'Exam Revision', title: 'Exam Revision', desc: 'Detailed notes & key concepts overview' },
                    { mode: 'Interview Preparation', title: 'Interview Preparation', desc: 'Concept reviews & Q&A flashcards' }
                  ].map(item => (
                    <button
                      key={item.mode}
                      onClick={() => setGenMode(item.mode)}
                      style={{
                        padding: '10px 12px', borderRadius: '8px', border: `1px solid ${genMode === item.mode ? '#00A884' : '#2A3942'}`,
                        backgroundColor: genMode === item.mode ? 'rgba(0,168,132,0.1)' : 'transparent',
                        textAlign: 'left', cursor: 'pointer', display: 'block', width: '100%'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '700', color: genMode === item.mode ? '#00A884' : '#E9EDEF', marginBottom: '2px' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#8696A0' }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Action */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={triggerJob}
                style={{
                  width: '100%', padding: '12px', borderRadius: '24px', border: 'none',
                  background: 'linear-gradient(135deg, #00A884, #25D366)',
                  color: '#0B141A', fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Trigger AI Generation
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
