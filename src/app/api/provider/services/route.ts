import { NextRequest, NextResponse } from 'next/server'
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
    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
    })

    if (!profile) {
      return NextResponse.json([])
    }

    const providerServices = await prisma.providerService.findMany({
      where: { providerId: profile.id },
      include: {
        service: {
          include: { category: true },
        },
      },
    })

    return NextResponse.json(providerServices)
  } catch (error) {
    console.error('Provider services GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { serviceIds } = await req.json()

    if (!Array.isArray(serviceIds)) {
      return NextResponse.json({ error: 'serviceIds must be an array' }, { status: 400 })
    }

    // Ensure provider profile exists
    let profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
    })

    if (!profile) {
      profile = await prisma.providerProfile.create({
        data: { userId: user.id },
      })
    }

    // Get selected services to use their base prices
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    })

    // Delete existing and re-create (simpler than diffing)
    await prisma.providerService.deleteMany({
      where: { providerId: profile.id },
    })

    if (serviceIds.length > 0) {
      await prisma.providerService.createMany({
        data: services.map((s) => ({
          providerId: profile!.id,
          serviceId: s.id,
          price: s.basePrice,
        })),
      })
    }

    // Return updated list
    const providerServices = await prisma.providerService.findMany({
      where: { providerId: profile.id },
      include: {
        service: {
          include: { category: true },
        },
      },
    })

    return NextResponse.json(providerServices)
  } catch (error) {
    console.error('Provider services POST error:', error)
    return NextResponse.json({ error: 'Failed to update services' }, { status: 500 })
  }
}
