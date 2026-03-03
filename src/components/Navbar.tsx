'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = session?.user as any

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">UrbanServ</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-[#6C63FF] font-medium transition">Home</Link>
            <Link href="/services" className="text-gray-600 hover:text-[#6C63FF] font-medium transition">Services</Link>

            {session ? (
              <div className="flex items-center gap-4">
                {user?.role === 'CONSUMER' && (
                  <Link href="/bookings" className="text-gray-600 hover:text-[#6C63FF] font-medium transition">My Bookings</Link>
                )}
                {user?.role === 'PROVIDER' && (
                  <Link href="/provider" className="text-gray-600 hover:text-[#6C63FF] font-medium transition">Dashboard</Link>
                )}
                {user?.role === 'ADMIN' && (
                  <Link href="/admin" className="text-gray-600 hover:text-[#6C63FF] font-medium transition">Admin</Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 bg-gray-100 rounded-full pl-3 pr-4 py-1.5 hover:bg-gray-200 transition"
                  >
                    <div className="w-7 h-7 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-gray-600 hover:text-[#6C63FF] font-medium transition">Login</Link>
                <Link href="/auth/register" className="gradient-primary text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-gray-600 font-medium py-2" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link href="/services" className="text-gray-600 font-medium py-2" onClick={() => setMenuOpen(false)}>Services</Link>
              {session ? (
                <>
                  {user?.role === 'CONSUMER' && <Link href="/bookings" className="text-gray-600 font-medium py-2" onClick={() => setMenuOpen(false)}>My Bookings</Link>}
                  {user?.role === 'PROVIDER' && <Link href="/provider" className="text-gray-600 font-medium py-2" onClick={() => setMenuOpen(false)}>Dashboard</Link>}
                  {user?.role === 'ADMIN' && <Link href="/admin" className="text-gray-600 font-medium py-2" onClick={() => setMenuOpen(false)}>Admin</Link>}
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="text-red-600 font-medium py-2 text-left">Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-gray-600 font-medium py-2" onClick={() => setMenuOpen(false)}>Login</Link>
                  <Link href="/auth/register" className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-center" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
