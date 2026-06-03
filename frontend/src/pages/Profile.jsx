import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, GraduationCap, Building2, Calendar, Code2,
  Edit3, Save, X, Zap, Flame, Shield, AtSign, CheckCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { profileApi, preferencesApi } from '../services/api';
import toast from 'react-hot-toast';

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'C', 'Go', 'Rust', 'TypeScript'];
const YEARS = ['1', '2', '3', '4', 'Alumni'];

// XP thresholds per level
const XP_LEVELS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];

function getLevel(xp) {
  let level = 1;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) level = i + 1;
    else break;
  }
  const currentLevelXp = XP_LEVELS[level - 1] || 0;
  const nextLevelXp = XP_LEVELS[level] || XP_LEVELS[XP_LEVELS.length - 1];
  const progress = nextLevelXp > currentLevelXp
    ? ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 100;
  return { level, currentLevelXp, nextLevelXp, progress: Math.min(progress, 100) };
}

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({ notifications_enabled: true, theme: 'dark' });

  const loadProfile = useCallback(async () => {
    try {
      const res = await profileApi.getProfile();
      setProfile(res.data);
      setForm({
        name: res.data.name,
        college: res.data.college,
        branch: res.data.branch,
        year: res.data.year,
        preferred_language: res.data.preferred_language,
      });
    } catch (err) {
      console.warn('Failed to load profile via API, falling back to authStore:', err);
      // Fallback to authStore data
      if (user) {
        setProfile(user);
        setForm({
          name: user.name,
          college: user.college || '',
          branch: user.branch || '',
          year: user.year || '3',
          preferred_language: user.preferred_language || 'Python',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await preferencesApi.get();
      setPrefs(res.data);
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
    loadPrefs();
  }, [loadProfile, loadPrefs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(form);
      setProfile(res.data);
      updateUser(res.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePrefToggle = async (key, value) => {
    try {
      await preferencesApi.update({ [key]: value });
      setPrefs(p => ({ ...p, [key]: value }));
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  const xpInfo = getLevel((profile || user)?.xp || 0);
  const displayUser = profile || user;

  const inputStyle = (readOnly = false) => ({
    width: '100%',
    padding: '10px 12px',
    backgroundColor: readOnly ? '#131c22' : '#0B141A',
    border: '1px solid #2A3942',
    borderRadius: '10px',
    color: readOnly ? '#8696A0' : '#E9EDEF',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: readOnly ? 'not-allowed' : 'text',
  });

  const labelStyle = {
    color: '#8696A0',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8696A0', fontSize: '14px' }}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#E9EDEF', fontSize: '22px', fontWeight: '700', margin: '0 0 4px' }}>My Profile</h1>
          <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>Manage your account and preferences</p>
        </div>
        {!editing ? (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '10px', border: '1px solid rgba(0,168,132,0.3)',
              backgroundColor: 'rgba(0,168,132,0.15)', color: '#00A884',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            <Edit3 size={14} /> Edit Profile
          </motion.button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setEditing(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 14px', borderRadius: '10px', border: '1px solid #2A3942',
                backgroundColor: 'transparent', color: '#8696A0',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              <X size={14} /> Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #00A884, #25D366)',
                color: '#0B141A', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.8 : 1,
              }}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {/* XP & Level */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '16px', border: '1px solid #2A3942' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Zap size={14} color="#00A884" />
            <span style={{ color: '#8696A0', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level & XP</span>
          </div>
          <div style={{ color: '#E9EDEF', fontSize: '20px', fontWeight: '700' }}>Lv {xpInfo.level}</div>
          <div style={{ color: '#8696A0', fontSize: '12px', marginBottom: '10px' }}>{displayUser?.xp || 0} XP</div>
          <div style={{ height: '4px', backgroundColor: '#2A3942', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpInfo.progress}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #00A884, #25D366)', borderRadius: '4px' }}
            />
          </div>
          <div style={{ color: '#8696A0', fontSize: '10px', marginTop: '4px' }}>
            {Math.max(0, xpInfo.nextLevelXp - (displayUser?.xp || 0))} XP to next level
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '16px', border: '1px solid #2A3942' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Flame size={14} color="#F4B400" />
            <span style={{ color: '#8696A0', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Streak</span>
          </div>
          <div style={{ color: '#E9EDEF', fontSize: '20px', fontWeight: '700' }}>{displayUser?.streak || 0} 🔥</div>
          <div style={{ color: '#8696A0', fontSize: '12px' }}>consecutive days</div>
        </motion.div>

        {/* Role */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '16px', border: '1px solid #2A3942' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Shield size={14} color="#00A884" />
            <span style={{ color: '#8696A0', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
          </div>
          <div style={{ color: '#E9EDEF', fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>
            {displayUser?.role || 'student'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <CheckCircle size={11} color="#25D366" />
            <span style={{ color: '#25D366', fontSize: '11px' }}>Active account</span>
          </div>
        </motion.div>
      </div>

      {/* Profile info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '24px', border: '1px solid #2A3942', marginBottom: '16px' }}
      >
        <h2 style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: '700', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} color="#00A884" /> Personal Information
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}><User size={11} />Full Name</label>
            {editing ? (
              <input
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={inputStyle()}
                placeholder="Your full name"
              />
            ) : (
              <div style={inputStyle(true)}>{displayUser?.name || '—'}</div>
            )}
          </div>

          {/* Username (read-only always) */}
          <div>
            <label style={labelStyle}><AtSign size={11} />Username</label>
            <div style={inputStyle(true)}>@{displayUser?.username || '—'}</div>
          </div>

          {/* Email (read-only always) */}
          <div>
            <label style={labelStyle}><Mail size={11} />Email</label>
            <div style={{ ...inputStyle(true), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{displayUser?.email || '—'}</span>
              {displayUser?.email_verified && <CheckCircle size={13} color="#25D366" />}
            </div>
          </div>

          {/* College */}
          <div>
            <label style={labelStyle}><Building2 size={11} />College</label>
            {editing ? (
              <input
                value={form.college || ''}
                onChange={e => setForm(f => ({ ...f, college: e.target.value }))}
                style={inputStyle()}
                placeholder="Your college"
              />
            ) : (
              <div style={inputStyle(true)}>{displayUser?.college || '—'}</div>
            )}
          </div>

          {/* Branch */}
          <div>
            <label style={labelStyle}><GraduationCap size={11} />Branch</label>
            {editing ? (
              <input
                value={form.branch || ''}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                style={inputStyle()}
                placeholder="CSE, ECE..."
              />
            ) : (
              <div style={inputStyle(true)}>{displayUser?.branch || '—'}</div>
            )}
          </div>

          {/* Year */}
          <div>
            <label style={labelStyle}><Calendar size={11} />Year</label>
            {editing ? (
              <select
                value={form.year || '3'}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                style={{ ...inputStyle(), cursor: 'pointer' }}
              >
                {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            ) : (
              <div style={inputStyle(true)}>Year {displayUser?.year || '—'}</div>
            )}
          </div>

          {/* Language */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}><Code2 size={11} />Preferred Language</label>
            {editing ? (
              <select
                value={form.preferred_language || 'Python'}
                onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}
                style={{ ...inputStyle(), cursor: 'pointer', maxWidth: '220px' }}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <div style={{ ...inputStyle(true), maxWidth: '220px', display: 'inline-block' }}>
                {displayUser?.preferred_language || 'Python'}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Preferences card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ backgroundColor: '#202C33', borderRadius: '14px', padding: '24px', border: '1px solid #2A3942' }}
      >
        <h2 style={{ color: '#E9EDEF', fontSize: '15px', fontWeight: '700', margin: '0 0 20px' }}>⚙️ Preferences</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            {
              key: 'notifications_enabled',
              label: 'Push Notifications',
              desc: 'Get notified about achievements and streaks',
            },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#E9EDEF', fontSize: '14px', fontWeight: '500' }}>{label}</div>
                <div style={{ color: '#8696A0', fontSize: '12px' }}>{desc}</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePrefToggle(key, !prefs[key])}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                  backgroundColor: prefs[key] ? '#00A884' : '#2A3942',
                  cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
                  flexShrink: 0,
                }}
              >
                <motion.div
                  animate={{ x: prefs[key] ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    position: 'absolute', top: '2px', left: 0,
                    width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: '#E9EDEF',
                  }}
                />
              </motion.button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
