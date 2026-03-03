import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'
import bcrypt from 'bcryptjs'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, name, role } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s/g, '')

    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!verifySid) {
      return NextResponse.json({ error: 'SMS service not configured' }, { status: 500 })
    }

    // Verify OTP via Twilio Verify
    const check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: cleanPhone, code: otp })

    if (check.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 })
    }

    // OTP verified — find or create user
    let user = await prisma.user.findFirst({
      where: { phone: cleanPhone },
    })

    if (!user) {
      const validRoles = ['CONSUMER', 'PROVIDER']
      const userRole = validRoles.includes(role) ? role : 'CONSUMER'
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 12)

      user = await prisma.user.create({
        data: {
          name: name || `User ${cleanPhone.slice(-4)}`,
          email: `${cleanPhone.replace('+', '')}@phone.suchiti.local`,
          phone: cleanPhone,
          password: randomPassword,
          role: userRole,
          isVerified: true,
        },
      })

      if (userRole === 'PROVIDER') {
        await prisma.providerProfile.create({
          data: { userId: user.id },
        })
      }
    }

    return NextResponse.json({
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('Verify OTP error:', error?.message || error)
    if (error?.code === 60200) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 })
    }
    if (error?.code === 20404) {
      return NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'OTP verification failed' }, { status: 500 })
  }
}
