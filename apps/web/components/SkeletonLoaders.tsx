export function OrderCardSkeleton() {
  return (
    <div className="mb-2 animate-pulse rounded-xl border border-stone-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-stone-200" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-stone-200" />
            <div className="h-3 w-10 rounded bg-stone-200" />
          </div>
          <div className="h-3 w-32 rounded bg-stone-200" />
          <div className="h-3 w-40 rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      {/* Profile Section */}
      <div className="flex flex-col items-center">
        <div className="h-24 w-24 rounded-full bg-stone-200 mb-4" />
        <div className="h-5 w-32 rounded bg-stone-200 mb-2" />
        <div className="h-3 w-20 rounded bg-stone-200" />
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-stone-200" />
          <div className="space-y-1">
            <div className="h-3 w-20 rounded bg-stone-200" />
            <div className="h-4 w-36 rounded bg-stone-200" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-stone-200" />
          <div className="space-y-1">
            <div className="h-3 w-16 rounded bg-stone-200" />
            <div className="h-4 w-24 rounded bg-stone-200" />
          </div>
        </div>
      </div>

      {/* Linked Order */}
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-stone-200" />
        <div className="rounded-xl border border-stone-200 p-4 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-20 rounded bg-stone-200" />
            <div className="h-5 w-16 rounded-full bg-stone-200" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded bg-stone-200" />
            <div className="h-3 w-20 rounded bg-stone-200" />
          </div>
          <div className="h-8 w-full rounded-lg bg-stone-200" />
        </div>
      </div>
    </div>
  );
}

export function EmailCardSkeleton() {
  return (
    <div className="animate-pulse p-4 border-b border-stone-50">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-stone-200" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-stone-200" />
            <div className="h-3 w-12 rounded bg-stone-200" />
          </div>
          <div className="h-3 w-40 rounded bg-stone-200" />
          <div className="h-3 w-48 rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}

export function UnassignedEmailSkeleton() {
  return (
    <div className="animate-pulse p-4 border-b border-stone-50">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-stone-200" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-stone-200" />
            <div className="h-3 w-10 rounded bg-stone-200" />
          </div>
          <div className="h-3 w-44 rounded bg-stone-200" />
          <div className="h-3 w-52 rounded bg-stone-200" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-16 rounded-full bg-violet-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 h-4 w-24 rounded bg-slate-200"></div>
          <div className="h-8 w-12 rounded bg-slate-200"></div>
        </div>
        <div className="h-12 w-12 rounded bg-slate-200"></div>
      </div>
    </div>
  );
}

export function IntegrationCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-200"></div>
            <div className="h-5 w-16 rounded-full bg-slate-200"></div>
          </div>
          <div className="mt-3 h-4 w-40 rounded bg-slate-200"></div>
          <div className="mt-1 h-3 w-32 rounded bg-slate-200"></div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 flex-1 rounded bg-slate-200"></div>
        <div className="h-8 w-20 rounded bg-slate-200"></div>
        <div className="h-8 w-20 rounded bg-slate-200"></div>
      </div>
    </div>
  );
}

export function FullPageLoader({
  message = 'Loading...',
}: {
  message?: string;
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500"></div>
          </div>
        </div>
        <p className="text-lg font-medium text-slate-700">{message}</p>
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600"></div>
        </div>
      </div>
    </div>
  );
}
