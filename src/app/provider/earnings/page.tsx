'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BookingItem {
  id: string
  price: number
  quantity: number
  service: { id: string; name: string }
}

interface Booking {
  id: string
  bookingNumber: string
  status: string
  total: number
  completedAt: string | null
  scheduledDate: string
  items: BookingItem[]
}

export default function ProviderEarningsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

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

  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'COMPLETED'),
    [bookings]
  )

  const totalEarnings = useMemo(
    () => completedBookings.reduce((sum, b) => sum + b.total, 0),
    [completedBookings]
  )

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthEarnings = useMemo(() => {
    return completedBookings
      .filter((b) => {
        if (!b.completedAt) return false
        const d = new Date(b.completedAt)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, b) => sum + b.total, 0)
  }, [completedBookings, currentMonth, currentYear])

  const lastMonthEarnings = useMemo(() => {
    const lm = currentMonth === 0 ? 11 : currentMonth - 1
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear
    return completedBookings
      .filter((b) => {
        if (!b.completedAt) return false
        const d = new Date(b.completedAt)
        return d.getMonth() === lm && d.getFullYear() === ly
      })
      .reduce((sum, b) => sum + b.total, 0)
  }, [completedBookings, currentMonth, currentYear])

  const monthChange = lastMonthEarnings > 0
    ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
    : thisMonthEarnings > 0
    ? 100
    : 0

  // Daily earnings for last 7 days
  const dailyEarnings = useMemo(() => {
    const days: { date: string; label: string; earnings: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
      const earnings = completedBookings
        .filter((b) => b.completedAt && b.completedAt.split('T')[0] === dateStr)
        .reduce((sum, b) => sum + b.total, 0)
      days.push({ date: dateStr, label, earnings })
    }
    return days
  }, [completedBookings])

  // Earnings list (completed bookings sorted by completion date)
  const earningsList = useMemo(() => {
    return [...completedBookings]
      .sort((a, b) => {
        const da = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const db = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return db - da
      })
  }, [completedBookings])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 mt-1">Track your income from completed services</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Earnings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{totalEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{completedBookings.length} completed bookings</p>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{thisMonthEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
          {monthChange !== 0 && (
            <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${monthChange > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {monthChange > 0 ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {Math.abs(monthChange)}% vs last month
            </div>
          )}
        </div>

        {/* Last Month */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Month</p>
              <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{lastMonthEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Earnings Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Daily Earnings</h2>
        <p className="text-sm text-gray-500 mb-6">Last 7 days performance</p>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEarnings} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickFormatter={(v) => `\u20B9${v}`}
                />
                <Tooltip
                  formatter={(value: any) => [`\u20B9${Number(value).toLocaleString('en-IN')}`, 'Earnings']}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar
                  dataKey="earnings"
                  fill="#6C63FF"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Earnings List */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Earnings History</h2>
          <p className="text-sm text-gray-500">Detailed breakdown of your completed services</p>
        </div>

        {loading ? (
          <div className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
                  <div className="w-1/2 h-3 bg-gray-200 rounded" />
                </div>
                <div className="w-20 h-5 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : earningsList.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No earnings yet</h3>
            <p className="text-sm text-gray-500">Complete your first service to start earning.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {earningsList.map((booking) => {
              const serviceNames = booking.items.map((i) => i.service.name)
              const displayName = serviceNames.length <= 2
                ? serviceNames.join(' & ')
                : `${serviceNames[0]} +${serviceNames.length - 1} more`
              return (
                <div key={booking.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking.bookingNumber} &middot; {booking.completedAt ? formatDate(booking.completedAt) : formatDate(booking.scheduledDate)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                    +{'\u20B9'}{booking.total.toLocaleString('en-IN')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
