import { Link } from 'react-router-dom';
import { ExternalLink, Store, Tag } from 'lucide-react';
import TemperatureVote from './TemperatureVote';

function formatPrice(price) {
  if (price == null) return null;
  return `₪${parseFloat(price).toFixed(0)}`;
}

function calcSaving(price, original) {
  if (!price || !original || original <= price) return null;
  const pct = Math.round(((original - price) / original) * 100);
  return pct > 0 ? pct : null;
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
  const saving = calcSaving(deal.price, deal.original_price);

  return (
    <article className="deal-card">
      {isHot && <span className="hot-badge">🔥 חם</span>}

      <div className="deal-card-image">
        {deal.image_path ? (
          <img
            src={deal.image_path}
            alt={deal.title}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <span
          className="deal-card-image-placeholder"
          style={{ display: deal.image_path ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
        >
          <Tag size={36} color="#ccc" />
        </span>
      </div>

      <div className="deal-card-body">
        <div className="deal-card-top">
          <Link to={`/deals/${deal.id}`} className="deal-card-title">
            {deal.title}
          </Link>
        </div>

        <div className="deal-card-meta">
          {deal.merchant && (
            <span className="deal-card-merchant">
              <Store size={10} />
              {deal.merchant}
            </span>
          )}
          {deal.category_name && (
            <><span className="deal-card-dot">•</span><span>{deal.category_name}</span></>
          )}
          {deal.posted_by && (
            <><span className="deal-card-dot">•</span><span>ע״י {deal.posted_by}</span></>
          )}
          <span className="deal-card-dot">•</span>
          <span>{timeAgo(deal.created_at)}</span>
        </div>

        {deal.description && (
          <p className="deal-card-description">{deal.description}</p>
        )}

        <div className="deal-card-price-row">
          {deal.price && <span className="deal-card-price">{formatPrice(deal.price)}</span>}
          {deal.original_price && deal.original_price > deal.price && (
            <span className="deal-card-original">{formatPrice(deal.original_price)}</span>
          )}
          {saving && <span className="deal-card-saving">-{saving}%</span>}
        </div>

        <div className="deal-card-footer">
          <TemperatureVote deal={deal} user={user} onChange={onVote} />
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="deal-card-go-btn"
          >
            לעסקה
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </article>
  );
}
