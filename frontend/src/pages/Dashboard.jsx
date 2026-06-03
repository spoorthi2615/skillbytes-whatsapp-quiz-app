import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, Play, BookOpen, Flame, Bell, 
  TrendingUp, CheckCircle, RefreshCw, BarChart2, ChevronRight 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { 
  quizApi, challengeApi, recommendationApi, notificationApi, authApi 
} from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  
  const [exams, setExams] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      // 1. Sync auth user state
      const meRes = await authApi.me();
      if (meRes.success && meRes.data) {
        updateUser(meRes.data);
      }

      // 2. Fetch exams list
      const examsRes = await quizApi.fetchExams();
      setExams(examsRes.data || []);

      // 3. Fetch daily challenge
      try {
        const challengeRes = await challengeApi.getToday();
        setChallenge(challengeRes.data);
      } catch (err) {
        console.error("Failed to load daily challenge", err);
      }

      // 4. Fetch recommendations
      try {
        const recsRes = await recommendationApi.getRecommendations();
        setRecommendations(recsRes.data || []);
      } catch (err) {
        console.error("Failed to load recommendations", err);
      }

      // 5. Fetch notifications
      try {
        const notifRes = await notificationApi.getFeed();
        setNotifications(notifRes.data || []);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }

      // 6. Fetch stats
      try {
        const statsRes = await quizApi.fetchAnalytics(meRes.data?.id || user?.id);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to load analytics stats", err);
      }

      if (showToast) toast.success("Dashboard data refreshed!");
    } catch (err) {
      console.error("Error loading dashboard data", err);
      if (showToast) toast.error("Refresh failed. Please check backend connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, updateUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate XP Level progress
  const getXpProgress = (xp = 0) => {
    const thresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    const currentThreshold = thresholds[level - 1];
    const nextThreshold = thresholds[level] || (currentThreshold + 2000);
    const xpInCurrentLevel = xp - currentThreshold;
    const xpNeededForNext = nextThreshold - currentThreshold;
    const pct = Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);
    return { level, nextThreshold, xpInCurrentLevel, xpNeededForNext, pct };
  };

  const { level, nextThreshold, xpInCurrentLevel, xpNeededForNext, pct } = getXpProgress(user?.xp || 0);

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All marked read");
    } catch (err) {
      console.error("Could not update notifications", err);
      toast.error("Could not update notifications");
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '80vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#8696A0', gap: '16px'
      }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: '#00A884' }} />
        <span>Syncing learning profile...</span>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', margin: '0 auto', padding: '24px 16px',
      backgroundColor: '#0B141A', minHeight: '100vh', color: '#E9EDEF'
    }}>
      
      {/* ── HEADER SECTION ────────────────────────────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', borderBottom: '1px solid #2A3942', paddingBottom: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', color: '#E9EDEF' }}>
            Welcome back, {user?.name || 'Learner'} 👋
          </h1>
          <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>
            @{user?.username || 'user'} · {user?.college || 'College Student'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            style={{
              backgroundColor: '#202C33', border: '1px solid #2A3942', borderRadius: '10px',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#8696A0'
            }}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </motion.button>

          {/* Streak indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'rgba(255, 110, 0, 0.12)', border: '1px solid rgba(255, 110, 0, 0.3)',
            padding: '8px 16px', borderRadius: '12px', color: '#FF6E00', fontWeight: '700', fontSize: '14px'
          }}>
            <Flame size={18} color="#FF6E00" fill="#FF6E00" />
            <span>{user?.streak || 0} Day Streak</span>
          </div>
        </div>
      </div>

      {/* ── TOP STATS GRID ───────────────────────────────────────── */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '16px', marginBottom: '24px' 
      }}>
        {/* Level and XP progress */}
        <div style={{
          backgroundColor: '#202C33', borderRadius: '16px', padding: '20px', border: '1px solid #2A3942'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#00A884" fill="#00A884" />
              <span style={{ fontWeight: '700', fontSize: '16px' }}>Level {level}</span>
            </div>
            <span style={{ color: '#8696A0', fontSize: '12px', fontWeight: '600' }}>
              {user?.xp || 0} / {nextThreshold} XP
            </span>
          </div>
          
          {/* Progress bar */}
          <div style={{ height: '8px', backgroundColor: '#0B141A', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', backgroundColor: '#00A884', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8696A0' }}>
            <span>{xpInCurrentLevel} XP in current level</span>
            <span>{xpNeededForNext - xpInCurrentLevel} XP needed for Level {level + 1}</span>
          </div>
        </div>

        {/* Challenge Summary */}
        {challenge && (
          <div style={{
            background: 'linear-gradient(135deg, #1C2D2F, #202C33)', borderRadius: '16px', 
            padding: '20px', border: '1px solid rgba(0, 168, 132, 0.3)', display: 'flex', 
            flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#00A884', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Daily Challenge
                </span>
                <div style={{ 
                  backgroundColor: 'rgba(0,168,132,0.15)', padding: '2px 8px', borderRadius: '12px', 
                  color: '#00A884', fontSize: '11px', fontWeight: '600' 
                }}>
                  +{challenge.xp_reward} XP
                </div>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700' }}>{challenge.title}</h3>
              <p style={{ margin: 0, color: '#8696A0', fontSize: '13px' }}>{challenge.description}</p>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {challenge.is_completed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00A884', fontSize: '13px', fontWeight: '700' }}>
                  <CheckCircle size={16} /> Challenge Completed!
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/exams')}
                  style={{
                    backgroundColor: '#00A884', color: '#0B141A', border: 'none', borderRadius: '8px',
                    padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Play size={12} fill="#0B141A" /> Start Challenge
                </motion.button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT SPLIT ───────────────────────────────────── */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', 
        gap: '24px', alignItems: 'start' 
      }}>
        
        {/* LEFT COLUMN: EXAMS & RECOMMENDATIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Recommendations list */}
          {recommendations.length > 0 && (
            <div style={{
              backgroundColor: '#202C33', borderRadius: '16px', padding: '20px', border: '1px solid #2A3942'
            }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>
                <TrendingUp size={18} color="#00A884" /> Recommended for You
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommendations.map((rec) => (
                  <div 
                    key={rec.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: '#0B141A', borderRadius: '12px', padding: '12px 16px',
                      border: '1px solid #2A3942'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600' }}>{rec.title}</h4>
                      <p style={{ margin: 0, color: '#8696A0', fontSize: '12px' }}>{rec.description}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(rec.action_url || '/exams')}
                      style={{
                        backgroundColor: '#2A3942', color: '#E9EDEF', border: 'none', borderRadius: '8px',
                        padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '2px'
                      }}
                    >
                      Go <ChevronRight size={14} />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Exams section */}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>
              <BookOpen size={18} color="#00A884" /> Quizzes & Subjects
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {exams.map(exam => (
                <motion.div 
                  key={exam._id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/exams?id=${exam._id}`)}
                  style={{
                    backgroundColor: '#202C33',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #2A3942',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700' }}>{exam.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#8696A0' }}>{exam.description}</p>
                  </div>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0B141A',
                    display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#00A884',
                    justifyContent: 'center', border: '1px solid #2A3942'
                  }}>
                    <ChevronRight size={18} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STATS & NOTIFICATIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats Box */}
          <div style={{
            backgroundColor: '#202C33', borderRadius: '16px', padding: '20px', border: '1px solid #2A3942'
          }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>
              <BarChart2 size={18} color="#00A884" /> Stats Summary
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: '#0B141A', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #2A3942' }}>
                <span style={{ color: '#8696A0', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Quizzes Done</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#E9EDEF' }}>{stats?.total_attempts || 0}</span>
              </div>
              <div style={{ backgroundColor: '#0B141A', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #2A3942' }}>
                <span style={{ color: '#8696A0', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Accuracy Avg</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#00A884' }}>{stats?.accuracy ? `${stats.accuracy.toFixed(1)}%` : '0%'}</span>
              </div>
              <div style={{ backgroundColor: '#0B141A', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #2A3942', gridColumn: 'span 2' }}>
                <span style={{ color: '#8696A0', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Questions Answered</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#E9EDEF' }}>{stats?.questions_answered || 0}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/analytics')}
              style={{
                marginTop: '16px', width: '100%', padding: '10px', borderRadius: '10px',
                backgroundColor: 'transparent', color: '#00A884', border: '1px solid #00A884',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer'
              }}
            >
              Detailed Analytics
            </motion.button>
          </div>

          {/* Notifications feed preview */}
          <div style={{
            backgroundColor: '#202C33', borderRadius: '16px', padding: '20px', border: '1px solid #2A3942'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                <Bell size={18} color="#00A884" /> Notifications
              </h2>
              {notifications.some(n => !n.is_read) && (
                <button 
                  onClick={handleMarkAllNotificationsRead}
                  style={{ background: 'none', border: 'none', color: '#00A884', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p style={{ color: '#8696A0', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>No notifications yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.slice(0, 3).map((notif) => (
                  <div 
                    key={notif._id}
                    style={{
                      padding: '10px 12px', borderRadius: '10px',
                      backgroundColor: notif.is_read ? 'transparent' : 'rgba(0, 168, 132, 0.06)',
                      borderLeft: notif.is_read ? '2px solid transparent' : '2px solid #00A884',
                      borderBottom: '1px solid #2A3942'
                    }}
                  >
                    <div style={{ display: 'flex', justifyItems: 'center', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{notif.title}</span>
                      {!notif.is_read && <span style={{ width: '6px', height: '6px', backgroundColor: '#00A884', borderRadius: '50%' }} />}
                    </div>
                    <p style={{ margin: '4px 0 0', color: '#8696A0', fontSize: '12px' }}>{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
