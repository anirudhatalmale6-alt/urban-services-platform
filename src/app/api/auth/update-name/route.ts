import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId, name } = await req.json()

    if (!userId || !name) {
      return NextResponse.json({ error: 'User ID and name are required' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
    })

    return NextResponse.json({ message: 'Name updated', user: { id: user.id, name: user.name } })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
  }
}
