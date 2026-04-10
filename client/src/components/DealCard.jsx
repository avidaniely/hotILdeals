import { Link } from 'react-router-dom';
import TemperatureVote from './TemperatureVote';

function formatPrice(price) {
  if (price == null) return null;
  return `₪${parseFloat(price).toFixed(2)}`;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export default function DealCard({ deal, user, onVote }) {
  const isHot = (deal.temperature || 0) > 50;

  return (
    <article className="deal-card">
      {isHot && <span className="hot-badge">HOT</span>}

      <div className="deal-card-image">
        {deal.image_path ? (
          <img
            src={deal.image_path}
            alt={deal.title}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span className="deal-card-image-placeholder">🏷️</span>
        )}
      </div>

      <div className="deal-card-body">
        <Link to={`/deals/${deal.id}`} className="deal-card-title">
          {deal.title}
        </Link>

        <div className="deal-card-meta">
          {deal.merchant && <span className="deal-card-merchant">{deal.merchant}</span>}
          {deal.category_name && <span>• {deal.category_name}</span>}
          {deal.posted_by && <span>• פורסם ע״י {deal.posted_by}</span>}
          <span>• {timeAgo(deal.created_at)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {deal.price && <span className="deal-card-price">{formatPrice(deal.price)}</span>}
          {deal.original_price && deal.original_price > deal.price && (
            <span className="deal-card-original-price">{formatPrice(deal.original_price)}</span>
          )}
        </div>

        {deal.description && (
          <p className="deal-card-description">{deal.description}</p>
        )}

        <div className="deal-card-footer">
          <TemperatureVote deal={deal} user={user} onChange={onVote} />
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="deal-card-go-btn"
          >
            לעסקה ←
          </a>
        </div>
      </div>
    </article>
  );
}
