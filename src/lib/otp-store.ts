// In-memory OTP store
// In production, replace with Redis for multi-instance support
const globalForOtp = globalThis as unknown as {
  otpStore: Map<string, { otp: string; expiresAt: number; attempts: number }>
}

export const otpStore = globalForOtp.otpStore || new Map<string, { otp: string; expiresAt: number; attempts: number }>()

if (process.env.NODE_ENV !== 'production') globalForOtp.otpStore = otpStore
