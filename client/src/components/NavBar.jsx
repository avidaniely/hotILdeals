import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Inbox, Plus, Flame } from 'lucide-react';

export default function NavBar({ user, onLogout }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Flame size={28} className="navbar-logo-flame" />
          <span className="navbar-logo-text">hot<span className="navbar-logo-il">IL</span>deals</span>
        </Link>

        {/* Menu pill */}
        <button className="navbar-menu-btn">
          <Menu size={16} />
          תפריט
        </button>

        {/* Search — grows to fill middle */}
        <div className="navbar-search">
          <form onSubmit={handleSearch}>
            <div className="navbar-search-wrap">
              <Search size={16} className="navbar-search-icon" />
              <input
                type="text"
                placeholder="חיפוש מותגים, מוצרים ועוד..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Right actions */}
        <div className="navbar-actions">
          <button className="navbar-action-item">
            <Bell size={17} />
            <span>התראות</span>
          </button>
          <button className="navbar-action-item">
            <Inbox size={17} />
            <span>הודעות</span>
          </button>

          {user ? (
            <>
              <button className="navbar-action-item" onClick={onLogout} title="התנתק">
                <span className="navbar-flag">🇮🇱</span>
                <span>{user.username}</span>
              </button>
              <Link to="/post-deal" className="navbar-post-btn">
                <Plus size={15} strokeWidth={2.5} />
                פרסם
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-action-item">
                <span className="navbar-flag">🇮🇱</span>
                <span>כניסה</span>
              </Link>
              <Link to="/post-deal" className="navbar-post-btn">
                <Plus size={15} strokeWidth={2.5} />
                פרסם
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
