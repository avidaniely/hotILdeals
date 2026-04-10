import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import SubNav from './components/SubNav';
import Home from './pages/Home';
import DealDetail from './pages/DealDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import PostDeal from './pages/PostDeal';
import './styles/main.css';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      import('./api').then(({ default: api }) => {
        api.get('/auth/me')
          .then(({ data }) => setUser(data))
          .catch(() => localStorage.removeItem('token'));
      });
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <BrowserRouter>
      <NavBar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<><SubNav /><Home user={user} /></>} />
        <Route path="/deals/:id" element={<DealDetail user={user} />} />
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/register" element={<Register onLogin={setUser} />} />
        <Route path="/post-deal" element={<PostDeal user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}
