import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorySlug = searchParams.get('category')

    const where: any = { isActive: true }

    if (categorySlug) {
      where.category = { slug: categorySlug }
    }

    const services = await prisma.service.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(services)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}
