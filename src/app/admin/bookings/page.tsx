'use client'

import { useState, useEffect, useCallback } from 'react'

interface BookingItem {
  id: string
  serviceId: string
  price: number
  quantity: number
  service: { id: string; name: string; basePrice: number }
}

interface Booking {
  id: string
  bookingNumber: string
  status: string
  scheduledDate: string
  scheduledTime: string
  subtotal: number
  tax: number
  discount: number
  total: number
  notes: string | null
  paymentStatus: string
  paymentMethod: string | null
  cancelReason: string | null
  createdAt: string
  completedAt: string | null
  items: BookingItem[]
  consumer: { id: string; name: string; email: string; phone: string | null }
  provider: { id: string; name: string; email: string; phone: string | null } | null
  address: { id: string; label: string; fullAddress: string; city: string; pincode: string }
}

interface Provider {
  id: string
  name: string
  email: string
}

const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Confirmed' },
  IN_PROGRESS: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
}

const PAYMENT_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Pending' },
  PAID: { bg: 'bg-green-50', text: 'text-green-700', label: 'Paid' },
  REFUNDED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Refunded' },
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [assignProvider, setAssignProvider] = useState<string | null>(null) // bookingId being assigned

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/bookings?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          let filtered = data
          if (dateFrom) {
            filtered = filtered.filter((b: Booking) => b.scheduledDate >= dateFrom)
          }
          if (dateTo) {
            filtered = filtered.filter((b: Booking) => b.scheduledDate <= dateTo + 'T23:59:59')
          }
          setBookings(filtered)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo])

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?role=PROVIDER')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setProviders(data.map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
        }
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchProviders()
  }, [fetchBookings, fetchProviders])

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId + '-status')
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: newStatus,
                  ...(newStatus === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}),
                }
              : b
          )
        )
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssignProvider = async (bookingId: string, providerId: string) => {
    setActionLoading(bookingId + '-assign')
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      if (res.ok) {
        const provider = providers.find((p) => p.id === providerId)
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  provider: provider ? { ...provider, phone: null } : b.provider,
                }
              : b
          )
        )
        setAssignProvider(null)
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

  const getNextStatuses = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'PENDING': return ['CONFIRMED', 'CANCELLED']
      case 'CONFIRMED': return ['IN_PROGRESS', 'CANCELLED']
      case 'IN_PROGRESS': return ['COMPLETED', 'CANCELLED']
      default: return []
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Booking Management</h1>
        <p className="text-gray-500 mt-1">View and manage all bookings on the platform.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-6">
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          {/* Status filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === s
                    ? 'bg-[#6C63FF] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="w-1/3 h-5 bg-gray-200 rounded mb-2" />
                  <div className="w-1/2 h-3 bg-gray-200 rounded" />
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No bookings found</p>
          </div>
        ) : (
          bookings.map((booking) => {
            const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
            const paymentCfg = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.PENDING
            const isExpanded = expandedBooking === booking.id
            const serviceNames = booking.items.map((i) => i.service.name)
            const displayName = serviceNames.length <= 2
              ? serviceNames.join(' & ')
              : `${serviceNames[0]} +${serviceNames.length - 1} more`
            const nextStatuses = getNextStatuses(booking.status)

            return (
              <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Booking card header */}
                <div
                  className="px-4 sm:px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                >
                  <div className="w-12 h-12 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#6C63FF]">
                      {booking.bookingNumber.slice(-4)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking.consumer.name} &middot; {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{'\u20B9'}{booking.total.toLocaleString('en-IN')}</p>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold ${paymentCfg.bg} ${paymentCfg.text}`}>
                      {paymentCfg.label}
                    </span>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* Booking info */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking Info</h4>
                        <div className="text-sm">
                          <p><span className="text-gray-500">Number:</span> <span className="font-semibold">{booking.bookingNumber}</span></p>
                          <p><span className="text-gray-500">Date:</span> {formatDate(booking.scheduledDate)} at {booking.scheduledTime}</p>
                          <p><span className="text-gray-500">Created:</span> {formatDate(booking.createdAt)}</p>
                          {booking.completedAt && (
                            <p><span className="text-gray-500">Completed:</span> {formatDate(booking.completedAt)}</p>
                          )}
                          {booking.paymentMethod && (
                            <p><span className="text-gray-500">Payment:</span> {booking.paymentMethod}</p>
                          )}
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</h4>
                        <div className="text-sm">
                          <p className="font-semibold">{booking.consumer.name}</p>
                          <p className="text-gray-500">{booking.consumer.email}</p>
                          {booking.consumer.phone && <p className="text-gray-500">{booking.consumer.phone}</p>}
                          <p className="text-gray-500 mt-1 text-xs">{booking.address.fullAddress}, {booking.address.city} {booking.address.pincode}</p>
                        </div>
                      </div>

                      {/* Provider */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</h4>
                        {booking.provider ? (
                          <div className="text-sm">
                            <p className="font-semibold">{booking.provider.name}</p>
                            <p className="text-gray-500">{booking.provider.email}</p>
                            {booking.provider.phone && <p className="text-gray-500">{booking.provider.phone}</p>}
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-yellow-600 font-medium mb-2">No provider assigned</p>
                            {assignProvider === booking.id ? (
                              <div className="flex gap-2">
                                <select
                                  id={`provider-select-${booking.id}`}
                                  defaultValue=""
                                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20"
                                >
                                  <option value="" disabled>Select provider...</option>
                                  {providers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const el = document.getElementById(`provider-select-${booking.id}`) as HTMLSelectElement
                                    if (el?.value) handleAssignProvider(booking.id, el.value)
                                  }}
                                  disabled={actionLoading === booking.id + '-assign'}
                                  className="px-2 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-white hover:opacity-90 transition disabled:opacity-50"
                                >
                                  {actionLoading === booking.id + '-assign' ? '...' : 'Assign'}
                                </button>
                                <button
                                  onClick={() => setAssignProvider(null)}
                                  className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAssignProvider(booking.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6C63FF] bg-[#6C63FF]/10 hover:bg-[#6C63FF]/20 transition"
                              >
                                Assign Provider
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Services breakdown */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Services</h4>
                      <div className="bg-gray-50 rounded-xl p-3">
                        {booking.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-1.5 text-sm">
                            <span className="text-gray-700">
                              {item.service.name} {item.quantity > 1 && <span className="text-gray-400">x{item.quantity}</span>}
                            </span>
                            <span className="font-semibold text-gray-900">{'\u20B9'}{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 mt-2 pt-2 space-y-1 text-sm">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{'\u20B9'}{booking.subtotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Tax (GST)</span>
                            <span>{'\u20B9'}{booking.tax.toLocaleString('en-IN')}</span>
                          </div>
                          {booking.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount</span>
                              <span>-{'\u20B9'}{booking.discount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                            <span>Total</span>
                            <span>{'\u20B9'}{booking.total.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{booking.notes}</p>
                      </div>
                    )}
                    {booking.cancelReason && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cancel Reason</h4>
                        <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{booking.cancelReason}</p>
                      </div>
                    )}

                    {/* Status Actions */}
                    {nextStatuses.length > 0 && (
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-500">Update Status:</span>
                        {nextStatuses.map((ns) => {
                          const nsCfg = STATUS_CONFIG[ns]
                          const isCancel = ns === 'CANCELLED'
                          return (
                            <button
                              key={ns}
                              onClick={() => handleStatusUpdate(booking.id, ns)}
                              disabled={actionLoading === booking.id + '-status'}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                                isCancel
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'gradient-primary text-white hover:opacity-90'
                              }`}
                            >
                              {actionLoading === booking.id + '-status' ? '...' : nsCfg?.label || ns}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Count */}
      {!loading && bookings.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}
