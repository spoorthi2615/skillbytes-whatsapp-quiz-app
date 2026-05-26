import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await quizApi.fetchAnalytics();
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div style={{ padding: '20px', color: '#E9EDEF' }}>Loading Analytics...</div>;
  if (!metrics) return <div style={{ padding: '20px', color: '#F28B82' }}>Failed to load data</div>;

  const chartData = [
    { name: 'DAU', users: metrics.daily_active_users },
    { name: 'WAU', users: metrics.weekly_active_users }
  ];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ paddingBottom: '20px', borderBottom: '1px solid #202C33', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Analytics</h1>
        <button onClick={() => navigate('/')} style={{ background: 'none', color: '#00A884' }}>Home</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px' }}>
          <div style={{ color: '#8696A0', fontSize: '13px' }}>Completion Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00A884' }}>
            {Math.round(metrics.quiz_completion_rate)}%
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
      </div>

      <div style={{ backgroundColor: '#202C33', padding: '20px', borderRadius: '12px', flex: 1, minHeight: '300px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#8696A0' }}>Active Users</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#8696A0" />
            <YAxis stroke="#8696A0" allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: '#0B141A', border: 'none', borderRadius: '8px' }} />
            <Bar dataKey="users" fill="#00A884" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
