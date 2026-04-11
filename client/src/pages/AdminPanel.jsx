import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, RefreshCw, Trash2, EyeOff, Eye, UserX, UserCheck, ShieldOff, ShieldCheck } from 'lucide-react';
import api from '../api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שע'`;
  return `לפני ${Math.floor(hrs / 24)} ימים`;
}

function DashboardTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(console.error);
  }, []);

  if (!stats) return <div className="loading"><div className="loading-spinner" />טוען...</div>;

  return (
    <>
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-label">עסקאות פעילות</span>
          <span className="admin-stat-value">{stats.totals.deals.toLocaleString()}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">משתמשים</span>
          <span className="admin-stat-value">{stats.totals.users.toLocaleString()}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">הצבעות</span>
          <span className="admin-stat-value">{stats.totals.votes.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="admin-section">
          <div className="admin-section-title">קטגוריות מובילות</div>
          {stats.top_categories.map((c) => (
            <div key={c.slug} className="admin-activity-item">
              <span className="admin-activity-icon">{c.icon}</span>
              <span className="admin-activity-text">{c.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.deal_count} עסקאות</span>
            </div>
          ))}
        </div>

        <div className="admin-section">
          <div className="admin-section-title">פעילות אחרונה</div>
          {stats.recent_activity.map((item, i) => (
            <div key={i} className="admin-activity-item">
              <span className="admin-activity-icon">{item.type === 'deal' ? '🏷️' : '👤'}</span>
              <span className="admin-activity-text">
                {item.type === 'deal'
                  ? <><strong>{item.username}</strong> פרסם: {item.title?.slice(0, 30)}...</>
                  : <>משתמש חדש: <strong>{item.username}</strong></>
                }
              </span>
              <span className="admin-activity-time">{timeAgo(item.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function DealsTab({ currentUserId }) {
  const [data, setData] = useState({ deals: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  function load(p = page) {
    setLoading(true);
    const q = new URLSearchParams({ page: p });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    api.get(`/admin/deals?${q}`)
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1); setPage(1); }, [search, status]);

  async function setDealStatus(id, newStatus) {
    await api.patch(`/admin/deals/${id}`, { status: newStatus });
    load(page);
  }

  async function deleteDeal(id) {
    if (!confirm('למחוק עסקה זו לצמיתות?')) return;
    await api.delete(`/admin/deals/${id}`);
    load(page);
  }

  const STATUS_LABELS = { active: 'פעיל', hidden: 'מוסתר', expired: 'פג תוקף' };

  return (
    <div className="admin-section">
      <div className="admin-table-toolbar">
        <input
          type="text" placeholder="חיפוש עסקאות..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="hidden">מוסתר</option>
          <option value="expired">פג תוקף</option>
        </select>
        <button className="admin-btn" onClick={() => load(page)}><RefreshCw size={13} /></button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>כותרת</th>
              <th>סטטוס</th>
              <th>מחיר</th>
              <th>מפרסם</th>
              <th>קטגוריה</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>טוען...</td></tr>
              : data.deals.map((d) => (
                <tr key={d.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{d.id}</td>
                  <td>
                    <Link to={`/deals/${d.id}`} style={{ color: 'var(--blue)', fontWeight: 600 }}>
                      {d.title.slice(0, 40)}{d.title.length > 40 ? '...' : ''}
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${d.status}`}>{STATUS_LABELS[d.status]}</span>
                  </td>
                  <td>{d.price ? `₪${parseFloat(d.price).toFixed(0)}` : '—'}</td>
                  <td>{d.posted_by || '—'}</td>
                  <td>{d.category_name || '—'}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {d.status === 'active'
                      ? <button className="admin-btn" onClick={() => setDealStatus(d.id, 'hidden')} title="הסתר"><EyeOff size={12} /></button>
                      : <button className="admin-btn success" onClick={() => setDealStatus(d.id, 'active')} title="הפעל"><Eye size={12} /></button>
                    }
                    <button className="admin-btn danger" onClick={() => deleteDeal(d.id)} title="מחק"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <div className="pagination" style={{ padding: '12px 16px' }}>
          {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => { setPage(p); load(p); }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab({ currentUserId }) {
  const [data, setData] = useState({ users: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  function load(p = page) {
    setLoading(true);
    const q = new URLSearchParams({ page: p });
    if (search) q.set('search', search);
    api.get(`/admin/users?${q}`)
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1); setPage(1); }, [search]);

  async function toggleRole(user) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await api.patch(`/admin/users/${user.id}`, { role: newRole });
    load(page);
  }

  async function toggleBan(user) {
    await api.patch(`/admin/users/${user.id}`, { is_banned: user.is_banned ? 0 : 1 });
    load(page);
  }

  return (
    <div className="admin-section">
      <div className="admin-table-toolbar">
        <input
          type="text" placeholder="חיפוש משתמשים..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <button className="admin-btn" onClick={() => load(page)}><RefreshCw size={13} /></button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>שם משתמש</th>
              <th>אימייל</th>
              <th>תפקיד</th>
              <th>עסקאות</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>טוען...</td></tr>
              : data.users.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_banned ? 0.55 : 1 }}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>
                    {u.username}
                    {u.is_banned && <span style={{ fontSize: 10, color: 'var(--hot)', marginRight: 6 }}>חסום</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <span className={`admin-status-badge ${u.role === 'admin' ? 'active' : 'expired'}`}>
                      {u.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                  </td>
                  <td>{u.deal_count}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="admin-btn"
                      disabled={u.id === currentUserId}
                      onClick={() => toggleRole(u)}
                      title={u.role === 'admin' ? 'הסר הרשאת מנהל' : 'הפוך למנהל'}
                    >
                      {u.role === 'admin' ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                    </button>
                    <button
                      className={`admin-btn ${u.is_banned ? 'success' : 'danger'}`}
                      disabled={u.id === currentUserId}
                      onClick={() => toggleBan(u)}
                      title={u.is_banned ? 'בטל חסימה' : 'חסום משתמש'}
                    >
                      {u.is_banned ? <UserCheck size={12} /> : <UserX size={12} />}
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <div className="pagination" style={{ padding: '12px 16px' }}>
          {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => { setPage(p); load(p); }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({ user }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    if (user.role !== 'admin') { navigate('/'); }
  }, [user]);

  if (!user || user.role !== 'admin') return null;

  const TABS = [
    { key: 'dashboard', label: 'לוח בקרה' },
    { key: 'deals',     label: 'עסקאות' },
    { key: 'users',     label: 'משתמשים' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <Shield size={22} color="var(--brand)" />
        <h1>פאנל ניהול</h1>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`admin-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'deals'     && <DealsTab currentUserId={user.id} />}
      {tab === 'users'     && <UsersTab currentUserId={user.id} />}
    </div>
  );
}
