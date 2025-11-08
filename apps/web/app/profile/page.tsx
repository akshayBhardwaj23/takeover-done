'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { Input } from '../../../../@ai-ecom/api/components/ui/input';
import { useToast, ToastContainer } from '../../components/Toast';
import { Loader2, Store, User } from 'lucide-react';

type StoreEditState = Record<
  string,
  {
    storeName: string;
    supportEmail: string;
    isDirty: boolean;
  }
>;

export default function ProfilePage() {
  const toast = useToast();
  const profileQuery = trpc.getUserProfile.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const updateProfile = trpc.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully');
      profileQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to update profile');
    },
  });

  const updateConnection = trpc.updateConnectionSettings.useMutation({
    onSuccess: () => {
      toast.success('Store details updated');
      profileQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to update store details');
    },
  });

  const [displayName, setDisplayName] = useState('');
  const [storeEdits, setStoreEdits] = useState<StoreEditState>({});

  useEffect(() => {
    if (profileQuery.data) {
      setDisplayName(profileQuery.data.user.name ?? '');
      const initialStoreState = profileQuery.data.stores.reduce<StoreEditState>(
        (acc, store) => {
          acc[store.id] = {
            storeName: store.name,
            supportEmail: store.supportEmail ?? '',
            isDirty: false,
          };
          return acc;
        },
        {},
      );
      setStoreEdits(initialStoreState);
    }
  }, [profileQuery.data]);

  const isSavingProfile = updateProfile.isPending;

  const hasProfileChanged = useMemo(() => {
    if (!profileQuery.data) return false;
    return (profileQuery.data.user.name ?? '') !== displayName.trim();
  }, [displayName, profileQuery.data]);

  const handleStoreFieldChange = (
    storeId: string,
    field: 'storeName' | 'supportEmail',
    value: string,
  ) => {
    setStoreEdits((prev) => {
      const existing = prev[storeId] ?? { storeName: '', supportEmail: '', isDirty: false };
      const updated = {
        ...existing,
        [field]: value,
      };
      const original = profileQuery.data?.stores.find((s) => s.id === storeId);
      const isDirty =
        original != null &&
        (updated.storeName.trim() !== original.name ||
          (updated.supportEmail || '').trim() !== (original.supportEmail || ''));
      return {
        ...prev,
        [storeId]: {
          ...updated,
          isDirty,
        },
      };
    });
  };

  const handleStoreSave = (storeId: string) => {
    const store = storeEdits[storeId];
    if (!store) return;
    updateConnection.mutate({
      connectionId: storeId,
      storeName: store.storeName.trim(),
      supportEmail: store.supportEmail.trim() || undefined,
    });
  };

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileQuery.data) return;
    if (!hasProfileChanged) return;
    updateProfile.mutate({
      name: displayName.trim(),
    });
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (profileQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <h1 className="text-xl font-semibold text-slate-900">
            Unable to load profile
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {profileQuery.error.message ||
              'Make sure you are signed in and try again.'}
          </p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <h1 className="text-xl font-semibold text-slate-900">
            No profile found
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Sign in to manage your profile and connected stores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <main className="min-h-screen bg-white text-slate-900">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18)_0,rgba(15,23,42,0)_55%)]" />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-20">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Profile
            </span>
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black leading-tight md:text-5xl">
                Make Zyyp feel personal
              </h1>
              <p className="mt-4 text-lg text-white/70">
                Keep your profile and store identities up to date so every reply
                feels on-brand and personal.
              </p>
            </div>
          </div>
        </section>
        <div className="relative z-10 mx-auto -mt-14 flex max-w-5xl flex-col gap-6 px-6 pb-24">
          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
            <div className="mb-6 flex items-center gap-3 text-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Profile details</h2>
                <p className="text-sm text-slate-600">
                  Update how your teammates see you across the workspace.
                </p>
              </div>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                  >
                    Display name
                  </label>
                  <Input
                    id="profile-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-email"
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                  >
                    Email
                  </label>
                  <Input
                    id="profile-email"
                    value={profile.user.email}
                    readOnly
                    className="mt-2 bg-slate-50 text-slate-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  disabled={!hasProfileChanged || isSavingProfile}
                  className="rounded-full bg-slate-900 px-5 py-2 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingProfile ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
            <div className="mb-6 flex items-center gap-3 text-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Connected stores</h2>
                <p className="text-sm text-slate-600">
                  Rename your storefront and update the support email your
                  customers see.
                </p>
              </div>
            </div>

            {profile.stores.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No stores connected yet. Connect your first Shopify store from{' '}
                <a
                  className="font-semibold text-slate-900 underline underline-offset-4"
                  href="/integrations"
                >
                  integrations
                </a>
                .
              </div>
            ) : (
              <div className="space-y-6">
                {profile.stores.map((store) => {
                  const editState = storeEdits[store.id];
                  const isSaving =
                    updateConnection.isPending &&
                    updateConnection.variables?.connectionId === store.id;
                  const canSave = editState?.isDirty && !isSaving;

                  return (
                    <div
                      key={store.id}
                      className="rounded-2xl border border-slate-200 p-6 shadow-sm shadow-slate-200/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                            {store.shopDomain}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            Connected on{' '}
                            {new Date(store.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleStoreSave(store.id)}
                          disabled={!canSave}
                          className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {isSaving ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </span>
                          ) : (
                            'Save store'
                          )}
                        </Button>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`store-name-${store.id}`}
                            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                          >
                            Store display name
                          </label>
                          <Input
                            id={`store-name-${store.id}`}
                            value={editState?.storeName ?? ''}
                            onChange={(event) =>
                              handleStoreFieldChange(
                                store.id,
                                'storeName',
                                event.target.value,
                              )
                            }
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`store-support-${store.id}`}
                            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
                          >
                            Support email
                          </label>
                          <Input
                            id={`store-support-${store.id}`}
                            type="email"
                            placeholder="support@store.com"
                            value={editState?.supportEmail ?? ''}
                            onChange={(event) =>
                              handleStoreFieldChange(
                                store.id,
                                'supportEmail',
                                event.target.value,
                              )
                            }
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

