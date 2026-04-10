import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
        <Link to="/" className="navbar-logo">
          hot<span>IL</span>deals
        </Link>

        <div className="navbar-search">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="חיפוש מבצעים..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="navbar-username">שלום, {user.username}</span>
              <Link to="/post-deal" className="btn btn-white">פרסם מבצע</Link>
              <button className="btn btn-outline-white" onClick={onLogout}>התנתק</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-white">כניסה</Link>
              <Link to="/register" className="btn btn-white">הרשמה</Link>
              <Link to="/post-deal" className="btn btn-white">פרסם מבצע</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
