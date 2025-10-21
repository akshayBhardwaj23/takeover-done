'use client';

import { useEffect } from 'react';
import PinterestWGMIHero from './components/PinterestWGMIHero';
import Floating3DCards from './components/Floating3DCards';
import ModularGrid from './components/ModularGrid';

export default function PinterestDemo() {
  // Debug console logs
  useEffect(() => {
    console.log('🎨 Pinterest WGMI Demo Debug:', {
      'found .hero-section': !!document.querySelector('.hero-section'),
      'found .module-grid': !!document.querySelector('.module-grid'),
      'reduced-motion flag': window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      'screen size': `${window.innerWidth}x${window.innerHeight}`
    });
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Main Pinterest WGMI Hero */}
      <PinterestWGMIHero className="hero-section" />
      
      {/* Additional sections to showcase the hybrid design */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Hybrid Design System
          </h2>
          
          {/* Floating 3D Cards Section */}
          <div className="mb-20">
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              Floating 3D Cards
            </h3>
            <div className="relative h-96 rounded-2xl overflow-hidden">
              <Floating3DCards cardCount={12} />
            </div>
          </div>
          
          {/* Modular Grid Section */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              Modular Grid System
            </h3>
            <div className="relative h-96 rounded-2xl overflow-hidden">
              <ModularGrid moduleCount={16} />
            </div>
          </div>
        </div>
      </section>
      
      {/* Integration showcase */}
      <section className="py-20 bg-black">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Pinterest × WGMI Integration
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
            This hybrid design combines Pinterest's clean, minimal aesthetic with WGMI's 
            futuristic 3D modular approach. The result is a unique visual language that 
            balances accessibility with cutting-edge design.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mb-4 mx-auto"></div>
              <h3 className="text-white font-semibold mb-2">Pinterest Clean</h3>
              <p className="text-gray-400 text-sm">Minimal, organized layouts with subtle animations</p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mb-4 mx-auto"></div>
              <h3 className="text-white font-semibold mb-2">WGMI Modular</h3>
              <p className="text-gray-400 text-sm">3D floating elements with neon glow effects</p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mb-4 mx-auto"></div>
              <h3 className="text-white font-semibold mb-2">Hybrid Result</h3>
              <p className="text-gray-400 text-sm">Best of both worlds with accessibility in mind</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
