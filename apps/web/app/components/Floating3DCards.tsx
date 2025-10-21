'use client';

import { useEffect, useRef, useState } from 'react';

interface Card3D {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  rotation: { x: number; y: number; z: number };
  color: string;
  speed: number;
  direction: { x: number; y: number; z: number };
  expression: string;
}

interface Floating3DCardsProps {
  className?: string;
  cardCount?: number;
}

export default function Floating3DCards({ className = '', cardCount = 8 }: Floating3DCardsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [cards, setCards] = useState<Card3D[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  const expressions = ['😊', '🚀', '💎', '⚡', '🎯', '🔥', '✨', '🌟'];
  const colors = ['#1E73FF', '#FF2A00', '#5AA0FF', '#FF7A3B', '#00FFB3', '#FF6B35', '#8B5CF6', '#10B981'];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Initialize 3D cards
  useEffect(() => {
    const newCards: Card3D[] = [];
    for (let i = 0; i < cardCount; i++) {
      newCards.push({
        id: `card-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 50,
        size: Math.random() * 30 + 20,
        rotation: {
          x: Math.random() * 360,
          y: Math.random() * 360,
          z: Math.random() * 360
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 0.8 + 0.2,
        direction: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.01
        },
        expression: expressions[Math.floor(Math.random() * expressions.length)]
      });
    }
    setCards(newCards);
  }, [cardCount]);

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
        
        // Sort cards by z position for proper depth rendering
        const sortedCards = [...cards].sort((a, b) => a.z - b.z);
        
        sortedCards.forEach((card, index) => {
          // Update card position with floating motion
          const time = timeRef.current * card.speed;
          const x = (card.x + Math.sin(time + index) * 15) * width / 100;
          const y = (card.y + Math.cos(time + index * 0.7) * 10) * height / 100;
          const z = card.z + Math.sin(time * 0.5) * 5;
          
          // Calculate perspective
          const perspective = 200;
          const scale = perspective / (perspective + z);
          const screenX = x * scale;
          const screenY = y * scale;
          const screenSize = card.size * scale;
          
          // Skip if card is behind camera
          if (z < -perspective) return;
          
          ctx.save();
          ctx.translate(screenX, screenY);
          
          // Apply rotation
          const rotationX = card.rotation.x + time * 20;
          const rotationY = card.rotation.y + time * 15;
          const rotationZ = card.rotation.z + time * 10;
          
          ctx.rotate((rotationZ * Math.PI) / 180);
          
          // Draw 3D card with depth
          const gradient = ctx.createLinearGradient(-screenSize/2, -screenSize/2, screenSize/2, screenSize/2);
          gradient.addColorStop(0, card.color);
          gradient.addColorStop(0.5, card.color + 'CC');
          gradient.addColorStop(1, card.color + '66');
          
          ctx.fillStyle = gradient;
          ctx.shadowColor = card.color;
          ctx.shadowBlur = 15 * scale;
          ctx.shadowOffsetX = 2 * scale;
          ctx.shadowOffsetY = 2 * scale;
          
          // Draw main card body
          ctx.fillRect(-screenSize/2, -screenSize/2, screenSize, screenSize);
          
          // Draw 3D depth effect
          ctx.fillStyle = card.color + '40';
          ctx.fillRect(-screenSize/2 + 2, -screenSize/2 + 2, screenSize - 4, screenSize - 4);
          
          // Draw expression/icon
          ctx.fillStyle = 'white';
          ctx.font = `${screenSize * 0.3}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.expression, 0, 0);
          
          // Draw highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(-screenSize/4, -screenSize/4, screenSize/2, screenSize/2);
          
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
  }, [prefersReducedMotion, cards]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{
        background: prefersReducedMotion 
          ? 'linear-gradient(135deg, #1E73FF 0%, #FF5D2B 50%, #FF8A3D 100%)'
          : 'transparent'
      }}
    >
      {/* Animated 3D cards canvas */}
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
          aria-label="Floating 3D cards animation"
        />
      )}
      
      {/* Static fallback for reduced motion */}
      {prefersReducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-4 gap-4">
            {cards.slice(0, 8).map((card, index) => (
              <div
                key={card.id}
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                style={{
                  background: `linear-gradient(135deg, ${card.color}, ${card.color}CC)`,
                  boxShadow: `0 8px 32px ${card.color}40`
                }}
              >
                {card.expression}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
