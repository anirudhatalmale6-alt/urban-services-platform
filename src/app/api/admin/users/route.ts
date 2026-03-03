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
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const where: any = {}

    if (role && role !== 'ALL') {
      where.role = role
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        providerProfile: {
          select: {
            id: true,
            bio: true,
            experience: true,
            idDocument: true,
            idDocumentType: true,
            isApproved: true,
            approvedAt: true,
            rating: true,
            totalReviews: true,
            totalEarnings: true,
            serviceAreaCity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action, value } = await req.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    if (action === 'toggleActive') {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } })
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isActive: !targetUser.isActive },
      })
      return NextResponse.json({ success: true, isActive: updated.isActive })
    }

    if (action === 'approveProvider') {
      await prisma.providerProfile.update({
        where: { userId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
        },
      })
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true },
      })
      return NextResponse.json({ success: true, isApproved: true })
    }

    if (action === 'rejectProvider') {
      await prisma.providerProfile.update({
        where: { userId },
        data: { isApproved: false, approvedAt: null },
      })
      return NextResponse.json({ success: true, isApproved: false })
    }

    if (action === 'updateRole') {
      if (!value || !['CONSUMER', 'PROVIDER', 'ADMIN'].includes(value)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      await prisma.user.update({
        where: { id: userId },
        data: { role: value },
      })
      return NextResponse.json({ success: true, role: value })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
