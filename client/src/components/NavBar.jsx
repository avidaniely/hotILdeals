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
              placeholder="Search deals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="navbar-username">Hi, {user.username}</span>
              <Link to="/post-deal" className="btn btn-white">Post Deal</Link>
              <button className="btn btn-outline-white" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-white">Log in</Link>
              <Link to="/register" className="btn btn-white">Register</Link>
              <Link to="/post-deal" className="btn btn-white">Post Deal</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
