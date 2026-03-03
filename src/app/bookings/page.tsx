'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface BookingItem {
  id: string
  serviceId: string
  price: number
  quantity: number
  service: {
    id: string
    name: string
    slug: string
    description: string
    basePrice: number
  }
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

interface BookingReview {
  id: string
  rating: number
  comment: string
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
  provider: { id: string; name: string; email: string; phone: string | null } | null
  address: BookingAddress
  review: BookingReview | null
}

type TabFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Confirmed' },
  IN_PROGRESS: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
}

export default function BookingsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [authStatus, router])

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bookings')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setBookings(data)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchBookings()
    }
  }, [authStatus, fetchBookings])

  // Cancel booking
  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b))
        )
      }
    } catch {
      // Silently fail
    } finally {
      setCancellingId(null)
      setCancelConfirmId(null)
    }
  }

  // Filter bookings by active tab
  const filteredBookings =
    activeTab === 'ALL' ? bookings : bookings.filter((b) => b.status === activeTab)

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Format address summary
  const formatAddress = (address: BookingAddress) => {
    const parts = [address.fullAddress, address.city, address.pincode].filter(Boolean)
    const full = parts.join(', ')
    return full.length > 60 ? full.slice(0, 57) + '...' : full
  }

  // Don't render until auth is resolved
  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-3 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Header */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-500 mt-1">Track and manage your service bookings</p>
            </div>
            <button
              onClick={() => router.push('/services')}
              className="gradient-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2 self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Book a Service
            </button>
          </div>
        </div>
      </section>

      {/* Tab Filters */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
            {TABS.map((tab) => {
              const count =
                tab.value === 'ALL'
                  ? bookings.length
                  : bookings.filter((b) => b.status === tab.value).length
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.value
                      ? 'border-[#6C63FF] text-[#6C63FF]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        activeTab === tab.value
                          ? 'bg-[#6C63FF]/10 text-[#6C63FF]'
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
      </div>

      {/* Bookings Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          /* Loading Skeleton */
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
                <div className="w-1/2 h-4 bg-gray-200 rounded mb-3" />
                <div className="flex items-center gap-4 mt-4">
                  <div className="w-28 h-4 bg-gray-200 rounded" />
                  <div className="w-28 h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'ALL' ? 'No bookings yet' : `No ${STATUS_CONFIG[activeTab]?.label?.toLowerCase()} bookings`}
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {activeTab === 'ALL'
                ? 'Book your first service and it will appear here.'
                : 'You don\'t have any bookings with this status.'}
            </p>
            {activeTab === 'ALL' ? (
              <button
                onClick={() => router.push('/services')}
                className="gradient-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Browse Services
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('ALL')}
                className="text-[#6C63FF] font-semibold hover:underline transition"
              >
                View all bookings
              </button>
            )}
          </div>
        ) : (
          /* Bookings List */
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
              const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
              const canRate = booking.status === 'COMPLETED' && !booking.review
              const serviceNames = booking.items.map((item) => item.service.name)

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-gray-100 card-hover overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        {booking.bookingNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-[#6C63FF]">
                      ₹{booking.total.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Card Body */}
                  <div className="px-6 py-4">
                    {/* Services */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4.5 h-4.5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Date & Time */}
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                        </span>
                      </div>

                      {/* Provider */}
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {booking.provider ? booking.provider.name : 'Assigning provider...'}
                        </span>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-sm text-gray-600" title={booking.address.fullAddress}>
                          {formatAddress(booking.address)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  {(canCancel || canRate) && (
                    <>
                      <div className="border-t border-gray-100" />
                      <div className="px-6 py-3.5 flex items-center gap-3 justify-end">
                        {canCancel && cancelConfirmId !== booking.id && (
                          <button
                            onClick={() => setCancelConfirmId(booking.id)}
                            className="px-5 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition"
                          >
                            Cancel Booking
                          </button>
                        )}

                        {canCancel && cancelConfirmId === booking.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 mr-1">Are you sure?</span>
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                            >
                              {cancellingId === booking.id ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Cancelling...
                                </span>
                              ) : (
                                'Yes, Cancel'
                              )}
                            </button>
                            <button
                              onClick={() => setCancelConfirmId(null)}
                              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                            >
                              No, Keep
                            </button>
                          </div>
                        )}

                        {canRate && (
                          <button
                            onClick={() => router.push(`/bookings/${booking.id}/review`)}
                            className="px-5 py-2 rounded-xl text-sm font-semibold text-white gradient-primary hover:opacity-90 transition flex items-center gap-1.5"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                            Rate Service
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
