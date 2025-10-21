'use client';

import { useEffect } from 'react';
import AnimatedBackground from './components/AnimatedBackground';
import Reveal from './components/Reveal';
import Magnetic from './components/Magnetic';
import TiltCard from './components/TiltCard';
import Parallax from './components/Parallax';
import Link from 'next/link';

export default function HeroSection() {
  // Troubleshooting console logs
  useEffect(() => {
    const heroImageColumn = document.querySelector('.hero-image-column');
    const found = !!heroImageColumn;
    const rect = heroImageColumn?.getBoundingClientRect();
    const size = rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : 'N/A';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    console.log('🎨 AnimatedBackground Debug:', {
      'found .hero-image-column': found,
      'column computed size': size,
      'reduced-motion flag': reducedMotion
    });
  }, []);

  return (
    <section id="hero" className="relative isolate">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 py-20">
        <div className="hero-text-column relative z-10">
          <div className="space-y-8">
            <Reveal>
              <div className="inline-flex items-center rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-800">
                <span className="mr-2">🚀</span>
                New • AI-powered e-commerce automation
              </div>
            </Reveal>
            
            <Reveal>
              <h1 className="hero-headline text-gray-900">
                Transform your e-commerce with{' '}
                <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  intelligent automation
                </span>
                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full ml-2 animate-pulse" style={{ animationDuration: '0.5s' }}></span>
              </h1>
            </Reveal>
            
            <Reveal>
              <p className="subheadline text-gray-600 max-w-2xl">
                Unify your Shopify store with Gmail support in one intelligent inbox. 
                Let AI handle customer inquiries, process refunds, and manage orders automatically with human oversight.
              </p>
            </Reveal>
            
            <Reveal>
              <div className="flex flex-wrap gap-4">
                <Magnetic>
                  <Link href="/integrations" className="btn-brand">
                    Get started for free
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link href="/inbox" className="btn-secondary">
                    Watch demo
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          </div>
        </div>
        
        <div className="hero-image-column relative isolate overflow-hidden rounded-3xl">
          <AnimatedBackground className="absolute inset-0 -z-10 pointer-events-none" />
          <div className="relative z-10">
            <Reveal>
              <TiltCard>
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-gray-100">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-24 bg-gray-200 rounded-full"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                    
                    <Parallax>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl"></div>
                        <div className="h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl"></div>
                        <div className="h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-xl"></div>
                      </div>
                    </Parallax>
                    
                    <div className="space-y-3">
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                      <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
            
            {/* Floating stats */}
            <div className="absolute -right-8 -top-8 bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">AI Summary</div>
              <p className="text-xs text-gray-600 mt-1">
                Detected coupon confusion and suggested approved partial refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
