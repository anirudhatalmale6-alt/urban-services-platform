'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface ProviderProfile {
  id: string
  bio: string | null
  experience: number
  idDocument: string | null
  idDocumentType: string | null
  isApproved: boolean
  approvedAt: string | null
  rating: number
  totalReviews: number
  totalEarnings: number
  serviceAreaCity: string | null
}

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  isVerified: boolean
  isActive: boolean
  createdAt: string
  providerProfile: ProviderProfile | null
}

const ROLE_FILTERS = ['ALL', 'CONSUMER', 'PROVIDER', 'ADMIN']

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  CONSUMER: { bg: 'bg-blue-50', text: 'text-blue-700' },
  PROVIDER: { bg: 'bg-green-50', text: 'text-green-700' },
  ADMIN: { bg: 'bg-purple-50', text: 'text-purple-700' },
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const initialRole = searchParams.get('role') || 'ALL'

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState(initialRole)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (roleFilter !== 'ALL') params.set('role', roleFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setUsers(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [roleFilter, search])

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, search ? 400 : 0)
    return () => clearTimeout(timeout)
  }, [fetchUsers, search])

  const handleToggleActive = async (userId: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'toggleActive' }),
      })
      if (res.ok) {
        const { isActive } = await res.json()
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)))
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveProvider = async (userId: string) => {
    setActionLoading(userId + '-approve')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approveProvider' }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  isVerified: true,
                  providerProfile: u.providerProfile
                    ? { ...u.providerProfile, isApproved: true, approvedAt: new Date().toISOString() }
                    : u.providerProfile,
                }
              : u
          )
        )
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectProvider = async (userId: string) => {
    setActionLoading(userId + '-reject')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'rejectProvider' }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  providerProfile: u.providerProfile
                    ? { ...u.providerProfile, isApproved: false, approvedAt: null }
                    : u.providerProfile,
                }
              : u
          )
        )
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage all users, providers, and admins on the platform.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-6">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
          {/* Role filter tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {ROLE_FILTERS.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  roleFilter === role
                    ? 'bg-[#6C63FF] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {role === 'ALL' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="w-1/3 h-4 bg-gray-200 rounded mb-2" />
                  <div className="w-1/4 h-3 bg-gray-200 rounded" />
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded-full" />
                <div className="w-20 h-8 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No users found</p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-50">
              {users.map((u) => {
                const roleBadge = ROLE_BADGE[u.role] || ROLE_BADGE.CONSUMER
                const isProvider = u.role === 'PROVIDER'
                const isExpanded = expandedUser === u.id

                return (
                  <div key={u.id}>
                    {/* Main row */}
                    <div className="px-4 sm:px-6 py-4 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                      {/* User info */}
                      <div className="col-span-3 flex items-center gap-3 mb-3 md:mb-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6C63FF] to-[#5A52D5] rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {u.name[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </div>

                      {/* Role */}
                      <div className="col-span-2 mb-2 md:mb-0">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge.bg} ${roleBadge.text}`}>
                          {u.role}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 mb-2 md:mb-0 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className={`text-xs font-medium ${u.isActive ? 'text-green-700' : 'text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {u.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Joined */}
                      <div className="col-span-2 mb-3 md:mb-0">
                        <span className="text-xs text-gray-500">{formatDate(u.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        {isProvider && (
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          disabled={actionLoading === u.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                            u.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {actionLoading === u.id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {/* Provider details (expanded) */}
                    {isProvider && isExpanded && u.providerProfile && (
                      <div className="px-6 pb-4 bg-gray-50/50">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Provider Details</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500">Experience</p>
                              <p className="text-sm font-semibold text-gray-900">{u.providerProfile.experience} yrs</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rating</p>
                              <p className="text-sm font-semibold text-gray-900">{u.providerProfile.rating.toFixed(1)} ({u.providerProfile.totalReviews} reviews)</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Earnings</p>
                              <p className="text-sm font-semibold text-gray-900">{'\u20B9'}{u.providerProfile.totalEarnings.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Service Area</p>
                              <p className="text-sm font-semibold text-gray-900">{u.providerProfile.serviceAreaCity || 'Not set'}</p>
                            </div>
                          </div>

                          {u.providerProfile.bio && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-1">Bio</p>
                              <p className="text-sm text-gray-700">{u.providerProfile.bio}</p>
                            </div>
                          )}

                          {u.providerProfile.idDocument && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-1">ID Document</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                  {u.providerProfile.idDocumentType || 'Document'}
                                </span>
                                <a
                                  href={u.providerProfile.idDocument}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-[#6C63FF] hover:underline"
                                >
                                  View Document
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Approval Status & Actions */}
                          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              u.providerProfile.isApproved
                                ? 'bg-green-50 text-green-700'
                                : 'bg-yellow-50 text-yellow-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                u.providerProfile.isApproved ? 'bg-green-400' : 'bg-yellow-400'
                              }`} />
                              {u.providerProfile.isApproved ? 'Approved' : 'Pending Approval'}
                            </span>

                            {!u.providerProfile.isApproved && (
                              <>
                                <button
                                  onClick={() => handleApproveProvider(u.id)}
                                  disabled={actionLoading === u.id + '-approve'}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-white hover:opacity-90 transition disabled:opacity-50"
                                >
                                  {actionLoading === u.id + '-approve' ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleRejectProvider(u.id)}
                                  disabled={actionLoading === u.id + '-reject'}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                                >
                                  {actionLoading === u.id + '-reject' ? 'Rejecting...' : 'Reject'}
                                </button>
                              </>
                            )}

                            {u.providerProfile.isApproved && (
                              <button
                                onClick={() => handleRejectProvider(u.id)}
                                disabled={actionLoading === u.id + '-reject'}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                              >
                                {actionLoading === u.id + '-reject' ? 'Revoking...' : 'Revoke Approval'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Count */}
      {!loading && users.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Showing {users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}
