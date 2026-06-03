import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { authApi, notificationApi } from '../services/api';
import toast from 'react-hot-toast';
import { LayoutDashboard, BookOpen, History, Trophy, LogOut, User, ChevronDown, Zap, Bell, UploadCloud, Sparkles } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Upload Material', path: '/upload', icon: UploadCloud },
  { label: 'Study Aids', path: '/generated-content', icon: Sparkles },
  { label: 'Tracks', path: '/tracks', icon: BookOpen },
  { label: 'History', path: '/history', icon: History },
  { label: 'Achievements', path: '/achievements', icon: Trophy },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout: storeLogout, isAuthenticated } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      notificationApi.getFeed().then(res => {
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    try {
      const refreshToken = sessionStorage.getItem('refresh_token');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (err) {
      console.warn("Logout request failed:", err);
    }
    sessionStorage.removeItem('refresh_token');
    storeLogout();
    navigate('/login');
    toast.success('Logged out');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: '#202C33',
      borderBottom: '1px solid #2A3942',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      height: '56px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Brand */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #00A884, #25D366)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={16} color="#0B141A" strokeWidth={2.5} />
        </div>
        <span style={{ color: '#E9EDEF', fontWeight: '700', fontSize: '16px', letterSpacing: '-0.3px' }}>
          SkillBytes
        </span>
      </motion.div>

      {/* Nav links — desktop */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {NAV_LINKS.map(({ label, path, icon: Icon }) => (
          <motion.button
            key={path}
            whileHover={{ backgroundColor: '#2A3942' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: isActive(path) ? '#2A3942' : 'transparent',
              color: isActive(path) ? '#00A884' : '#8696A0',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            <Icon size={15} />
            {label}
          </motion.button>
        ))}
      </div>

      {/* User section */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <motion.button
          whileHover={{ backgroundColor: '#2A3942' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            notificationApi.markAllRead();
            setUnreadCount(0);
          }}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
            backgroundColor: 'transparent', cursor: 'pointer', marginRight: '8px'
          }}
        >
          <Bell size={18} color="#E9EDEF" />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: '4px', right: '4px',
              width: '14px', height: '14px', borderRadius: '50%',
              backgroundColor: '#F28B82', color: '#0B141A',
              fontSize: '10px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {unreadCount}
            </div>
          )}
        </motion.button>

        <div style={{ position: 'relative' }}>
          <motion.button
          whileHover={{ backgroundColor: '#2A3942' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setDropdownOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px', borderRadius: '10px', border: 'none',
            backgroundColor: 'transparent', cursor: 'pointer',
          }}
        >
          {/* XP/Level badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: 'rgba(0,168,132,0.15)', padding: '3px 8px',
            borderRadius: '20px', border: '1px solid rgba(0,168,132,0.3)',
          }}>
            <Zap size={11} color="#00A884" />
            <span style={{ color: '#00A884', fontSize: '11px', fontWeight: '600' }}>
              Lv {user?.level || 1} · {user?.xp || 0} XP
            </span>
          </div>

          {/* Avatar */}
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00A884, #25D366)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0B141A', fontWeight: '700', fontSize: '12px',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <span style={{
            color: '#E9EDEF', fontSize: '13px', fontWeight: '500',
            maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.name?.split(' ')[0] || 'User'}
          </span>

          <ChevronDown
            size={14}
            color="#8696A0"
            style={{
              transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </motion.button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: '44px', right: 0,
                backgroundColor: '#202C33', border: '1px solid #2A3942',
                borderRadius: '12px', padding: '6px',
                minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 200,
              }}
            >
              {[
                {
                  label: 'Profile',
                  icon: User,
                  action: () => { navigate('/profile'); setDropdownOpen(false); },
                  danger: false,
                },
                {
                  label: 'Logout',
                  icon: LogOut,
                  action: handleLogout,
                  danger: true,
                },
              ].map(({ label, icon: Icon, action, danger }) => (
                <motion.button
                  key={label}
                  whileHover={{ backgroundColor: '#2A3942' }}
                  onClick={action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: 'none', backgroundColor: 'transparent',
                    color: danger ? '#F28B82' : '#E9EDEF',
                    fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </nav>
  );
}
