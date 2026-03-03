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
      select: {
        photoUrl: true,
        aadhaarUrl: true,
        aadhaarNumber: true,
        dlVoterUrl: true,
        dlVoterType: true,
        dlVoterNumber: true,
        verificationStatus: true,
        verificationNote: true,
        isApproved: true,
      },
    })

    if (!profile) {
      return NextResponse.json({
        photoUrl: null,
        aadhaarUrl: null,
        aadhaarNumber: null,
        dlVoterUrl: null,
        dlVoterType: null,
        dlVoterNumber: null,
        verificationStatus: 'NOT_SUBMITTED',
        verificationNote: null,
        isApproved: false,
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Verification GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 })
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

    const body = await req.json()
    const {
      photoUrl,
      aadhaarUrl,
      aadhaarNumber,
      dlVoterUrl,
      dlVoterType,
      dlVoterNumber,
    } = body

    // Validate required fields
    if (!photoUrl || !aadhaarUrl || !aadhaarNumber || !dlVoterUrl || !dlVoterType || !dlVoterNumber) {
      return NextResponse.json({ error: 'All documents are required for verification' }, { status: 400 })
    }

    // Validate dlVoterType
    if (!['DRIVING_LICENSE', 'VOTER_ID', 'VEHICLE_RC'].includes(dlVoterType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        photoUrl,
        aadhaarUrl,
        aadhaarNumber,
        dlVoterUrl,
        dlVoterType,
        dlVoterNumber,
        verificationStatus: 'PENDING',
        verificationNote: null,
      },
      create: {
        userId: user.id,
        photoUrl,
        aadhaarUrl,
        aadhaarNumber,
        dlVoterUrl,
        dlVoterType,
        dlVoterNumber,
        verificationStatus: 'PENDING',
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Verification POST error:', error)
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 })
  }
}
