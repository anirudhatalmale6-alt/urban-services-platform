'use client'

import { useState, useEffect, useCallback } from 'react'

interface Service {
  id: string
  name: string
  slug: string
  description: string | null
  basePrice: number
  discount: number
  duration: number
  isActive: boolean
  createdAt: string
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  isActive: boolean
  sortOrder: number
  services: Service[]
}

export default function AdminServicesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showServiceForm, setShowServiceForm] = useState<string | null>(null) // categoryId
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Category form
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('')
  const [catDesc, setCatDesc] = useState('')

  // Service form
  const [svcName, setSvcName] = useState('')
  const [svcDesc, setSvcDesc] = useState('')
  const [svcPrice, setSvcPrice] = useState('')
  const [svcDiscount, setSvcDiscount] = useState('0')
  const [svcDuration, setSvcDuration] = useState('60')

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/services')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setCategories(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const resetCategoryForm = () => {
    setCatName('')
    setCatIcon('')
    setCatDesc('')
    setShowCategoryForm(false)
    setEditingCategory(null)
  }

  const resetServiceForm = () => {
    setSvcName('')
    setSvcDesc('')
    setSvcPrice('')
    setSvcDiscount('0')
    setSvcDuration('60')
    setShowServiceForm(null)
    setEditingService(null)
  }

  const handleCreateCategory = async () => {
    if (!catName.trim()) return
    setActionLoading('create-cat')
    setError(null)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'category', name: catName, icon: catIcon, description: catDesc }),
      })
      if (res.ok) {
        const newCat = await res.json()
        setCategories((prev) => [...prev, newCat])
        resetCategoryForm()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create category')
      }
    } catch {
      setError('Failed to create category')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !catName.trim()) return
    setActionLoading('update-cat')
    setError(null)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'category', id: editingCategory.id, name: catName, icon: catIcon, description: catDesc }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        resetCategoryForm()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update category')
      }
    } catch {
      setError('Failed to update category')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    setActionLoading('del-' + categoryId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/services?type=category&id=${categoryId}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete category')
      }
    } catch {
      setError('Failed to delete category')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateService = async (categoryId: string) => {
    if (!svcName.trim() || !svcPrice) return
    setActionLoading('create-svc')
    setError(null)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'service',
          name: svcName,
          description: svcDesc,
          basePrice: svcPrice,
          discount: svcDiscount,
          duration: svcDuration,
          categoryId,
        }),
      })
      if (res.ok) {
        const newSvc = await res.json()
        setCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, services: [newSvc, ...c.services] } : c))
        )
        resetServiceForm()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create service')
      }
    } catch {
      setError('Failed to create service')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateService = async () => {
    if (!editingService || !svcName.trim() || !svcPrice) return
    setActionLoading('update-svc')
    setError(null)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'service',
          id: editingService.id,
          name: svcName,
          description: svcDesc,
          basePrice: svcPrice,
          discount: svcDiscount,
          duration: svcDuration,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            services: c.services.map((s) => (s.id === updated.id ? updated : s)),
          }))
        )
        resetServiceForm()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update service')
      }
    } catch {
      setError('Failed to update service')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleService = async (serviceId: string, currentActive: boolean) => {
    setActionLoading('toggle-' + serviceId)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'service', id: serviceId, isActive: !currentActive }),
      })
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            services: c.services.map((s) => (s.id === serviceId ? { ...s, isActive: !currentActive } : s)),
          }))
        )
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    setActionLoading('del-svc-' + serviceId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/services?type=service&id=${serviceId}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            services: c.services.filter((s) => s.id !== serviceId),
          }))
        )
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete service')
      }
    } catch {
      setError('Failed to delete service')
    } finally {
      setActionLoading(null)
    }
  }

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setCatName(cat.name)
    setCatIcon(cat.icon || '')
    setCatDesc(cat.description || '')
    setShowCategoryForm(true)
  }

  const startEditService = (svc: Service) => {
    setEditingService(svc)
    setSvcName(svc.name)
    setSvcDesc(svc.description || '')
    setSvcPrice(String(svc.basePrice))
    setSvcDiscount(String(svc.discount || 0))
    setSvcDuration(String(svc.duration))
    setShowServiceForm('edit')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Services & Categories</h1>
          <p className="text-gray-500 mt-1">Manage service categories and individual services.</p>
        </div>
        <button
          onClick={() => {
            resetCategoryForm()
            setShowCategoryForm(true)
          }}
          className="px-4 py-2 rounded-xl text-sm font-semibold gradient-primary text-white hover:opacity-90 transition shadow-md shadow-[#6C63FF]/25"
        >
          + Add Category
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Add/Edit Category Form */}
      {showCategoryForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCategory ? 'Edit Category' : 'New Category'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Home Cleaning"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Icon (emoji or URL)</label>
              <input
                type="text"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="e.g. cleaning or URL"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Short description..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
              disabled={actionLoading === 'create-cat' || actionLoading === 'update-cat'}
              className="px-4 py-2 rounded-xl text-sm font-semibold gradient-primary text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {actionLoading === 'create-cat' || actionLoading === 'update-cat'
                ? 'Saving...'
                : editingCategory ? 'Update Category' : 'Create Category'}
            </button>
            <button
              onClick={resetCategoryForm}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="w-1/3 h-5 bg-gray-200 rounded mb-2" />
                  <div className="w-1/4 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No categories yet. Create your first category to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const isExpanded = expandedCategory === cat.id
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Category header */}
                <div
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                >
                  <div className="w-12 h-12 bg-[#6C63FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {cat.icon ? (
                      <span className="text-xl">{cat.icon}</span>
                    ) : (
                      <svg className="w-6 h-6 text-[#6C63FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{cat.name}</h3>
                      <span className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {cat.services.length} service{cat.services.length !== 1 ? 's' : ''}
                      {cat.description && ` \u00B7 ${cat.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditCategory(cat)
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(cat.id)
                      }}
                      disabled={actionLoading === 'del-' + cat.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded services */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Add service button */}
                    <div className="px-6 py-3 bg-gray-50/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Services</span>
                      <button
                        onClick={() => {
                          resetServiceForm()
                          setShowServiceForm(cat.id)
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6C63FF] bg-[#6C63FF]/10 hover:bg-[#6C63FF]/20 transition"
                      >
                        + Add Service
                      </button>
                    </div>

                    {/* Add/Edit service form */}
                    {(showServiceForm === cat.id || (showServiceForm === 'edit' && editingService)) && (
                      <div className="px-6 py-4 bg-[#6C63FF]/5 border-y border-[#6C63FF]/10">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          {editingService ? 'Edit Service' : 'New Service'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                            <input
                              type="text"
                              value={svcName}
                              onChange={(e) => setSvcName(e.target.value)}
                              placeholder="e.g. Deep Cleaning"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                            <input
                              type="text"
                              value={svcDesc}
                              onChange={(e) => setSvcDesc(e.target.value)}
                              placeholder="Brief description..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Base Price ({'\u20B9'}) *</label>
                            <input
                              type="number"
                              value={svcPrice}
                              onChange={(e) => setSvcPrice(e.target.value)}
                              placeholder="499"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Discount (%)</label>
                            <input
                              type="number"
                              value={svcDiscount}
                              onChange={(e) => setSvcDiscount(e.target.value)}
                              placeholder="0"
                              min="0"
                              max="100"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (mins)</label>
                            <input
                              type="number"
                              value={svcDuration}
                              onChange={(e) => setSvcDuration(e.target.value)}
                              placeholder="60"
                              min="15"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editingService ? handleUpdateService() : handleCreateService(cat.id)}
                            disabled={actionLoading === 'create-svc' || actionLoading === 'update-svc'}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-white hover:opacity-90 transition disabled:opacity-50"
                          >
                            {actionLoading === 'create-svc' || actionLoading === 'update-svc'
                              ? 'Saving...'
                              : editingService ? 'Update' : 'Create'}
                          </button>
                          <button
                            onClick={resetServiceForm}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Services list */}
                    {cat.services.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <p className="text-xs text-gray-400">No services in this category yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {cat.services.map((svc) => (
                          <div key={svc.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                                <span className={`w-1.5 h-1.5 rounded-full ${svc.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                              </div>
                              {svc.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{svc.description}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {svc.discount > 0 ? (
                                <>
                                  <p className="text-sm font-bold text-green-600">
                                    {'\u20B9'}{Math.round(svc.basePrice * (1 - svc.discount / 100)).toLocaleString('en-IN')}
                                    <span className="ml-1.5 text-[10px] font-semibold text-white bg-green-500 px-1.5 py-0.5 rounded-full">{svc.discount}% OFF</span>
                                  </p>
                                  <p className="text-[10px] text-gray-400 line-through">{'\u20B9'}{svc.basePrice.toLocaleString('en-IN')}</p>
                                </>
                              ) : (
                                <p className="text-sm font-bold text-gray-900">{'\u20B9'}{svc.basePrice.toLocaleString('en-IN')}</p>
                              )}
                              <p className="text-[10px] text-gray-400">{svc.duration} mins</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Toggle active */}
                              <button
                                onClick={() => handleToggleService(svc.id, svc.isActive)}
                                disabled={actionLoading === 'toggle-' + svc.id}
                                className={`relative w-9 h-5 rounded-full transition disabled:opacity-50 ${
                                  svc.isActive ? 'bg-[#6C63FF]' : 'bg-gray-300'
                                }`}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  svc.isActive ? 'left-[18px]' : 'left-0.5'
                                }`} />
                              </button>
                              {/* Edit */}
                              <button
                                onClick={() => startEditService(svc)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteService(svc.id)}
                                disabled={actionLoading === 'del-svc-' + svc.id}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
