import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Zap, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ email: form.email, password: form.password });
      const { access_token, refresh_token, user } = res.data;
      sessionStorage.setItem('refresh_token', refresh_token);
      login(user, access_token);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
        style={{ width: '100%', maxWidth: '400px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #00A884, #25D366)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 24px rgba(0,168,132,0.3)',
          }}>
            <Zap size={28} color="#0B141A" strokeWidth={2.5} />
          </div>
          <h1 style={{ color: '#E9EDEF', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>
            Welcome back
          </h1>
          <p style={{ color: '#8696A0', fontSize: '14px', margin: 0 }}>
            Sign in to continue learning
          </p>
        </div>

        {/* Form card */}
        <div style={{
          backgroundColor: '#202C33',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid #2A3942',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                color: '#8696A0', fontSize: '12px', fontWeight: '600',
                display: 'block', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="#8696A0"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@college.edu"
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '11px 12px 11px 38px',
                    backgroundColor: '#0B141A', border: '1px solid #2A3942',
                    borderRadius: '10px', color: '#E9EDEF', fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                color: '#8696A0', fontSize: '12px', fontWeight: '600',
                display: 'block', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#8696A0"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '11px 40px 11px 38px',
                    backgroundColor: '#0B141A', border: '1px solid #2A3942',
                    borderRadius: '10px', color: '#E9EDEF', fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {showPassword
                    ? <EyeOff size={16} color="#8696A0" />
                    : <Eye size={16} color="#8696A0" />
                  }
                </button>
              </div>
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
              {loading ? 'Signing in…' : 'Sign In'}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', color: '#8696A0', fontSize: '13px' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#00A884', fontWeight: '600', textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
