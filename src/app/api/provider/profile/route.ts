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

    let profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    })

    // Auto-create profile if it doesn't exist
    if (!profile) {
      profile = await prisma.providerProfile.create({
        data: { userId: user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Provider profile GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      phone,
      bio,
      experience,
      serviceAreaCity,
      serviceAreaPincode,
      idDocumentName,
      idDocumentType,
    } = body

    // Update user fields (name, phone)
    if (name || phone !== undefined) {
      const userData: any = {}
      if (name) userData.name = name
      if (phone !== undefined) userData.phone = phone || null

      await prisma.user.update({
        where: { id: user.id },
        data: userData,
      })
    }

    // Build provider profile update
    const profileData: any = {}
    if (bio !== undefined) profileData.bio = bio || null
    if (experience !== undefined) profileData.experience = parseInt(experience) || 0
    if (serviceAreaCity !== undefined) profileData.serviceAreaCity = serviceAreaCity || null
    if (serviceAreaPincode !== undefined) profileData.serviceAreaPincode = serviceAreaPincode || null
    if (idDocumentName) profileData.idDocument = idDocumentName
    if (idDocumentType) profileData.idDocumentType = idDocumentType

    // Upsert the provider profile
    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Provider profile PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
