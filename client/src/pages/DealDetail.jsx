import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Store, ExternalLink, Tag } from 'lucide-react';
import api from '../api';
import TemperatureVote from '../components/TemperatureVote';

function formatPrice(price) {
  if (price == null) return null;
  return `₪${parseFloat(price).toFixed(0)}`;
}

function calcSaving(price, original) {
  if (!price || !original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
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

  if (loading) return <div className="loading"><div className="loading-spinner" />טוען...</div>;
  if (!deal) return <div className="loading">המבצע לא נמצא.</div>;

  const saving = calcSaving(deal.price, deal.original_price);

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        <ChevronRight size={16} />
        חזרה למבצעים
      </Link>

      <div className="deal-detail">
        {deal.image_path && (
          <div className="deal-detail-hero">
            <img src={deal.image_path} alt={deal.title} />
          </div>
        )}

        <div className="deal-detail-body">
          <h1 className="deal-detail-title">{deal.title}</h1>

          <div className="deal-card-meta" style={{ marginBottom: 12 }}>
            {deal.merchant && (
              <span className="deal-card-merchant"><Store size={10} />{deal.merchant}</span>
            )}
            {deal.category_name && <><span className="deal-card-dot">•</span><span>{deal.category_name}</span></>}
            {deal.posted_by && <><span className="deal-card-dot">•</span><span>פורסם ע״י {deal.posted_by}</span></>}
          </div>

          <div className="deal-detail-price-row">
            {deal.price && <span className="deal-detail-price">{formatPrice(deal.price)}</span>}
            {deal.original_price && deal.original_price > deal.price && (
              <span className="deal-detail-original">{formatPrice(deal.original_price)}</span>
            )}
            {saving && <span className="deal-detail-saving">חיסכון {saving}%</span>}
          </div>

          {deal.description && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              {deal.description}
            </p>
          )}

          <div className="deal-detail-actions">
            <TemperatureVote
              deal={deal}
              user={user}
              onChange={(data) => setDeal((d) => ({ ...d, ...data }))}
            />
            <a href={deal.url} target="_blank" rel="noopener noreferrer" className="btn-go-deal">
              עבור לעסקה
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
