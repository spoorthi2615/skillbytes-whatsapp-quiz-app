import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid } from 'recharts';
import { useQuizStore } from '../store/quizStore';

const SkeletonCard = () => (
  <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px', height: '100px', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
);

export default function Analytics() {
  const navigate = useNavigate();
  const { userId } = useQuizStore();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('personal'); // 'personal' or 'global'

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await quizApi.fetchAnalytics(view === 'personal' ? userId : null);
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [view, userId]);

  if (loading) return <div style={{ padding: '20px', color: '#E9EDEF' }}>Loading Analytics...</div>;
  if (!metrics) return <div style={{ padding: '20px', color: '#F28B82' }}>Failed to load data</div>;

  const activeUsersData = [
    { name: 'DAU', users: metrics.daily_active_users },
    { name: 'WAU', users: metrics.weekly_active_users }
  ];

  const pieData = [
    { name: 'Correct', value: Math.round(metrics.accuracy) },
    { name: 'Wrong', value: Math.round(100 - metrics.accuracy) }
  ];
  const COLORS = ['#25D366', '#F28B82'];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ paddingBottom: '20px', borderBottom: '1px solid #202C33', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Analytics Dashboard</h1>
        <button onClick={() => navigate('/')} style={{ background: 'none', color: '#00A884', fontWeight: 'bold' }}>Return Home</button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setView('personal')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: view === 'personal' ? '#00A884' : '#202C33',
            color: view === 'personal' ? '#111B21' : '#E9EDEF',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
        >
          Your Stats
        </button>
        <button
          onClick={() => setView('global')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: view === 'global' ? '#00A884' : '#202C33',
            color: view === 'global' ? '#111B21' : '#E9EDEF',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
        >
          Global Stats
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : metrics.questions_answered === 0 && view === 'personal' ? (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#8696A0' }}>
          <p>You haven't taken any quizzes yet.</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#00A884', color: '#111B21', fontWeight: 'bold' }}>Start a Quiz</button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#8696A0', fontSize: '13px' }}>{view === 'personal' ? 'Total Attempts' : 'Completion Rate'}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00A884' }}>
                {view === 'personal' ? metrics.total_attempts : `${Math.round(metrics.quiz_completion_rate)}%`}
              </div>
            </div>
            <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#8696A0', fontSize: '13px' }}>Avg Time / Q</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#25D366' }}>
                {Math.round(metrics.average_response_time_ms / 1000)}s
              </div>
            </div>
            <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#8696A0', fontSize: '13px' }}>Questions Served</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E9EDEF' }}>
                {metrics.questions_served}
              </div>
            </div>
            <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#8696A0', fontSize: '13px' }}>Questions Answered</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#E9EDEF' }}>
                {metrics.questions_answered}
              </div>
            </div>
            <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px' }}>
              <div style={{ color: '#8696A0', fontSize: '13px' }}>Avg Questions/Session</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00A884' }}>
                {metrics.avg_questions_per_session?.toFixed(1) || "0.0"}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {view === 'global' && metrics.drop_off_data && metrics.drop_off_data.length > 0 && (
              <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px', minHeight: '250px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#8696A0' }}>Quiz Abandonment (Drop-off)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.drop_off_data}>
                    <defs>
                      <linearGradient id="colorDrop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F28B82" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F28B82" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#202C33" vertical={false} />
                    <XAxis dataKey="question_index" stroke="#8696A0" tick={{fontSize: 12}} />
                    <YAxis stroke="#8696A0" allowDecimals={false} tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B141A', border: 'none', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="dropoffs" stroke="#F28B82" fillOpacity={1} fill="url(#colorDrop)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {view === 'global' && metrics.peak_hours_data && metrics.peak_hours_data.length > 0 && (
              <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px', minHeight: '250px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#8696A0' }}>Peak Activity Hours</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metrics.peak_hours_data}>
                    <XAxis dataKey="hour" stroke="#8696A0" tick={{fontSize: 12}} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis stroke="#8696A0" allowDecimals={false} tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B141A', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="activity" fill="#00A884" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px', minHeight: '250px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#8696A0' }}>Accuracy Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0B141A', border: 'none', borderRadius: '8px', color: '#E9EDEF' }} itemStyle={{ color: '#E9EDEF' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {view === 'global' && (
              <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px', minHeight: '250px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#8696A0' }}>Active Users</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={activeUsersData}>
                    <XAxis dataKey="name" stroke="#8696A0" />
                    <YAxis stroke="#8696A0" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B141A', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="users" fill="#00A884" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
