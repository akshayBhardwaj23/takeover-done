'use client';

import { useEffect, useRef, useState } from 'react';

interface FloatingCard {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  speed: number;
  direction: number;
}

interface PinterestWGMIHeroProps {
  className?: string;
}

export default function PinterestWGMIHero({ className = '' }: PinterestWGMIHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [floatingCards, setFloatingCards] = useState<FloatingCard[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Profile configuration from pinterest_wgmi_mix.profile.json
  const profile = {
    palette: {
      primary: '#1E73FF',
      secondary: '#FF2A00',
      accent: ['#5AA0FF', '#FF7A3B', '#00FFB3'],
      backgrounds: {
        light_zone: '#F8F8FA',
        dark_zone: '#0E0F12',
        grid_overlay: 'rgba(255,255,255,0.08)'
      },
      gradient: {
        colors: ['#1E73FF', '#FF5D2B', '#FF8A3D']
      }
    },
    motion: {
      module_float: { amplitude: 8, speed: 2.5 },
      grid_scroll: { speed: 0.4 },
      glow_pulse: { speed: 1.2 },
      gradient_shift: { speed: 0.05 }
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize floating cards
  useEffect(() => {
    const cards: FloatingCard[] = [];
    for (let i = 0; i < 6; i++) {
      cards.push({
        id: `card-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 40 + 20,
        rotation: Math.random() * 360,
        color: profile.palette.accent[Math.floor(Math.random() * profile.palette.accent.length)],
        speed: Math.random() * 0.5 + 0.5,
        direction: Math.random() * Math.PI * 2
      });
    }
    setFloatingCards(cards);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || prefersReducedMotion) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    updateCanvasSize();

    const animate = () => {
      timeRef.current += 0.016;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw top gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height * 0.6);
        gradient.addColorStop(0, profile.palette.gradient.colors[0]);
        gradient.addColorStop(0.5, profile.palette.gradient.colors[1]);
        gradient.addColorStop(1, profile.palette.gradient.colors[2]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height * 0.6);
        
        // Draw floating cards
        floatingCards.forEach((card, index) => {
          const x = (card.x + Math.sin(timeRef.current * card.speed + index) * 20) * width / 100;
          const y = (card.y + Math.cos(timeRef.current * card.speed + index) * 15) * height / 100;
          const rotation = card.rotation + timeRef.current * 10;
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((rotation * Math.PI) / 180);
          
          // Draw 3D-style card
          ctx.fillStyle = card.color;
          ctx.shadowColor = card.color;
          ctx.shadowBlur = 20;
          ctx.fillRect(-card.size / 2, -card.size / 2, card.size, card.size);
          
          // Add inner glow
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(-card.size / 4, -card.size / 4, card.size / 2, card.size / 2);
          
          ctx.restore();
        });
        
        // Draw bottom dark section with grid
        ctx.fillStyle = profile.palette.backgrounds.dark_zone;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);
        
        // Draw dot grid
        const gridSpacing = 16;
        const gridColor = profile.palette.backgrounds.grid_overlay;
        ctx.fillStyle = gridColor;
        
        for (let x = 0; x < width; x += gridSpacing) {
          for (let y = height * 0.6; y < height; y += gridSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [prefersReducedMotion, floatingCards]);

  return (
    <div 
      ref={containerRef}
      className={`relative min-h-screen overflow-hidden ${className}`}
      style={{
        background: prefersReducedMotion 
          ? `linear-gradient(135deg, ${profile.palette.gradient.colors[0]} 0%, ${profile.palette.gradient.colors[1]} 50%, ${profile.palette.gradient.colors[2]} 100%)`
          : 'transparent'
      }}
    >
      {/* Animated background canvas */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
          aria-label="Pinterest WGMI hybrid animated background"
        />
      )}
      
      {/* Content sections */}
      <div className="relative z-10">
        {/* Top section - Hero with floating cards */}
        <section className="min-h-[60vh] flex items-center justify-center relative">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
              Modular
              <span className="block bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Future
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Blend Pinterest's clean minimalism with WGMI's futuristic 3D modular design
            </p>
            <button className="bg-gradient-to-r from-blue-500 to-orange-500 text-white px-8 py-4 rounded-full font-semibold uppercase tracking-wide hover:shadow-lg transition-all duration-300 hover:scale-105">
              Explore Modules
            </button>
          </div>
        </section>
        
        {/* Bottom section - Modular grid */}
        <section className="min-h-[40vh] bg-gray-900 relative">
          <div className="container mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: '3D Cards', desc: 'Floating modular blocks', color: 'from-blue-500 to-cyan-500' },
                { title: 'Grid System', desc: 'Organized layout structure', color: 'from-orange-500 to-red-500' },
                { title: 'Motion Design', desc: 'Smooth parallax effects', color: 'from-green-500 to-emerald-500' },
                { title: 'Neon Glow', desc: 'Soft lighting effects', color: 'from-purple-500 to-pink-500' },
                { title: 'Responsive', desc: 'Mobile-first approach', color: 'from-yellow-500 to-orange-500' },
                { title: 'Accessible', desc: 'Reduced motion support', color: 'from-indigo-500 to-blue-500' }
              ].map((module, index) => (
                <div
                  key={index}
                  className="group relative bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.6s ease-out forwards'
                  }}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${module.color} mb-4 group-hover:scale-110 transition-transform duration-300`}></div>
                  <h3 className="text-white font-semibold text-lg mb-2">{module.title}</h3>
                  <p className="text-gray-400 text-sm">{module.desc}</p>
                  
                  {/* Glow effect */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${module.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
