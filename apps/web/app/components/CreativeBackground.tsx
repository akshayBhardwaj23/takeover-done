'use client';

import { useEffect, useRef } from 'react';

export default function CreativeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Store canvas and ctx in consts so TypeScript knows they're non-null in closures
    const canvasElement: HTMLCanvasElement = canvas;
    const ctx2d: CanvasRenderingContext2D = ctx;

    let animationId: number;
    let particles: Particle[] = [];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvasElement.width;
        this.y = Math.random() * canvasElement.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 3 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.color = Math.random() > 0.5 ? '#FF6B35' : '#FF4500';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvasElement.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvasElement.height) this.vy *= -1;
      }

      draw() {
        ctx2d.save();
        ctx2d.globalAlpha = this.opacity;
        ctx2d.fillStyle = this.color;
        ctx2d.beginPath();
        ctx2d.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();
      }
    }

    const resizeCanvas = () => {
      canvasElement.width = window.innerWidth;
      canvasElement.height = window.innerHeight;
      particles = Array.from({ length: 50 }, () => new Particle());
    };

    const animate = () => {
      ctx2d.clearRect(0, 0, canvasElement.width, canvasElement.height);

      particles.forEach((particle, i) => {
        particle.update();
        particle.draw();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particle.x - particles[j].x;
          const dy = particle.y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx2d.save();
            ctx2d.globalAlpha = ((100 - distance) / 100) * 0.2;
            ctx2d.strokeStyle = '#FF6B35';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(particle.x, particle.y);
            ctx2d.lineTo(particles[j].x, particles[j].y);
            ctx2d.stroke();
            ctx2d.restore();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          background: 'linear-gradient(135deg, #FFF8F0 0%, #F5F1ED 100%)',
        }}
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-blue-50/20" />
      <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-orange-100/10 to-transparent" />
    </div>
  );
}
