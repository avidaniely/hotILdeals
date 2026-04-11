import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, PlusCircle } from 'lucide-react';

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
          <div className="navbar-logo-flame">🔥</div>
          <div>
            <div className="navbar-logo-text">
              <em>hot</em>deals
            </div>
          </div>
          <span className="navbar-logo-tag">IL</span>
        </Link>

        {/* Search */}
        <div className="navbar-search">
          <form onSubmit={handleSearch}>
            <div className="navbar-search-wrap">
              <span className="navbar-search-icon"><Search size={15} /></span>
              <input
                type="text"
                placeholder="חיפוש מבצעים, מותגים, מוצרים..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {user ? (
            <>
              <button className="nav-icon-btn" title="התראות"><Bell size={17} /></button>
              <div className="navbar-avatar" title={user.username}>
                {user.username[0].toUpperCase()}
              </div>
              <Link to="/post-deal" className="nav-pill-btn solid">
                <PlusCircle size={15} />
                פרסם מבצע
              </Link>
              <button className="nav-icon-btn" title="התנתק" onClick={onLogout}>
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-pill-btn ghost">כניסה</Link>
              <Link to="/register" className="nav-pill-btn ghost">הרשמה</Link>
              <Link to="/post-deal" className="nav-pill-btn solid">
                <PlusCircle size={15} />
                פרסם מבצע
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
