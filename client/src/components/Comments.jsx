import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import api from '../api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שע'`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `לפני ${days} ימים`;
  return new Date(dateStr).toLocaleDateString('he-IL');
}

export default function Comments({ dealId, user }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/deals/${dealId}/comments`)
      .then(({ data }) => setComments(data))
      .catch(console.error);
  }, [dealId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/deals/${dealId}/comments`, { body });
      setComments((prev) => [...prev, data]);
      setBody('');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בשליחת התגובה');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/deals/${dealId}/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const canDelete = (comment) =>
    user && (user.id === comment.user_id || user.role === 'admin');

  return (
    <div className="comments-section">
      <h3 className="comments-header">תגובות ({comments.length})</h3>

      {comments.length === 0 && (
        <p className="comments-empty">אין תגובות עדיין. היה הראשון להגיב!</p>
      )}

      <div className="comments-list">
        {comments.map((c) => (
          <div key={c.id} className="comment-item">
            <div className="comment-avatar">{c.username[0].toUpperCase()}</div>
            <div className="comment-content">
              <div className="comment-meta">
                <span className="comment-author">{c.username}</span>
                <span className="comment-time">{timeAgo(c.created_at)}</span>
              </div>
              <p className="comment-body">{c.body}</p>
            </div>
            {canDelete(c) && (
              <button
                className="comment-delete"
                onClick={() => handleDelete(c.id)}
                title="מחק תגובה"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          {error && <p style={{ color: 'var(--hot)', fontSize: 13, marginBottom: 6 }}>{error}</p>}
          <div className="comment-form-row">
            <div className="comment-avatar">{user.username[0].toUpperCase()}</div>
            <textarea
              className="comment-textarea"
              placeholder="כתוב תגובה..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
            <button
              type="submit"
              className="comment-submit"
              disabled={!body.trim() || submitting}
            >
              {submitting ? 'שולח...' : 'פרסם תגובה'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-guest">
          <Link to="/login">התחבר</Link> כדי להגיב
        </p>
      )}
    </div>
  );
}
