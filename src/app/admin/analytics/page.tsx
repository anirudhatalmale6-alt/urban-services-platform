'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'

interface AnalyticsData {
  revenueOverTime: Array<{ date: string; revenue: number }>
  bookingsByStatus: Array<{ name: string; value: number; color: string }>
  topServices: Array<{ name: string; count: number }>
  metrics: {
    avgBookingValue: number
    completionRate: number
    avgRating: number
    totalReviews: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FBBF24',
  CONFIRMED: '#3B82F6',
  IN_PROGRESS: '#F97316',
  COMPLETED: '#22C55E',
  CANCELLED: '#EF4444',
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch all bookings and reviews to compute analytics client-side
      const [bookingsRes, servicesRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/admin/services'),
      ])

      if (!bookingsRes.ok || !servicesRes.ok) return

      const bookings = await bookingsRes.json()
      const categories = await servicesRes.json()

      if (!Array.isArray(bookings)) return

      // Revenue over time (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const revenueByDay: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        revenueByDay[d.toISOString().split('T')[0]] = 0
      }

      for (const b of bookings) {
        if (b.status === 'COMPLETED' && b.completedAt) {
          const key = b.completedAt.split('T')[0]
          if (revenueByDay[key] !== undefined) {
            revenueByDay[key] += b.total
          }
        }
      }

      const revenueOverTime = Object.entries(revenueByDay).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue),
      }))

      // Bookings by status
      const statusCounts: Record<string, number> = {
        PENDING: 0,
        CONFIRMED: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      }
      for (const b of bookings) {
        if (statusCounts[b.status] !== undefined) {
          statusCounts[b.status]++
        }
      }
      const bookingsByStatus = Object.entries(statusCounts)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name: name === 'IN_PROGRESS' ? 'In Progress' : name.charAt(0) + name.slice(1).toLowerCase(),
          value,
          color: STATUS_COLORS[name] || '#6B7280',
        }))

      // Top services by bookings
      const serviceCounts: Record<string, { name: string; count: number }> = {}
      for (const b of bookings) {
        if (b.items) {
          for (const item of b.items) {
            const name = item.service?.name || 'Unknown'
            if (!serviceCounts[name]) {
              serviceCounts[name] = { name, count: 0 }
            }
            serviceCounts[name].count += item.quantity || 1
          }
        }
      }
      const topServices = Object.values(serviceCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Metrics
      const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED')
      const totalBookings = bookings.filter((b: any) => b.status !== 'CANCELLED').length
      const avgBookingValue = completedBookings.length > 0
        ? Math.round(completedBookings.reduce((s: number, b: any) => s + b.total, 0) / completedBookings.length)
        : 0
      const completionRate = totalBookings > 0
        ? Math.round((completedBookings.length / totalBookings) * 100)
        : 0

      // Avg rating from reviews
      let avgRating = 0
      let totalReviews = 0
      for (const b of bookings) {
        if (b.review) {
          totalReviews++
          avgRating += b.review.rating
        }
      }
      if (totalReviews > 0) {
        avgRating = Math.round((avgRating / totalReviews) * 10) / 10
      }

      setData({
        revenueOverTime,
        bookingsByStatus,
        topServices,
        metrics: {
          avgBookingValue,
          completionRate,
          avgRating,
          totalReviews,
        },
      })
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="w-16 h-7 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Platform performance metrics and insights.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{(data?.metrics.avgBookingValue ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-1">Avg Booking Value</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.metrics.completionRate ?? 0}%</p>
          <p className="text-sm text-gray-500 mt-1">Completion Rate</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.metrics.avgRating || 'N/A'}</p>
          <p className="text-sm text-gray-500 mt-1">Avg Rating</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.metrics.totalReviews ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Reviews</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-2xl border border-gray-100 lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Over Time (Last 30 Days)</h2>
          </div>
          <div className="p-6">
            {data?.revenueOverTime && data.revenueOverTime.some((d) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    fontSize={11}
                    tick={{ fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    fontSize={11}
                    tick={{ fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(v) => `\u20B9${v}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`\u20B9${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                    labelFormatter={(label: any) => formatChartDate(String(label))}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6C63FF"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#6C63FF', strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                No revenue data available yet
              </div>
            )}
          </div>
        </div>

        {/* Bookings by Status - Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Bookings by Status</h2>
          </div>
          <div className="p-6">
            {data?.bookingsByStatus && data.bookingsByStatus.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.bookingsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.bookingsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [value, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {data.bookingsByStatus.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-gray-600">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No booking data available
              </div>
            )}
          </div>
        </div>

        {/* Top Services - Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Top Services by Bookings</h2>
          </div>
          <div className="p-6">
            {data?.topServices && data.topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    fontSize={11}
                    tick={{ fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={11}
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(value: any) => [value, 'Bookings']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#6C63FF"
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No service data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
