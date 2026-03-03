import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s/g, '')

    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!verifySid) {
      console.error('TWILIO_VERIFY_SERVICE_SID not configured')
      return NextResponse.json({ error: 'SMS service not configured' }, { status: 500 })
    }

    await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: cleanPhone, channel: 'sms' })

    console.log(`[OTP] Sent to ${cleanPhone} via Twilio Verify`)

    return NextResponse.json({
      message: 'OTP sent successfully',
      phone: cleanPhone,
    })
  } catch (error: any) {
    console.error('Send OTP error:', error?.message || error)
    if (error?.code === 60203) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
