import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { status, cancelReason, providerId } = await req.json()

    const booking = await prisma.booking.findUnique({ where: { id: params.id } })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (status) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
      if (status === 'CANCELLED') {
        updateData.cancelReason = cancelReason
      }
      // Auto-assign provider when they accept (CONFIRMED) an unassigned booking
      if (status === 'CONFIRMED' && user.role === 'PROVIDER' && !booking.providerId) {
        updateData.providerId = user.id
      }
    }

    if (providerId && (user.role === 'ADMIN' || user.role === 'PROVIDER')) {
      updateData.providerId = providerId
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: { include: { service: true } },
        consumer: { select: { id: true, name: true, email: true, phone: true } },
        provider: { select: { id: true, name: true, email: true, phone: true } },
        address: true,
      },
    })

    // Send SMS notification to consumer when booking is confirmed
    if (status === 'CONFIRMED' && updated.consumer?.phone) {
      const consumerPhone = updated.consumer.phone.startsWith('+')
        ? updated.consumer.phone
        : `+91${updated.consumer.phone.replace(/\D/g, '').slice(-10)}`

      const providerName = updated.provider?.name || 'A service provider'
      const scheduledDate = new Date(updated.scheduledDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const serviceNames = updated.items.map((i: any) => i.service.name).join(', ')

      const smsBody = `Hi ${updated.consumer.name}, your booking #${updated.bookingNumber} for ${serviceNames} has been accepted! ${providerName} will visit on ${scheduledDate} at ${updated.scheduledTime}. - Suchiti`

      try {
        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: consumerPhone,
        })
      } catch (smsErr) {
        // Log but don't fail the booking update if SMS fails
        console.error('SMS notification failed:', smsErr)
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
