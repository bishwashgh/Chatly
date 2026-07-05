import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { venuesApi, type CreateVenuePayload } from '../../lib/venuesApi'
import { imageUrl, normalizeError } from '../../lib/api'
import type { Venue, VenueType } from '../../types'
import { Modal } from '../../components/Modal'
import { LoadingState, ErrorState, EmptyState } from '../../components/Feedback'

const emptyForm: CreateVenuePayload = { name: '', type: 'conferencehall', capacity: 100, description: '', email: '', phone: '', address: '', basePrice: 1000 }

export default function AdminVenuesPage() {
  const qc = useQueryClient()
  const { data: venues, isLoading, isError, refetch } = useQuery({ queryKey: ['venues'], queryFn: venuesApi.list })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Venue | null>(null)
  const [form, setForm] = useState<CreateVenuePayload>(emptyForm)
  const [images, setImages] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openCreate = () => { setEditing(null); setForm(emptyForm); setImages([]); setError(''); setModalOpen(true) }
  const openEdit = (v: Venue) => {
    setEditing(v)
    setForm({ name: v.name, type: v.type, capacity: v.capacity, description: v.description ?? '', email: v.email, phone: v.phone, address: v.address, basePrice: v.basePrice })
    setImages([]); setError(''); setModalOpen(true)
  }
  const update = (k: keyof CreateVenuePayload, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await venuesApi.update(editing.id, form)
      else await venuesApi.create(form, images)
      qc.invalidateQueries({ queryKey: ['venues'] })
      setModalOpen(false)
    } catch (err) { setError(normalizeError(err).message) }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this venue? This cannot be undone.')) return
    await venuesApi.remove(id)
    qc.invalidateQueries({ queryKey: ['venues'] })
  }

  return (
    <div className="container-app py-10">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Manage venues</h1>
          <p className="mt-2 text-slate-500">Create, edit, and remove venue listings.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New venue
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">📍 Venues</span>
        <Link to="/admin/users" className="badge bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">👥 Users</Link>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Could not load venues." onRetry={refetch} />
      ) : !venues?.length ? (
        <div className="card mt-8">
          <EmptyState 
            title="No venues yet" 
            description="Create your first venue to start accepting bookings"
            action={<button onClick={openCreate} className="btn-primary">Create your first venue</button>} 
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-blue-100/50 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-blue-100/50 bg-gradient-to-r from-blue-50 to-cyan-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-4 font-semibold">Venue Name</th>
                <th className="px-4 py-4 font-semibold">Type</th>
                <th className="px-4 py-4 font-semibold">Capacity</th>
                <th className="px-4 py-4 font-semibold">Price/Day</th>
                <th className="px-4 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100/30">
              {venues.map((v) => (
                <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                        {v.images?.[0] ? (
                          <img src={imageUrl(v.images[0])} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-400">
                            🏛️
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{v.name}</div>
                        <div className="text-xs text-slate-500">{v.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-blue-100/50 px-2.5 py-1 text-xs font-medium text-blue-700 capitalize">
                      {v.type === 'conferencehall' ? '🏢 Conference Hall' : '🌳 Outdoor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-600">{v.capacity} pax</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">Rs {v.basePrice.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openEdit(v)} 
                        className="btn-ghost text-xs font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => remove(v.id)} 
                        className="btn-ghost text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '✏️ Edit venue' : '🏛️ Create new venue'} size="lg">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">❌ {error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Venue Name *</label><input required value={form.name} onChange={(e) => update('name', e.target.value)} className="input" placeholder="E.g., Grand Ballroom" /></div>
            <div><label className="label">Venue Type *</label><select value={form.type} onChange={(e) => update('type', e.target.value as VenueType)} className="input"><option value="conferencehall">🏢 Conference Hall</option><option value="outdoor">🌳 Outdoor Space</option></select></div>
            <div><label className="label">Capacity (pax) *</label><input type="number" min={1} required value={form.capacity} onChange={(e) => update('capacity', Number(e.target.value))} className="input" placeholder="100" /></div>
            <div><label className="label">Base Price / Day (Rs) *</label><input type="number" min={0} required value={form.basePrice} onChange={(e) => update('basePrice', Number(e.target.value))} className="input" placeholder="5000" /></div>
            <div><label className="label">Email *</label><input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className="input" placeholder="contact@venue.com" /></div>
            <div><label className="label">Phone *</label><input required value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input" placeholder="+977 9841234567" /></div>
          </div>
          <div><label className="label">Address *</label><input required value={form.address} onChange={(e) => update('address', e.target.value)} className="input" placeholder="Street address, area, city" /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} className="input" placeholder="Describe the venue features, amenities, etc." /></div>
          {!editing && (
            <div><label className="label">Images (max 4 images, 5MB each)</label><input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files ?? []))} className="input" />{images.length > 0 && <p className="mt-2 text-xs font-medium text-green-700">✅ {images.length} file(s) selected</p>}</div>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '⏳ Saving…' : '💾 Save venue'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
