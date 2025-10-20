type Props = { className?: string };

export default function GlowOrb({ className }: Props) {
  return (
    <div
      className={
        'pointer-events-none absolute h-40 w-40 animate-float rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6),rgba(255,255,255,0.1)_60%,transparent_70%)] blur-xl ' +
        (className ?? '')
      }
    />
  );
}


