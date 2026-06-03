import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, CheckCircle, Zap } from 'lucide-react';
import { trackApi } from '../services/api';

export default function Tracks() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackApi.getTracks().then(res => {
      setTracks(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696A0' }}>Loading tracks...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#E9EDEF', fontSize: '24px', fontWeight: '700', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={24} color="#00A884" /> Learning Tracks
        </h1>
        <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
          Follow guided paths to master new skills
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tracks.map((track, i) => (
          <motion.div
            key={track._id}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            style={{
              backgroundColor: '#202C33', borderRadius: '16px', padding: '24px',
              border: '1px solid #2A3942', cursor: 'pointer',
              display: 'flex', gap: '20px', alignItems: 'flex-start'
            }}
            whileHover={{ backgroundColor: '#2A3942', scale: 1.01 }}
          >
            <div style={{ fontSize: '40px', backgroundColor: '#0B141A', padding: '16px', borderRadius: '16px', border: '1px solid #2A3942' }}>
              {track.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: '#E9EDEF', fontSize: '18px', fontWeight: '700', margin: '0 0 8px' }}>{track.title}</h2>
              <p style={{ color: '#8696A0', fontSize: '14px', margin: '0 0 16px' }}>{track.description}</p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8696A0', fontSize: '12px', fontWeight: '600' }}>
                  <CheckCircle size={14} color="#00A884" /> {track.modules?.length || 0} Modules
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8696A0', fontSize: '12px', fontWeight: '600' }}>
                  <Zap size={14} color="#F4B400" /> {track.modules?.reduce((acc, m) => acc + (m.xp || 0), 0) || 0} XP
                </div>
              </div>
            </div>
            <ChevronRight size={24} color="#8696A0" style={{ alignSelf: 'center' }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
