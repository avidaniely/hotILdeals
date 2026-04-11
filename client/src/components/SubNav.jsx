import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Flame, TrendingUp, Clock } from 'lucide-react';
import api from '../api';

const TABS = [
  { key: 'new',        label: 'חדש',    icon: Clock },
  { key: 'highlights', label: 'נבחרים', icon: Sparkles },
  { key: 'hottest',    label: 'הכי חם', icon: TrendingUp },
  { key: 'hot',        label: 'חם',     icon: Flame },
];

export default function SubNav() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const activeTab = params.get('tab') || 'new';
  const activeCategory = params.get('category') || '';

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  function setTab(tab) {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    next.delete('page');
    setParams(next);
  }

  function setCategory(slug) {
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug);
    else next.delete('category');
    next.delete('page');
    setParams(next);
  }

  return (
    <div className="subnav">
      <div className="subnav-inner">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`subnav-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}

        <div className="subnav-divider" />

        {categories.length > 0 && (
          <select
            className="subnav-category-select"
            value={activeCategory}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">כל הקטגוריות</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
