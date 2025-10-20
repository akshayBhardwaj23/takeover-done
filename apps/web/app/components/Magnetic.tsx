'use client';

import { useRef } from 'react';

type Props = { children: React.ReactNode; strength?: number };

export default function Magnetic({ children, strength = 0.25 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`;
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = 'translate(0px, 0px)';
      }}
      className="inline-block will-change-transform"
    >
      {children}
    </div>
  );
}


