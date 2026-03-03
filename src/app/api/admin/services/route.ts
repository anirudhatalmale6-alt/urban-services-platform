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
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categories = await prisma.serviceCategory.findMany({
      include: {
        services: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Admin services GET error:', error)
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
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { type } = body

    if (type === 'category') {
      const { name, icon, description } = body
      if (!name) {
        return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Check for duplicate slug
      const existing = await prisma.serviceCategory.findUnique({ where: { slug } })
      if (existing) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 })
      }

      const maxOrder = await prisma.serviceCategory.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })

      const category = await prisma.serviceCategory.create({
        data: {
          name,
          slug,
          icon: icon || null,
          description: description || null,
          sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
        },
        include: { services: true },
      })

      return NextResponse.json(category)
    }

    if (type === 'service') {
      const { name, description, basePrice, duration, categoryId } = body
      if (!name || !categoryId || basePrice === undefined) {
        return NextResponse.json({ error: 'Name, category, and base price are required' }, { status: 400 })
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Check for duplicate slug
      const existing = await prisma.service.findUnique({ where: { slug } })
      if (existing) {
        return NextResponse.json({ error: 'Service with this name already exists' }, { status: 400 })
      }

      const service = await prisma.service.create({
        data: {
          name,
          slug,
          description: description || null,
          basePrice: parseFloat(basePrice),
          duration: parseInt(duration) || 60,
          categoryId,
        },
      })

      return NextResponse.json(service)
    }

    return NextResponse.json({ error: 'Invalid type. Use "category" or "service"' }, { status: 400 })
  } catch (error) {
    console.error('Admin services POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
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

    const body = await req.json()
    const { type, id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (type === 'category') {
      const { name, icon, description, isActive } = body
      const data: any = {}
      if (name !== undefined) {
        data.name = name
        data.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      }
      if (icon !== undefined) data.icon = icon
      if (description !== undefined) data.description = description
      if (isActive !== undefined) data.isActive = isActive

      const category = await prisma.serviceCategory.update({
        where: { id },
        data,
        include: { services: true },
      })

      return NextResponse.json(category)
    }

    if (type === 'service') {
      const { name, description, basePrice, duration, isActive } = body
      const data: any = {}
      if (name !== undefined) {
        data.name = name
        data.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      }
      if (description !== undefined) data.description = description
      if (basePrice !== undefined) data.basePrice = parseFloat(basePrice)
      if (duration !== undefined) data.duration = parseInt(duration)
      if (isActive !== undefined) data.isActive = isActive

      const service = await prisma.service.update({
        where: { id },
        data,
      })

      return NextResponse.json(service)
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Admin services PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
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
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 })
    }

    if (type === 'category') {
      // Check if category has services
      const serviceCount = await prisma.service.count({ where: { categoryId: id } })
      if (serviceCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete category with existing services. Delete services first.' },
          { status: 400 }
        )
      }
      await prisma.serviceCategory.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    if (type === 'service') {
      // Check if service has bookings
      const bookingCount = await prisma.bookingItem.count({ where: { serviceId: id } })
      if (bookingCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete service with existing bookings. Deactivate it instead.' },
          { status: 400 }
        )
      }
      // Delete provider service links first
      await prisma.providerService.deleteMany({ where: { serviceId: id } })
      await prisma.service.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Admin services DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
