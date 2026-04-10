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
      setError(err.response?.data?.error || 'Failed to post deal');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="page-container">
        <div className="form-page">
          <h1>Post a Deal</h1>
          <p>You need to <Link to="/login" style={{ color: 'var(--link-blue)' }}>log in</Link> to post a deal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="post-deal-page">
        <h1>Post a Deal</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Deal title *</label>
            <input value={form.title} onChange={set('title')} required maxLength={500} placeholder="e.g. Samsung 55'' TV - 40% off" />
          </div>
          <div className="form-group">
            <label>Deal URL *</label>
            <input type="url" value={form.url} onChange={set('url')} required placeholder="https://..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Price (₪)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Original price (₪)</label>
              <input type="number" step="0.01" min="0" value={form.original_price} onChange={set('original_price')} placeholder="0.00" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Merchant / Store</label>
              <input value={form.merchant} onChange={set('merchant')} placeholder="e.g. Amazon IL" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Image URL (optional)</label>
            <input type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Describe the deal..." />
          </div>
          <div className="form-group">
            <label>Expires at (optional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={set('expires_at')} />
          </div>
          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? 'Posting...' : 'Post Deal'}
          </button>
        </form>
      </div>
    </div>
  );
}
