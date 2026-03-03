'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'

interface ProviderProfile {
  id: string
  userId: string
  bio: string | null
  experience: number
  idDocument: string | null
  idDocumentType: string | null
  isApproved: boolean
  approvedAt: string | null
  rating: number
  totalReviews: number
  totalEarnings: number
  serviceAreaCity: string | null
  serviceAreaPincode: string | null
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
}

export default function ProviderProfilePage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState(0)
  const [serviceAreaCity, setServiceAreaCity] = useState('')
  const [serviceAreaPincode, setServiceAreaPincode] = useState('')
  const [idDocument, setIdDocument] = useState<File | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/provider/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setName(data.user?.name || '')
        setPhone(data.user?.phone || '')
        setBio(data.bio || '')
        setExperience(data.experience || 0)
        setServiceAreaCity(data.serviceAreaCity || '')
        setServiceAreaPincode(data.serviceAreaPincode || '')
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const body: Record<string, unknown> = {
        name,
        phone,
        bio,
        experience,
        serviceAreaCity,
        serviceAreaPincode,
      }

      if (idDocument) {
        body.idDocumentName = idDocument.name
        body.idDocumentType = idDocument.type
      }

      const res = await fetch('/api/provider/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const errData = await res.json().catch(() => ({ error: 'Failed to save profile' }))
        setError(errData.error || 'Failed to save profile')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl">
          <div className="animate-pulse">
            <div className="w-48 h-8 bg-gray-200 rounded mb-2" />
            <div className="w-72 h-4 bg-gray-200 rounded mb-8" />
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
                  <div className="w-full h-10 bg-gray-200 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1">Manage your provider profile and service details</p>
        </div>

        {/* Approval Status */}
        <div className={`rounded-2xl p-4 mb-6 flex items-center gap-3 ${
          profile?.isApproved
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          {profile?.isApproved ? (
            <>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Profile Approved</p>
                <p className="text-xs text-green-600">
                  Your profile is verified. You can receive booking requests.
                  {profile.approvedAt && ` Approved on ${new Date(profile.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-800">Pending Approval</p>
                <p className="text-xs text-yellow-600">
                  Your profile is under review. Complete your profile details and upload an ID document to speed up the process.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Profile stats (rating, reviews) */}
        {profile && (profile.totalReviews > 0 || profile.totalEarnings > 0) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-[#6C63FF]">{profile.rating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Rating</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{profile.totalReviews}</p>
              <p className="text-xs text-gray-500 mt-1">Reviews</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{'\u20B9'}{profile.totalEarnings.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500 mt-1">Earned</p>
            </div>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h2>

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm resize-none"
                placeholder="Tell customers about your experience and expertise..."
              />
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={50}
                value={experience}
                onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm"
                placeholder="0"
              />
            </div>

            {/* Service Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Area - City</label>
                <input
                  type="text"
                  value={serviceAreaCity}
                  onChange={(e) => setServiceAreaCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm"
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Area - Pincode</label>
                <input
                  type="text"
                  value={serviceAreaPincode}
                  onChange={(e) => setServiceAreaPincode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm"
                  placeholder="e.g. 400001"
                />
              </div>
            </div>

            {/* ID Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Document</label>
              {profile?.idDocument && !idDocument && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-lg">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-green-700 font-medium">
                    Document uploaded: {profile.idDocument}
                  </span>
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#6C63FF]/10 file:text-[#6C63FF] hover:file:bg-[#6C63FF]/20"
                />
              </div>
              {idDocument && (
                <p className="text-xs text-[#6C63FF] mt-1 font-medium">
                  New file selected: {idDocument.name}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">Upload Aadhaar, PAN, or Driving License (image or PDF)</p>
            </div>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          {saved && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile saved successfully!
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-white px-8 py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
