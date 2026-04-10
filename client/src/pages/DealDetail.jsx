import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import TemperatureVote from '../components/TemperatureVote';

function formatPrice(price) {
  if (price == null) return null;
  return `₪${parseFloat(price).toFixed(2)}`;
}

export default function DealDetail({ user }) {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/deals/${id}`)
      .then(({ data }) => setDeal(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">טוען...</div>;
  if (!deal) return <div className="loading">המבצע לא נמצא.</div>;

  return (
    <div className="page-container">
      <Link to="/" style={{ color: 'var(--link-blue)', fontSize: 13, display: 'inline-block', marginBottom: 12 }}>
        → חזרה למבצעים
      </Link>
      <div className="deal-detail">
        {deal.image_path && (
          <img className="deal-detail-image" src={deal.image_path} alt={deal.title} />
        )}

        <h1 className="deal-detail-title">{deal.title}</h1>

        <div className="deal-card-meta" style={{ marginBottom: 8 }}>
          {deal.merchant && <span className="deal-card-merchant">{deal.merchant}</span>}
          {deal.category_name && <span>• {deal.category_name}</span>}
          {deal.posted_by && <span>• פורסם ע״י {deal.posted_by}</span>}
        </div>

        <div className="deal-detail-price-row">
          {deal.price && <span className="deal-detail-price">{formatPrice(deal.price)}</span>}
          {deal.original_price && deal.original_price > deal.price && (
            <span className="deal-detail-original">{formatPrice(deal.original_price)}</span>
          )}
        </div>

        {deal.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
            {deal.description}
          </p>
        )}

        <div className="deal-detail-actions">
          <TemperatureVote
            deal={deal}
            user={user}
            onChange={(data) => setDeal((d) => ({ ...d, ...data }))}
          />
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-go-deal"
          >
            לעסקה ←
          </a>
        </div>
      </div>
    </div>
  );
}
