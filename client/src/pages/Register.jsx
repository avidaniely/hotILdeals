import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register({ onLogin }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('token', data.token);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'ההרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="form-page">
        <h1>יצירת חשבון</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>שם משתמש</label>
            <input value={form.username} onChange={set('username')} required minLength={3} maxLength={50} />
          </div>
          <div className="form-group">
            <label>אימייל</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>סיסמה</label>
            <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>
        <p className="form-link">
          יש לך כבר חשבון? <Link to="/login">כניסה</Link>
        </p>
      </div>
    </div>
  );
}
