'use client';

import { useEffect, useState } from 'react';

export default function PageFade({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}


