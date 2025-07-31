'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';

function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, userData, loading } = useAuth();

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut();
      // User will be redirected automatically via AuthContext
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Glow
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#features" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Features
                </a>
                <a href="#pricing" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Pricing
                </a>
                <a href="#templates" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Templates
                </a>
                <a href="#about" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  About
                </a>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {!loading && (
                <>
                  {user ? (
                    // User is logged in
                    <div className="flex items-center space-x-4">
                      <Link href="/dashboard">
                        <button className="text-gray-700 hover:text-purple-600 px-4 py-2 text-sm font-medium">
                          Dashboard
                        </button>
                      </Link>
                      <Link href="/Editor">
                        <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
                          Start Building
                        </button>
                      </Link>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>Welcome, {userData?.fullName || user?.displayName || 'User'}!</span>
                        <button 
                          onClick={handleLogout}
                          className="text-gray-500 hover:text-red-600 px-2 py-1 text-xs underline"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    // User is not logged in
                    <>
                      <Link href="/Login">
                        <button className="text-gray-700 hover:text-purple-600 px-4 py-2 text-sm font-medium">
                          Sign In
                        </button>
                      </Link>
                      <Link href="/Signup">
                        <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
                          Start Building
                        </button>
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-purple-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <a href="#features" className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium">
                Features
              </a>
              <a href="#pricing" className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium">
                Pricing
              </a>
              <a href="#templates" className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium">
                Templates
              </a>
              <a href="#about" className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium">
                About
              </a>
              <div className="pt-4 pb-3 border-t border-gray-200">
                {!loading && (
                  <>
                    {user ? (
                      // User is logged in
                      <>
                        <div className="px-3 py-2 text-sm text-gray-600">
                          Welcome, {userData?.fullName || user?.displayName || 'User'}!
                        </div>
                        <Link href="/dashboard">
                          <button className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium w-full text-left">
                            Dashboard
                          </button>
                        </Link>
                        <Link href="/Editor">
                          <button className="mt-2 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg text-base font-medium">
                            Start Building
                          </button>
                        </Link>
                      </>
                    ) : (
                      // User is not logged in
                      <>
                        <Link href="/Login">
                          <button className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium w-full text-left">
                            Sign In
                          </button>
                        </Link>
                        <Link href="/Signup">
                          <button className="mt-2 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg text-base font-medium">
                            Start Building
                          </button>
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Build Any Website
              <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Without Code
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create stunning websites with our visual editor. From portfolios and blogs to e-commerce stores and business sites - build anything you can imagine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!loading && (
                <>
                  {user ? (
                    <Link href="/Editor">
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                        Continue Building
                      </button>
                    </Link>
                  ) : (
                    <Link href="/Signup">
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                        Start Building Free
                      </button>
                    </Link>
                  )}
                </>
              )}
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-purple-300 hover:text-purple-600 transition-all duration-200">
                Watch Demo
              </button>
            </div>
          </div>

          {/* Hero Image/Demo */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-2xl shadow-2xl p-4 mx-auto max-w-5xl">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl h-96 md:h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Interactive Editor Preview</p>
                  <p className="text-sm text-gray-500 mt-2">Visual website builder interface</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Create
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features for any type of website - from personal portfolios to enterprise solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Drag & Drop Builder</h3>
              <p className="text-gray-600">
                Intuitive visual editor that lets you build websites by simply dragging and dropping elements exactly where you want them.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Mobile Responsive</h3>
              <p className="text-gray-600">
                Every website you create automatically works perfectly on all devices. Mobile-first design that scales beautifully.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600">
                Optimized performance and clean code generation ensures your websites load quickly and rank well in search engines.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Templates</h3>
              <p className="text-gray-600">
                Start with beautiful templates for any industry - portfolios, blogs, business sites, landing pages, and online stores.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-pink-50 to-white p-8 rounded-2xl border border-pink-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-600">
                Built with enterprise-grade security and reliability. Your websites are hosted on fast, secure infrastructure.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0v4a2 2 0 002 2h2a2 2 0 002-2v-4m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">E-commerce Ready</h3>
              <p className="text-gray-600">
                Need to sell online? Built-in shopping cart, payment processing, and inventory management make e-commerce simple.
              </p>
            </div>
          </div>

          {/* Website Types Grid */}
          <div className="mt-20">
            <div className="text-center mb-16">
              <h3 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
                Perfect for Any Website Type
              </h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Whatever you're building, Glow has the tools and features you need.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Portfolios</h4>
                <p className="text-sm text-gray-600">Showcase your work with stunning galleries and layouts</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Blogs</h4>
                <p className="text-sm text-gray-600">Create engaging content sites with rich text and media</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Business Sites</h4>
                <p className="text-sm text-gray-600">Professional websites for companies and services</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-white rounded-xl border border-orange-100">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0v4a2 2 0 002 2h2a2 2 0 002-2v-4m-6 0h6" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Online Stores</h4>
                <p className="text-sm text-gray-600">Full e-commerce with payments and inventory management</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-white rounded-xl border border-pink-100">
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Landing Pages</h4>
                <p className="text-sm text-gray-600">High-converting pages for marketing campaigns</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Documentation</h4>
                <p className="text-sm text-gray-600">Knowledge bases and help centers</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-white rounded-xl border border-yellow-100">
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Event Sites</h4>
                <p className="text-sm text-gray-600">Conferences, weddings, and event management</p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Non-Profit</h4>
                <p className="text-sm text-gray-600">Fundraising and community organization sites</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Everything you need to build and sell online. One price, forever.
          </p>
          
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-4 border-gradient-to-r from-purple-500 to-blue-500 relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                BEST VALUE
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lifetime Access</h3>
              <div className="mb-6">
                <span className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">$1</span>
                <span className="text-xl text-gray-600 ml-2">one time</span>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Pay once, own forever. No monthly fees, no hidden costs.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-8">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Unlimited websites & pages</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Any website type</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>E-commerce capabilities</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Mobile responsive design</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>SEO optimization tools</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Analytics & insights</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Lifetime updates</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Priority support</span>
                  </div>
                </div>
              </div>
              
              {!loading && (
                <>
                  {user ? (
                    <Link href="/Editor">
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 w-full md:w-auto">
                        Continue Building
                      </button>
                    </Link>
                  ) : (
                    <Link href="/Signup">
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 w-full md:w-auto">
                        Get Lifetime Access - $1
                      </button>
                    </Link>
                  )}
                </>
              )}
              
              <p className="text-sm text-gray-500 mt-4">
                💳 Secure payment • 🔒 30-day money back guarantee • 🚀 Instant access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Start Building Your Dream Website Today
          </h2>
          <p className="text-xl text-purple-100 mb-4">
            Join thousands of creators building amazing websites with Glow.
          </p>
          <p className="text-2xl font-bold text-white mb-8">
            🎉 Special Launch Price: Only $1 for Lifetime Access! 🎉
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!loading && (
              <>
                {user ? (
                  <Link href="/Editor">
                    <button className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg">
                      Continue Building
                    </button>
                  </Link>
                ) : (
                  <Link href="/Signup">
                    <button className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg">
                      Get Started - $1 Lifetime
                    </button>
                  </Link>
                )}
              </>
            )}
            <button className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200">
              View Website Examples
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Glow
              </span>
              <p className="mt-4 text-gray-400">
                The visual website builder that empowers everyone to create any type of website without code.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Templates</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Examples</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Community</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Glow. All rights reserved. Built with passion for creators.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;