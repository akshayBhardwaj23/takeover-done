// Force dynamic rendering for this route segment
// This page uses tRPC queries and user-specific data
export const dynamic = 'force-dynamic';

export default function GoogleAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

