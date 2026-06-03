import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Target, Brain } from 'lucide-react';
import { historyApi } from '../services/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyApi.getHistory().then(res => {
      setHistory(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696A0' }}>Loading history...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#E9EDEF', fontSize: '24px', fontWeight: '700', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HistoryIcon size={24} color="#F28B82" /> Activity History
        </h1>
        <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
          Your recent learning activities and progress
        </p>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696A0', backgroundColor: '#202C33', borderRadius: '16px' }}>
          <Brain size={48} color="#2A3942" style={{ marginBottom: '16px' }} />
          <p>No activity recorded yet. Take a quiz to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                backgroundColor: '#202C33', borderRadius: '12px', padding: '16px',
                border: '1px solid #2A3942', display: 'flex', alignItems: 'center', gap: '16px'
              }}
            >
              <div style={{ backgroundColor: 'rgba(242,139,130,0.1)', padding: '10px', borderRadius: '10px' }}>
                <Target size={20} color="#F28B82" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: '600', margin: '0 0 4px' }}>{item.action}</h3>
                <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>{new Date(item.completed_at).toLocaleString()}</p>
              </div>
              {item.details?.score && (
                <div style={{ color: '#00A884', fontWeight: '700', fontSize: '16px' }}>
                  {item.details.score}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
