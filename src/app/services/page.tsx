'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description: string
  _count: { services: number }
}

interface Service {
  id: string
  name: string
  slug: string
  description: string
  basePrice: number
  duration: number
  category: { id: string; name: string; icon: string; slug: string }
}

interface CartItem {
  service: Service
  quantity: number
}

export default function ServicesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#6C63FF] border-t-transparent rounded-full animate-spin" /></div>}>
      <ServicesPage />
    </Suspense>
  )
}

function ServicesPage() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')

  const [categories, setCategories] = useState<Category[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam)
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Fetch categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [])

  // Fetch services (all at once, filter client-side for responsiveness)
  useEffect(() => {
    setLoading(true)
    fetch('/api/services')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setServices(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Sync URL param to state
  useEffect(() => {
    setSelectedCategory(categoryParam)
  }, [categoryParam])

  // Filtered services
  const filteredServices = useMemo(() => {
    let result = services

    if (selectedCategory) {
      result = result.filter((s) => s.category.slug === selectedCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [services, selectedCategory, searchQuery])

  // Persist cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      const cartData = cart.map(item => ({
        serviceId: item.service.id,
        name: item.service.name,
        price: item.service.basePrice,
        quantity: item.quantity,
        categoryIcon: item.service.category.icon,
      }))
      localStorage.setItem('urbanserv-cart', JSON.stringify(cartData))
    } else {
      localStorage.removeItem('urbanserv-cart')
    }
  }, [cart])

  // Cart helpers
  const addToCart = (service: Service) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.service.id === service.id)
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { service, quantity: 1 }]
    })
  }

  const removeFromCart = (serviceId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.service.id === serviceId)
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.service.id === serviceId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return prev.filter((item) => item.service.id !== serviceId)
    })
  }

  const getCartQuantity = (serviceId: string) => {
    return cart.find((item) => item.service.id === serviceId)?.quantity || 0
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.service.basePrice * item.quantity,
    0
  )

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleCategoryClick = (slug: string | null) => {
    setSelectedCategory(slug)
    setMobileSidebarOpen(false)
    // Update URL without full reload
    const url = new URL(window.location.href)
    if (slug) {
      url.searchParams.set('category', slug)
    } else {
      url.searchParams.delete('category')
    }
    window.history.pushState({}, '', url.toString())
  }

  const activeCategory = categories.find((c) => c.slug === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Page Header */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {activeCategory ? activeCategory.name : 'All Services'}
              </h1>
              <p className="text-gray-500 mt-1">
                {activeCategory
                  ? activeCategory.description
                  : 'Browse and book trusted home services'}
              </p>
            </div>
            <div className="text-sm text-gray-400">
              {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] transition text-gray-900 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Category Filter Chips */}
      <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              !selectedCategory
                ? 'gradient-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.slug)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? 'gradient-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Categories
              </h3>
              <nav className="space-y-1">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    !selectedCategory
                      ? 'bg-[#6C63FF]/10 text-[#6C63FF]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">📋</span>
                  <span>All Services</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {services.length}
                  </span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      selectedCategory === cat.slug
                        ? 'bg-[#6C63FF]/10 text-[#6C63FF]'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {cat._count.services}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Services Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              /* Loading Skeleton */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                      <div className="w-20 h-4 bg-gray-200 rounded" />
                    </div>
                    <div className="w-3/4 h-5 bg-gray-200 rounded mb-3" />
                    <div className="w-full h-4 bg-gray-200 rounded mb-2" />
                    <div className="w-2/3 h-4 bg-gray-200 rounded mb-4" />
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-6 bg-gray-200 rounded" />
                      <div className="w-24 h-9 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              /* Empty State */
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No services found
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {searchQuery
                    ? `No results for "${searchQuery}". Try a different search term.`
                    : 'No services available in this category yet.'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    handleCategoryClick(null)
                  }}
                  className="gradient-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition"
                >
                  View All Services
                </button>
              </div>
            ) : (
              /* Services Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredServices.map((service) => {
                  const qty = getCartQuantity(service.id)
                  return (
                    <div
                      key={service.id}
                      className="bg-white rounded-2xl border border-gray-100 p-5 card-hover flex flex-col"
                    >
                      {/* Category Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center text-lg">
                          {service.category.icon}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          {service.category.name}
                        </span>
                      </div>

                      {/* Service Info */}
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg leading-snug">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
                        {service.description}
                      </p>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{service.duration} min</span>
                      </div>

                      {/* Price + Cart Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xl font-bold text-[#6C63FF]">
                          ₹{service.basePrice.toLocaleString('en-IN')}
                        </span>
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(service)}
                            className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition flex items-center gap-1.5"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(service.id)}
                              className="w-8 h-8 rounded-lg border-2 border-[#6C63FF] text-[#6C63FF] flex items-center justify-center hover:bg-[#6C63FF]/10 transition font-semibold text-sm"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-semibold text-gray-900 text-sm">
                              {qty}
                            </span>
                            <button
                              onClick={() => addToCart(service)}
                              className="w-8 h-8 rounded-lg gradient-primary text-white flex items-center justify-center hover:opacity-90 transition font-semibold text-sm"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Summary Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="bg-white rounded-2xl shadow-[0_-4px_30px_rgba(108,99,255,0.15)] border border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
              {/* Cart Info */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center relative">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                    />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6584] text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {cartItemCount}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {cartItemCount} service{cartItemCount !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{cartTotal.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Cart Items Preview (desktop) */}
              <div className="hidden md:flex items-center gap-2 flex-1 justify-center overflow-hidden">
                {cart.slice(0, 3).map((item) => (
                  <span
                    key={item.service.id}
                    className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
                  >
                    {item.service.category.icon} {item.service.name}
                    {item.quantity > 1 && (
                      <span className="text-[#6C63FF] font-semibold ml-1">
                        x{item.quantity}
                      </span>
                    )}
                  </span>
                ))}
                {cart.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{cart.length - 3} more
                  </span>
                )}
              </div>

              {/* Book Now Button */}
              <Link
                href="/bookings/new"
                className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2 flex-shrink-0"
              >
                Book Now
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding when cart is visible */}
      {cart.length > 0 && <div className="h-24" />}
    </div>
  )
}
