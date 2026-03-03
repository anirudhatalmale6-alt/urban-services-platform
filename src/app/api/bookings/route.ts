import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}

    if (user.role === 'CONSUMER') {
      where.consumerId = user.id
    } else if (user.role === 'PROVIDER') {
      // Show bookings assigned to this provider OR unassigned bookings (available to claim)
      where.OR = [
        { providerId: user.id },
        { providerId: null, status: 'PENDING' },
      ]
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        items: { include: { service: true } },
        consumer: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
        address: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'CONSUMER') {
      return NextResponse.json({ error: 'Only consumers can create bookings' }, { status: 403 })
    }

    const { services, addressId, scheduledDate, scheduledTime, notes, paymentMethod } = await req.json()

    if (!services?.length || !addressId || !scheduledDate || !scheduledTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate booking number
    const count = await prisma.booking.count()
    const bookingNumber = `US${String(count + 1).padStart(6, '0')}`

    // Calculate totals
    let subtotal = 0
    const serviceDetails = []

    for (const item of services) {
      const service = await prisma.service.findUnique({ where: { id: item.serviceId } })
      if (!service) continue
      const price = service.basePrice * (item.quantity || 1)
      subtotal += price
      serviceDetails.push({ serviceId: service.id, price: service.basePrice, quantity: item.quantity || 1 })
    }

    const tax = Math.round(subtotal * 0.18 * 100) / 100 // 18% GST
    const total = subtotal + tax

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        consumerId: user.id,
        addressId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        status: 'PENDING',
        subtotal,
        tax,
        total,
        paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
        paymentMethod: paymentMethod || 'RAZORPAY',
        notes,
        items: {
          create: serviceDetails,
        },
      },
      include: {
        items: { include: { service: true } },
        address: true,
      },
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
