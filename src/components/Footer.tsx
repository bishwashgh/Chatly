import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-blue-200/30 bg-gradient-to-r from-blue-50/95 via-cyan-50/95 to-blue-50/95">
      <div className="container-app py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
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
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Book premium venues for your events. Find spaces in Bihe, Bratabanda, Pasni and beyond. Secure, simple, and seamless booking.
            </p>
            {/* Social Icons */}
            <div className="mt-5 flex gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-600/20 bg-white/70 text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-600/40 hover:shadow-md">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-800">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/venues" className="flex items-center gap-2 text-slate-600 transition-colors hover:text-blue-700 hover:translate-x-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  </svg>
                  Browse Venues
                </Link>
              </li>
              <li>
                <Link to="/bookings" className="flex items-center gap-2 text-slate-600 transition-colors hover:text-blue-700 hover:translate-x-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  My Bookings
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex items-center gap-2 text-slate-600 transition-colors hover:text-blue-700 hover:translate-x-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-800">
              Account
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/sign-in" className="flex items-center gap-2 text-slate-600 transition-colors hover:text-blue-700 hover:translate-x-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/sign-up" className="flex items-center gap-2 text-slate-600 transition-colors hover:text-blue-700 hover:translate-x-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-blue-200/30 pt-6 text-sm text-slate-400">
          <span>
            © {new Date().getFullYear()} VenueBook. Premier event venue booking platform.
          </span>
        </div>
      </div>
    </footer>
  );
}