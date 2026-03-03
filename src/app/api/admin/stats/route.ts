import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Count totals
    const [totalUsers, totalProviders, totalBookings, pendingApprovals] = await Promise.all([
      prisma.user.count({ where: { role: 'CONSUMER' } }),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.booking.count(),
      prisma.providerProfile.count({ where: { isApproved: false } }),
    ])

    // Total revenue from completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: { total: true },
    })
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.total, 0)

    // Revenue last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const revenueBookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: sevenDaysAgo },
      },
      select: { total: true, completedAt: true },
    })

    // Group revenue by day
    const revenueByDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      revenueByDay[key] = 0
    }
    for (const b of revenueBookings) {
      if (b.completedAt) {
        const key = b.completedAt.toISOString().split('T')[0]
        if (revenueByDay[key] !== undefined) {
          revenueByDay[key] += b.total
        }
      }
    }

    const revenueChart = Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue),
    }))

    // Recent bookings (last 5)
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        consumer: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        items: { include: { service: true } },
      },
    })

    return NextResponse.json({
      totalUsers,
      totalProviders,
      totalBookings,
      totalRevenue,
      pendingApprovals,
      revenueChart,
      recentBookings,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
