import { ArrowRight, Globe, Palette, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-20">
            <div />
            <div className="flex items-center justify-center">
              <Link href="/" className="flex items-center" aria-label="MonoPage home">
                <Image
                  src="/images/Logo.png"
                  alt="MonoPage logo"
                  width={150}
                  height={50}
                  className="h-12 w-auto md:h-16"
                  priority
                />
              </Link>
            </div>
            <div className="flex items-center justify-end space-x-4 pr-2 sm:pr-0">
              <Link href="/auth/login" className="text-gray-600 hover:text-orange-600 transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100" />
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-60 w-60 rounded-full bg-amber-100/40 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-orange-600 shadow-sm ring-1 ring-orange-200/60 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Launch in 30 minutes
              </span>
              <h1 className="mt-8 text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                Your Business, Your Brand,{' '}
                <span className="text-orange-600">Your Way</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl">
                Go live with a professional one-page website, smart service booking, and secure PayFast payments—built specifically for South African small businesses.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:items-center">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 py-3 text-lg font-semibold text-white shadow-xl shadow-gray-900/20 transition hover:bg-gray-800"
                >
                  Start Building
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-8 py-3 text-lg font-semibold text-gray-700 transition hover:border-gray-300">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    ▶
                  </span>
                  Watch 2‑min Demo
                </button>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4 rounded-3xl bg-white/80 px-6 py-4 shadow-lg shadow-orange-100/40 ring-1 ring-orange-200/80 backdrop-blur">
                  <span className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full bg-orange-500 text-base font-semibold text-white overflow-hidden">
                    <span className="absolute inset-0 bg-white/10" />
                    <span className="relative">96%</span>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">Satisfied launches</span>
                    <p className="text-xs text-gray-500">
                      Customer satisfaction after launching with MonoPage.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-3xl bg-white/80 px-6 py-4 shadow-lg shadow-gray-200/40 ring-1 ring-gray-200/80 backdrop-blur">
                  <span className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gray-900 text-base font-semibold text-white overflow-hidden">
                    <span className="absolute inset-0 bg-white/10" />
                    <span className="relative">250+</span>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">Active businesses</span>
                    <p className="text-xs text-gray-500">
                      Service businesses selling online today.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white to-orange-50 blur-3xl opacity-80" />
              <div className="relative rounded-3xl bg-white/95 shadow-2xl ring-1 ring-orange-100 p-8 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-orange-600">Pro toolkit preview</span>
                  <span className="text-xs text-gray-400">MonoPage Studio</span>
                </div>
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/80 via-white to-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-orange-500 shadow-sm ring-1 ring-orange-200/60">
                          <Globe className="h-3.5 w-3.5" />
                          Custom domain active
                        </span>
                        <h3 className="mt-3 text-lg font-bold text-gray-900">thebarberstudio.co.za</h3>
                        <p className="mt-2 text-xs text-gray-500">
                          SSL secured · Auto-renew enabled · Live on MonoPage CDN
                        </p>
                      </div>
                      <span className="ml-4 text-xs font-bold text-green-600">LIVE</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                      Template collection
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="group relative overflow-hidden rounded-xl border border-orange-100 bg-white px-4 py-5 text-left shadow-sm transition hover:shadow-md">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                        <div className="pl-2">
                          <span className="block text-sm font-bold text-gray-900 leading-tight">
                            Bold Beauty
                          </span>
                          <p className="mt-2.5 text-xs font-normal text-orange-600 leading-relaxed">
                            High-contrast glam layout.
                          </p>
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-800 px-4 py-5 text-left shadow-sm">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600" />
                        <div className="pl-2">
                          <span className="block text-sm font-bold text-white leading-tight">
                            Urban Groom
                          </span>
                          <p className="mt-2.5 text-xs font-normal text-white/70 leading-relaxed">
                            Sleek dark style for barbers.
                          </p>
                        </div>
                      </div>
                      <div className="group relative overflow-hidden rounded-xl border border-amber-100 bg-white px-4 py-5 text-left shadow-sm transition hover:shadow-md">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                        <div className="pl-2">
                          <span className="block text-sm font-bold text-gray-900 leading-tight">
                            Lens & Light
                          </span>
                          <p className="mt-2.5 text-xs font-normal text-amber-600 leading-relaxed">
                            Minimal gallery for creatives.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                      Swap designs instantly without losing your content.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Sparkles className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          Smart automations
                        </p>
                        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                          Auto-generate PayFast links, email branded receipts, and sync customer info to your CRM.
                        </p>
                        <div className="mt-3.5 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-medium text-orange-600">
                            PayFast receipts
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white">
                            Service reminders
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          Priority support & analytics
                        </p>
                        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                          Weekly performance snapshots and personalised optimisation tips from the MonoPage team.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Start Online
            </h2>
            <p className="text-lg text-gray-600">
              No coding, no design skills needed. Just focus on your business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="flex items-center justify-center mx-auto mb-4">
                <Image 
                  src="/images/Quick_setup_icon.png" 
                  alt="Quick Setup" 
                  width={80} 
                  height={80}
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Quick Setup
              </h3>
              <p className="text-gray-600">
                Create your services, choose a template, and go live in minutes. 
                No technical knowledge required.
              </p>
            </div>
            
            <div className="card text-center">
              <div className="flex items-center justify-center mx-auto mb-4">
                <Image 
                  src="/images/payfast_integration_icon.png" 
                  alt="Integrated Payments" 
                  width={80} 
                  height={80}
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Integrated Payments
              </h3>
              <p className="text-gray-600">
                Accept payments instantly with PayFast integration. 
                Generate payment links for each service automatically.
              </p>
            </div>
            
            <div className="card text-center">
              <div className="flex items-center justify-center mx-auto mb-4">
                <Image 
                  src="/images/Professional_Templates_icon.png" 
                  alt="Professional Templates" 
                  width={80} 
                  height={80}
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Professional Templates
              </h3>
              <p className="text-gray-600">
                Beautiful, mobile-ready templates designed specifically 
                for your business type and industry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progression System */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Grow With Your Business
            </h2>
            <p className="text-lg text-gray-600">
              Start simple, unlock advanced features as you grow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card">
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Starter</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Create services, generate payment links, and launch your one-page website.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Up to 5 services</li>
                <li>• Basic templates</li>
                <li>• PayFast integration</li>
                <li>• Mobile optimized</li>
              </ul>
            </div>
            
            <div className="card border-orange-200 border-2">
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Professional</h3>
                <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                  Unlock at 10+ sales
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                Enhanced branding with custom domains and advanced templates.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Custom domain</li>
                <li>• Advanced templates</li>
                <li>• Email integration</li>
                <li>• Customer testimonials</li>
              </ul>
            </div>
            
            <div className="card">
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Business</h3>
                <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                  Unlock at 50+ sales
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                Full website with booking system and customer management.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Multi-page website</li>
                <li>• Booking system</li>
                <li>• Customer management</li>
                <li>• Advanced analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Online Journey?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join hundreds of small businesses already growing online with BusinessBuilder.
          </p>
          <Link href="/auth/register" className="bg-gray-900 text-white hover:bg-gray-800 font-semibold py-3 px-8 rounded-xl text-lg transition-colors duration-200 shadow-lg hover:shadow-xl">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">BusinessBuilder</h3>
            <p className="text-gray-400 mb-4">
              Your Small Business Starter Kit
            </p>
            <p className="text-sm text-gray-500">
              © 2024 BusinessBuilder. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}