import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'הכניסה נכשלה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="form-page">
        <h1>כניסה לחשבון</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>אימייל</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>סיסמה</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
        <p className="form-link">
          אין חשבון? <Link to="/register">הירשם כאן</Link>
        </p>
      </div>
    </div>
  );
}
