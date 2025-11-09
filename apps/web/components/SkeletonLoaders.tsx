export function OrderCardSkeleton() {
  return (
    <div className="mb-2 animate-pulse rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-slate-200"></div>
        <div className="h-5 w-16 rounded-full bg-slate-200"></div>
      </div>
      <div className="mb-1 h-3 w-32 rounded bg-slate-200"></div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 rounded bg-slate-200"></div>
        <div className="h-3 w-20 rounded bg-slate-200"></div>
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-slate-200/70" />
          <div className="h-5 w-36 rounded-full bg-slate-200/70" />
          <div className="h-3 w-28 rounded-full bg-slate-200/70" />
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="h-7 w-20 rounded-full bg-slate-200/70" />
          <div className="h-8 w-32 rounded-full bg-slate-200/70" />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
        <div className="h-3 w-28 rounded-full bg-slate-200/70" />
        {[0, 1].map((entry) => (
          <div
            key={entry}
            className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-inner"
          >
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-full bg-slate-200/70" />
              <div className="h-3 w-16 rounded-full bg-slate-200/70" />
            </div>
            <div className="h-4 w-14 rounded-full bg-slate-200/70" />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
        <div className="h-3 w-24 rounded-full bg-slate-200/70" />
        <div className="h-32 w-full rounded-2xl bg-slate-200/60" />
        <div className="h-9 w-36 rounded-full bg-slate-200/70" />
      </div>
    </div>
  );
}

export function EmailCardSkeleton() {
  return (
    <div className="mb-2 animate-pulse rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="h-5 w-16 rounded-full bg-slate-200"></div>
        <div className="h-3 w-12 rounded bg-slate-200"></div>
      </div>
      <div className="mb-2 h-3 w-24 rounded bg-slate-200"></div>
      <div className="mt-2 space-y-1">
        <div className="h-3 w-full rounded bg-slate-200"></div>
        <div className="h-3 w-3/4 rounded bg-slate-200"></div>
      </div>
    </div>
  );
}

export function UnassignedEmailSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-4 rounded bg-amber-200"></div>
        <div className="h-3 w-16 rounded bg-amber-200"></div>
      </div>
      <div className="mb-2 h-3 w-32 rounded bg-amber-200"></div>
      <div className="mb-3 rounded bg-white/80 p-3">
        <div className="mb-1 h-3 w-28 rounded bg-slate-200"></div>
        <div className="space-y-1">
          <div className="h-3 w-full rounded bg-slate-200"></div>
          <div className="h-3 w-5/6 rounded bg-slate-200"></div>
          <div className="h-3 w-4/6 rounded bg-slate-200"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-amber-200"></div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="mb-2 h-3 w-16 rounded bg-slate-200"></div>
          <div className="space-y-1">
            <div className="h-3 w-full rounded bg-slate-200"></div>
            <div className="h-3 w-full rounded bg-slate-200"></div>
            <div className="h-3 w-3/4 rounded bg-slate-200"></div>
          </div>
        </div>
        <div className="h-8 w-full rounded bg-violet-200"></div>
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
