import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { venuesApi } from '../lib/venuesApi';
import { imageUrl } from '../lib/api';
import type { VenueType } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/Feedback';

type Filter = 'all' | VenueType;

export default function VenuesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [animate, setAnimate] = useState(false);

  const { data: venues, isLoading, isError, refetch } = useQuery({ 
    queryKey: ['venues'], 
    queryFn: venuesApi.list 
  });

  useEffect(() => {
    setAnimate(true);
  }, []);

  const filtered = useMemo(() => {
    if (!venues) return [];
    return venues.filter((v) => {
      const matchType = filter === 'all' || v.type === filter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [venues, filter, search]);

  const filters: { key: Filter; label: string; icon: string }[] = [
    { key: 'all', label: 'All venues', icon: '🏛️' },
    { key: 'conferencehall', label: 'Conference halls', icon: '💼' },
    { key: 'outdoor', label: 'Outdoor', icon: '🌳' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-blue-50/50">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-cyan-200/10 blur-3xl"></div>
      </div>

      <div className="container-app relative py-10">
        {/* Header Section with Animation */}
        <div className={`mb-10 transition-all duration-700 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏛️</span>
            <div>
              <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
                Discover Venues
              </h1>
              <p className="mt-1 text-slate-500">
                Find the perfect space for your event in Bihe, Bratabanda, Pasni and beyond.
              </p>
            </div>
          </div>
          
          {/* Decorative Line */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600"></div>
            <div className="h-1 w-1 rounded-full bg-cyan-400"></div>
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300"></div>
          </div>
        </div>

        {/* Filters Section with Animation */}
        <div className={`mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 delay-100 ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="relative max-w-sm flex-1">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by name or location…" 
              className="w-full rounded-full border border-amber-200/50 bg-white/80 px-5 py-3 pl-12 text-sm text-stone-900 placeholder-stone-400 backdrop-blur-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 hover:shadow-md" 
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button 
                key={f.key} 
                onClick={() => setFilter(f.key)} 
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  filter === f.key 
                    ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white shadow-lg shadow-red-700/30 scale-105' 
                    : 'bg-white/80 text-stone-600 border border-amber-200/30 hover:bg-amber-50 hover:border-amber-400 hover:scale-105'
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && !isError && (
          <div className={`mb-4 text-sm text-stone-500 transition-all duration-700 delay-200 ${
            animate ? 'opacity-100' : 'opacity-0'
          }`}>
            Showing {filtered.length} {filtered.length === 1 ? 'venue' : 'venues'}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message="Could not load venues." onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <div className={`transition-all duration-700 delay-300 ${
            animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <EmptyState 
              title="No venues found" 
              description="Try adjusting your search or filters." 
              action={
                <button 
                  onClick={() => { setFilter('all'); setSearch(''); }} 
                  className="inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-white/70 px-6 py-2.5 text-sm font-semibold text-amber-800 shadow-sm backdrop-blur-sm transition-all hover:bg-amber-50 hover:border-amber-600/50 hover:scale-105"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset filters
                </button>
              } 
            />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v, index) => (
              <Link 
                key={v.id} 
                to={`/venues/${v.id}`} 
                className={`group overflow-hidden rounded-xl border border-amber-200/30 bg-white/80 shadow-lg shadow-amber-900/5 backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-amber-900/10 hover:-translate-y-2 ${
                  animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                  {v.images?.[0] ? (
                    <img 
                      src={imageUrl(v.images[0])} 
                      alt={v.name} 
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110" 
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
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-amber-700 backdrop-blur-sm shadow-sm">
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
                  
                  {/* Price Badge */}
                  <div className="absolute right-3 bottom-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-red-700 backdrop-blur-sm shadow-sm">
                      Rs {v.basePrice.toLocaleString()}
                      <span className="text-xs font-normal text-stone-400">/day</span>
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-stone-900 group-hover:text-amber-700 transition-colors">
                    {v.name}
                  </h3>
                  
                  <div className="mt-1.5 flex items-center gap-1 text-sm text-stone-500">
                    <svg className="h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{v.address}</span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {v.capacity} guests
                    </span>
                    
                    {v.description && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-amber-300"></span>
                        <span className="truncate flex-1">{v.description}</span>
                      </>
                    )}
                  </div>

                  {/* View Details Link */}
                  <div className="mt-4 flex items-center justify-between border-t border-amber-100/50 pt-3">
                    <span className="text-xs text-stone-400">Click to view details</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition-all group-hover:gap-2">
                      View
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}