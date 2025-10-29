import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
}: {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-lg">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
