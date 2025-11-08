'use client';

import { useEffect, useRef } from 'react';

export default function CursorFollower() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch

    // Store el in a const so TypeScript knows it's non-null in closures
    const element: HTMLDivElement = el;

    function onMove(e: MouseEvent) {
      const x = e.clientX;
      const y = e.clientY;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove as any);
  }, []);
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-50 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/5 shadow backdrop-blur md:block"
      style={{ width: 18, height: 18 }}
    />
  );
}
