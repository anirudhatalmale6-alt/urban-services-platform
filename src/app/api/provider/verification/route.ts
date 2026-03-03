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

    // Validate: photo is mandatory
    if (!photoUrl) {
      return NextResponse.json({ error: 'Profile photo is required' }, { status: 400 })
    }

    // Validate: at least one ID document (Aadhaar OR DL/Voter ID)
    const hasAadhaar = aadhaarUrl && aadhaarNumber
    const hasDlVoter = dlVoterUrl && dlVoterType && dlVoterNumber
    if (!hasAadhaar && !hasDlVoter) {
      return NextResponse.json({ error: 'At least one ID document is required (Aadhaar or DL/Voter ID)' }, { status: 400 })
    }

    // Validate dlVoterType if provided
    if (dlVoterType && !['DRIVING_LICENSE', 'VOTER_ID', 'VEHICLE_RC'].includes(dlVoterType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    const profileData: any = {
      photoUrl,
      verificationStatus: 'PENDING',
      verificationNote: null,
    }

    // Only set Aadhaar fields if provided
    if (hasAadhaar) {
      profileData.aadhaarUrl = aadhaarUrl
      profileData.aadhaarNumber = aadhaarNumber
    }

    // Only set DL/Voter fields if provided
    if (hasDlVoter) {
      profileData.dlVoterUrl = dlVoterUrl
      profileData.dlVoterType = dlVoterType
      profileData.dlVoterNumber = dlVoterNumber
    }

    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Verification POST error:', error)
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 })
  }
}
