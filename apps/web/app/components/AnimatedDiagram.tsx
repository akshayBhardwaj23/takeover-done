'use client';

import { useEffect, useRef } from 'react';

interface AnimatedDiagramProps {
  className?: string;
}

export default function AnimatedDiagram({ className = '' }: AnimatedDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Animate paths on mount
    const paths = svg.querySelectorAll('path');
    paths.forEach((path, index) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.animation = `drawPath 2s ease-in-out ${index * 0.2}s forwards`;
    });
  }, []);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 400 300"
        className="w-full h-auto"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
        }}
      >
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF4500" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Background circles */}
        <circle cx="200" cy="150" r="120" fill="url(#gradient1)" opacity="0.1" />
        <circle cx="200" cy="150" r="80" fill="url(#gradient2)" opacity="0.1" />
        <circle cx="200" cy="150" r="40" fill="url(#gradient3)" opacity="0.1" />

        {/* Main flow paths */}
        <path
          d="M 50 150 Q 125 100 200 150 Q 275 200 350 150"
          stroke="url(#gradient1)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5,5"
        />
        <path
          d="M 50 100 Q 125 50 200 100 Q 275 150 350 100"
          stroke="url(#gradient2)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5,5"
        />
        <path
          d="M 50 200 Q 125 250 200 200 Q 275 150 350 200"
          stroke="url(#gradient3)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5,5"
        />

        {/* Connection nodes */}
        <circle cx="50" cy="150" r="8" fill="url(#gradient1)" />
        <circle cx="50" cy="100" r="8" fill="url(#gradient2)" />
        <circle cx="50" cy="200" r="8" fill="url(#gradient3)" />
        
        <circle cx="200" cy="150" r="12" fill="url(#gradient1)" />
        <circle cx="200" cy="100" r="12" fill="url(#gradient2)" />
        <circle cx="200" cy="200" r="12" fill="url(#gradient3)" />
        
        <circle cx="350" cy="150" r="8" fill="url(#gradient1)" />
        <circle cx="350" cy="100" r="8" fill="url(#gradient2)" />
        <circle cx="350" cy="200" r="8" fill="url(#gradient3)" />

        {/* Labels */}
        <text x="50" y="85" textAnchor="middle" className="text-xs font-medium fill-gray-600">
          Input
        </text>
        <text x="200" y="85" textAnchor="middle" className="text-xs font-medium fill-gray-600">
          Process
        </text>
        <text x="350" y="85" textAnchor="middle" className="text-xs font-medium fill-gray-600">
          Output
        </text>
      </svg>

      <style jsx>{`
        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
