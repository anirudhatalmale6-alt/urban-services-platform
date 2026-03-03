'use client'

import { useEffect, useState } from 'react'
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
  category: { name: string; icon: string }
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [popularServices, setPopularServices] = useState<Service[]>([])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories)
    fetch('/api/services').then(r => r.json()).then((data: Service[]) => setPopularServices(data.slice(0, 8)))
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="gradient-hero text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Home services,<br />
              <span className="text-white/90">delivered to your door</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-lg">
              Book trusted professionals for cleaning, repairs, beauty, and more. Quality service guaranteed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/services"
                className="bg-white text-[#6C63FF] px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition text-center"
              >
                Browse Services
              </Link>
              <Link
                href="/auth/register?role=PROVIDER"
                className="border-2 border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition text-center"
              >
                Become a Provider
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-[#6C63FF]">10K+</p>
              <p className="text-sm text-gray-500">Happy Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#6C63FF]">500+</p>
              <p className="text-sm text-gray-500">Verified Providers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#6C63FF]">50+</p>
              <p className="text-sm text-gray-500">Service Types</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#6C63FF]">4.8</p>
              <p className="text-sm text-gray-500">Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">What do you need help with?</h2>
            <p className="text-gray-500 max-w-md mx-auto">Browse our wide range of home services and book instantly</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/services?category=${cat.slug}`}
                className="bg-white rounded-2xl p-6 text-center card-hover border border-gray-100"
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{cat.name}</h3>
                <p className="text-xs text-gray-500">{cat._count.services} services</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Popular Services</h2>
              <p className="text-gray-500">Most booked services by our customers</p>
            </div>
            <Link href="/services" className="text-[#6C63FF] font-semibold hover:underline hidden sm:block">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {popularServices.map((svc) => (
              <Link
                key={svc.id}
                href={`/services/${svc.slug}`}
                className="bg-gray-50 rounded-2xl p-5 card-hover border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{svc.category.icon}</span>
                  <span className="text-xs text-gray-500 font-medium">{svc.category.name}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{svc.name}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{svc.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#6C63FF]">₹{svc.basePrice}</span>
                  <span className="text-xs text-gray-400">{svc.duration} min</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500">Book a service in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Choose a Service', desc: 'Browse through our categories and pick the service you need', icon: '🔍' },
              { step: '02', title: 'Book & Pay', desc: 'Select a time slot, add your address, and pay securely online', icon: '📅' },
              { step: '03', title: 'Get it Done', desc: 'A verified professional arrives at your door and gets the job done', icon: '✅' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#6C63FF]/10 flex items-center justify-center text-3xl mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="text-sm text-[#6C63FF] font-semibold mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gradient-hero rounded-3xl p-10 lg:p-16 text-center text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">Join thousands of happy customers who trust Suchiti for their home service needs.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="bg-white text-[#6C63FF] px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition">
                Book a Service
              </Link>
              <Link href="/auth/register?role=PROVIDER" className="border-2 border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition">
                Join as Provider
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-bold">Suchiti</span>
              </div>
              <p className="text-sm text-gray-400">Quality home services at your doorstep. Trusted by thousands.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Home Cleaning</p>
                <p>Beauty & Spa</p>
                <p>Plumbing</p>
                <p>Electrician</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>About Us</p>
                <p>Careers</p>
                <p>Contact</p>
                <p>Blog</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Help Center</p>
                <p>Terms of Service</p>
                <p>Privacy Policy</p>
                <p>Refund Policy</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            &copy; 2026 Suchiti. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
