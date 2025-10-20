import { ReactNode } from 'react';

type Props = { children: ReactNode };

export default function GradientText({ children }: Props) {
  return (
    <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent [text-shadow:0_0_24px_rgba(255,255,255,0.15)]">
      {children}
    </span>
  );
}


