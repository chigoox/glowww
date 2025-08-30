'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import MotionSection, { itemVariant } from '../../components/ui/MotionSection';
import { motion } from 'framer-motion';
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
                <a
                  href="/#features"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                >
                  Features
                </a>
                <a
                  href="/#pricing"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                >
                  Pricing
                </a>
                <a
                  href="/marketplace"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                >
                  Templates
                </a>
                <a
                  href="/about"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium"
                >
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
                        <button className="text-gray-700 hover:text-purple-600 px-4 py-2 text-sm font-medium cursor-pointer transition-colors duration-200">
                          Dashboard
                        </button>
                      </Link>
                      <Link href="/Editor">
                        <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
                          Start Building
                        </button>
                      </Link>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>
                          Welcome,{" "}
                          {userData?.fullName || user?.displayName || "User"}!
                        </span>
                        <button
                          onClick={handleLogout}
                          className="text-gray-500 hover:text-red-600 px-2 py-1 text-xs underline cursor-pointer transition-colors duration-200"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    // User is not logged in
                    <>
                      <Link href="/Login">
                        <button className="text-gray-700 hover:text-purple-600 px-4 py-2 text-sm font-medium cursor-pointer transition-colors duration-200">
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
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <a
                href="/#features"
                className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium"
              >
                Features
              </a>
              <a
                href="/#pricing"
                className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium"
              >
                Pricing
              </a>
              <a
                href="/marketplace"
                className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium"
              >
                Templates
              </a>
              <a
                href="/about"
                className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium"
              >
                About
              </a>
              <div className="pt-4 pb-3 border-t border-gray-200">
                {!loading && (
                  <>
                    {user ? (
                      // User is logged in
                      <>
                        <div className="px-3 py-2 text-sm text-gray-600">
                          Welcome,{" "}
                          {userData?.fullName || user?.displayName || "User"}!
                        </div>
                        <Link href="/dashboard">
                          <button className="block text-gray-700 hover:text-purple-600 px-3 py-2 text-base font-medium w-full text-left cursor-pointer transition-colors duration-200">
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
              Create stunning websites with our visual editor. From portfolios
              and blogs to e-commerce stores and business sites - build anything
              you can imagine.
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
          <div className="mt-20 relative animate-fade-in-up">
        <div className="bg-white rounded-3xl shadow-2xl p-4 mx-auto max-w-7xl relative overflow-hidden">
          {/* Editor Chrome/Top Bar */}
          <div className="bg-gray-50 rounded-2xl p-2 mb-4 border border-gray-200">
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Glow Website Builder
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  Live Preview
                </span>
              </div>
            </div>
          </div>

          {/* Editor Interface */}
          <div className="flex flex-col md:flex-row bg-gray-50 rounded-2xl overflow-hidden min-h-[400px] md:min-h-[600px] border border-gray-200">
            {/* Left Sidebar - Toolbox (stacks above canvas on small screens) */}
            <div className="w-full md:w-64 bg-white md:border-r border-gray-200 flex flex-col">
              <div className="p-3 md:p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">
                  Components
                </h3>
                <div className="space-y-2">
                  {/* Component categories */}
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                    Layout
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="group cursor-pointer">
                      <div className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="w-6 h-6 mx-auto mb-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                        </div>
                        <div className="text-xs text-center text-gray-700 group-hover:text-purple-700">
                          Box
                        </div>
                      </div>
                    </div>
                    <div className="group cursor-pointer">
                      <div className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="w-6 h-6 mx-auto mb-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </div>
                        <div className="text-xs text-center text-gray-700 group-hover:text-purple-700">
                          Grid
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                    Content
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="group cursor-pointer">
                      <div className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="w-6 h-6 mx-auto mb-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2.5 3A1.5 1.5 0 001 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0015 5.293V4.5A1.5 1.5 0 0013.5 3h-11z" />
                            <path d="M15 6.954L8.978 9.86a2.25 2.25 0 01-1.956 0L1 6.954V11.5A1.5 1.5 0 002.5 13h11a1.5 1.5 0 001.5-1.5V6.954z" />
                          </svg>
                        </div>
                        <div className="text-xs text-center text-gray-700 group-hover:text-purple-700">
                          Text
                        </div>
                      </div>
                    </div>
                    <div className="group cursor-pointer">
                      <div className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="w-6 h-6 mx-auto mb-1 bg-gradient-to-r from-orange-500 to-red-500 rounded flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="text-xs text-center text-gray-700 group-hover:text-purple-700">
                          Image
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                    Interactive
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="group cursor-pointer">
                      <div className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                        <div className="w-6 h-6 mx-auto mb-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M8 5a1 1 0 100 2h5.586L9 11.586A1 1 0 109 13h5.586L9 17.586A1 1 0 109 19h8a1 1 0 001-1V8a1 1 0 10-2 0v5.586L11.414 9H17a1 1 0 100-2H8z" />
                          </svg>
                        </div>
                        <div className="text-xs text-center text-gray-700 group-hover:text-purple-700">
                          Button
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-white relative overflow-hidden min-h-[400px] md:min-h-[600px]">
              {/* Canvas Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white"></div>

              {/* Sample Website Being Built */}
              <div className="relative h-full p-4 md:p-8 overflow-x-hidden">
                <div className="max-w-full md:max-w-4xl mx-auto">
                  {/* Sample Content with drag handles and animations */}
                  <div className="space-y-8">
                    {/* Header Section */}
                    <div className="group relative p-4 md:p-6 bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Edit Header
                        </div>
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Welcome to My Site
                      </h1>
                      <p className="text-xl text-gray-600">
                        This is a sample website being built in real-time
                      </p>
                    </div>

                    {/* Content Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="group relative p-4 md:p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Edit Box
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold mb-4">
                          About Us
                        </h3>
                        <p className="text-gray-600">
                          We create amazing experiences through innovative
                          design and technology.
                        </p>
                      </div>

                      <div className="group relative p-4 md:p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-dashed border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Edit Image
                          </div>
                        </div>
                        <div className="w-full h-32 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg mb-4 flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600">
                          Sample image placeholder
                        </p>
                      </div>
                    </div>

                    {/* Button Section */}
                    <div className="group relative text-center">
                      <div className="inline-block relative">
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <div className="bg-pink-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Edit Button
                          </div>
                        </div>
                        <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 cursor-pointer border-2 border-dashed border-transparent hover:border-pink-300">
                          Get Started Today
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Animation Indicators */}
                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                  <div className="bg-white px-3 py-2 rounded-full shadow-lg border border-gray-200 text-xs text-gray-600 animate-pulse">
                    ✨ Real-time editing
                  </div>
                  <div className="bg-white px-3 py-2 rounded-full shadow-lg border border-gray-200 text-xs text-gray-600 animate-bounce">
                    🎨 Visual design tools
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Feature Highlights */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span>Drag & Drop Interface</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              <span>Mobile Responsive</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
              <span>Real-time Preview</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
              <span>No Coding Required</span>
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
              Powerful features for any type of website - from personal
              portfolios to enterprise solutions.
            </p>
          </div>

          <MotionSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div variants={itemVariant} className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Drag & Drop Builder
              </h3>
              <p className="text-gray-600">
                Intuitive visual editor that lets you build websites by simply
                dragging and dropping elements exactly where you want them.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={itemVariant} className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Mobile Responsive
              </h3>
              <p className="text-gray-600">
                Every website you create automatically works perfectly on all
                devices. Mobile-first design that scales beautifully.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={itemVariant} className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Lightning Fast
              </h3>
              <p className="text-gray-600">
                Optimized performance and clean code generation ensures your
                websites load quickly and rank well in search engines.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div variants={itemVariant} className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Professional Templates
              </h3>
              <p className="text-gray-600">
                Start with beautiful templates for any industry - portfolios,
                blogs, business sites, landing pages, and online stores.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div variants={itemVariant} className="bg-gradient-to-br from-pink-50 to-white p-8 rounded-2xl border border-pink-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Secure & Reliable
              </h3>
              <p className="text-gray-600">
                Built with enterprise-grade security and reliability. Your
                websites are hosted on fast, secure infrastructure.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div variants={itemVariant} className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100 hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0v4a2 2 0 002 2h2a2 2 0 002-2v-4m-6 0h6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                E-commerce Ready
              </h3>
              <p className="text-gray-600">
                Need to sell online? Built-in shopping cart, payment processing,
                and inventory management make e-commerce simple.
              </p>
            </motion.div>
          </MotionSection>

          {/* Website Types Grid */}
          <div className="mt-20">
            <div className="text-center mb-16">
              <h3 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
                Perfect for Any Website Type
              </h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Whatever you're building, Glow has the tools and features you
                need.
              </p>
            </div>

            <MotionSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Portfolios</h4>
                <p className="text-sm text-gray-600">
                  Showcase your work with stunning galleries and layouts
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Blogs</h4>
                <p className="text-sm text-gray-600">
                  Create engaging content sites with rich text and media
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Business Sites
                </h4>
                <p className="text-sm text-gray-600">
                  Professional websites for companies and services
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-orange-50 to-white rounded-xl border border-orange-100">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h1.586m0 0v4a2 2 0 002 2h2a2 2 0 002-2v-4m-6 0h6"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Online Stores
                </h4>
                <p className="text-sm text-gray-600">
                  Full e-commerce with payments and inventory management
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-pink-50 to-white rounded-xl border border-pink-100">
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Landing Pages
                </h4>
                <p className="text-sm text-gray-600">
                  High-converting pages for marketing campaigns
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100">
                <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Documentation
                </h4>
                <p className="text-sm text-gray-600">
                  Knowledge bases and help centers
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-yellow-50 to-white rounded-xl border border-yellow-100">
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Event Sites
                </h4>
                <p className="text-sm text-gray-600">
                  Conferences, weddings, and event management
                </p>
              </motion.div>

              <motion.div variants={itemVariant} className="text-center p-6 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Non-Profit</h4>
                <p className="text-sm text-gray-600">
                  Fundraising and community organization sites
                </p>
              </motion.div>
            </MotionSection>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 bg-gradient-to-br from-gray-50 to-white"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Start free, upgrade when you grow. No hidden fees.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100 relative">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Free</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <span className="text-lg text-gray-600 ml-2">forever</span>
                </div>
                <p className="text-gray-600 mb-8">Perfect to get started</p>

                <div className="space-y-4 text-left mb-8">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>1 Website</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Unlimited pages</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Basic templates</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Glow subdomain</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Basic support</span>
                  </div>
                </div>

                {!loading && (
                  <>
                    {user ? (
                      <Link href="/dashboard">
                        <button className="w-full bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200">
                          Current Plan
                        </button>
                      </Link>
                    ) : (
                      <Link href="/Signup">
                        <button className="w-full bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200">
                          Get Started Free
                        </button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-gradient-to-r from-purple-500 to-blue-500 relative transform scale-105">
              {/* Popular badge */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Pro</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    $9.99
                  </span>
                  <span className="text-lg text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-gray-600 mb-8">For growing businesses</p>

                <div className="space-y-4 text-left mb-8">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <strong>5 Websites</strong>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Unlimited pages</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Premium templates</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Custom domain support</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Remove Glow branding</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Priority support</span>
                  </div>
                </div>

                {!loading && (
                  <>
                    {user ? (
                      <Link href="/dashboard">
                        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
                          Upgrade Now
                        </button>
                      </Link>
                    ) : (
                      <Link href="/Signup">
                        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
                          Start Pro Trial
                        </button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Business Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100 relative">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Business
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">
                    $19.99
                  </span>
                  <span className="text-lg text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-gray-600 mb-8">For serious entrepreneurs</p>

                <div className="space-y-4 text-left mb-8">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <strong>25 Websites</strong>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>All premium features</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>White-label solution</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Advanced e-commerce</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>API access</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-blue-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Dedicated support</span>
                  </div>
                </div>

                {!loading && (
                  <>
                    {user ? (
                      <Link href="/dashboard">
                        <button className="w-full bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition-all duration-200">
                          Upgrade to Business
                        </button>
                      </Link>
                    ) : (
                      <Link href="/Signup">
                        <button className="w-full bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition-all duration-200">
                          Start Business Trial
                        </button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              💳 Secure payment • 🔒 Cancel anytime • 🚀 14-day free trial on
              all paid plans
            </p>
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
            🚀 Start Free - Upgrade When You Grow! 🚀
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
              <a href="/examples" className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200 inline-block">
              View Website Examples
            </a>
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
                The visual website builder that empowers everyone to create any
                type of website without code.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/marketplace" className="hover:text-white">
                    Templates
                  </a>
                </li>
                <li>
                  <a href="/#pricing" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/examples" className="hover:text-white">
                    Examples
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/support" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="/documentation" className="hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="/support" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="/support" className="hover:text-white">
                    Community
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/about" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="/blog" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="/careers" className="hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-white">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>
              &copy; 2025 Glow. All rights reserved. Built with passion for
              creators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;