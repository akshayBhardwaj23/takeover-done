'use client';

import { useEffect, useRef, useState } from 'react';

interface GridModule {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowIntensity: number;
  content: string;
  icon: string;
}

interface ModularGridProps {
  className?: string;
  moduleCount?: number;
}

export default function ModularGrid({ className = '', moduleCount = 12 }: ModularGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [modules, setModules] = useState<GridModule[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  const moduleData = [
    { content: '3D Cards', icon: '🎴', color: '#1E73FF' },
    { content: 'Grid System', icon: '📐', color: '#FF2A00' },
    { content: 'Motion Design', icon: '🎬', color: '#5AA0FF' },
    { content: 'Neon Glow', icon: '💡', color: '#FF7A3B' },
    { content: 'Responsive', icon: '📱', color: '#00FFB3' },
    { content: 'Accessible', icon: '♿', color: '#8B5CF6' },
    { content: 'Parallax', icon: '🌊', color: '#10B981' },
    { content: 'WebGL', icon: '🎮', color: '#F59E0B' },
    { content: 'Canvas', icon: '🖼️', color: '#EF4444' },
    { content: 'React', icon: '⚛️', color: '#3B82F6' },
    { content: 'Next.js', icon: '▲', color: '#000000' },
    { content: 'Tailwind', icon: '🎨', color: '#06B6D4' }
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize grid modules
  useEffect(() => {
    const newModules: GridModule[] = [];
    const cols = 4;
    const rows = Math.ceil(moduleCount / cols);
    
    for (let i = 0; i < moduleCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const data = moduleData[i % moduleData.length];
      
      newModules.push({
        id: `module-${i}`,
        x: (col / cols) * 100,
        y: (row / rows) * 100,
        width: (100 / cols) - 2,
        height: (100 / rows) - 2,
        color: data.color,
        glowIntensity: Math.random() * 0.5 + 0.5,
        content: data.content,
        icon: data.icon
      });
    }
    setModules(newModules);
  }, [moduleCount]);

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
        
        // Draw dot grid background
        const gridSpacing = 16;
        const gridColor = 'rgba(255, 255, 255, 0.08)';
        ctx.fillStyle = gridColor;
        
        for (let x = 0; x < width; x += gridSpacing) {
          for (let y = 0; y < height; y += gridSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // Draw animated modules
        modules.forEach((module, index) => {
          const time = timeRef.current;
          const x = (module.x / 100) * width;
          const y = (module.y / 100) * height;
          const w = (module.width / 100) * width;
          const h = (module.height / 100) * height;
          
          // Floating animation
          const floatY = y + Math.sin(time * 0.5 + index) * 3;
          const glowPulse = 0.5 + Math.sin(time * 1.2 + index) * 0.3;
          
          ctx.save();
          ctx.translate(x + w/2, floatY + h/2);
          
          // Draw glow effect
          const glowRadius = 20 * glowPulse;
          const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
          glowGradient.addColorStop(0, module.color + '40');
          glowGradient.addColorStop(0.5, module.color + '20');
          glowGradient.addColorStop(1, module.color + '00');
          
          ctx.fillStyle = glowGradient;
          ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2);
          
          // Draw module card
          ctx.fillStyle = module.color + '20';
          ctx.strokeStyle = module.color + '60';
          ctx.lineWidth = 1;
          ctx.shadowColor = module.color;
          ctx.shadowBlur = 10 * glowPulse;
          
          ctx.fillRect(-w/2, -h/2, w, h);
          ctx.strokeRect(-w/2, -h/2, w, h);
          
          // Draw content
          ctx.fillStyle = 'white';
          ctx.font = `${h * 0.15}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw icon
          ctx.font = `${h * 0.3}px Arial`;
          ctx.fillText(module.icon, 0, -h * 0.1);
          
          // Draw text
          ctx.font = `${h * 0.12}px Arial`;
          ctx.fillText(module.content, 0, h * 0.15);
          
          ctx.restore();
        });
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
  }, [prefersReducedMotion, modules]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-gray-900 ${className}`}
    >
      {/* Animated grid canvas */}
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
          aria-label="Modular grid animation"
        />
      )}
      
      {/* Static grid fallback */}
      <div className="relative z-10 p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <div
              key={module.id}
              className="group relative bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              style={{
                animationDelay: `${index * 0.1}s`,
                animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center text-lg"
                style={{
                  background: `linear-gradient(135deg, ${module.color}, ${module.color}CC)`,
                  boxShadow: `0 4px 16px ${module.color}40`
                }}
              >
                {module.icon}
              </div>
              <h3 className="text-white font-semibold text-sm">{module.content}</h3>
              
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${module.color}, ${module.color}CC)`
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
