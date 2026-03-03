'use client'

import { useState, useEffect, useCallback } from 'react'

interface VerificationData {
  photoUrl: string | null
  aadhaarUrl: string | null
  aadhaarNumber: string | null
  dlVoterUrl: string | null
  dlVoterType: string | null
  dlVoterNumber: string | null
  verificationStatus: string
  verificationNote: string | null
  isApproved: boolean
}

const ID_DOC_OPTIONS = [
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'VEHICLE_RC', label: 'Vehicle RC' },
]

export default function ProviderVerificationPage() {
  const [data, setData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Which ID doc type the user chose
  const [idDocChoice, setIdDocChoice] = useState<string>('AADHAAR')

  // Upload states
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null)
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null)
  const [aadhaarUploading, setAadhaarUploading] = useState(false)
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null)
  const [aadhaarNumber, setAadhaarNumber] = useState('')

  const [dlVoterFile, setDlVoterFile] = useState<File | null>(null)
  const [dlVoterPreview, setDlVoterPreview] = useState<string | null>(null)
  const [dlVoterUploading, setDlVoterUploading] = useState(false)
  const [dlVoterUrl, setDlVoterUrl] = useState<string | null>(null)
  const [dlVoterType, setDlVoterType] = useState('DRIVING_LICENSE')
  const [dlVoterNumber, setDlVoterNumber] = useState('')

  const fetchVerification = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/provider/verification')
      if (res.ok) {
        const d = await res.json()
        setData(d)
        if (d.photoUrl) setPhotoUrl(d.photoUrl)
        if (d.aadhaarUrl) {
          setAadhaarUrl(d.aadhaarUrl)
          setIdDocChoice('AADHAAR')
        }
        if (d.aadhaarNumber) setAadhaarNumber(d.aadhaarNumber)
        if (d.dlVoterUrl) {
          setDlVoterUrl(d.dlVoterUrl)
          if (d.dlVoterType) setIdDocChoice(d.dlVoterType)
        }
        if (d.dlVoterType) setDlVoterType(d.dlVoterType)
        if (d.dlVoterNumber) setDlVoterNumber(d.dlVoterNumber)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVerification()
  }, [fetchVerification])

  const uploadFile = async (
    file: File,
    docType: string,
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void
  ) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('docType', docType)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      const { url } = await res.json()
      setUrl(url)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    // Validate photo (mandatory)
    if (!photoUrl && !photoFile) {
      setError('Please upload your photo')
      return
    }

    // Validate chosen ID document
    const isAadhaar = idDocChoice === 'AADHAAR'
    if (isAadhaar) {
      if (!aadhaarUrl && !aadhaarFile) {
        setError('Please upload your Aadhaar card')
        return
      }
      if (!aadhaarNumber.trim()) {
        setError('Please enter your Aadhaar number')
        return
      }
    } else {
      if (!dlVoterUrl && !dlVoterFile) {
        setError(`Please upload your ${ID_DOC_OPTIONS.find(o => o.value === idDocChoice)?.label || 'document'}`)
        return
      }
      if (!dlVoterNumber.trim()) {
        setError('Please enter the document number')
        return
      }
    }

    setSubmitting(true)
    try {
      // Upload pending files
      let finalPhotoUrl = photoUrl
      let finalAadhaarUrl = aadhaarUrl
      let finalDlVoterUrl = dlVoterUrl

      if (photoFile && !finalPhotoUrl) {
        await uploadFile(photoFile, 'photo', setPhotoUploading, (url) => { finalPhotoUrl = url; setPhotoUrl(url) })
      }
      if (isAadhaar && aadhaarFile && !finalAadhaarUrl) {
        await uploadFile(aadhaarFile, 'aadhaar', setAadhaarUploading, (url) => { finalAadhaarUrl = url; setAadhaarUrl(url) })
      }
      if (!isAadhaar && dlVoterFile && !finalDlVoterUrl) {
        await uploadFile(dlVoterFile, 'dlvoter', setDlVoterUploading, (url) => { finalDlVoterUrl = url; setDlVoterUrl(url) })
      }

      if (!finalPhotoUrl) {
        setError('Photo upload failed. Please try again.')
        setSubmitting(false)
        return
      }

      const payload: any = { photoUrl: finalPhotoUrl }

      if (isAadhaar) {
        if (!finalAadhaarUrl) {
          setError('Aadhaar upload failed. Please try again.')
          setSubmitting(false)
          return
        }
        payload.aadhaarUrl = finalAadhaarUrl
        payload.aadhaarNumber = aadhaarNumber.trim()
      } else {
        if (!finalDlVoterUrl) {
          setError('Document upload failed. Please try again.')
          setSubmitting(false)
          return
        }
        payload.dlVoterUrl = finalDlVoterUrl
        payload.dlVoterType = idDocChoice
        payload.dlVoterNumber = dlVoterNumber.trim()
      }

      const res = await fetch('/api/provider/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSuccess('Verification documents submitted successfully! Our team will review them shortly.')
        setData((prev) => prev ? { ...prev, verificationStatus: 'PENDING' } : prev)
        setPhotoFile(null)
        setAadhaarFile(null)
        setDlVoterFile(null)
      } else {
        const err = await res.json()
        setError(err.error || 'Submission failed')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isUploading = photoUploading || aadhaarUploading || dlVoterUploading

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl">
          <div className="animate-pulse">
            <div className="w-48 h-8 bg-gray-200 rounded mb-2" />
            <div className="w-72 h-4 bg-gray-200 rounded mb-8" />
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    NOT_SUBMITTED: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: 'text-gray-400' },
    PENDING: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-500' },
    APPROVED: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: 'text-green-500' },
    REJECTED: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: 'text-red-500' },
  }

  const status = data?.verificationStatus || 'NOT_SUBMITTED'
  const statusStyle = statusColors[status] || statusColors.NOT_SUBMITTED
  const canEdit = status !== 'APPROVED'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verification</h1>
          <p className="text-gray-500 mt-1">Upload your documents to get verified and start receiving bookings</p>
        </div>

        {/* Status Banner */}
        <div className={`rounded-2xl p-4 mb-6 border ${statusStyle.bg}`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${statusStyle.icon}`}>
              {status === 'APPROVED' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
              {status === 'PENDING' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {status === 'REJECTED' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              {status === 'NOT_SUBMITTED' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${statusStyle.text}`}>
                {status === 'NOT_SUBMITTED' && 'Documents Not Submitted'}
                {status === 'PENDING' && 'Verification Under Review'}
                {status === 'APPROVED' && 'Verified Provider'}
                {status === 'REJECTED' && 'Verification Rejected'}
              </p>
              <p className={`text-xs mt-0.5 ${statusStyle.text} opacity-80`}>
                {status === 'NOT_SUBMITTED' && 'Upload all required documents below to start the verification process.'}
                {status === 'PENDING' && 'Your documents are being reviewed. This usually takes 1-2 business days.'}
                {status === 'APPROVED' && 'Your identity has been verified. You can now receive booking requests.'}
                {status === 'REJECTED' && (data?.verificationNote || 'Your documents were rejected. Please re-upload correct documents.')}
              </p>
            </div>
          </div>
        </div>

        {/* Document Upload Form */}
        <div className="space-y-6">
          {/* 1. Profile Photo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Profile Photo</h3>
                <p className="text-xs text-gray-500">Clear face photo for identification</p>
              </div>
              {photoUrl && !photoFile && (
                <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Uploaded</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {(photoPreview || photoUrl) ? (
                  <img src={photoPreview || photoUrl!} alt="Photo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>

              {canEdit && (
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      handleFileSelect(e, setPhotoFile, setPhotoPreview)
                      const file = e.target.files?.[0]
                      if (file) uploadFile(file, 'photo', setPhotoUploading, setPhotoUrl)
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#6C63FF]/10 file:text-[#6C63FF] hover:file:bg-[#6C63FF]/20"
                  />
                  {photoUploading && <p className="text-xs text-[#6C63FF] mt-1 animate-pulse">Uploading...</p>}
                </div>
              )}
            </div>
          </div>

          {/* 2. ID Document — choose one */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">ID Document</h3>
                <p className="text-xs text-gray-500">Upload any one: Aadhaar, Driving License, Voter ID, or Vehicle RC</p>
              </div>
            </div>

            {/* Document type chooser */}
            {canEdit && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-600 mb-2">Choose Document Type</label>
                <div className="flex gap-2 flex-wrap">
                  {ID_DOC_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setIdDocChoice(opt.value); if (opt.value !== 'AADHAAR') setDlVoterType(opt.value) }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        idDocChoice === opt.value
                          ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-[#6C63FF]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Aadhaar fields */}
            {idDocChoice === 'AADHAAR' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Aadhaar Number</label>
                  <input
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12)
                      setAadhaarNumber(val.replace(/(\d{4})(?=\d)/g, '$1 ').trim())
                    }}
                    disabled={!canEdit}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {(aadhaarPreview || aadhaarUrl) ? (
                      <img src={aadhaarPreview || aadhaarUrl!} alt="Aadhaar" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => {
                          handleFileSelect(e, setAadhaarFile, setAadhaarPreview)
                          const file = e.target.files?.[0]
                          if (file) uploadFile(file, 'aadhaar', setAadhaarUploading, setAadhaarUrl)
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#6C63FF]/10 file:text-[#6C63FF] hover:file:bg-[#6C63FF]/20"
                      />
                      {aadhaarUploading && <p className="text-xs text-[#6C63FF] mt-1 animate-pulse">Uploading...</p>}
                      <p className="text-xs text-gray-400 mt-1">Upload front side of Aadhaar card</p>
                    </div>
                  )}
                </div>

                {aadhaarUrl && !aadhaarFile && (
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Uploaded</span>
                  </div>
                )}
              </>
            )}

            {/* DL / Voter ID / Vehicle RC fields */}
            {idDocChoice !== 'AADHAAR' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Document Number</label>
                  <input
                    type="text"
                    value={dlVoterNumber}
                    onChange={(e) => setDlVoterNumber(e.target.value.toUpperCase())}
                    disabled={!canEdit}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder={
                      idDocChoice === 'DRIVING_LICENSE' ? 'e.g. MH01 20200012345'
                      : idDocChoice === 'VOTER_ID' ? 'e.g. ABC1234567'
                      : 'e.g. MH01AB1234'
                    }
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {(dlVoterPreview || dlVoterUrl) ? (
                      <img src={dlVoterPreview || dlVoterUrl!} alt="Document" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => {
                          handleFileSelect(e, setDlVoterFile, setDlVoterPreview)
                          const file = e.target.files?.[0]
                          if (file) uploadFile(file, 'dlvoter', setDlVoterUploading, setDlVoterUrl)
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#6C63FF]/10 file:text-[#6C63FF] hover:file:bg-[#6C63FF]/20"
                      />
                      {dlVoterUploading && <p className="text-xs text-[#6C63FF] mt-1 animate-pulse">Uploading...</p>}
                    </div>
                  )}
                </div>

                {dlVoterUrl && !dlVoterFile && (
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Uploaded</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          {/* Submit */}
          {canEdit && (
            <button
              onClick={handleSubmit}
              disabled={submitting || isUploading}
              className="w-full gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading files...
                </>
              ) : status === 'REJECTED' ? (
                'Re-submit for Verification'
              ) : status === 'PENDING' ? (
                'Update Documents'
              ) : (
                'Submit for Verification'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
