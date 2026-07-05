import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '../lib/bookingsApi'
import { imageUrl } from '../lib/api'
import type { Booking, BookingStatus } from '../types'
import { LoadingState, ErrorState, EmptyState } from '../components/Feedback'

const statusStyles: Record<BookingStatus, string> = {
  pending_payment: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border border-green-200',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const statusLabel: Record<BookingStatus, string> = {
  pending_payment: 'Pending Payment', 
  confirmed: 'Confirmed', 
  cancelled: 'Cancelled',
}

export default function BookingsPage() {
  const qc = useQueryClient()
  const { data: bookings, isLoading, isError, refetch } = useQuery({ 
    queryKey: ['my-bookings'], 
    queryFn: bookingsApi.listMine 
  })

  const handleCancel = async (id: number, status: BookingStatus) => {
    // Don't allow cancellation of already cancelled bookings
    if (status === 'cancelled') {
      alert('This booking is already cancelled.')
      return
    }
    
    if (!confirm('Cancel this booking? This action cannot be undone.')) return
    
    try {
      await bookingsApi.cancel(id)
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      alert('Booking cancelled successfully.')
    } catch (error: any) {
      console.error('Cancel error:', error)
      // Handle specific error types
      if (error.response?.status === 404) {
        alert('Booking not found.')
      } else if (error.response?.status === 401) {
        alert('Please sign in again to cancel this booking.')
      } else if (error.response?.status === 400) {
        alert(error.response.data?.message || 'Cannot cancel this booking.')
      } else {
        alert('Failed to cancel booking. Please try again later.')
      }
    }
  }

  if (isLoading) return <div className="container-app py-16"><LoadingState /></div>
  if (isError) return <div className="container-app py-16"><ErrorState message="Could not load your bookings." onRetry={refetch} /></div>

  return (
    <div className="container-app py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900">My bookings</h1>
      <p className="mt-2 text-slate-500">Track and manage your venue reservations.</p>

      {!bookings || bookings.length === 0 ? (
        <div className="card mt-8"><EmptyState title="No bookings yet" description="Browse venues and book your first event space." action={<Link to="/venues" className="btn-primary">Browse venues</Link>} /></div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b: Booking) => (
            <div key={b.id} className="card overflow-hidden">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="h-24 w-full flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-32">
                  {b.venue?.images?.[0] ? (
                    <img src={imageUrl(b.venue.images[0])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-slate-900">
                        {b.venue?.name ?? `Venue #${b.venueId ?? '?'}`}
                      </h3>
                      <p className="text-sm text-slate-500">{b.venue?.address}</p>
                    </div>
                    <span className={`badge ${statusStyles[b.status]}`}>{statusLabel[b.status]}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                    <span>
                      <span className="font-medium text-slate-700">{new Date(b.startDate).toLocaleDateString()}</span>
                      {' → '}
                      <span className="font-medium text-slate-700">{new Date(b.endDate).toLocaleDateString()}</span>
                    </span>
                    <span>{b.days} {b.days === 1 ? 'day' : 'days'}</span>
                    <span className="font-semibold text-slate-900">Rs {Number(b.amount).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:w-32">
                  {b.venue && <Link to={`/venues/${b.venue.id}`} className="btn-secondary text-xs">View venue</Link>}
                  {b.status === 'pending_payment' && b.venue && (
                    <Link to={`/venues/${b.venue.id}/book`} className="btn-primary text-xs">Pay now</Link>
                  )}
                  {/* ✅ Show cancel button only if not cancelled */}
                  {b.status !== 'cancelled' && (
                    <button 
                      onClick={() => handleCancel(b.id)} 
                      className="btn-ghost text-xs text-error-600 hover:bg-error-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}