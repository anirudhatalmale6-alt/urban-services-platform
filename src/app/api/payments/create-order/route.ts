import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await req.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { consumer: true },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.consumerId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(booking.total * 100), // amount in paise
      currency: 'INR',
      receipt: booking.bookingNumber,
      notes: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      },
    })

    // Create payment record
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: { razorpayOrderId: order.id, status: 'CREATED' },
      create: {
        bookingId: booking.id,
        amount: booking.total,
        currency: 'INR',
        razorpayOrderId: order.id,
        status: 'CREATED',
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingNumber: booking.bookingNumber,
      key: process.env.RAZORPAY_KEY_ID,
      prefill: {
        name: booking.consumer.name,
        email: booking.consumer.email,
        contact: booking.consumer.phone || '',
      },
    })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
  }
}
