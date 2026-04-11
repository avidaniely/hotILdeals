import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import SubNav from './components/SubNav';
import Analytics from './components/Analytics';
import Home from './pages/Home';
import DealDetail from './pages/DealDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import PostDeal from './pages/PostDeal';
import AdminPanel from './pages/AdminPanel';
import Inbox from './pages/Inbox';
import api from './api';
import './styles/main.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => {
          if (data.is_banned) {
            localStorage.removeItem('token');
          } else {
            setUser(data);
          }
        })
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  // Poll unread message count every 30s when logged in
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchCount = () => {
      api.get('/messages/unread-count')
        .then(({ data }) => setUnreadCount(data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setUnreadCount(0);
  }

  return (
    <BrowserRouter>
      <Analytics />
      <NavBar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      <Routes>
        <Route path="/" element={<><SubNav /><Home user={user} /></>} />
        <Route path="/deals/:id" element={<DealDetail user={user} />} />
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/register" element={<Register onLogin={setUser} />} />
        <Route path="/post-deal" element={<PostDeal user={user} />} />
        <Route path="/admin" element={<AdminPanel user={user} />} />
        <Route path="/inbox" element={<Inbox user={user} onRead={() => setUnreadCount(0)} />} />
        <Route path="/inbox/:partnerId" element={<Inbox user={user} onRead={() => setUnreadCount(0)} />} />
      </Routes>
    </BrowserRouter>
  );
}
