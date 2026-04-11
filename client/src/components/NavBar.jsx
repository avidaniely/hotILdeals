import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, PlusCircle, Menu, Flame } from 'lucide-react';

export default function NavBar({ user, onLogout, onSearch }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
      onSearch?.(query.trim());
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Flame size={20} color="#f7641b" style={{ marginLeft: 4, flexShrink: 0 }} />
          <span className="navbar-logo-hot">hot</span>
          <span className="navbar-logo-il">IL</span>
          <span style={{ color: '#fff' }}>deals</span>
        </Link>

        {/* Search */}
        <div className="navbar-search">
          <form onSubmit={handleSearch}>
            <div className="navbar-search-inner">
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
              <span className="navbar-username">{user.username}</span>
              <button className="nav-icon-btn" title="התראות"><Bell size={18} /></button>
              <Link to="/post-deal" className="nav-post-btn">
                <PlusCircle size={16} />
                פרסם מבצע
              </Link>
              <button className="nav-icon-btn" title="התנתק" onClick={onLogout}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-text-btn">
                <User size={15} />
                כניסה
              </Link>
              <Link to="/register" className="nav-text-btn primary">הרשמה</Link>
              <Link to="/post-deal" className="nav-post-btn">
                <PlusCircle size={16} />
                פרסם מבצע
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
