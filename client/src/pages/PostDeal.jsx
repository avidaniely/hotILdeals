import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function PostDeal({ user }) {
  const [form, setForm] = useState({
    title: '', description: '', price: '', original_price: '',
    merchant: '', url: '', image_url: '', category_id: '', expires_at: '',
  });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/deals', form);
      navigate(`/deals/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'פרסום המבצע נכשל');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="page-container">
        <div className="form-page">
          <h1>פרסום מבצע</h1>
          <p>יש <Link to="/login" style={{ color: 'var(--link-blue)' }}>להתחבר</Link> כדי לפרסם מבצע.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="post-deal-page">
        <h1>פרסום מבצע</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>כותרת המבצע *</label>
            <input value={form.title} onChange={set('title')} required maxLength={500} placeholder='למשל: טלוויזיה 55" סמסונג - 40% הנחה' />
          </div>
          <div className="form-group">
            <label>קישור למבצע *</label>
            <input type="url" value={form.url} onChange={set('url')} required placeholder="https://..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>מחיר (₪)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>מחיר מקורי (₪)</label>
              <input type="number" step="0.01" min="0" value={form.original_price} onChange={set('original_price')} placeholder="0.00" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>חנות / מותג</label>
              <input value={form.merchant} onChange={set('merchant')} placeholder="למשל: אמזון ישראל" />
            </div>
            <div className="form-group">
              <label>קטגוריה</label>
              <select value={form.category_id} onChange={set('category_id')}>
                <option value="">בחר קטגוריה</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>קישור לתמונה (אופציונלי)</label>
            <input type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>תיאור</label>
            <textarea value={form.description} onChange={set('description')} placeholder="תאר את המבצע..." />
          </div>
          <div className="form-group">
            <label>תוקף המבצע (אופציונלי)</label>
            <input type="datetime-local" value={form.expires_at} onChange={set('expires_at')} />
          </div>
          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? 'מפרסם...' : 'פרסם מבצע'}
          </button>
        </form>
      </div>
    </div>
  );
}
