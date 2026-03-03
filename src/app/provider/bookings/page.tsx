'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface BookingItem {
  id: string
  serviceId: string
  price: number
  quantity: number
  service: { id: string; name: string; slug: string; description: string; basePrice: number }
}

interface BookingAddress {
  id: string
  label: string
  fullAddress: string
  city: string
  state: string
  pincode: string
  landmark: string | null
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
  paymentMethod: string
  paymentStatus: string
  notes: string | null
  cancelReason: string | null
  createdAt: string
  completedAt: string | null
  items: BookingItem[]
  consumer: { id: string; name: string; email: string; phone: string | null }
  address: BookingAddress
}

type TabFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED'

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
]

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Confirmed' },
  IN_PROGRESS: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
}

export default function ProviderBookingsPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabFilter) || 'ALL'

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabFilter>(initialTab)
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
              ? {
                  ...b,
                  status: newStatus as Booking['status'],
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

  const filteredBookings =
    activeTab === 'ALL'
      ? bookings.filter((b) => b.status !== 'CANCELLED')
      : bookings.filter((b) => b.status === activeTab)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatAddress = (address: BookingAddress) => {
    const parts = [address.fullAddress, address.city, address.pincode].filter(Boolean)
    const full = parts.join(', ')
    return full.length > 80 ? full.slice(0, 77) + '...' : full
  }

  const getActionButton = (booking: Booking) => {
    const isLoading = actionLoading === booking.id

    switch (booking.status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold gradient-primary text-white hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Accept
            </button>
            <button
              onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
        )
      case 'CONFIRMED':
        return (
          <button
            onClick={() => handleStatusUpdate(booking.id, 'IN_PROGRESS')}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Start Service
          </button>
        )
      case 'IN_PROGRESS':
        return (
          <button
            onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Mark Complete
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-500 mt-1">Manage your service bookings and update their status</p>
      </div>

      {/* Tab Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-6">
        <div className="flex gap-1 overflow-x-auto p-1.5 scrollbar-hide">
          {TABS.map((tab) => {
            const count =
              tab.value === 'ALL'
                ? bookings.filter((b) => b.status !== 'CANCELLED').length
                : bookings.filter((b) => b.status === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.value
                    ? 'gradient-primary text-white shadow-md shadow-[#6C63FF]/25'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      activeTab === tab.value
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-5 bg-gray-200 rounded" />
                  <div className="w-20 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded" />
              </div>
              <div className="w-3/4 h-4 bg-gray-200 rounded mb-3" />
              <div className="w-1/2 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {activeTab === 'ALL' ? 'No bookings yet' : `No ${STATUS_CONFIG[activeTab]?.label?.toLowerCase()} bookings`}
          </h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'ALL'
              ? 'Bookings assigned to you will appear here.'
              : 'You don\'t have any bookings with this status.'}
          </p>
          {activeTab !== 'ALL' && (
            <button
              onClick={() => setActiveTab('ALL')}
              className="mt-4 text-sm font-semibold text-[#6C63FF] hover:underline"
            >
              View all bookings
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
            const serviceNames = booking.items.map((item) => item.service.name)

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-gray-100 card-hover overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">{booking.bookingNumber}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-[#6C63FF]">
                    {'\u20B9'}{booking.total.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="border-t border-gray-100" />

                {/* Card Body */}
                <div className="px-6 py-4">
                  {/* Services */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4.5 h-4.5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {serviceNames.length <= 2
                          ? serviceNames.join(' & ')
                          : `${serviceNames.slice(0, 2).join(', ')} +${serviceNames.length - 2} more`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {booking.items.length} service{booking.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Consumer */}
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {booking.consumer.name}
                        {booking.consumer.phone && (
                          <span className="text-gray-400"> &middot; {booking.consumer.phone}</span>
                        )}
                      </span>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                      </span>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-2.5 sm:col-span-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-600" title={booking.address.fullAddress}>
                        {formatAddress(booking.address)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer - Actions */}
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS') && (
                  <>
                    <div className="border-t border-gray-100" />
                    <div className="px-6 py-3.5 flex items-center justify-end">
                      {getActionButton(booking)}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
