'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SignupStep = 'role' | 'phone' | 'otp' | 'name'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<SignupStep>('role')
  const [role, setRole] = useState('CONSUMER')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifiedUserId, setVerifiedUserId] = useState('')

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Send OTP
  const handleSendOTP = async () => {
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

      setStep('otp')
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
        body: JSON.stringify({ phone: cleanPhone, otp: otpValue, role, name: name || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      setVerifiedUserId(data.user.id)

      if (!data.user.name || data.user.name.startsWith('User ')) {
        setStep('name')
      } else {
        // Existing user — just sign in
        await completeSignIn(data.user.id)
      }
    } catch {
      setError('Verification failed')
    }
    setLoading(false)
  }

  // Complete registration with name
  const handleCompleteName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    // Update user name via API
    try {
      await fetch('/api/auth/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: verifiedUserId, name }),
      })
    } catch {
      // Non-critical — proceed anyway
    }

    await completeSignIn(verifiedUserId)
  }

  const completeSignIn = async (userId: string) => {
    const result = await signIn('phone-otp', {
      userId,
      redirect: false,
    })

    if (result?.error) {
      setError('Login failed. Please try again.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/session')
    const session = await res.json()
    const userRole = session?.user?.role

    if (userRole === 'PROVIDER') router.push('/provider')
    else router.push('/')
  }

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^[0-9]$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      const next = document.getElementById(`reg-otp-${index + 1}`)
      next?.focus()
    }

    if (value && index === 5 && newOtp.every(d => d !== '')) {
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`reg-otp-${index - 1}`)
      prev?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">Suchiti</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Join Suchiti</h1>
          <p className="text-white/80 text-lg">
            {role === 'PROVIDER'
              ? 'Start earning by providing quality services to customers in your area.'
              : 'Get access to hundreds of trusted professionals for your home service needs.'}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Suchiti</span>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            {['role', 'phone', 'otp', 'name'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition ${
                  ['role', 'phone', 'otp', 'name'].indexOf(step) >= i ? 'bg-[#6C63FF]' : 'bg-gray-200'
                }`} />
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Role Selection */}
          {step === 'role' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
              <p className="text-gray-500 mb-6">How do you want to use Suchiti?</p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setRole('CONSUMER')}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition ${
                    role === 'CONSUMER'
                      ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      role === 'CONSUMER' ? 'bg-[#6C63FF]/10' : 'bg-gray-100'
                    }`}>
                      🏠
                    </div>
                    <div>
                      <p className={`font-semibold text-lg ${role === 'CONSUMER' ? 'text-[#6C63FF]' : 'text-gray-900'}`}>I need services</p>
                      <p className="text-sm text-gray-500">Book cleaning, repairs, beauty & more</p>
                    </div>
                    <div className="ml-auto">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        role === 'CONSUMER' ? 'border-[#6C63FF]' : 'border-gray-300'
                      }`}>
                        {role === 'CONSUMER' && <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF]" />}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRole('PROVIDER')}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition ${
                    role === 'PROVIDER'
                      ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      role === 'PROVIDER' ? 'bg-[#6C63FF]/10' : 'bg-gray-100'
                    }`}>
                      🛠️
                    </div>
                    <div>
                      <p className={`font-semibold text-lg ${role === 'PROVIDER' ? 'text-[#6C63FF]' : 'text-gray-900'}`}>I provide services</p>
                      <p className="text-sm text-gray-500">Earn by offering your skills to customers</p>
                    </div>
                    <div className="ml-auto">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        role === 'PROVIDER' ? 'border-[#6C63FF]' : 'border-gray-300'
                      }`}>
                        {role === 'PROVIDER' && <div className="w-2.5 h-2.5 rounded-full bg-[#6C63FF]" />}
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep('phone')}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Phone Number */}
          {step === 'phone' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter your mobile number</h2>
              <p className="text-gray-500 mb-6">We&apos;ll send you an OTP to verify</p>

              <div className="mb-5">
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
                    maxLength={10}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('role')}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={loading || phone.length < 10}
                  className="flex-1 gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {step === 'otp' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your number</h2>
              <p className="text-gray-500 mb-6">
                Enter the 6-digit code sent to <span className="font-medium text-gray-700">+91 {phone}</span>
                <button onClick={() => { setStep('phone'); setOtp(['','','','','','']) }} className="text-[#6C63FF] ml-2 text-sm font-medium hover:underline">Change</button>
              </p>

              <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`reg-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6C63FF] focus:border-[#6C63FF] outline-none transition"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.some(d => d === '')}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 mb-4"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-500">Resend OTP in <span className="font-medium">{countdown}s</span></p>
                ) : (
                  <button onClick={handleSendOTP} className="text-sm text-[#6C63FF] font-medium hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Name */}
          {step === 'name' && (
            <form onSubmit={handleCompleteName}>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost there!</h2>
              <p className="text-gray-500 mb-6">Tell us your name to complete setup</p>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Enter your full name"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Get Started'}
              </button>
            </form>
          )}

          <p className="text-center text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#6C63FF] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
