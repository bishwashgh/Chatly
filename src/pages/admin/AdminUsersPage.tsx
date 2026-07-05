import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersApi } from '../../lib/usersApi'
import { normalizeError } from '../../lib/api'
import type { User } from '../../types'
import { LoadingState, ErrorState, EmptyState } from '../../components/Feedback'

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { data: users, isLoading, isError, refetch } = useQuery<User[]>({ 
    queryKey: ['admin-users'], 
    queryFn: usersApi.listAll
  })
  const [removing, setRemoving] = useState<number | null>(null)
  const [error, setError] = useState('')

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"? This action cannot be undone and all their bookings will be affected.`)) return
    setRemoving(id)
    setError('')
    try { 
      await usersApi.delete(id)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      alert('User deleted successfully.')
    }
    catch (err) { 
      setError(normalizeError(err).message)
    }
    finally { 
      setRemoving(null) 
    }
  }

  const roleBadge = (role: string) => {
    const map: Record<string, { bg: string; text: string; icon: string }> = { 
      ADMIN: { bg: 'bg-red-50', text: 'text-red-700', icon: '👑' },
      MANAGER: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🔑' },
      PROVIDER: { bg: 'bg-orange-50', text: 'text-orange-700', icon: '🏢' },
      CUSTOMER: { bg: 'bg-green-50', text: 'text-green-700', icon: '👤' }
    }
    const style = map[role] ?? { bg: 'bg-slate-100', text: 'text-slate-600', icon: '?' }
    return { ...style }
  }

  return (
    <div className="container-app py-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">👥 Manage users</h1>
        <p className="mt-2 text-slate-500">View and manage all registered users in the system.</p>
      </div>
      
      <div className="mt-4 flex gap-2">
        <Link to="/admin/venues" className="badge bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">📍 Venues</Link>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">👥 Users</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          ❌ {error}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Could not load users." onRetry={refetch} />
      ) : !users?.length ? (
        <div className="card mt-8">
          <EmptyState title="No users found" />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-blue-100/50 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-blue-100/50 bg-gradient-to-r from-blue-50 to-cyan-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-4 font-semibold">User Name</th>
                <th className="px-4 py-4 font-semibold">Email Address</th>
                <th className="px-4 py-4 font-semibold">Role</th>
                <th className="px-4 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100/30">
              {users.map((u) => {
                const style = roleBadge(u.role)
                return (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-display text-sm font-semibold text-white">
                          {u.name?.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
                        {style.icon} {u.role?.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => remove(u.id, u.name)} 
                        disabled={removing === u.id} 
                        className="btn-ghost text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {removing === u.id ? '⏳ Deleting…' : '🗑️ Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
