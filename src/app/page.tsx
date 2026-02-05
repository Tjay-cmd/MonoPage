'use client';

import { ArrowRight, Globe, Palette, Sparkles, ShieldCheck, Zap, TrendingUp, Award, Users, CheckCircle2, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0 }
  };
  
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  };
  
  const slideInLeft = {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 }
  };
  
  const slideInRight = {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 sticky top-0 z-50 transition-all">
        <div className="px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-20">
            <div />
            <div className="flex items-center justify-center">
              <Link href="/" className="flex items-center group" aria-label="MonoPage home">
                <Image
                  src="/images/Logo.png"
                  alt="MonoPage logo"
                  width={150}
                  height={50}
                  className="h-12 w-auto md:h-16 transition-transform group-hover:scale-105"
                  priority
                />
              </Link>
            </div>
            <div className="flex items-center justify-end space-x-4 pr-2 sm:pr-0">
              <Link href="/auth/login" className="text-gray-600 hover:text-orange-600 transition-all font-medium hover:scale-105">
                Sign In
              </Link>
              <Link href="/auth/register" className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-2xl transition-all hover:scale-105 shadow-lg">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          {/* Background Image with Parallax */}
          <motion.div 
            className="absolute inset-0 bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/header background.png')",
              backgroundSize: 'cover',
              y
            }}
          >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
          </motion.div>
        
          {/* Animated overlay elements */}
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl animate-pulse delay-700" />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-orange-200/10 blur-3xl animate-pulse delay-1000" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Launch Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-white/90 to-white/70 px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-xl ring-2 ring-orange-300/50 backdrop-blur-xl hover:scale-105 transition-transform"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              Launch in 30 minutes
            </motion.div>

            {/* Hero Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 text-5xl md:text-7xl font-black text-gray-900 leading-tight tracking-tight"
            >
              Your Business, Your Brand,{' '}
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent animate-gradient">
                Your Way
              </span>
            </motion.h1>

            {/* Hero Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8 text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Go live with a professional one-page website, smart service booking, and secure PayFast payments—built specifically for{' '}
              <span className="text-orange-600 font-semibold">South African small businesses</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-12 flex flex-col sm:flex-row gap-4 sm:items-center justify-center"
            >
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-10 py-4 text-lg font-bold text-white shadow-2xl shadow-gray-900/30 transition-all hover:scale-105 hover:shadow-3xl"
              >
                Start Building
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white/90 backdrop-blur border-2 border-gray-200 px-10 py-4 text-lg font-bold text-gray-700 shadow-xl transition-all hover:scale-105 hover:border-orange-300 hover:shadow-2xl">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                  ▶
                </span>
                Watch 2‑min Demo
              </button>
            </motion.div>

            {/* Social Proof Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-16 grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto"
            >
              <motion.div 
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="group flex items-center gap-5 rounded-3xl bg-gradient-to-br from-white to-orange-50/50 px-8 py-6 shadow-2xl shadow-orange-100/60 ring-2 ring-orange-200/50 backdrop-blur-xl hover:scale-105 transition-all"
              >
                <span className="relative flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-xl font-black text-white shadow-lg shadow-orange-500/40 group-hover:rotate-6 transition-transform">
                  96%
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-base font-bold text-gray-900">Satisfied launches</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer satisfaction after launching with MonoPage.
                  </p>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1.3 }}
                className="group flex items-center gap-5 rounded-3xl bg-gradient-to-br from-white to-gray-50 px-8 py-6 shadow-2xl shadow-gray-200/60 ring-2 ring-gray-200/50 backdrop-blur-xl hover:scale-105 transition-all"
              >
                <span className="relative flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 text-xl font-black text-white shadow-lg shadow-gray-800/40 group-hover:rotate-6 transition-transform">
                  250+
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-base font-bold text-gray-900">Active businesses</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Service businesses selling online today.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Trusted By Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="mt-16 flex items-center justify-center gap-3 text-sm text-gray-500"
            >
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-white" />
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-white" />
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 ring-2 ring-white" />
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 ring-2 ring-white" />
              </div>
              <p className="font-semibold">Trusted by <span className="text-orange-600">250+</span> South African businesses</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Redesigned */}
      <section className="py-24 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-4 py-2 text-sm font-bold text-orange-600 mb-6"
            >
              <Sparkles className="h-4 w-4" />
              Features
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Everything You Need to Sell Services Online
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Launch a professional page, take payments, and manage bookings—no code.
            </p>
            
            {/* Feature Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 mb-12"
            >
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-lg border border-orange-100">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
                <span className="font-bold text-gray-900">PayFast Ready</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-lg border border-orange-100">
                <Zap className="h-5 w-5 text-orange-600" />
                <span className="font-bold text-orange-600">Launch in 30 min</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ staggerChildren: 0.15 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            <motion.div 
              variants={fadeInUp}
              onAnimationComplete={() => {
                const el = document.getElementById('card-1');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-slow'), 50);
                }
              }}
              className="bg-white rounded-2xl p-8 shadow-xl border border-orange-100 hover:shadow-2xl transition-all"
              id="card-1"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Quick Setup</h3>
                  <p className="text-gray-600 mb-4">Launch your page in minutes</p>
                  <Link href="/auth/register" className="inline-flex items-center gap-2 text-orange-600 font-bold hover:gap-3 transition-all">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              onAnimationComplete={() => {
                const el = document.getElementById('card-2');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-slow', 'delay-1000'), 50);
                }
              }}
              className="bg-white rounded-2xl p-8 shadow-xl border border-orange-100 hover:shadow-2xl transition-all"
              id="card-2"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Palette className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Professional Templates</h3>
                  <p className="text-gray-600 mb-4">Beautiful, mobile-ready designs</p>
                  <Link href="/auth/register" className="inline-flex items-center gap-2 text-orange-600 font-bold hover:gap-3 transition-all">
                    View Templates <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              onAnimationComplete={() => {
                const el = document.getElementById('card-3');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-slow', 'delay-2000'), 50);
                }
              }}
              className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 shadow-xl border-2 border-orange-200 hover:shadow-2xl transition-all"
              id="card-3"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Integrated Payments</h3>
                  <p className="text-gray-600 mb-4">Accept payments instantly and securely with PayFast.</p>
                  <Link href="/auth/register" className="inline-flex items-center gap-2 text-orange-600 font-bold hover:gap-3 transition-all">
                    Secure & Instant <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Additional Features Grid */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <motion.div 
              variants={scaleIn}
              onAnimationComplete={() => {
                const el = document.getElementById('mini-card-1');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-bounce'), 50);
                }
              }}
              className="bg-white rounded-xl p-4 shadow-md border border-orange-50 hover:shadow-lg transition-all text-center"
              id="mini-card-1"
            >
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">Booking System</h4>
              <p className="text-xs text-gray-600">Manage appointments</p>
            </motion.div>

            <motion.div 
              variants={scaleIn}
              onAnimationComplete={() => {
                const el = document.getElementById('mini-card-2');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-bounce', 'delay-1000'), 50);
                }
              }}
              className="bg-white rounded-xl p-4 shadow-md border border-orange-50 hover:shadow-lg transition-all text-center"
              id="mini-card-2"
            >
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">Analytics</h4>
              <p className="text-xs text-gray-600">Track your growth</p>
            </motion.div>

            <motion.div 
              variants={scaleIn}
              onAnimationComplete={() => {
                const el = document.getElementById('mini-card-3');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-bounce', 'delay-2000'), 50);
                }
              }}
              className="bg-white rounded-xl p-4 shadow-md border border-orange-50 hover:shadow-lg transition-all text-center"
              id="mini-card-3"
            >
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">Custom Domain</h4>
              <p className="text-xs text-gray-600">Your brand, your URL</p>
            </motion.div>

            <motion.div 
              variants={scaleIn}
              onAnimationComplete={() => {
                const el = document.getElementById('mini-card-4');
                if (el) {
                  el.style.transition = 'transform 0.3s ease-out';
                  setTimeout(() => el.classList.add('animate-float-bounce', 'delay-3000'), 50);
                }
              }}
              className="bg-white rounded-xl p-4 shadow-md border border-orange-50 hover:shadow-lg transition-all text-center"
              id="mini-card-4"
            >
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">SA Support</h4>
              <p className="text-xs text-gray-600">Local assistance</p>
            </motion.div>
          </motion.div>

          {/* CTA Button */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mt-12"
          >
            <Link href="/auth/register" className="inline-flex items-center gap-3 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-gray-800 transition-all hover:scale-105 shadow-2xl">
              Start Building
              <ArrowRight className="h-6 w-6" />
            </Link>
            <p className="mt-4 text-gray-600">
              <Link href="/dashboard/templates" className="underline hover:text-orange-600 transition-colors">See templates</Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Progression System */}
      <section className="py-24 bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-orange-500 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-amber-500 blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            variants={fadeInUp}
            className="text-center mb-20"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-2 text-sm font-bold text-orange-700 mb-6"
            >
              <TrendingUp className="h-4 w-4" />
              Progressive Growth
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Grow With Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start simple, unlock advanced features as you grow. No upfront costs—pay only when you're ready to scale.
            </p>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ staggerChildren: 0.2 }}
            className="grid md:grid-cols-3 gap-8 relative items-stretch"
          >
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-orange-200 via-orange-300 to-amber-300 opacity-30 -translate-y-1/2" />
            
            {/* Starter Tier */}
            <motion.div variants={fadeInUp} className="group relative flex">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-3xl p-8 shadow-2xl border-2 border-orange-200 hover:border-orange-400 transition-all hover:scale-105 flex flex-col w-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Starter</h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                    FREE
                  </div>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed font-medium">
                  Create services, generate payment links, and launch your one-page website.
                </p>
                <ul className="space-y-3 flex-grow">
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Up to 5 services</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Basic templates</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">PayFast integration</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Mobile optimized</span>
                  </li>
                </ul>
              </div>
            </motion.div>
            
            {/* Professional Tier */}
            <motion.div variants={fadeInUp} className="group relative flex">
              <div className="absolute -inset-1 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity animate-pulse" />
              <div className="relative bg-white rounded-3xl p-8 shadow-2xl border-4 border-orange-300 hover:border-orange-400 transition-all hover:scale-110 transform flex flex-col w-full">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-lg">
                  MOST POPULAR
                </div>
                <div className="flex items-center justify-between mb-6 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                      <Star className="h-6 w-6 text-white fill-white" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Professional</h3>
                  </div>
                </div>
                <div className="mb-4 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-black text-orange-700">Unlock at 10+ sales</span>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed font-medium">
                  Enhanced branding with custom domains and advanced templates.
                </p>
                <ul className="space-y-3 flex-grow">
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Custom domain</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Advanced templates</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Email integration</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">Customer testimonials</span>
                  </li>
                </ul>
              </div>
            </motion.div>
            
            {/* Business Tier */}
            <motion.div variants={fadeInUp} className="group relative flex">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-3xl p-8 shadow-2xl border-2 border-amber-200 hover:border-amber-400 transition-all hover:scale-105 flex flex-col w-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Business</h3>
                  </div>
                </div>
                <div className="mb-4 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-black text-amber-700">Unlock at 50+ sales</span>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed font-medium">
                  Full website with booking system and customer management.
                </p>
                <ul className="space-y-3 flex-grow">
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Multi-page website</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Booking system</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Customer management</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Advanced analytics</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </motion.div>

          {/* Value Proposition */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-8 px-8 py-6 rounded-3xl bg-gradient-to-r from-white to-gray-50 shadow-2xl border-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-gray-900">No Upfront Costs</p>
                  <p className="text-sm text-gray-600">Start free, scale as you grow</p>
                </div>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-gray-900">Unlock Naturally</p>
                  <p className="text-sm text-gray-600">Features unlock with sales</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-orange-50/20 to-white" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-4 py-2 text-sm font-bold text-orange-600 mb-6">
              <Star className="h-4 w-4 fill-orange-600" />
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Loved by South African Businesses
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say about their success with MonoPage
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="group bg-gradient-to-br from-white to-orange-50/50 rounded-3xl p-8 shadow-xl border-2 border-orange-100 hover:shadow-2xl hover:scale-105 transition-all">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-orange-500 fill-orange-500" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed font-medium italic">
                "MonoPage helped me launch my barbershop's website in less than an hour. Now I'm taking online bookings and getting more customers!"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
                  T
                </div>
                <div>
                  <p className="font-bold text-gray-900">Thabo M.</p>
                  <p className="text-sm text-gray-600">Barbershop Owner, Johannesburg</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="group bg-gradient-to-br from-white to-amber-50/50 rounded-3xl p-8 shadow-xl border-2 border-amber-100 hover:shadow-2xl hover:scale-105 transition-all">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-amber-500 fill-amber-500" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed font-medium italic">
                "Finally, a platform that understands South African businesses! The PayFast integration works perfectly and my students can pay easily."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">
                  S
                </div>
                <div>
                  <p className="font-bold text-gray-900">Sarah K.</p>
                  <p className="text-sm text-gray-600">Tutor, Cape Town</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="group bg-gradient-to-br from-white to-orange-50/50 rounded-3xl p-8 shadow-xl border-2 border-orange-100 hover:shadow-2xl hover:scale-105 transition-all">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-orange-500 fill-orange-500" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed font-medium italic">
                "Best decision for my photography business! The templates look professional and I can showcase my work beautifully."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg">
                  L
                </div>
                <div>
                  <p className="font-bold text-gray-900">Lerato N.</p>
                  <p className="text-sm text-gray-600">Photographer, Durban</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <Image
                src="/images/Logo.png"
                alt="MonoPage logo"
                width={150}
                height={50}
                className="h-12 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                Your Small Business Starter Kit. Built specifically for South African entrepreneurs who want to launch their business online quickly and affordably.
              </p>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-110">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-110">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/auth/register" className="hover:text-orange-400 transition-colors">Get Started</Link></li>
                <li><Link href="/auth/login" className="hover:text-orange-400 transition-colors">Sign In</Link></li>
                <li><a href="#features" className="hover:text-orange-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-orange-400 transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold text-lg mb-4">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-orange-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                © 2024 MonoPage. All rights reserved. Made with ❤️ in South Africa.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-6 w-6 rounded bg-green-500 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-400">Secured by PayFast</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}