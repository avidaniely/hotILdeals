import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Tag, Gift, Flame, MessageSquare, Star, ChevronDown } from 'lucide-react';
import api from '../api';

const TABS = [
  { key: 'highlights', label: 'קטגוריות',      icon: LayoutGrid, dropdown: true },
  { key: 'new',        label: 'מבצעים',         icon: Tag },
  { key: 'hot',        label: 'פריביז',          icon: Gift },
  { key: 'hottest',    label: 'הכי חם',          icon: Flame },
  { key: 'discuss',    label: 'דיונים',          icon: MessageSquare },
  { key: 'club',       label: 'קלאב',            icon: Star },
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
              <Icon size={14} />
              {t.label}
              {t.dropdown && <ChevronDown size={12} />}
            </button>
          );
        })}

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
