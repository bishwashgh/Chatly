import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState} from 'react'
export function Navbar() {
  const { isAuthenticated, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-blue-200/30 bg-gradient-to-r from-blue-50/95 via-cyan-50/95 to-blue-50/95 backdrop-blur-md shadow-sm">
      <nav className="container-app flex h-[76px] items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <div className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-900/30 ring-2 ring-cyan-400/20">
            <div className="absolute inset-1 rounded-full border border-white/25"></div>
            <svg className="h-6 w-6 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-600 bg-clip-text text-[22px] font-extrabold tracking-tight text-transparent">
              VenueBook
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[2px] text-blue-700/85">
              Event Spaces
            </span>
          </div>
        </Link>

        {/* Ornament */}
        <div className="hidden items-center gap-2 text-blue-600/40 md:flex">
          <div className="h-px w-7 bg-gradient-to-r from-transparent to-blue-600/50"></div>
          <div className="h-1.5 w-1.5 rotate-45 bg-blue-600/50"></div>
          <div className="h-px w-7 bg-gradient-to-l from-transparent to-blue-600/50"></div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/venues" className={navLink}>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              </svg>
              Browse Venues
            </span>
          </NavLink>
          
          <span className="mx-1.5 h-1.5 w-1.5 rounded-full bg-blue-600/30"></span>

          {isAuthenticated && (
            <>
              <NavLink to="/bookings" className={navLink}>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  My Bookings
                </span>
              </NavLink>
              <span className="mx-1.5 h-1.5 w-1.5 rounded-full bg-blue-600/30"></span>
            </>
          )}

          {isAdmin && (
            <>
              <NavLink to="/admin/venues" className={navLink}>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Admin
                </span>
              </NavLink>
              <span className="mx-1.5 h-1.5 w-1.5 rounded-full bg-blue-600/30"></span>
            </>
          )}
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-amber-600/20 bg-white/80 shadow-sm hover:bg-amber-50">
                <svg className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white"></span>
              </button>

              <div className="h-6 w-px bg-gradient-to-b from-transparent via-amber-600/30 to-transparent"></div>

              {/* User Pill */}
              <Link to="/profile" className="flex items-center gap-2.5 rounded-full border border-amber-600/25 bg-gradient-to-r from-white/90 to-amber-50/80 px-3 py-1.5 pr-3.5 shadow-sm transition-colors hover:bg-amber-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-sm font-extrabold text-white shadow-md shadow-amber-600/30">
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold text-stone-700">{user?.name?.split(' ')[0]}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    {isAdmin ? 'Admin' : 'Member'}
                  </span>
                </div>
                {isAdmin && (
                  <span className="ml-1 flex items-center gap-1 rounded-full bg-red-50/80 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 ring-1 ring-red-200">
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Admin
                  </span>
                )}
                <svg className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </Link>

              <button onClick={handleSignOut} className="btn-ghost-danger">
                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link to="/sign-in" className="btn-ghost">
                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign in
              </Link>
              <Link to="/sign-up" className="btn-primary">
                <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-amber-200/30 bg-white px-4 py-4 shadow-lg md:hidden">
          <div className="flex flex-col gap-2">
            <NavLink to="/venues" className={navLink} onClick={() => setMenuOpen(false)}>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Venues
              </span>
            </NavLink>
            <NavLink to="/events" className={navLink} onClick={() => setMenuOpen(false)}>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Events
              </span>
            </NavLink>
            <NavLink to="/gallery" className={navLink} onClick={() => setMenuOpen(false)}>
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Gallery
              </span>
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/bookings" className={navLink} onClick={() => setMenuOpen(false)}>
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    My Bookings
                  </span>
                </NavLink>
              </>
            )}
            {isAdmin && (
              <NavLink to="/admin/venues" className={navLink} onClick={() => setMenuOpen(false)}>
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Manage
                </span>
              </NavLink>
            )}
            <div className="mt-3 flex flex-col gap-2 border-t border-stone-200 pt-3">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="btn-secondary" onClick={() => setMenuOpen(false)}>
                    Profile
                  </Link>
                  <button onClick={handleSignOut} className="btn-secondary">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/sign-in" className="btn-secondary" onClick={() => setMenuOpen(false)}>
                    Sign in
                  </Link>
                  <Link to="/sign-up" className="btn-primary" onClick={() => setMenuOpen(false)}>
                    Book Now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}