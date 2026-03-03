import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
