'use client';
import { trpc } from '../lib/trpc';
import Link from 'next/link';
import { useState } from 'react';
import Floating3DCards from './components/Floating3DCards';
import ModularGrid from './components/ModularGrid';

export default function HomePage() {
  const connections = trpc.connections.useQuery();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Single Navigation Header */}
      <nav className="relative z-20 flex items-center justify-between p-6 bg-transparent backdrop-blur-sm">
        <div className="flex items-center space-x-8">
          <div className="text-2xl font-black text-gray-900">ZYYP</div>
          <div className="hidden md:flex space-x-6">
            <Link href="/" className="text-gray-900 font-medium">Home</Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About</Link>
            <Link href="/gallery" className="text-gray-600 hover:text-gray-900 transition-colors">Gallery</Link>
            <Link href="/team" className="text-gray-600 hover:text-gray-900 transition-colors">Team</Link>
            <Link href="/member" className="text-gray-600 hover:text-gray-900 transition-colors">Member</Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/integrations" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Integrations</Link>
          <Link href="/inbox" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Inbox</Link>
          <button className="bg-orange-500 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all duration-300">
            Sign in
          </button>
          <button className="bg-black text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all duration-300">
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* Hero Section - Web3/NFT Style */}
      <section className="relative min-h-screen bg-gray-50 overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>

        {/* Floating 3D Cards Background */}
        <div className="absolute inset-0 pointer-events-none">
          <Floating3DCards cardCount={6} />
        </div>

        {/* Main Hero Content */}
        <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-6">
          <div className="max-w-5xl text-center">
            <h1 className="text-6xl md:text-8xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
              Shopify Automation
              <br />
              <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto font-medium">
              A collection of 10,000+ AI-powered workflows for your Shopify store. 
              Automate customer support, process refunds, and manage orders with intelligent automation.
            </p>
            <button className="bg-black text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 transition-all duration-300 hover:scale-105">
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Dark Section with Card Grid */}
      <section className="bg-black py-20 relative" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white">Shopify Top Features</h2>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm font-medium">Filter:</span>
              <select className="bg-gray-800 text-white px-4 py-2 rounded-full border border-gray-700 text-sm font-medium">
                <option>All Features</option>
                <option>AI Support</option>
                <option>Automation</option>
                <option>Analytics</option>
              </select>
            </div>
          </div>

          {/* 3-Column Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* AI Support Card */}
            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-8 relative overflow-hidden group hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl mb-6 flex items-center justify-center">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">AI Customer Support</h3>
                <p className="text-white/90 mb-6 text-sm font-medium">Intelligent responses to customer inquiries with 95% accuracy</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">AI Support</span>
                  <span className="text-sm text-white/70 font-medium">+95% Accuracy</span>
                </div>
              </div>
            </div>

            {/* Automation Card */}
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-8 relative overflow-hidden group hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl mb-6 flex items-center justify-center">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Smart Automation</h3>
                <p className="text-white/90 mb-6 text-sm font-medium">Automated workflows for refunds, cancellations, and order management</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Automation</span>
                  <span className="text-sm text-white/70 font-medium">+80% Efficiency</span>
                </div>
              </div>
            </div>

            {/* Analytics Card */}
            <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-8 relative overflow-hidden group hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl mb-6 flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Advanced Analytics</h3>
                <p className="text-white/90 mb-6 text-sm font-medium">Real-time insights into customer behavior and support patterns</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Analytics</span>
                  <span className="text-sm text-white/70 font-medium">+60% Insights</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modular Grid Section */}
          <div className="relative">
            <h3 className="text-3xl font-black text-white mb-8 text-center">Modular Integration System</h3>
            <div className="relative h-96 rounded-2xl overflow-hidden">
              <ModularGrid moduleCount={12} />
            </div>
          </div>
        </div>
      </section>

      {/* Light Section - Integration Steps */}
      <section className="py-20 bg-gray-50" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Seamlessly integrate with your existing tools
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Native connections for Shopify and Gmail. Secure OAuth and resilient webhooks keep your inbox in sync.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-3xl font-black text-gray-900">Connect in 3 steps</h3>
                <div className="space-y-6">
                  {[
                    { step: '1', title: 'Install Shopify app', desc: 'Add our app to your Shopify store' },
                    { step: '2', title: 'Approve Gmail access', desc: 'Connect your Gmail account securely' },
                    { step: '3', title: 'Start automating', desc: 'Let AI handle your customer support' },
                  ].map((item, index) => (
                    <div key={item.step} className="flex items-start gap-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-gray-900 mb-2">{item.title}</h4>
                        <p className="text-gray-600 font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/integrations" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full font-bold hover:from-orange-600 hover:to-red-600 transition-all duration-300 hover:scale-105">
                  Connect your store
                </Link>
                <Link href="/inbox" className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-all duration-300 hover:scale-105">
                  See it in action
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Shopify card */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 group hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl">🛍️</div>
                  <div className="text-lg font-black text-gray-900">Shopify</div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="h-3 w-32 bg-gray-200 rounded-full"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded-full"></div>
                </div>
                <Link href="/integrations" className="w-full bg-green-600 text-white text-center py-3 px-4 rounded-full text-sm font-bold hover:bg-green-700 transition-all duration-300">
                  Connect
                </Link>
              </div>
              
              {/* Gmail card */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 group hover:scale-105 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white text-2xl">✉️</div>
                  <div className="text-lg font-black text-gray-900">Gmail</div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="h-3 w-32 bg-gray-200 rounded-full"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded-full"></div>
                </div>
                <Link href="/integrations" className="w-full bg-red-600 text-white text-center py-3 px-4 rounded-full text-sm font-bold hover:bg-red-700 transition-all duration-300">
                  Authorize
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Section - Stats */}
      <section className="py-20 bg-black" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Trusted by leading Shopify stores
            </h2>
            <p className="text-xl text-gray-300 font-medium">
              Join thousands of e-commerce businesses automating their customer service
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { number: '2.5K+', label: 'Shopify Stores' },
              { number: '95%', label: 'AI Accuracy' },
              { number: '30s', label: 'Avg Response' },
              { number: '24/7', label: 'AI Support' },
            ].map((stat, index) => (
              <div key={index} className="text-center group hover:scale-105 transition-all duration-300">
                <div className="text-5xl font-black text-white mb-3">{stat.number}</div>
                <div className="text-gray-400 font-bold text-sm uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Light Section - Pricing */}
      <section className="py-20 bg-gray-50" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-600 font-medium">Choose the plan that fits your business needs</p>
          </div>
          
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">Annual discount</span>
              <button
                type="button"
                aria-pressed={annual}
                onClick={() => setAnnual((v) => !v)}
                className={`${annual ? 'bg-orange-500' : 'bg-gray-200'} relative h-8 w-16 rounded-full transition-colors duration-300`}
              >
                <span
                  className={`${annual ? 'translate-x-9' : 'translate-x-1'} inline-block h-6 w-6 translate-y-1 rounded-full bg-white transition-transform duration-300`}
                />
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200 group hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-black text-gray-900 mb-2">Start</div>
              <div className="text-5xl font-black text-gray-900 mb-6">Free</div>
              <ul className="space-y-4 text-sm text-gray-600 font-medium mb-8">
                <li>Up to 3 workflows</li>
                <li>250 emails / mo</li>
                <li>AI replies and approvals</li>
              </ul>
              <Link href="/integrations" className="w-full border-2 border-gray-300 text-gray-700 text-center py-4 rounded-full font-bold hover:bg-gray-100 transition-all duration-300">
                Get started
              </Link>
            </div>
            
            {/* Team */}
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-8 shadow-2xl relative group hover:scale-105 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-white text-orange-500 px-6 py-2 rounded-full text-sm font-black">Most Popular</span>
              </div>
              <div className="text-2xl font-black text-white mb-2">Team</div>
              <div className="text-5xl font-black text-white mb-2">
                {annual ? '$150' : '$175'}<span className="text-2xl font-bold text-white/80">/mo</span>
              </div>
              {annual && <div className="text-sm text-white/80 font-medium mb-6">Billed annually</div>}
              <ul className="space-y-4 text-sm text-white/90 font-medium mb-8">
                <li>Unlimited workflows</li>
                <li>Unlimited responses</li>
                <li>Add up to 5 teammates</li>
                <li>Project folders and permissions</li>
              </ul>
              <Link href="/integrations" className="w-full bg-white text-orange-500 text-center py-4 rounded-full font-black hover:bg-gray-100 transition-all duration-300">
                Start free trial
              </Link>
            </div>
            
            {/* Enterprise */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200 group hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-black text-gray-900 mb-2">Enterprise</div>
              <div className="text-5xl font-black text-gray-900 mb-6">Custom</div>
              <ul className="space-y-4 text-sm text-gray-600 font-medium mb-8">
                <li>Custom branding</li>
                <li>Unlimited users</li>
                <li>Custom enhancements</li>
                <li>SSO and dedicated support</li>
              </ul>
              <Link href="/integrations" className="w-full border-2 border-gray-300 text-gray-700 text-center py-4 rounded-full font-bold hover:bg-gray-100 transition-all duration-300">
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Dark Section */}
      <section className="py-20 bg-black" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready to transform your e-commerce support?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto font-medium">
            Start automating your Shopify customer support today with our AI-powered platform.
          </p>
          <Link href="/integrations" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-12 py-6 rounded-full text-xl font-black hover:from-orange-600 hover:to-red-600 transition-all duration-300 hover:scale-105">
            Get started for free
          </Link>
        </div>
      </section>
    </div>
  );
}