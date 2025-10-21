'use client';
import { trpc } from '../lib/trpc';
import Link from 'next/link';
import { useState } from 'react';
import AnimatedDiagram from './components/AnimatedDiagram';
import InteractiveStats from './components/InteractiveStats';
import FeatureTabs from './components/FeatureTabs';
import HeroSection from './HeroSection';
import Reveal from './components/Reveal';
import Magnetic from './components/Magnetic';
import TiltCard from './components/TiltCard';
import Parallax from './components/Parallax';

export default function HomePage() {
  const connections = trpc.connections.useQuery();
  const [annual, setAnnual] = useState(false);

  return (
    <main className="relative min-h-screen bg-white">
      {/* Hero Section - Following design.json */}
      <HeroSection />

      {/* Value Proposition Section */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Reveal>
                <h2 className="section-headline text-gray-900">
                  Automate your Shopify customer support workflow
                </h2>
              </Reveal>
              
              <Reveal>
                <p className="body-text text-gray-600 max-w-lg">
                  Create intelligent workflows that handle common customer requests automatically. 
                  Set up approval chains for refunds, cancellations, and replacements while maintaining full control.
                </p>
              </Reveal>
              
              <Reveal>
                <ul className="space-y-4">
                  {[
                    'AI drafts responses using your Shopify order data',
                    'Auto-approve refunds under $50 with manager oversight',
                    'Detect customer sentiment and urgency levels',
                    'Track all AI decisions for compliance and analytics',
                  ].map((item, index) => (
                    <li key={item} className="flex items-start gap-3" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        ✓
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            
            <Reveal>
              <div className="bg-gray-50 rounded-2xl p-8">
                <div className="space-y-4">
                  {[
                    'Detect intent',
                    'Draft reply',
                    'Propose refund',
                    'Await approval',
                  ].map((step, index) => (
                    <div key={step} className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-8 w-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Feature Tabs Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="section-headline text-gray-900 mb-4">
                  Everything you need for Shopify support automation
                </h2>
                <p className="subheadline text-gray-600 max-w-3xl mx-auto">
                  Powerful AI features designed to handle your Shopify customer support while you focus on growing your business
                </p>
              </div>
            </Reveal>
          
          <FeatureTabs />
        </div>
      </section>

      {/* Interactive Stats Section */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="section-headline text-gray-900 mb-4">
                Trusted by thousands of businesses
              </h2>
              <p className="subheadline text-gray-600">
                See why companies choose our platform for their e-commerce automation
              </p>
            </div>
          </Reveal>
          
          <InteractiveStats />
        </div>
      </section>

      {/* Animated Diagram Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Reveal>
                <h2 className="section-headline text-gray-900">
                  How it works
                </h2>
              </Reveal>
              
              <Reveal>
                <p className="body-text text-gray-600">
                  Our intelligent system processes your data through multiple stages, 
                  ensuring accuracy and reliability at every step.
                </p>
              </Reveal>
              
              <Reveal>
                <div className="space-y-6">
                  {[
                    { title: 'Data Input', desc: 'Connect your Shopify store and Gmail account' },
                    { title: 'AI Processing', desc: 'Our AI analyzes patterns and customer behavior' },
                    { title: 'Smart Actions', desc: 'Automated responses with human oversight' },
                    { title: 'Results', desc: 'Improved efficiency and customer satisfaction' },
                  ].map((step, index) => (
                    <div key={step.title} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{step.title}</h3>
                        <p className="text-gray-600 text-sm">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
            
            <Reveal>
              <AnimatedDiagram className="max-w-lg mx-auto" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <h3 className="section-headline text-gray-900">Best-in-class integrations</h3>
              <div className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {connections.data?.connections?.length ?? 0} connected store(s)
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <p className="body-text text-gray-600 max-w-md">
                  Native connections for Shopify and Gmail. No passwords, secure OAuth, 
                  and resilient webhooks so your inbox always stays in sync.
                </p>
                
                <ul className="space-y-4">
                  {[
                    'Sync orders, customers, and payments',
                    'Inline order actions from the inbox',
                    'One-click OAuth setup',
                    'Reliable webhook delivery',
                  ].map((feature, index) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="flex flex-wrap gap-4">
                  <Link href="/integrations" className="btn-brand">
                    Connect your store
                  </Link>
                  <Link href="/inbox" className="btn-secondary">
                    See it in action
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Shopify card */}
                <div className="card-feature p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-green-500"></div>
                    <div className="text-sm font-semibold text-gray-900">Shopify</div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 w-32 bg-gray-200 rounded"></div>
                    <div className="h-2 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <Link href="/integrations" className="w-full bg-green-600 text-white text-center py-3 px-4 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    Connect
                  </Link>
                </div>
                
                {/* Gmail card */}
                <div className="card-feature p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500"></div>
                    <div className="text-sm font-semibold text-gray-900">Gmail</div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 w-32 bg-gray-200 rounded"></div>
                    <div className="h-2 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <Link href="/integrations" className="w-full bg-red-600 text-white text-center py-3 px-4 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
                    Authorize
                  </Link>
                </div>

                {/* Steps card */}
                <div className="col-span-2 card-feature p-6">
                  <div className="text-sm font-semibold text-gray-900 mb-4">Connect in 3 steps</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { n: '1', t: 'Install Shopify app' },
                      { n: '2', t: 'Approve Gmail access' },
                      { n: '3', t: 'Start replying with AI' },
                    ].map((step) => (
                      <div key={step.n} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                          {step.n}
                        </span>
                        <span className="text-sm text-gray-700">{step.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="section-headline text-gray-900 mb-4">
                What our customers say
              </h2>
              <p className="subheadline text-gray-600">
                Join thousands of businesses already using our platform
              </p>
            </div>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'This AI handles 80% of our customer support automatically. Our response time went from hours to minutes.',
                author: 'Sarah Chen, Founder of EcoWear Store',
              },
              {
                quote: 'The Shopify integration is seamless. AI knows exactly which order the customer is asking about.',
                author: 'Mike Rodriguez, Owner of TechGadgets Plus',
              },
              {
                quote: 'Finally, a support tool that actually understands e-commerce. Our team can focus on growth now.',
                author: 'Lisa Park, CEO of Fashion Forward',
              },
            ].map((testimonial, index) => (
              <Reveal key={index}>
                <div className="card-feature p-8">
                  <p className="text-gray-900 mb-4">"{testimonial.quote}"</p>
                  <div className="text-sm text-gray-600">{testimonial.author}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="section-headline text-gray-900 mb-4">Simple, transparent pricing</h2>
              <p className="subheadline text-gray-600">Choose the plan that fits your business needs</p>
            </div>
          </Reveal>
          
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Annual discount</span>
              <button
                type="button"
                aria-pressed={annual}
                onClick={() => setAnnual((v) => !v)}
                className={`${annual ? 'bg-orange-500' : 'bg-gray-200'} relative h-6 w-11 rounded-full transition-colors`}
              >
                <span
                  className={`${annual ? 'translate-x-5' : 'translate-x-1'} inline-block h-4 w-4 translate-y-1 rounded-full bg-white transition-transform`}
                />
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="card-feature p-8">
              <div className="text-lg font-semibold text-gray-900">Start</div>
              <div className="mt-2 text-4xl font-bold text-gray-900">Free</div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>Up to 3 workflows</li>
                <li>250 emails / mo</li>
                <li>AI replies and approvals</li>
              </ul>
              <Link href="/integrations" className="mt-6 w-full btn-secondary text-center">
                Get started
              </Link>
            </div>
            
            {/* Team */}
            <div className="card-feature p-8 border-2 border-orange-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">Team</div>
              <div className="mt-2 text-4xl font-bold text-gray-900">
                {annual ? '$150' : '$175'}<span className="text-lg font-normal text-gray-600">/mo</span>
              </div>
              {annual && <div className="text-sm text-gray-600">Billed annually</div>}
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>Unlimited workflows</li>
                <li>Unlimited responses</li>
                <li>Add up to 5 teammates</li>
                <li>Project folders and permissions</li>
              </ul>
              <Link href="/integrations" className="mt-6 w-full btn-brand text-center">
                Start free trial
              </Link>
            </div>
            
            {/* Enterprise */}
            <div className="card-feature p-8">
              <div className="text-lg font-semibold text-gray-900">Enterprise</div>
              <div className="mt-2 text-4xl font-bold text-gray-900">Custom</div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>Custom branding</li>
                <li>Unlimited users</li>
                <li>Custom enhancements</li>
                <li>SSO and dedicated support</li>
              </ul>
              <Link href="/integrations" className="mt-6 w-full btn-secondary text-center">
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="container-max text-center">
          <Reveal>
            <h2 className="section-headline text-gray-900 mb-4">
              Ready to transform your e-commerce?
            </h2>
            <p className="subheadline text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using our platform to automate their operations
            </p>
            <Magnetic>
              <Link href="/integrations" className="btn-brand text-lg px-12 py-4">
                Get started for free
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </main>
  );
}