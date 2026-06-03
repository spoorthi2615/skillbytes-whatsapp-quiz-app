import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, GraduationCap, Zap, Eye, EyeOff, AtSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'C', 'Go', 'Rust', 'TypeScript'];
const YEARS = ['1', '2', '3', '4', 'Alumni'];

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    college: '',
    branch: '',
    year: '3',
    preferred_language: 'Python',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.password) {
      toast.error('Please fill all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { access_token, refresh_token, user } = res.data;
      sessionStorage.setItem('refresh_token', refresh_token);
      login(user, access_token);
      toast.success(`Account created! Welcome, ${user.name.split(' ')[0]}!`);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px 11px 38px',
    backgroundColor: '#0B141A',
    border: '1px solid #2A3942',
    borderRadius: '10px',
    color: '#E9EDEF',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    color: '#8696A0',
    fontSize: '12px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B141A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '460px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #00A884, #25D366)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 24px rgba(0,168,132,0.3)',
          }}>
            <Zap size={26} color="#0B141A" strokeWidth={2.5} />
          </div>
          <h1 style={{ color: '#E9EDEF', fontSize: '22px', fontWeight: '700', margin: '0 0 4px' }}>
            Create your account
          </h1>
          <p style={{ color: '#8696A0', fontSize: '13px', margin: 0 }}>
            Start your learning journey today
          </p>
        </div>

        <div style={{
          backgroundColor: '#202C33',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid #2A3942',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Name + Username row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '12px', marginBottom: '16px',
            }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={15} color="#8696A0"
                    style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Spoorthi"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Username *</label>
                <div style={{ position: 'relative' }}>
                  <AtSign
                    size={15} color="#8696A0"
                    style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="spoorthi_dev"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15} color="#8696A0"
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@college.edu"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15} color="#8696A0"
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  style={{ ...inputStyle, paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: 'absolute', right: '11px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {showPassword
                    ? <EyeOff size={15} color="#8696A0" />
                    : <Eye size={15} color="#8696A0" />
                  }
                </button>
              </div>
            </div>

            {/* College */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>College</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap
                  size={15} color="#8696A0"
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  name="college"
                  value={form.college}
                  onChange={handleChange}
                  placeholder="ABC Engineering College"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Branch + Year row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '12px', marginBottom: '16px',
            }}>
              <div>
                <label style={labelStyle}>Branch</label>
                <input
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  placeholder="CSE"
                  style={{ ...inputStyle, paddingLeft: '12px' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <select
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  style={{ ...inputStyle, paddingLeft: '12px', cursor: 'pointer' }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Preferred Language</label>
              <select
                name="preferred_language"
                value={form.preferred_language}
                onChange={handleChange}
                style={{ ...inputStyle, paddingLeft: '12px', cursor: 'pointer' }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#8696A0' : 'linear-gradient(135deg, #00A884, #25D366)',
                border: 'none', borderRadius: '12px',
                color: '#0B141A', fontWeight: '700', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(0,168,132,0.4)',
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '18px', color: '#8696A0', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#00A884', fontWeight: '600', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
