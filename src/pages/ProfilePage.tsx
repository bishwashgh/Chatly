import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { usersApi } from '../lib/usersApi'
import { normalizeError } from '../lib/api'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await usersApi.updateProfile({ name, email })
      await refreshUser()
      setMessage({ type: 'success', text: '✅ Profile updated successfully.' })
    } catch (err) {
      const error = normalizeError(err)
      setMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-app py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900">Your profile</h1>
      <p className="mt-2 text-slate-500">Manage your account details and preferences.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-display text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="badge mt-3 bg-blue-50 text-blue-700 capitalize font-semibold">
              {user?.role?.toLowerCase()}
            </span>
            {user?.isTfaEnabled && (
              <span className="mt-2 flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                2FA Enabled
              </span>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">Edit profile</h2>
          
          {message && (
            <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === 'success' 
                ? 'border border-green-200 bg-green-50 text-green-700' 
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input 
                id="name" 
                type="text"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="input" 
                required
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="input" 
                required
                disabled={saving}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={saving} 
              className="btn-primary mt-6 w-full"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving…
                </span>
              ) : (
                'Save changes'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
