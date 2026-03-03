'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface CartItem {
  serviceId: string
  name: string
  price: number
  quantity: number
  categoryIcon: string
}

interface SavedAddress {
  id: string
  label: string
  fullAddress: string
  city: string
  state: string
  pincode: string
  landmark: string | null
  isDefault: boolean
}

interface AddressForm {
  fullAddress: string
  city: string
  state: string
  pincode: string
  landmark: string
  label: string
}

interface BookingResult {
  id: string
  bookingNumber: string
  total: number
  scheduledDate: string
  scheduledTime: string
  paymentMethod: string
  address: SavedAddress
}

const STEPS = [
  { number: 1, title: 'Address', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { number: 2, title: 'Schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { number: 3, title: 'Payment', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
]

const ADDRESS_LABELS = ['Home', 'Office', 'Other']

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
]

function getNext7Days(): { date: Date; label: string; dayName: string; dayNum: number; monthShort: string; isToday: boolean }[] {
  const days = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      date: d,
      label: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString('en-IN', { month: 'short' }),
      isToday: i === 0,
    })
  }
  return days
}

export default function NewBookingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressForm>({
    fullAddress: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    label: 'Home',
  })
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressError, setAddressError] = useState('')

  // Schedule state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const dateDays = getNext7Days()

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Success state
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Load cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('suchiti-cart')
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed)
        }
      }
    } catch {
      // ignore parse errors
    }
    setCartLoaded(true)
  }, [])

  // Redirect if empty cart
  useEffect(() => {
    if (cartLoaded && cart.length === 0 && !bookingResult) {
      router.push('/services')
    }
  }, [cartLoaded, cart, router, bookingResult])

  // Fetch saved addresses
  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/addresses')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setSavedAddresses(data)
          // Auto-select default or first address
          const def = data.find((a: SavedAddress) => a.isDefault)
          if (def) {
            setSelectedAddressId(def.id)
          } else if (data.length > 0) {
            setSelectedAddressId(data[0].id)
          }
        }
      }
    } catch {
      // fail silently, user can still add new address
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses()
    }
  }, [status, fetchAddresses])

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = Math.round(subtotal * 0.18 * 100) / 100
  const total = subtotal + gst
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Address form handler
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddressError('')

    if (!addressForm.fullAddress || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      setAddressError('Please fill in all required fields.')
      return
    }

    if (!/^\d{6}$/.test(addressForm.pincode)) {
      setAddressError('Please enter a valid 6-digit pincode.')
      return
    }

    setAddressSaving(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addressForm,
          isDefault: savedAddresses.length === 0,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save address')
      }

      const newAddr = await res.json()
      setSavedAddresses((prev) => [...prev, newAddr])
      setSelectedAddressId(newAddr.id)
      setShowAddressForm(false)
      setAddressForm({ fullAddress: '', city: '', state: '', pincode: '', landmark: '', label: 'Home' })
    } catch (err: any) {
      setAddressError(err.message || 'Something went wrong.')
    } finally {
      setAddressSaving(false)
    }
  }

  // Step validation
  const canProceedFromStep = (step: number): boolean => {
    if (step === 1) return !!selectedAddressId
    if (step === 2) return !!selectedDate && !!selectedTime
    return true
  }

  // Submit booking
  const handleConfirmBooking = async () => {
    if (!selectedAddressId || !selectedDate || !selectedTime) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: cart.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
          })),
          addressId: selectedAddressId,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          paymentMethod,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create booking')
      }

      const booking = await res.json()
      setBookingResult(booking)

      // Clear cart
      localStorage.removeItem('suchiti-cart')
      setCart([])
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (status === 'loading' || !cartLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-[#6C63FF]/20 border-t-[#6C63FF] rounded-full animate-spin" />
            <p className="text-gray-500 font-medium">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Success screen
  if (bookingResult) {
    const scheduledDateFormatted = new Date(bookingResult.scheduledDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-10 text-center">
            {/* Success icon */}
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-500 mb-6">Your service has been booked successfully</p>

            {/* Booking number */}
            <div className="bg-[#6C63FF]/5 rounded-2xl p-5 mb-6">
              <p className="text-sm text-gray-500 mb-1">Booking Number</p>
              <p className="text-2xl font-bold text-[#6C63FF] tracking-wider">{bookingResult.bookingNumber}</p>
            </div>

            {/* Booking details */}
            <div className="space-y-3 text-left mb-8">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-medium text-gray-900">{scheduledDateFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Time</span>
                <span className="text-sm font-medium text-gray-900">{bookingResult.scheduledTime}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Payment</span>
                <span className="text-sm font-medium text-gray-900">
                  {bookingResult.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Razorpay'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-bold text-[#6C63FF]">
                  &#8377;{bookingResult.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/bookings')}
                className="flex-1 gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                View My Bookings
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Header */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Complete Your Booking</h1>
          <p className="text-gray-500 mt-1">
            {totalItems} service{totalItems !== 1 ? 's' : ''} in your cart
          </p>
        </div>
      </section>

      {/* Stepper Progress Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => {
                      // Only allow going back to completed steps
                      if (step.number < currentStep) setCurrentStep(step.number)
                    }}
                    disabled={step.number > currentStep}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                      step.number < currentStep
                        ? 'gradient-primary text-white shadow-md shadow-[#6C63FF]/25'
                        : step.number === currentStep
                        ? 'gradient-primary text-white shadow-md shadow-[#6C63FF]/25 ring-4 ring-[#6C63FF]/20'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step.number < currentStep ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-xs font-medium ${
                      step.number <= currentStep ? 'text-[#6C63FF]' : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4">
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          step.number < currentStep ? 'gradient-primary w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* ==================== STEP 1: ADDRESS ==================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Where should we send the professional?</h2>
              <p className="text-sm text-gray-500">Select a saved address or add a new one</p>
            </div>

            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <div className="space-y-3">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddressId(addr.id)
                      setShowAddressForm(false)
                    }}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                      selectedAddressId === addr.id
                        ? 'border-[#6C63FF] bg-[#6C63FF]/5 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          selectedAddressId === addr.id ? 'gradient-primary' : 'bg-gray-100'
                        }`}
                      >
                        <svg
                          className={`w-5 h-5 ${selectedAddressId === addr.id ? 'text-white' : 'text-gray-400'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          {addr.label === 'Office' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="text-xs bg-[#6C63FF]/10 text-[#6C63FF] px-2 py-0.5 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{addr.fullAddress}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {addr.city}, {addr.state} - {addr.pincode}
                          {addr.landmark && ` | Near ${addr.landmark}`}
                        </p>
                      </div>
                      {selectedAddressId === addr.id && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Add New Address Button / Form */}
            {!showAddressForm ? (
              <button
                onClick={() => {
                  setShowAddressForm(true)
                  setSelectedAddressId(null)
                }}
                className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white hover:border-[#6C63FF] hover:bg-[#6C63FF]/5 transition-all duration-200 flex items-center justify-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-[#6C63FF]/10 flex items-center justify-center transition">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6C63FF] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-500 group-hover:text-[#6C63FF] transition">
                  Add New Address
                </span>
              </button>
            ) : (
              <form onSubmit={handleAddressSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">New Address</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false)
                      if (savedAddresses.length > 0) {
                        setSelectedAddressId(savedAddresses[0].id)
                      }
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>

                {addressError && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {addressError}
                  </div>
                )}

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Label</label>
                  <div className="flex gap-2">
                    {ADDRESS_LABELS.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setAddressForm((prev) => ({ ...prev, label }))}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                          addressForm.label === label
                            ? 'gradient-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Address <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={addressForm.fullAddress}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, fullAddress: e.target.value }))}
                    placeholder="Flat/House no., Building, Street, Area"
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400 resize-none"
                  />
                </div>

                {/* City + State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g. Mumbai"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      State <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g. Maharashtra"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Pincode + Landmark */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Pincode <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                      placeholder="e.g. 400001"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Landmark</label>
                    <input
                      type="text"
                      value={addressForm.landmark}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, landmark: e.target.value }))}
                      placeholder="e.g. Near City Mall"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addressSaving}
                  className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addressSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Address'
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================== STEP 2: SCHEDULE ==================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">When would you like the service?</h2>
              <p className="text-sm text-gray-500">Pick a date and time slot that works for you</p>
            </div>

            {/* Date Picker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Select Date
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                {dateDays.map((day) => (
                  <button
                    key={day.label}
                    onClick={() => setSelectedDate(day.label)}
                    className={`flex flex-col items-center py-3 sm:py-4 rounded-2xl border-2 transition-all duration-200 card-hover ${
                      selectedDate === day.label
                        ? 'border-[#6C63FF] bg-[#6C63FF]/5 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium mb-1 ${
                        selectedDate === day.label ? 'text-[#6C63FF]' : 'text-gray-400'
                      }`}
                    >
                      {day.isToday ? 'Today' : day.dayName}
                    </span>
                    <span
                      className={`text-xl sm:text-2xl font-bold ${
                        selectedDate === day.label ? 'text-[#6C63FF]' : 'text-gray-900'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                    <span
                      className={`text-xs ${
                        selectedDate === day.label ? 'text-[#6C63FF]' : 'text-gray-400'
                      }`}
                    >
                      {day.monthShort}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select Time Slot
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`py-3 px-2 rounded-xl text-sm font-medium border-2 transition-all duration-200 ${
                      selectedTime === slot
                        ? 'border-[#6C63FF] bg-[#6C63FF]/5 text-[#6C63FF]'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected summary */}
            {selectedDate && selectedTime && (
              <div className="bg-[#6C63FF]/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-[#6C63FF] font-semibold">{selectedTime}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 3: PAYMENT ==================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Pay</h2>
              <p className="text-sm text-gray-500">Confirm your order details and choose a payment method</p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.serviceId} className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {item.categoryIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      &#8377;{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">&#8377;{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST (18%)</span>
                  <span className="text-gray-900">&#8377;{gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                  <span className="text-gray-900">Total</span>
                  <span className="text-[#6C63FF]">&#8377;{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Booking Details Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>
              <div className="space-y-3">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Service Address</p>
                    {(() => {
                      const addr = savedAddresses.find((a) => a.id === selectedAddressId)
                      return addr ? (
                        <>
                          <p className="text-sm font-medium text-gray-900">{addr.label}</p>
                          <p className="text-sm text-gray-500">{addr.fullAddress}, {addr.city} - {addr.pincode}</p>
                        </>
                      ) : null
                    })()}
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Scheduled For</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedDate).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-[#6C63FF] font-semibold">{selectedTime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
              <div className="space-y-3">
                {/* Razorpay */}
                <button
                  onClick={() => setPaymentMethod('RAZORPAY')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === 'RAZORPAY' ? 'gradient-primary' : 'bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${paymentMethod === 'RAZORPAY' ? 'text-white' : 'text-gray-400'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Pay Online (Razorpay)</p>
                    <p className="text-xs text-gray-400">UPI, Cards, Netbanking, Wallets</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'RAZORPAY' ? 'border-[#6C63FF]' : 'border-gray-300'
                    }`}
                  >
                    {paymentMethod === 'RAZORPAY' && (
                      <div className="w-2.5 h-2.5 rounded-full gradient-primary" />
                    )}
                  </div>
                </button>

                {/* COD */}
                <button
                  onClick={() => setPaymentMethod('COD')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                    paymentMethod === 'COD'
                      ? 'border-[#6C63FF] bg-[#6C63FF]/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === 'COD' ? 'gradient-primary' : 'bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${paymentMethod === 'COD' ? 'text-white' : 'text-gray-400'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-xs text-gray-400">Pay when the professional arrives</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'COD' ? 'border-[#6C63FF]' : 'border-gray-300'
                    }`}
                  >
                    {paymentMethod === 'COD' && (
                      <div className="w-2.5 h-2.5 rounded-full gradient-primary" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Additional Notes (Optional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for the professional..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400 resize-none"
              />
            </div>

            {/* Error */}
            {submitError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* ==================== NAVIGATION BUTTONS ==================== */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex items-center gap-2 text-gray-600 font-semibold hover:text-gray-900 transition py-3 px-4 rounded-xl hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <button
              onClick={() => router.push('/services')}
              className="flex items-center gap-2 text-gray-600 font-semibold hover:text-gray-900 transition py-3 px-4 rounded-xl hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Services
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceedFromStep(currentStep)}
              className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Booking
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
