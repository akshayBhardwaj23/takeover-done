'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { BarChart3, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface GA4Property {
  propertyId: string;
  propertyName: string;
  accountId: string;
}

function PropertySelectionInner() {
  const router = useRouter();
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch properties from API
    const fetchProperties = async () => {
      try {
        // Call API route that will read cookies and fetch properties
        const res = await fetch('/api/google-analytics/properties-from-temp', {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to fetch properties' }));
          throw new Error(errorData.error || 'Failed to fetch properties');
        }

        const data = await res.json();
        if (data.properties && data.properties.length > 0) {
          setProperties(data.properties);
        } else {
          setError('No Google Analytics properties found. Please check your GA4 setup.');
        }
      } catch (err) {
        console.error('[Property Selection] Error fetching properties:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load properties. Please try reconnecting.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleSelectProperty = async (property: GA4Property) => {
    setSelecting(true);
    setError(null);

    try {
      const res = await fetch('/api/google-analytics/select-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          accountId: property.accountId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save property' }));
        throw new Error(errorData.error || 'Failed to save property selection');
      }

      // Redirect to analytics page
      router.push('/google-analytics');
    } catch (err) {
      console.error('[Property Selection] Error selecting property:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save property selection. Please try again.',
      );
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-4xl px-6">
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="mt-4 text-sm text-slate-600">Loading Google Analytics properties...</p>
          </Card>
        </div>
      </main>
    );
  }

  if (error && properties.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 py-28">
        <div className="mx-auto max-w-4xl px-6">
          <Card className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Unable to load properties</h2>
            <p className="mt-3 text-sm text-slate-500">{error}</p>
            <a
              href="/integrations"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Go to Integrations
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-28">
      <div className="mx-auto max-w-4xl space-y-8 px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <BarChart3 className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Select Google Analytics Property</h1>
            <p className="text-sm text-slate-500">
              Choose one property to connect. You can only have one active property at a time.
            </p>
          </div>
        </div>

        {error && (
          <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          </Card>
        )}

        {properties.length === 0 ? (
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <BarChart3 className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">No properties found</h2>
            <p className="mt-3 text-sm text-slate-500">
              No Google Analytics properties were found for your account. Please check your Google
              Analytics setup.
            </p>
            <a
              href="/integrations"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            >
              Go to Integrations
              <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        ) : (
          <div className="space-y-3">
            {properties.map((property) => (
              <Card
                key={property.propertyId}
                className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-500 hover:shadow-md"
                onClick={() => !selecting && handleSelectProperty(property)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                        <BarChart3 className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{property.propertyName}</h3>
                        <p className="text-xs text-slate-500">Property ID: {property.propertyId}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selecting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <Badge className="border border-slate-200 bg-slate-50 text-slate-600">
                          Select
                        </Badge>
                        <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-600" />
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function PropertySelectionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </main>
      }
    >
      <PropertySelectionInner />
    </Suspense>
  );
}

