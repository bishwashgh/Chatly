import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { venuesApi } from '../lib/venuesApi'
import { imageUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { LoadingState, ErrorState } from '../components/Feedback'

export default function VenueDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [activeImage, setActiveImage] = useState(0)

  const { data: venue, isLoading, isError, refetch } = useQuery({
    queryKey: ['venue', id], queryFn: () => venuesApi.get(id!), enabled: !!id,
  })

  const handleBook = () => {
    if (!isAuthenticated) { navigate('/sign-in', { state: { from: `/venues/${id}/book` } }); return }
    navigate(`/venues/${id}/book`)
  }

  if (isLoading) return <LoadingState />
  if (isError || !venue) return <div className="container-app py-16"><ErrorState message="Could not load this venue." onRetry={refetch} /></div>

  const images = venue.images?.length ? venue.images : []

  return (
    <div className="container-app py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link to="/venues" className="hover:text-primary-600">Venues</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{venue.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
            {images[activeImage] ? (
              <img src={imageUrl(images[activeImage])} alt={venue.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${activeImage === i ? 'border-primary-500' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6">
            <span className="badge bg-blue-50 text-blue-700">{venue.type === 'conferencehall' ? 'Conference Hall' : 'Outdoor'}</span>
            <h1 className="mt-3 font-display text-2xl font-bold text-slate-900">{venue.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{venue.address}</p>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Capacity</span><span className="font-semibold text-slate-900">{venue.capacity} guests</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Contact</span><span className="font-semibold text-slate-900">{venue.email}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Phone</span><span className="font-semibold text-slate-900">{venue.phone}</span></div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-slate-900">Rs {venue.basePrice.toLocaleString()}</span>
                <span className="text-slate-400">/ day</span>
              </div>
              <button onClick={handleBook} className="btn-primary mt-5 w-full">
                Book this venue
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">40% deposit required to confirm</p>
            </div>
          </div>
        </div>
      </div>

      {venue.description && (
        <div className="mt-10">
          <h2 className="font-display text-xl font-bold text-slate-900">About this venue</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">{venue.description}</p>
        </div>
      )}
    </div>
  )
}
