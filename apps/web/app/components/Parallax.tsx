'use client';

import { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
  speed?: number; // positive moves slower than scroll
};

export default function Parallax({ children, speed = 0.4 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Store el in a const so TypeScript knows it's non-null in closures
    const element: HTMLDivElement = el;

    function onScroll() {
      const rect = element.getBoundingClientRect();
      const offset = rect.top - window.innerHeight / 2;
      element.style.transform = `translateY(${offset * speed * -0.1}px)`;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll as any);
  }, [speed]);
  return (
    <div ref={ref} className="will-change-transform">
      {children}
    </div>
  );
}
