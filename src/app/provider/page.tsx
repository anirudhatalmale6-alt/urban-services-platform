'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface BookingItem {
  id: string
  serviceId: string
  price: number
  quantity: number
  service: { id: string; name: string; slug: string; description: string; basePrice: number }
}

interface Booking {
  id: string
  bookingNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: string
  scheduledTime: string
  subtotal: number
  tax: number
  total: number
  notes: string | null
  createdAt: string
  completedAt: string | null
  items: BookingItem[]
  consumer: { id: string; name: string; email: string; phone: string | null }
  address: { id: string; label: string; fullAddress: string; city: string; pincode: string }
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Confirmed' },
  IN_PROGRESS: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
}

export default function ProviderDashboard() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bookings')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setBookings(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId)
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
              ? { ...b, status: newStatus as Booking['status'], ...(newStatus === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}) }
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

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const todaysBookings = bookings.filter(
    (b) => b.scheduledDate.split('T')[0] === today && b.status !== 'CANCELLED'
  )
  // Available = unassigned PENDING bookings any provider can claim
  const pendingRequests = bookings.filter((b) => b.status === 'PENDING')
  const completedThisMonth = bookings.filter((b) => {
    if (b.status !== 'COMPLETED' || !b.completedAt) return false
    const d = new Date(b.completedAt)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const totalEarnings = bookings
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.total, 0)

  const recentBookings = bookings.slice(0, 5)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0] || 'Provider'}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your services today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Bookings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{todaysBookings.length}</p>
          <p className="text-sm text-gray-500 mt-1">Today&apos;s Bookings</p>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
          <p className="text-sm text-gray-500 mt-1">Pending Requests</p>
        </div>

        {/* Completed This Month */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedThisMonth.length}</p>
          <p className="text-sm text-gray-500 mt-1">Completed This Month</p>
        </div>

        {/* Total Earnings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{totalEarnings.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-1">Total Earnings</p>
        </div>
      </div>

      {/* Pending Actions + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests - Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Available Bookings</h2>
            {pendingRequests.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700">
                {pendingRequests.length} new
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
                      <div className="w-1/2 h-3 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No available bookings</p>
              </div>
            ) : (
              pendingRequests.slice(0, 5).map((booking) => {
                const serviceNames = booking.items.map((i) => i.service.name).join(', ')
                return (
                  <div key={booking.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{serviceNames}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {booking.consumer.name} &middot; {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#6C63FF] whitespace-nowrap">
                        {'\u20B9'}{booking.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}
                        disabled={actionLoading === booking.id}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-white hover:opacity-90 transition disabled:opacity-50"
                      >
                        {actionLoading === booking.id ? 'Updating...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                        disabled={actionLoading === booking.id}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {pendingRequests.length > 5 && (
            <div className="px-6 py-3 border-t border-gray-100 text-center">
              <Link href="/provider/bookings?tab=PENDING" className="text-sm font-semibold text-[#6C63FF] hover:underline">
                View all pending requests
              </Link>
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <Link href="/provider/bookings" className="text-sm font-semibold text-[#6C63FF] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
                      <div className="w-1/2 h-3 bg-gray-200 rounded" />
                    </div>
                    <div className="w-16 h-6 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No bookings yet</p>
              </div>
            ) : (
              recentBookings.map((booking) => {
                const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
                const serviceNames = booking.items.map((i) => i.service.name)
                const displayName = serviceNames.length <= 2
                  ? serviceNames.join(' & ')
                  : `${serviceNames[0]} +${serviceNames.length - 1} more`
                return (
                  <div key={booking.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition">
                    <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500">{booking.consumer.name} &middot; {formatDate(booking.scheduledDate)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{'\u20B9'}{booking.total.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
