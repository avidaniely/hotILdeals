import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import DealCard from '../components/DealCard';

export default function Home({ user }) {
  const [params, setParams] = useSearchParams();
  const [deals, setDeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const tab = params.get('tab') || 'trends';
  const category = params.get('category') || '';
  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '1');

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({ tab, page });
    if (category) query.set('category', category);
    if (search) query.set('search', search);
    api.get(`/deals?${query}`)
      .then(({ data }) => { setDeals(data.deals); setTotal(data.total); setPages(data.pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab, category, search, page]);

  function setPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', p);
    setParams(next);
    window.scrollTo(0, 0);
  }

  if (loading) return (
    <div className="loading">
      <div className="loading-spinner" />
      טוען מבצעים...
    </div>
  );

  return (
    <div className="page-container">
      {search && (
        <p style={{ marginBottom: 14, color: 'var(--text-muted)', fontSize: 13 }}>
          נמצאו <strong>{total}</strong> תוצאות עבור &ldquo;{search}&rdquo;
        </p>
      )}

      {deals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{tab === 'trends' ? '📈' : '🏷️'}</div>
          <h3>{tab === 'trends' ? 'אין מבצעים בטרנד כרגע' : 'לא נמצאו מבצעים'}</h3>
          <p>{tab === 'trends' ? 'מבצעים שמקבלים הרבה הצבעות יופיעו כאן. חזור מאוחר יותר!' : 'נסה לשנות קטגוריה או לחפש משהו אחר.'}</p>
        </div>
      ) : (
        <div className="deal-list">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} user={user} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pagination">
          {page > 1 && <button className="page-btn" onClick={() => setPage(page - 1)}>›</button>}
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          {page < pages && <button className="page-btn" onClick={() => setPage(page + 1)}>‹</button>}
        </div>
      )}
    </div>
  );
}
