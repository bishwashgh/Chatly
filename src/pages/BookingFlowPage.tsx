import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { venuesApi } from '../lib/venuesApi'
import { bookingsApi } from '../lib/bookingsApi'
import { paymentsApi } from '../lib/paymentsApi'
import { normalizeError } from '../lib/api'
import type { PaymentProvider } from '../types'
import { LoadingState, ErrorState } from '../components/Feedback'

function todayStr() { return new Date().toISOString().split('T')[0] }
function diffDaysInclusive(start: string, end: string) {
  const s = new Date(start); const e = new Date(end)
  return Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1
}

export default function BookingFlowPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: venue, isLoading, isError, refetch } = useQuery({ queryKey: ['venue', id], queryFn: () => venuesApi.get(id!), enabled: !!id })

  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [provider, setProvider] = useState<PaymentProvider>('khalti')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0
    return Math.max(0, diffDaysInclusive(startDate, endDate))
  }, [startDate, endDate])

  const total = venue ? venue.basePrice * days : 0
  const deposit = Math.round(total * 0.4)

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault()
    if (!venue) return
    setError('')
    setSubmitting(true)
    try {
      const booking = await bookingsApi.create({ venueId: venue.id, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() })
      const payRes = await paymentsApi.initialize({ bookingId: booking.id, provider })
      if (payRes.paymentUrl) { window.location.href = payRes.paymentUrl; return }
      if (provider === 'esewa' && payRes.formData) {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = payRes.formData.action ?? ''
        Object.entries(payRes.formData).forEach(([k, v]) => {
          if (k === 'action') return
          const input = document.createElement('input')
          input.type = 'hidden'; input.name = k; input.value = v
          form.appendChild(input)
        })
        document.body.appendChild(form); form.submit(); return
      }
      navigate('/bookings')
    } catch (err) {
      setError(normalizeError(err).message)
      setSubmitting(false)
    }
  }

  if (isLoading) return <LoadingState />
  if (isError || !venue) return <div className="container-app py-16"><ErrorState message="Could not load this venue." onRetry={refetch} /></div>

  return (
    <div className="container-app py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900">Book {venue.name}</h1>
      <p className="mt-2 text-slate-500">Select your event dates and choose a payment method.</p>

      <form onSubmit={handleConfirm} className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">Event details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="startDate">Start date</label><input id="startDate" type="date" min={todayStr()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" required /></div>
            <div><label className="label" htmlFor="endDate">End date</label><input id="endDate" type="date" min={startDate || todayStr()} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" required /></div>
          </div>
          {days > 0 && <p className="mt-3 text-sm text-slate-500">{days} {days === 1 ? 'day' : 'days'} (inclusive of start and end dates)</p>}

          <h2 className="mt-8 font-display text-lg font-semibold text-slate-900">Payment method</h2>
          <p className="mt-1 text-sm text-slate-500">A 40% deposit is required to confirm your booking.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(['khalti', 'esewa'] as PaymentProvider[]).map((p) => (
              <button key={p} type="button" onClick={() => setProvider(p)} className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${provider === p ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white ${p === 'khalti' ? 'bg-purple-600' : 'bg-green-600'}`}>{p === 'khalti' ? 'K' : 'e'}</span>
                <div><div className="font-semibold capitalize text-slate-900">{p}</div><div className="text-xs text-slate-500">Pay securely with {p}</div></div>
              </button>
            ))}
          </div>
        </div>

        <div className="card h-fit p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-slate-900">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Venue</dt><dd className="font-medium text-slate-900">{venue.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Rate</dt><dd className="font-medium text-slate-900">Rs {venue.basePrice.toLocaleString()}/day</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Days</dt><dd className="font-medium text-slate-900">{days}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Total</dt><dd className="font-semibold text-slate-900">Rs {total.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Deposit (40%)</dt><dd className="font-display text-xl font-bold text-primary-600">Rs {deposit.toLocaleString()}</dd></div>
          </dl>
          {error && <div className="mt-4 rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
          <button type="submit" disabled={submitting || days <= 0} className="btn-primary mt-5 w-full">{submitting ? 'Processing…' : `Pay Rs ${deposit.toLocaleString()} & confirm`}</button>
          <p className="mt-3 text-center text-xs text-slate-400">You'll be redirected to {provider} to complete payment.</p>
        </div>
      </form>
    </div>
  )
}
