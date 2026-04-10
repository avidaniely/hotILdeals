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

  const tab = params.get('tab') || 'new';
  const category = params.get('category') || '';
  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '1');

  useEffect(() => {
    setLoading(true);

    const query = new URLSearchParams({ tab, page });
    if (category) query.set('category', category);
    if (search) query.set('search', search);

    api.get(`/deals?${query}`)
      .then(({ data }) => {
        setDeals(data.deals);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab, category, search, page]);

  function setPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', p);
    setParams(next);
    window.scrollTo(0, 0);
  }

  if (loading) return <div className="loading">טוען מבצעים...</div>;

  return (
    <div className="page-container">
      {search && (
        <p style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 14 }}>
          נמצאו {total} תוצאות עבור "<strong>{search}</strong>"
        </p>
      )}

      {deals.length === 0 ? (
        <div className="empty-state">
          <h3>לא נמצאו מבצעים</h3>
          <p>נסה לשנות קטגוריה או סנן.</p>
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
          {page > 1 && (
            <button className="page-btn" onClick={() => setPage(page - 1)}>‹</button>
          )}
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            );
          })}
          {page < pages && (
            <button className="page-btn" onClick={() => setPage(page + 1)}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
