import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, CheckCircle } from 'lucide-react';
import { achievementApi } from '../services/api';

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [unlocked, setUnlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      achievementApi.getAll(),
      achievementApi.getMine()
    ]).then(([allRes, mineRes]) => {
      setAchievements(allRes.data || []);
      setUnlocked(mineRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696A0' }}>Loading achievements...</div>;
  }

  const isUnlocked = (id) => unlocked.some(u => u.achievement_id === id);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#E9EDEF', fontSize: '24px', fontWeight: '700', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={24} color="#F4B400" /> Achievements
        </h1>
        <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
          You have unlocked {unlocked.length} of {achievements.length} achievements
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {achievements.map((ach, i) => {
          const hasIt = isUnlocked(ach.id);
          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                backgroundColor: '#202C33', borderRadius: '14px', padding: '20px',
                border: `1px solid ${hasIt ? '#F4B400' : '#2A3942'}`,
                position: 'relative', overflow: 'hidden',
                opacity: hasIt ? 1 : 0.6,
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px', filter: hasIt ? 'none' : 'grayscale(100%)' }}>
                {ach.icon}
              </div>
              <h3 style={{ color: '#E9EDEF', fontSize: '16px', fontWeight: '700', margin: '0 0 8px' }}>{ach.title}</h3>
              <p style={{ color: '#8696A0', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.4' }}>{ach.description}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#00A884', fontSize: '12px', fontWeight: '700' }}>+{ach.xp_reward} XP</span>
                {hasIt ? (
                  <CheckCircle size={16} color="#25D366" />
                ) : (
                  <Lock size={16} color="#8696A0" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
