import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, X, Link as LinkIcon } from 'lucide-react';
import api from '../api';

export default function PostDeal({ user }) {
  const [form, setForm] = useState({
    title: '', description: '', price: '', original_price: '',
    merchant: '', url: '', image_url: '', category_id: '', expires_at: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageMode, setImageMode] = useState('file'); // 'file' | 'url'
  const [dragging, setDragging] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { setError('גודל התמונה לא יעלה על 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (imageMode === 'file' && imageFile) {
        fd.append('image', imageFile);
      }

      const { data } = await api.post('/deals', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

          {/* Image upload */}
          <div className="form-group">
            <label>תמונה (אופציונלי)</label>
            <div className="image-mode-tabs">
              <button type="button" className={`image-mode-tab ${imageMode === 'file' ? 'active' : ''}`} onClick={() => { setImageMode('file'); setForm(f => ({ ...f, image_url: '' })); }}>
                <Upload size={13} /> העלאת קובץ
              </button>
              <button type="button" className={`image-mode-tab ${imageMode === 'url' ? 'active' : ''}`} onClick={() => { setImageMode('url'); clearImage(); }}>
                <LinkIcon size={13} /> קישור לתמונה
              </button>
            </div>

            {imageMode === 'file' ? (
              imagePreview ? (
                <div className="image-preview-wrap">
                  <img src={imagePreview} alt="תצוגה מקדימה" className="image-preview" />
                  <button type="button" className="image-preview-remove" onClick={clearImage}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className={`image-dropzone ${dragging ? 'dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <Upload size={28} color="var(--text-light)" />
                  <span>גרור תמונה לכאן או לחץ לבחירה</span>
                  <span style={{ fontSize: 11, color: 'var(--text-light)' }}>JPG, PNG, WEBP — עד 5MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                  />
                </div>
              )
            ) : (
              <input type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://example.com/image.jpg" />
            )}
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
