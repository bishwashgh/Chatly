import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { venuesApi } from '../lib/venuesApi';
import { imageUrl } from '../lib/api';
import { LoadingState, ErrorState } from '../components/Feedback';

export default function HomePage() {
  const { data: venues, isLoading, isError, refetch } = useQuery({ 
    queryKey: ['venues'], 
    queryFn: venuesApi.list 
  });
  const featured = (venues ?? []).slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} />
        {/* Decorative Circles */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"></div>
        
        <div className="container-app relative py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-white/20 backdrop-blur-sm">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h12a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
              </svg>
              Premier Venue Booking Platform
            </span>
            
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              Book premium venues for your events
            </h1>
            
            <p className="mt-4 text-lg text-blue-100/90 md:text-xl">
              Discover perfect spaces in Bihe, Bratabanda, Pasni and more. Check real-time availability, secure your dates, and pay securely with Khalti or eSewa.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-3">
              <Link 
                to="/venues" 
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-lg shadow-blue-900/30 transition-all hover:scale-105 hover:bg-blue-50 hover:shadow-blue-900/40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
              >
                Browse Venues
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link 
                to="/sign-up" 
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create account
              </Link>
            </div>
          </div>
        </div>
        
        {/* Hero Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F0F9FF"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container-app relative z-10 -mt-8">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-amber-200/30 bg-white/80 p-6 shadow-lg shadow-amber-900/10 backdrop-blur-sm md:grid-cols-4">
          {[
            { label: 'Venues listed', value: venues?.length ?? '—', icon: '🏛️' },
            { label: 'Booking types', value: '2', icon: '📋' },
            { label: 'Payment methods', value: '2', icon: '💳' },
            { label: 'Secure payments', value: '100%', icon: '🔒' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1 font-display text-2xl font-bold bg-gradient-to-r from-red-700 to-amber-600 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Venues Section */}
      <section className="container-app py-16">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <h2 className="font-display text-2xl font-bold text-stone-900">Featured venues</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">Handpicked spaces for memorable events.</p>
          </div>
          <Link 
            to="/venues" 
            className="hidden items-center gap-1 text-sm font-semibold text-amber-700 transition-all hover:gap-2 hover:text-red-700 sm:flex"
          >
            View all
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Could not load venues." onRetry={refetch} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => (
              <Link 
                key={v.id} 
                to={`/venues/${v.id}`} 
                className="group overflow-hidden rounded-xl border border-amber-200/30 bg-white/80 shadow-lg shadow-amber-900/5 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-amber-900/10 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                  {v.images?.[0] ? (
                    <img 
                      src={imageUrl(v.images[0])} 
                      alt={v.name} 
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-amber-300">
                      <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Type Badge Overlay */}
                  <div className="absolute left-3 top-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-amber-700 backdrop-blur-sm shadow-sm">
                      {v.type === 'conferencehall' ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5m2 0h.5A2.5 2.5 0 0014 5.5V3.935M12 20.5v-2.5m0 0h.5m-.5 0h-2.5m0 0V15m0 0h.5m-.5 0h-2.5" />
                        </svg>
                      )}
                      {v.type === 'conferencehall' ? 'Conference Hall' : 'Outdoor'}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-lg font-semibold text-stone-900 group-hover:text-amber-700 transition-colors">
                      {v.name}
                    </h3>
                    <span className="text-sm font-bold text-red-700 whitespace-nowrap ml-2">
                      Rs {v.basePrice.toLocaleString()}
                      <span className="text-xs font-normal text-stone-400">/day</span>
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-1 text-sm text-stone-500">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{v.address}</span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {v.capacity} guests
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      4.8
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-r from-amber-50/80 via-orange-50/80 to-amber-50/80 py-16 border-t border-amber-200/30">
        <div className="container-app">
          <div className="text-center">
            <span className="text-3xl">🚀</span>
            <h2 className="mt-2 font-display text-2xl font-bold text-stone-900">How it works</h2>
            <p className="mt-1 text-sm text-stone-500">Book your perfect venue in three simple steps</p>
          </div>
          
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { 
                step: '1', 
                title: 'Find a venue', 
                text: 'Browse conference halls and outdoor spaces by capacity, location, and price.',
                icon: '🔍',
                bg: 'from-amber-100 to-orange-100'
              },
              { 
                step: '2', 
                title: 'Book your dates', 
                text: 'Pick your event dates. We check for conflicts and calculate the total instantly.',
                icon: '📅',
                bg: 'from-orange-100 to-red-100'
              },
              { 
                step: '3', 
                title: 'Pay securely', 
                text: 'Pay a 40% deposit with Khalti or eSewa. Your booking is confirmed on success.',
                icon: '💳',
                bg: 'from-red-100 to-amber-100'
              },
            ].map((s) => (
              <div key={s.step} className="group text-center">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${s.bg})` }}>
                  <span className="text-3xl">{s.icon}</span>
                  <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm font-extrabold text-white shadow-lg shadow-red-600/30">
                    {s.step}
                  </div>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-stone-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-app py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-amber-700 p-8 md:p-12 shadow-xl shadow-red-900/20">
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }} />
          
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h3 className="font-display text-2xl font-bold text-white md:text-3xl">
                Ready to find your perfect venue?
              </h3>
              <p className="mt-2 text-amber-100/90">
                Join thousands of satisfied customers who booked their events with us.
              </p>
            </div>
            <Link 
              to="/venues" 
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-red-700 shadow-lg shadow-red-900/30 transition-all hover:scale-105 hover:bg-amber-50 hover:shadow-red-900/40 flex-shrink-0"
            >
              Get started
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}