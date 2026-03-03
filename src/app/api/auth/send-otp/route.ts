import { NextRequest, NextResponse } from 'next/server'
import { otpStore } from '@/lib/otp-store'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s/g, '')

    // Rate limiting: max 3 OTPs per phone per 10 minutes
    const existing = otpStore.get(cleanPhone)
    if (existing && existing.attempts >= 3 && existing.expiresAt > Date.now()) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const otp = generateOTP()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    otpStore.set(cleanPhone, {
      otp,
      expiresAt,
      attempts: (existing?.attempts || 0) + 1,
    })

    // In production, send OTP via SMS provider (MSG91, Twilio, Firebase)
    console.log(`[OTP] ${cleanPhone}: ${otp}`)

    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      message: 'OTP sent successfully',
      phone: cleanPhone,
      ...(isDev && { otp }),
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
