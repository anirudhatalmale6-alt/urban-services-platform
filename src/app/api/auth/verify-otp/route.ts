import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { otpStore } from '@/lib/otp-store'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, name, role } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s/g, '')

    // In development, accept '123456' as universal OTP for testing
    const isDev = process.env.NODE_ENV !== 'production'
    const isValidOTP = isDev && otp === '123456'

    // Verify OTP from store
    const stored = otpStore.get(cleanPhone)
    if (!isValidOTP) {
      if (!stored) {
        return NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 })
      }
      if (stored.expiresAt < Date.now()) {
        otpStore.delete(cleanPhone)
        return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
      }
      if (stored.otp !== otp) {
        return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 })
      }
    }

    // OTP verified — clean up
    otpStore.delete(cleanPhone)

    // Check if user exists
    let user = await prisma.user.findFirst({
      where: { phone: cleanPhone },
    })

    if (!user) {
      // New user — create account
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
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'OTP verification failed' }, { status: 500 })
  }
}
