import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Flame, LayoutGrid, X, ChevronLeft } from 'lucide-react';
import api from '../api';

const TABS = [
  { key: 'new',     label: 'טרנדים',  icon: Tag },
  { key: 'hottest', label: 'הכי חם',  icon: Flame },
  { key: 'all',     label: 'הכל',     icon: null },
];

export default function SubNav() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
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
    setPanelOpen(false);
  }

  return (
    <>
      <div className="subnav">
        <div className="subnav-inner">
          {/* Categories button — opens slide panel */}
          <button
            className={`subnav-tab subnav-categories-btn ${activeCategory ? 'active' : ''}`}
            onClick={() => setPanelOpen(true)}
          >
            <LayoutGrid size={14} />
            קטגוריות
            <ChevronLeft size={12} />
          </button>

          <div className="subnav-divider" />

          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                className={`subnav-tab ${activeTab === t.key && !activeCategory ? 'active' : ''}`}
                onClick={() => { setCategory(''); setTab(t.key); }}
              >
                {Icon && <Icon size={14} />}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overlay */}
      {panelOpen && (
        <div className="cat-overlay" onClick={() => setPanelOpen(false)} />
      )}

      {/* Slide-in categories panel */}
      <div className={`cat-panel ${panelOpen ? 'open' : ''}`}>
        <div className="cat-panel-header">
          <span>קטגוריות</span>
          <button onClick={() => setPanelOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="cat-panel-list">
          <button
            className={`cat-panel-item ${!activeCategory ? 'active' : ''}`}
            onClick={() => setCategory('')}
          >
            כל הקטגוריות
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat-panel-item ${activeCategory === c.slug ? 'active' : ''}`}
              onClick={() => setCategory(c.slug)}
            >
              {c.icon && <span className="cat-panel-icon">{c.icon}</span>}
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
