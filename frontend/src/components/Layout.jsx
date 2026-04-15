import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BRAND_NAME, BRAND_PROMISE, BRAND_SHORT } from '../constants/brand.js';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="ambient-orb left-[-8rem] top-[7rem] h-64 w-64 bg-blood-pale" />
        <div
          className="ambient-orb right-[-6rem] top-[5rem] h-72 w-72 bg-rose-100"
          style={{ animationDelay: '1.6s' }}
        />
        <div
          className="ambient-orb bottom-[-7rem] left-1/2 h-80 w-80 -translate-x-1/2 bg-red-100"
          style={{ animationDelay: '0.8s' }}
        />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/72 shadow-sm backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3 min-w-0">
            <span className="brand-mark transition-transform duration-300 group-hover:scale-105">
              {BRAND_SHORT}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg font-bold tracking-[0.12em] text-blood-dark">
                {BRAND_NAME}
              </span>
              <span className="hidden truncate text-xs text-medical-gray md:block">
                {BRAND_PROMISE}
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                {user.role === 'donor' && <Link to="/donor" className="nav-link">Dashboard</Link>}
                {user.role === 'patient' && <Link to="/patient" className="nav-link">Dashboard</Link>}
                {user.role === 'hospital' && <Link to="/hospital" className="nav-link">Dashboard</Link>}
                {user.role === 'admin' && <Link to="/admin" className="nav-link">Admin</Link>}
                <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-2 py-1 shadow-sm backdrop-blur">
                  <span className="hidden max-w-[140px] truncate px-2 text-sm text-medical-gray md:inline">
                    {user.name}
                  </span>
                  <button onClick={handleLogout} className="btn-secondary text-sm py-1.5">Logout</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="btn-primary">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-auto border-t border-white/20 bg-blood-dark text-white">
        <div className="hidden max-w-6xl mx-auto px-4 py-8 text-center">
          BIO SYNC
        </div>
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="font-display text-lg tracking-[0.16em]">{BRAND_NAME}</p>
          <p className="mt-2 text-sm text-gray-300">
            Bio-synced emergency coordination for live donor matching, hospital trust, and faster response.
          </p>
        </div>
      </footer>
    </div>
  );
}
