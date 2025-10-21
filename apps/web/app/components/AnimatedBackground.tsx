'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedBackgroundProps {
  className?: string;
}

// Background profile configuration from background.profile.json
const backgroundProfile = {
  palette: {
    base: '#ff2a00',
    stops: ['#ff2a00', '#ff5d2b', '#ff8a3d', '#b31600'],
    accent: '#ffffff',
    contrast: '#0e0f12'
  },
  motion: {
    fps_cap: 60,
    noise_fields: [
      { type: 'simplex3D', amplitude: 0.42, scale: 0.85, speed: 0.06 },
      { type: 'curlNoise2D', amplitude: 0.18, scale: 1.2, speed: 0.03 }
    ],
    parallax: { enable: true, intensity: 0.015, input: 'pointer+scroll' },
    easing: 'sine-in-out'
  },
  postfx: {
    bloom: { enable: true, threshold: 0.72, strength: 0.42, radius: 0.6 },
    vignette: { enable: true, amount: 0.08 },
    film_grain: { enable: true, opacity: 0.06 }
  },
  composition: {
    gradient_mesh: { points: 5, jitter: 0.18, color_distribution: 'center-hot-edges-cool' },
    light_dots: { enable: true, count: 3, size_range: [4, 18], opacity: 0.25, motion: 'float' }
  },
  fallbacks: {
    static_gradient: {
      css: 'linear-gradient(135deg, #ff2a00 0%, #ff5d2b 40%, #ff8a3d 70%, #b31600 100%)'
    }
  }
};

export default function AnimatedBackground({ className = '' }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Static gradient fallback
  const staticGradient = backgroundProfile.fallbacks.static_gradient.css;

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || prefersReducedMotion) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    updateCanvasSize();

    // Animation loop
    const animate = () => {
      timeRef.current += 0.016; // 60fps base
      
      // Simple gradient animation
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Create animated gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        const time = timeRef.current;
        
        // Animate gradient stops - clamp values between 0 and 1
        const stop1 = Math.max(0, Math.min(1, Math.sin(time * 0.5) * 0.1 + 0.1));
        const stop2 = Math.max(0, Math.min(1, Math.sin(time * 0.7) * 0.1 + 0.4));
        const stop3 = Math.max(0, Math.min(1, Math.sin(time * 0.9) * 0.1 + 0.7));
        const stop4 = Math.max(0, Math.min(1, Math.sin(time * 1.1) * 0.1 + 1.0));
        
        gradient.addColorStop(stop1, backgroundProfile.palette.stops[0]);
        gradient.addColorStop(stop2, backgroundProfile.palette.stops[1]);
        gradient.addColorStop(stop3, backgroundProfile.palette.stops[2]);
        gradient.addColorStop(stop4, backgroundProfile.palette.stops[3]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add floating light dots if enabled
        if (backgroundProfile.composition.light_dots.enable) {
          for (let i = 0; i < backgroundProfile.composition.light_dots.count; i++) {
            const dotX = Math.max(0, Math.min(width, (Math.sin(time * 0.3 + i) * 0.5 + 0.5) * width));
            const dotY = Math.max(0, Math.min(height, (Math.cos(time * 0.4 + i) * 0.5 + 0.5) * height));
            const dotSize = Math.max(2, Math.min(20, (Math.sin(time * 0.6 + i) * 0.5 + 0.5) * 10 + 5));
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${backgroundProfile.composition.light_dots.opacity})`;
            ctx.fill();
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [prefersReducedMotion]);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 ${className}`}
      style={{ 
        background: prefersReducedMotion ? staticGradient : 'transparent',
        width: '100%',
        height: '100%'
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
          aria-label="Decorative animated gradient background"
        />
      )}
    </div>
  );
}