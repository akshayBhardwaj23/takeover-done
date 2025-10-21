'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  sources: { src: string; type?: string }[];
  poster?: string;
  className?: string;
  overlayClassName?: string;
  opacity?: number; // 0..1
};

export default function BackgroundVideo({
  sources,
  poster,
  className,
  overlayClassName,
  opacity = 0.25,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const video = ref.current;
    if (!video) return;
    
    function onLoadedData() {
      setHasVideo(true);
    }
    function onError() {
      setHasVideo(false);
    }
    
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('error', onError);
    };
  }, [enabled]);

  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ''}`}>
      {enabled ? (
        <video
          ref={ref}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ) : null}
      {/* Fallback animated gradient when no video */}
      {enabled && !hasVideo && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 animate-pulse" />
      )}
      <div
        className={`absolute inset-0 bg-black ${overlayClassName ?? ''}`}
        style={{ opacity }}
      />
    </div>
  );
}



