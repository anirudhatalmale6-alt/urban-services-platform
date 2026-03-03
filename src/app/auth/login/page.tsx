'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type AuthMode = 'phone' | 'email'
type OTPStep = 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<AuthMode>('phone')

  // Phone OTP state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpStep, setOtpStep] = useState<OTPStep>('phone')
  const [countdown, setCountdown] = useState(0)
  const [devOtp, setDevOtp] = useState('')

  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Shared state
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const redirectByRole = async () => {
    const res = await fetch('/api/auth/session')
    const session = await res.json()
    const role = session?.user?.role
    if (role === 'ADMIN') router.push('/admin')
    else if (role === 'PROVIDER') router.push('/provider')
    else router.push('/')
  }

  // Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cleanPhone = phone.startsWith('+') ? phone : `+91${phone}`

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      // In dev mode, show the OTP for testing
      if (data.otp) setDevOtp(data.otp)

      setOtpStep('otp')
      setCountdown(30)
    } catch {
      setError('Failed to send OTP')
    }
    setLoading(false)
  }

  // Verify OTP
  const handleVerifyOTP = async () => {
    const otpValue = otp.join('')
    if (otpValue.length !== 6) return

    setError('')
    setLoading(true)

    const cleanPhone = phone.startsWith('+') ? phone : `+91${phone}`

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp: otpValue }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      // Sign in with NextAuth using the verified user ID
      const result = await signIn('phone-otp', {
        userId: data.user.id,
        redirect: false,
      })

      if (result?.error) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      await redirectByRole()
    } catch {
      setError('Verification failed')
    }
    setLoading(false)
  }

  // Email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
      return
    }

    await redirectByRole()
  }

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^[0-9]$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`)
      next?.focus()
    }

    // Auto-verify when all 6 digits entered
    if (value && index === 5 && newOtp.every(d => d !== '')) {
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`)
      prev?.focus()
    }
  }

  // Handle paste for OTP
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      const last = document.getElementById('otp-5')
      last?.focus()
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">UrbanServ</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Welcome back!</h1>
          <p className="text-white/80 text-lg">Book trusted professionals for all your home service needs. Quality service, right at your doorstep.</p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">UrbanServ</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
          <p className="text-gray-500 mb-6">
            {authMode === 'phone' ? 'Enter your mobile number to get started' : 'Enter your credentials to continue'}
          </p>

          {/* Auth mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('phone'); setError(''); setOtpStep('phone') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                authMode === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile OTP
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('email'); setError('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                authMode === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Phone OTP Flow */}
          {authMode === 'phone' && otpStep === 'phone' && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                    placeholder="98765 43210"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {authMode === 'phone' && otpStep === 'otp' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                  <button
                    onClick={() => { setOtpStep('phone'); setOtp(['', '', '', '', '', '']); setDevOtp('') }}
                    className="text-xs text-[#6C63FF] font-medium hover:underline"
                  >
                    Change number
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  OTP sent to <span className="font-medium text-gray-700">+91 {phone}</span>
                </p>

                {/* OTP Input Boxes */}
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6C63FF] focus:border-[#6C63FF] outline-none transition"
                    />
                  ))}
                </div>

                {/* Dev mode OTP hint */}
                {devOtp && (
                  <p className="text-xs text-center text-amber-600 mt-2 bg-amber-50 rounded-lg py-1.5">
                    Dev mode — OTP: <span className="font-mono font-bold">{devOtp}</span>
                  </p>
                )}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.some(d => d === '')}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-500">Resend OTP in <span className="font-medium text-gray-700">{countdown}s</span></p>
                ) : (
                  <button
                    onClick={handleSendOTP as any}
                    className="text-sm text-[#6C63FF] font-medium hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Email Login Flow */}
          {authMode === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          <p className="text-center text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-[#6C63FF] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
