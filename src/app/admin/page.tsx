'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RecentBooking {
  id: string
  bookingNumber: string
  status: string
  total: number
  createdAt: string
  consumer: { id: string; name: string; email: string }
  provider: { id: string; name: string; email: string } | null
  items: Array<{ service: { name: string } }>
}

interface Stats {
  totalUsers: number
  totalProviders: number
  totalBookings: number
  totalRevenue: number
  pendingApprovals: number
  revenueChart: Array<{ date: string; revenue: number }>
  recentBookings: RecentBooking[]
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Pending' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Confirmed' },
  IN_PROGRESS: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  }

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
              <div className="w-16 h-7 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse" />
          <div className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}. Here&apos;s your platform overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Users */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Users</p>
        </div>

        {/* Total Providers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalProviders ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Providers</p>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalBookings ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Bookings</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 card-hover col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.pendingApprovals ?? 0}</p>
          <Link href="/admin/users?role=PROVIDER" className="text-sm text-[#6C63FF] font-medium hover:underline mt-1 inline-block">
            Pending Approvals
          </Link>
        </div>
      </div>

      {/* Charts + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Revenue (Last 7 Days)</h2>
          </div>
          <div className="p-6">
            {stats?.revenueChart && stats.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    fontSize={12}
                    tick={{ fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    fontSize={12}
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
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6C63FF"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6C63FF', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#6C63FF', strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No revenue data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-sm font-semibold text-[#6C63FF] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!stats?.recentBookings?.length ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No bookings yet</p>
              </div>
            ) : (
              stats.recentBookings.map((booking) => {
                const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING
                const serviceNames = booking.items.map((i) => i.service.name)
                const displayName = serviceNames.length <= 2
                  ? serviceNames.join(' & ')
                  : `${serviceNames[0]} +${serviceNames.length - 1} more`
                return (
                  <div key={booking.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition">
                    <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#6C63FF]">
                        {booking.bookingNumber.slice(-4)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500">{booking.consumer.name} &middot; {formatDate(booking.createdAt)}</p>
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
