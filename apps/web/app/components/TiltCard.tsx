'use client';

import { useRef } from 'react';

type Props = { children: React.ReactNode; maxTiltDeg?: number };

export default function TiltCard({ children, maxTiltDeg = 6 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - y) * maxTiltDeg;
        const ry = (x - 0.5) * maxTiltDeg;
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      }}
      className="will-change-transform"
      style={{ transformStyle: 'preserve-3d', transition: 'transform 300ms ease' }}
    >
      {children}
    </div>
  );
}


