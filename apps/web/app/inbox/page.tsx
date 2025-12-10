'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { trpc } from '../../lib/trpc';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { Badge } from '../../../../@ai-ecom/api/components/ui/badge';
import { ScrollArea } from '../../../../@ai-ecom/api/components/ui/scroll-area';
import { Separator } from '../../../../@ai-ecom/api/components/ui/separator';
import {
  Mail,
  Package,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle,
  Sparkles,
  MessageSquare,
  Inbox,
  Search,
  Clock,
  ChevronDown,
  Paperclip,
  Smile,
  ArrowRight,
  X,
  User,
  Phone,
  AtSign,
  FileText,
  ExternalLink,
  ShoppingBag,
  DollarSign,
  Calendar,
  Store,
  Flag,
  GripVertical,
} from 'lucide-react';
import { useToast, ToastContainer } from '../../components/Toast';
import { LumaSpin } from '../../components/ui/luma-spin';
import { UpgradePrompt } from '../../components/UpgradePrompt';

// =============================================================================
// TYPES
// =============================================================================

type OrderLineItem = {
  id: string;
  shopifyId: string;
  title: string;
  quantity: number;
  price: number; // Price in cents
  sku?: string | null;
};

type DbOrder = {
  id: string;
  shopifyId: string;
  name?: string | null;
  email?: string | null;
  totalAmount: number;
  currency?: string | null;
  customerName?: string | null;
  status: string;
  fulfillmentStatus?: string | null;
  createdAt: string;
  pendingEmailCount?: number;
  shopDomain?: string | null;
  connectionId?: string;
  lineItems?: OrderLineItem[];
};

type EmailMessage = {
  id: string;
  from: string;
  to: string;
  body: string;
  createdAt: string;
  direction?: string;
  subject?: string;
  snippet?: string;
  orderId?: string | null;
  thread?: {
    id?: string;
    subject?: string;
    isUnread?: boolean;
    isFlagged?: boolean;
    connectionId?: string;
    connection?: {
      shopDomain?: string | null;
      metadata?: { storeName?: string } | null;
    } | null;
  } | null;
  aiSuggestion?: {
    reply?: string;
    proposedAction?: string;
    confidence?: number;
    rationale?: string;
    draftReply?: string;
  } | null;
};

// =============================================================================
// UTILS
// =============================================================================

function formatCurrency(cents: number, currencyCode: string = 'INR') {
  const code = currencyCode || 'INR';
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function relativeTime(date: string | undefined) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins <= 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days`;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateHeader(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isDifferentDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() !== d2.toDateString();
}

const extractEmailAddress = (value?: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
};

function getInitials(
  name: string | undefined | null,
  email: string | undefined | null,
): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'UN';
}

function getSenderName(email: string): string {
  const localPart = email.split('@')[0];
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-fuchsia-500',
  'bg-orange-500',
  'bg-teal-500',
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Store colors for multi-store badges
const STORE_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function getStoreColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return STORE_COLORS[Math.abs(hash) % STORE_COLORS.length];
}

function getStoreName(
  shopDomain?: string | null,
  metadata?: { storeName?: string } | null,
): string {
  if (metadata?.storeName) return metadata.storeName;
  if (shopDomain) {
    return shopDomain
      .replace('.myshopify.com', '')
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'Store';
}

// Fulfillment status colors (shipping/delivery status)
const FULFILLMENT_STATUS_COLORS: Record<string, string> = {
  FULFILLED: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
  UNFULFILLED: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-sky-100 text-sky-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  default: 'bg-slate-100 text-slate-600',
};

// Financial status colors (payment status)
const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  REFUNDED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-amber-100 text-amber-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
  VOIDED: 'bg-gray-100 text-gray-700',
  default: 'bg-slate-100 text-slate-600',
};

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl p-3 animate-pulse"
        >
          <div className="h-11 w-11 rounded-full bg-stone-200" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-stone-200" />
              <div className="h-3 w-10 rounded bg-stone-200" />
            </div>
            <div className="h-3 w-40 rounded bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 animate-pulse">
      <div className="flex items-center justify-center py-4">
        <div className="h-6 w-32 rounded-full bg-stone-200" />
      </div>
      <div className="flex-1 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-stone-200" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-stone-200" />
              <div className="h-20 w-64 rounded-2xl bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function InboxPage() {
  const toast = useToast();
  const [shop, setShop] = useState('');
  const [view, setView] = useState<'inbox' | 'orders'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [repliedMessageIds, setRepliedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [inboxTextareaHeight, setInboxTextareaHeight] = useState(100);
  // Local state to track flagged threads without refetching
  const [flaggedThreads, setFlaggedThreads] = useState<Set<string>>(new Set());
  const [orderTextareaHeight, setOrderTextareaHeight] = useState(80);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; isSyncing: boolean } | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const conversationScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('shop');
    if (s) setShop(s);
  }, []);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const inboxBootstrap = trpc.inboxBootstrap.useQuery(
    { ordersTake: 25 },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );

  const unassignedQuery = trpc.unassignedInbound.useQuery(
    { take: 50 },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Enable parallel execution - both queries can run simultaneously
      // They're independent and will be merged/deduped on the frontend
      enabled: true,
    },
  );

  const PAGE_SIZE = 20;
  const [ordersOffset, setOrdersOffset] = useState(0);
  const ordersPage = trpc.ordersList.useQuery(
    { offset: ordersOffset, limit: PAGE_SIZE },
    { keepPreviousData: true, staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const [ordersAccum, setOrdersAccum] = useState<any[]>([]);
  
  useEffect(() => {
    const incoming = Array.isArray(ordersPage.data?.orders)
      ? ordersPage.data.orders
      : [];
    const bootstrapOrders = Array.isArray(inboxBootstrap.data?.orders)
      ? inboxBootstrap.data.orders
      : [];

    // Merge orders from both sources, deduplicating by id
    const allOrders = [...bootstrapOrders, ...incoming];
    const orderMap = new Map<string, any>();
    allOrders.forEach((order: any) => {
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, order);
      }
    });

    // Sort by order number (highest/newest first)
    const sorted = Array.from(orderMap.values()).sort((a, b) => {
      // Extract numeric part from shopifyId (e.g., "304325" -> 304325)
      const numA = parseInt(a.shopifyId || '0', 10);
      const numB = parseInt(b.shopifyId || '0', 10);
      return numB - numA; // Descending order (highest number first)
    });

    setOrdersAccum(sorted);
  }, [ordersPage.data, ordersOffset, inboxBootstrap.data?.orders]);

  const hasMoreOrders = ordersPage.data?.hasMore ?? false;

  // Messages for selected order (when viewing order detail)
  const orderMessages = trpc.messagesByOrder.useQuery(
    { shopifyOrderId: selectedOrderId ?? '' },
    {
      enabled: !!selectedOrderId,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  // Get order detail
  const orderDetail = trpc.orderGet.useQuery(
    { shop: shop || '', orderId: selectedOrderId || '' },
    {
      enabled: !!shop && !!selectedOrderId,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  );

  // Get order details with line items (for order view)
  const orderDetailsWithItems = trpc.shopify.getOrderDetails.useQuery(
    { orderId: selectedOrderId || '' },
    {
      enabled: !!selectedOrderId,
      staleTime: 300000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
    },
  );

  // =============================================================================
  // MUTATIONS
  // =============================================================================

  const suggest = trpc.aiSuggestReply.useMutation();
  const createAction = trpc.actionCreate.useMutation();
  const approveSend = trpc.actionApproveAndSend.useMutation();
  const refreshOrder = trpc.refreshOrderFromShopify.useMutation({
    onSuccess: () => {
      inboxBootstrap.refetch();
      orderDetail.refetch();
      toast.success('Order synced from Shopify');
    },
  });
  const sendUnassignedReply = trpc.sendUnassignedReply.useMutation({
    onSuccess: (data: any) => {
      if (!data?.ok) {
        toast.error(data?.error || 'Failed to send reply');
        unassignedQuery.refetch();
        inboxBootstrap.refetch();
        return;
      }
      unassignedQuery.refetch();
      inboxBootstrap.refetch();
      threadMessages.refetch();
      toast.success('Reply sent successfully');
    },
    onError: (error) => {
      if (
        error.data?.code === 'FORBIDDEN' &&
        error.message?.includes('Email limit')
      ) {
        toast.error(error.message || 'Email limit reached.');
        inboxBootstrap.refetch();
      } else {
        toast.error('Failed to send reply');
      }
    },
  });

  const flagThread = trpc.flagThread.useMutation({
    onSuccess: () => {
      // Don't refetch to prevent emails from moving position
      // The flag state is saved to database and will persist
      // The UI will update on next natural refresh
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update flag status');
      // Only refetch on error to sync state
      unassignedQuery.refetch();
      inboxBootstrap.refetch();
    },
  });

  const syncAllOrders = trpc.syncAllOrdersFromShopify.useMutation({
    onMutate: () => {
      // Set initial progress state - start at 0, total will be updated when we know
      setSyncProgress({ current: 0, total: 100, isSyncing: true });
    },
    onSuccess: (data) => {
      console.log('[Sync Orders] Success response:', data);
      setSyncProgress(null); // Clear progress
      if (data?.ok) {
        toast.success(`Synced ${data.synced} orders from Shopify`);
        // Refetch orders to show newly synced data
        ordersPage.refetch();
        inboxBootstrap.refetch();
      } else {
        toast.error(data?.error || 'Failed to sync orders');
      }
    },
    onError: (error) => {
      console.error('[Sync Orders] Error:', error);
      setSyncProgress(null); // Clear progress on error
      toast.error(error.message || 'Failed to sync orders');
    },
  });

  // Simulate progress updates while syncing (since tRPC doesn't support streaming)
  useEffect(() => {
    if (syncProgress?.isSyncing) {
      const interval = setInterval(() => {
        setSyncProgress((prev) => {
          if (!prev) return null;
          // Estimate progress based on time (assuming ~0.5s per order)
          const estimatedProgress = Math.min(
            prev.current + 2,
            prev.total
          );
          return { ...prev, current: estimatedProgress };
        });
      }, 500); // Update every 500ms

      return () => clearInterval(interval);
    }
  }, [syncProgress?.isSyncing]);

  // =============================================================================
  // COMPUTED DATA
  // =============================================================================

  // Create a lookup map for connections by connectionId
  const connectionsMap = useMemo(() => {
    const connections = inboxBootstrap.data?.connections || [];
    const map = new Map<string, { shopDomain?: string | null; metadata?: { storeName?: string } | null }>();
    connections.forEach((conn: any) => {
      map.set(conn.id, {
        shopDomain: conn.shopDomain,
        metadata: conn.metadata,
      });
    });
    return map;
  }, [inboxBootstrap.data?.connections]);

  // Combine all emails for the email list view
  const allEmails = useMemo(() => {
    const unassigned = Array.isArray(unassignedQuery.data?.messages) 
      ? unassignedQuery.data.messages 
      : [];
    const bootstrapUnassigned = Array.isArray(inboxBootstrap.data?.unassigned)
      ? inboxBootstrap.data.unassigned
      : [];

    // Combine and dedupe by email ID
    const emailMap = new Map<string, any>();
    [...unassigned, ...bootstrapUnassigned].forEach((email: any) => {
      if (!emailMap.has(email.id)) {
        // Merge local flagged state with email data
        const threadId = email.thread?.id;
        if (threadId && flaggedThreads.has(threadId)) {
          email = {
            ...email,
            thread: {
              ...email.thread,
              isFlagged: true,
            },
          };
        }
        emailMap.set(email.id, email);
      }
    });

    // Group emails by thread - show one entry per thread (conversation)
    const threadMap = new Map<string, any[]>();
    emailMap.forEach((email) => {
      const threadId = email.thread?.id || email.id; // Fallback to email ID if no thread
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, []);
      }
      threadMap.get(threadId)!.push(email);
    });

    // For each thread, get the most recent email as the representative
    const threadRepresentatives = Array.from(threadMap.entries()).map(([threadId, emails]) => {
      // Sort emails in thread by date (most recent first)
      const sortedEmails = emails.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestEmail = sortedEmails[0];
      
      // Add thread metadata
      return {
        ...latestEmail,
        threadMessageCount: emails.length,
        threadEmails: sortedEmails,
      };
    });

    // Sort by unread status first, then by date descending
    return threadRepresentatives.sort((a, b) => {
      const aUnread = a.thread?.isUnread ?? true;
      const bUnread = b.thread?.isUnread ?? true;
      
      // Unread items first
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      
      // Then by date descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [unassignedQuery.data?.messages, inboxBootstrap.data?.unassigned, flaggedThreads]);

  // Filter emails by search
  // Filter emails by search
  const filteredEmails = useMemo(() => {
    // Filter out outbound emails from the list
    const inboundEmails = allEmails.filter(email => email.direction !== 'OUTBOUND');
    
    if (!searchQuery.trim()) return inboundEmails;
    const q = searchQuery.toLowerCase();
    return inboundEmails.filter(
      (email) =>
        email.from?.toLowerCase().includes(q) ||
        email.subject?.toLowerCase().includes(q) ||
        email.body?.toLowerCase().includes(q),
    );
  }, [allEmails, searchQuery]);

  // Selected email data
  const selectedEmail = useMemo(() => {
    if (!selectedEmailId) return null;
    const email = allEmails.find((e) => e.id === selectedEmailId);
    if (!email) return null;
    
    // Merge local flagged state
    const threadId = email.thread?.id;
    if (threadId && flaggedThreads.has(threadId)) {
      return {
        ...email,
        thread: {
          ...email.thread,
          isFlagged: true,
        },
      };
    }
    return email;
  }, [selectedEmailId, allEmails, flaggedThreads]);

  // Get threadId from selected email
  const selectedThreadId = useMemo(() => {
    if (!selectedEmail) return null;
    return selectedEmail.thread?.id || selectedEmail.id;
  }, [selectedEmail]);

  // Fetch all messages in the selected thread
  const threadMessages = trpc.threadMessages.useQuery(
    { threadId: selectedThreadId ?? '' },
    {
      enabled: !!selectedThreadId,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  // Auto-scroll to bottom when thread messages load
  useEffect(() => {
    if (threadMessages.data?.messages && conversationScrollRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const scrollContainer = conversationScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 100);
    }
  }, [threadMessages.data?.messages]);

  // Find linked order for selected email
  const linkedOrder = useMemo(() => {
    if (!selectedEmail) return null;

    // First, check if the message has a direct orderId link
    if (selectedEmail.orderId) {
      const orderById = ordersAccum.find(
        (order) =>
          order.id === selectedEmail.orderId ||
          order.shopifyId === selectedEmail.orderId,
      );
      if (orderById) return orderById;
    }

    // Fallback: match by sender email address
    const senderEmail = extractEmailAddress(selectedEmail.from);
    if (!senderEmail) return null;
    return (
      ordersAccum.find(
        (order) => extractEmailAddress(order.email) === senderEmail,
      ) ?? null
    );
  }, [selectedEmail, ordersAccum]);

  const emailLimit = {
    data: inboxBootstrap.data?.emailLimit,
    isLoading: inboxBootstrap.isLoading,
    refetch: inboxBootstrap.refetch,
  };

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const cleanPlaceholders = (text: string): string => {
    return text
      .replace(/\[Your Name\]/gi, '')
      .replace(/\[Your Company\]/gi, '')
      .replace(/\[Your Contact Information\]/gi, '')
      .replace(/\[Store Name\]/gi, '')
      .replace(/\[Your Company Name\]/gi, '')
      .replace(
        /Customer Support Team\s*\[Your Company\]/gi,
        'Customer Support Team',
      )
      .replace(/Best regards,?\s*\[Your Name\]/gi, 'Best regards,')
      .trim();
  };

  const handleSelectEmail = useCallback((email: EmailMessage) => {
    setSelectedEmailId(email.id);
    setSelectedOrderId(null);
    setDraft(
      email.aiSuggestion?.reply
        ? cleanPlaceholders(email.aiSuggestion.reply)
        : '',
    );
  }, []);

  const handleSelectOrder = useCallback((order: DbOrder) => {
    setSelectedOrderId(order.shopifyId);
    setSelectedEmailId(null);
    setDraft('');
    // Set shop from the order's shopDomain for API calls (Sync, Reply)
    if (order.shopDomain) {
      setShop(order.shopDomain);
    }
  }, []);

  const handleGenerateAi = async () => {
    if (!selectedEmail) {
      toast.info('No email selected.');
      return;
    }

    const fallbackSummary =
      selectedEmail.subject ||
      selectedEmail.snippet ||
      selectedEmail.body ||
      'Customer inquiry';
    const customerEmail = selectedEmail.from;

    try {
      const response = await suggest.mutateAsync({
        customerMessage: selectedEmail.body || 'Customer inquiry',
        orderSummary: linkedOrder?.name || fallbackSummary,
        tone: 'friendly',
        customerEmail,
        orderId: linkedOrder?.shopifyId ?? '',
      });

      const cleanedSuggestion = cleanPlaceholders(
        (response as any).suggestion ?? '',
      );
      setDraft(cleanedSuggestion);
      toast.success('AI reply generated');
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to generate AI reply');
    }
  };

  const handleRefreshAll = useCallback(async () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    setIsRefreshing(true);
    try {
      if (shop && selectedOrderId) {
        await refreshOrder.mutateAsync({ shop, orderId: selectedOrderId });
      }
      void inboxBootstrap.refetch();
      void unassignedQuery.refetch();
      toast.success('Inbox refreshed');
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to refresh');
    } finally {
      refreshTimer.current = setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  }, [
    inboxBootstrap,
    unassignedQuery,
    toast,
    shop,
    selectedOrderId,
    refreshOrder,
  ]);

  const handleSendReply = async () => {
    if (!selectedEmail || !draft.trim()) return;

    const recipientEmail = extractEmailAddress(selectedEmail.from);
    if (!recipientEmail) {
      toast.error('No valid recipient email found.');
      return;
    }

    if (emailLimit.data && !emailLimit.data.allowed) {
      toast.error(
        `Email limit reached (${emailLimit.data.current}/${emailLimit.data.limit}). Please upgrade.`,
      );
      return;
    }

    try {
      await sendUnassignedReply.mutateAsync({
        messageId: selectedEmail.id,
        replyBody: draft,
      });

      setRepliedMessageIds((prev) => new Set(prev).add(selectedEmail.id));
      setDraft('');

      // Auto-select next email
      const currentIndex = filteredEmails.findIndex(
        (e) => e.id === selectedEmail.id,
      );
      const nextEmail = filteredEmails[currentIndex + 1];
      if (nextEmail) {
        handleSelectEmail(nextEmail);
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to send reply');
    }
  };

  const handleSendOrderReply = async () => {
    if (!selectedOrderId || !draft.trim()) return;

    const order = ordersAccum.find((o) => o.shopifyId === selectedOrderId);
    if (!order) return;

    const recipientEmail = extractEmailAddress(order.email);
    if (!recipientEmail) {
      toast.error('No valid recipient email found for this order.');
      return;
    }

    if (emailLimit.data && !emailLimit.data.allowed) {
      toast.error(`Email limit reached. Please upgrade.`);
      return;
    }

    try {
      const action = await createAction.mutateAsync({
        shop,
        shopifyOrderId: order.shopifyId,
        email: recipientEmail,
        type: 'INFO_REQUEST',
        note: 'Manual approval',
        draft,
      });

      const result = await approveSend.mutateAsync({
        actionId: action.actionId,
        to: recipientEmail,
        subject: `Re: ${order.name || 'Your Order'}`,
        body: draft,
      });

      if (result.ok) {
        toast.success('Reply sent successfully');
        setDraft('');
        inboxBootstrap.refetch();
        orderMessages.refetch();
      } else {
        toast.error(`Failed to send: ${(result as any).error}`);
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to send reply');
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================



  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="min-h-screen bg-[#f8f6f3] pt-20">
        {/* Top Bar */}
        <div className="fixed top-20 left-0 right-0 z-40 bg-[#f8f6f3] border-b border-stone-200/60">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-6">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
                <button
                  onClick={() => setView('inbox')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    view === 'inbox'
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Inbox className="h-4 w-4" />
                  Inbox
                  {allEmails.length > 0 && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                        view === 'inbox' ? 'bg-white/20' : 'bg-stone-100'
                      }`}
                    >
                      {allEmails.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setView('orders')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    view === 'orders'
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Orders
                  {ordersAccum.length > 0 && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                        view === 'orders' ? 'bg-white/20' : 'bg-stone-100'
                      }`}
                    >
                      {ordersAccum.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Email Usage */}
              {emailLimit.data && (
                <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                  <Mail className="h-4 w-4 text-stone-400" />
                  <span className="text-stone-600">
                    {emailLimit.data.current}/{emailLimit.data.limit}
                  </span>
                  <div className="h-2 w-16 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(100, emailLimit.data.percentage)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                className="rounded-lg border-stone-200 bg-white text-stone-600 hover:bg-stone-50 shadow-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                {isRefreshing ? 'Refreshing' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-16 px-4 pb-6">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex gap-4 h-[calc(100vh-180px)]">
              {/* ============================================================= */}
              {/* LEFT PANEL - Email/Order List */}
              {/* ============================================================= */}
              <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Search Header */}
                <div className="p-4 border-b border-stone-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-stone-900">
                      {view === 'inbox' ? 'All Inbox' : 'All Orders'}
                    </span>
                    <div className="flex items-center gap-2">
                      {view === 'orders' && inboxBootstrap.data?.connections?.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Get the first Shopify connection's shop domain
                            const shopifyConnection = inboxBootstrap.data?.connections?.find(
                              (conn: any) => conn.type === 'SHOPIFY' && conn.shopDomain
                            );
                            if (shopifyConnection?.shopDomain) {
                              syncAllOrders.mutate({
                                shopDomain: shopifyConnection.shopDomain,
                              });
                            } else {
                              toast.error('No Shopify store connected');
                            }
                          }}
                          disabled={syncAllOrders.isPending || syncProgress?.isSyncing}
                          className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900"
                        >
                          <RefreshCw
                            className={`h-3 w-3 mr-1.5 ${
                              (syncAllOrders.isPending || syncProgress?.isSyncing) ? 'animate-spin' : ''
                            }`}
                          />
                          {syncProgress?.isSyncing
                            ? `Syncing ${syncProgress.current}/${syncProgress.total}...`
                            : syncAllOrders.isPending
                            ? 'Syncing...'
                            : 'Sync orders'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder={
                        view === 'inbox'
                          ? 'Search messages...'
                          : 'Search orders...'
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl bg-stone-50 border-0 py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                  </div>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                  {view === 'inbox' ? (
                    // Email List
                    unassignedQuery.isLoading ? (
                      <EmailListSkeleton />
                    ) : filteredEmails.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                          <Inbox className="h-6 w-6 text-stone-400" />
                        </div>
                        <p className="text-sm font-medium text-stone-900">
                          No emails found
                        </p>
                        <p className="text-xs text-stone-500 mt-1">
                          {searchQuery
                            ? 'Try a different search'
                            : 'Your inbox is empty'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-stone-50">
                        {filteredEmails.map((email) => {
                          const isReplied = repliedMessageIds.has(email.id);
                          const isSelected = selectedEmailId === email.id;
                          const senderName = getSenderName(email.from);
                          const hasAiSuggestion = !!email.aiSuggestion?.reply;
                          const isUnread = email.thread?.isUnread ?? true;
                          const isFlagged = email.thread?.isFlagged ?? false;
                          const emailStoreName = getStoreName(
                            email.thread?.connection?.shopDomain,
                            email.thread?.connection?.metadata as { storeName?: string } | null,
                          );
                          const emailStoreColor = getStoreColor(
                            email.thread?.connection?.shopDomain || 'default',
                          );

                          return (
                            <button
                              key={email.id}
                              onClick={() => handleSelectEmail(email)}
                              className={`w-full flex items-start gap-3 p-4 text-left transition-all hover:bg-stone-50 ${
                                isSelected ? 'bg-stone-100' : ''
                              } ${isReplied ? 'opacity-60' : ''}`}
                            >
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                <div
                                  className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(email.from)}`}
                                >
                                  {getInitials(null, email.from)}
                                </div>
                                {isUnread && (
                                  <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span
                                      className={`text-sm truncate ${
                                        isUnread
                                          ? 'font-bold text-stone-900'
                                          : 'font-semibold text-stone-900'
                                      }`}
                                    >
                                      {senderName}
                                    </span>
                                    {isFlagged && (
                                      <Flag className="h-3.5 w-3.5 text-orange-600 fill-orange-600 flex-shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-xs text-stone-500 flex-shrink-0 ml-2">
                                    {relativeTime(email.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p
                                    className={`text-xs truncate ${
                                      isUnread
                                        ? 'font-medium text-stone-900'
                                        : 'text-stone-600'
                                    }`}
                                  >
                                    {email.subject ||
                                      email.thread?.subject ||
                                      'No subject'}
                                  </p>
                                  {email.threadMessageCount > 1 && (
                                    <span className="text-xs text-stone-400 flex-shrink-0">
                                      ({email.threadMessageCount})
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-stone-500 line-clamp-1">
                                  {email.snippet || email.body?.slice(0, 80)}
                                </p>

                                {/* Indicators */}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {/* Store Badge */}
                                  {email.thread?.connection?.shopDomain && (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${emailStoreColor}`}
                                    >
                                      <Store className="h-3 w-3" />
                                      {emailStoreName}
                                    </span>
                                  )}
                                  {hasAiSuggestion && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                                      <Sparkles className="h-3 w-3" />
                                      AI ready
                                    </span>
                                  )}
                                  {isReplied && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                                      <CheckCircle className="h-3 w-3" />
                                      Replied
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : // Order List
                  ordersPage.isLoading && ordersOffset === 0 ? (
                    <EmailListSkeleton />
                  ) : ordersAccum.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                        <ShoppingBag className="h-6 w-6 text-stone-400" />
                      </div>
                      <p className="text-sm font-medium text-stone-900">
                        No orders found
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Connect your Shopify store
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-50">
                      {ordersAccum.map((order) => {
                        const isSelected = selectedOrderId === order.shopifyId;
                        const hasPendingEmails =
                          (order.pendingEmailCount ?? 0) > 0;
                        const orderStoreName = getStoreName(
                          order.shopDomain,
                          order.connectionId ? connectionsMap.get(order.connectionId)?.metadata : null,
                        );
                        const orderStoreColor = getStoreColor(
                          order.shopDomain || 'default',
                        );

                        return (
                          <button
                            key={order.shopifyId}
                            onClick={() => handleSelectOrder(order)}
                            className={`w-full flex items-start gap-3 p-4 text-left transition-all hover:bg-stone-50 ${
                              isSelected ? 'bg-stone-100' : ''
                            }`}
                          >
                            {/* Avatar */}
                            <div
                              className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${getAvatarColor(order.email || order.shopifyId)}`}
                            >
                              {getInitials(order.name, order.email)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 relative">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-semibold text-stone-900 truncate">
                                  {order.name ||
                                    `Order ${order.shopifyId.slice(-6)}`}
                                </span>
                                <span className="text-xs text-stone-500 flex-shrink-0 ml-2">
                                  {relativeTime(order.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-stone-600 truncate mb-1">
                                {order.customerName ||
                                  (order.email
                                    ? getSenderName(order.email)
                                    : null) ||
                                  'Guest Customer'}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Store Badge */}
                                {order.shopDomain && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${orderStoreColor}`}
                                  >
                                    <Store className="h-3 w-3" />
                                    {orderStoreName}
                                  </span>
                                )}
                                {/* Fulfillment/Shipping Status */}
                                <Badge
                                  className={`text-xs ${FULFILLMENT_STATUS_COLORS[order.fulfillmentStatus || 'default'] || FULFILLMENT_STATUS_COLORS.default}`}
                                >
                                  {order.fulfillmentStatus || 'UNFULFILLED'}
                                </Badge>
                                {/* Payment Status */}
                                <Badge
                                  className={`text-xs ${STATUS_COLORS[order.status] || STATUS_COLORS.default}`}
                                >
                                  {order.status}
                                </Badge>
                                <span className="text-xs text-stone-500">
                                  {formatCurrency(
                                    order.totalAmount,
                                    order.currency || 'INR',
                                  )}
                                </span>
                              </div>

                              {/* Email indicator */}
                              {hasPendingEmails && (
                                <div className="absolute top-0.5 right-0">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {/* Load More */}
                      {hasMoreOrders && (
                        <div className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full rounded-xl"
                            onClick={() => setOrdersOffset(ordersAccum.length)}
                            disabled={ordersPage.isFetching}
                          >
                            {ordersPage.isFetching ? 'Loading...' : 'Load more'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* ============================================================= */}
              {/* CENTER PANEL - Conversation / Email Detail */}
              {/* ============================================================= */}
              {/* ============================================================= */}
              {/* CENTER PANEL - Conversation / Email Detail */}
              {/* ============================================================= */}
              {view !== 'orders' && (
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
                {view === 'inbox' && selectedEmail ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(selectedEmail.from)}`}
                        >
                          {getInitials(null, selectedEmail.from)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-stone-900">
                              {getSenderName(selectedEmail.from)}
                            </h2>
                            {selectedEmail.thread?.isFlagged && (
                              <Flag className="h-4 w-4 text-orange-600 fill-orange-600" />
                            )}
                            {selectedEmail.thread?.connection?.shopDomain && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${getStoreColor(selectedEmail.thread.connection.shopDomain)}`}
                              >
                                <Store className="h-3 w-3" />
                                {getStoreName(
                                  selectedEmail.thread.connection.shopDomain,
                                  selectedEmail.thread.connection.metadata as { storeName?: string } | null,
                                )}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500">
                            {extractEmailAddress(selectedEmail.from)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedEmail.thread?.id && (
                          <Button
                              variant="ghost"
                              size="sm"
                              className={`rounded-lg text-xs ${
                                selectedEmail.thread?.isFlagged
                                  ? 'text-orange-600 hover:text-orange-700'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                              onClick={() => {
                                if (selectedEmail.thread?.id) {
                                  const threadId = selectedEmail.thread.id;
                                  const currentFlagged = selectedEmail.thread.isFlagged ?? false;
                                  const newFlaggedState = !currentFlagged;
                                  
                                  // Update local state immediately (optimistic update)
                                  setFlaggedThreads((prev) => {
                                    const next = new Set(prev);
                                    if (newFlaggedState) {
                                      next.add(threadId);
                                    } else {
                                      next.delete(threadId);
                                    }
                                    return next;
                                  });
                                  
                                  flagThread.mutate({
                                    threadId,
                                    isFlagged: newFlaggedState,
                                  });
                                  toast.success(
                                    newFlaggedState
                                      ? 'Flagged'
                                      : 'Unflagged',
                                  );
                                }
                              }}
                              disabled={flagThread.isPending}
                            >
                              <Flag
                                className={`h-3.5 w-3.5 mr-1.5 ${
                                  selectedEmail.thread?.isFlagged
                                    ? 'fill-orange-600'
                                    : ''
                                }`}
                              />
                              {selectedEmail.thread?.isFlagged
                                ? 'Unflag'
                                : 'Flag this mail'}
                            </Button>
                        )}
                      </div>
                    </div>

                    {/* Conversation Area */}
                    <ScrollArea ref={conversationScrollRef} className="flex-1 p-6">
                      {threadMessages.isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <LumaSpin />
                        </div>
                      ) : threadMessages.data?.messages && threadMessages.data.messages.length > 0 ? (
                        <div className="space-y-4">
                          {threadMessages.data.messages.map((message: any, index: number) => {
                            const isInbound = message.direction === 'INBOUND';
                            const isFirstMessage = index === 0;
                            const prevMessage = index > 0 ? threadMessages.data.messages[index - 1] : null;
                            const showDateSeparator = !prevMessage || isDifferentDay(message.createdAt, prevMessage.createdAt);
                            const subject = isFirstMessage ? (selectedEmail.subject || selectedEmail.thread?.subject) : null;

                            return (
                              <div key={message.id}>
                                {/* Date Separator */}
                                {showDateSeparator && (
                                  <div className="flex items-center justify-center my-6">
                                    <div className="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600">
                                      {formatDateHeader(message.createdAt)}
                                    </div>
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div className={`flex items-start gap-3 mb-4 ${isInbound ? 'justify-start' : 'justify-end'}`}>
                                  {isInbound && (
                                    <div
                                      className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${getAvatarColor(message.from)}`}
                                    >
                                      {getInitials(null, message.from)}
                                    </div>
                                  )}
                                  <div className={`flex-1 ${isInbound ? 'max-w-[75%]' : 'max-w-[75%] flex flex-col items-end'}`}>
                                    <div className={`flex items-center gap-2 mb-1 ${isInbound ? '' : 'flex-row-reverse'}`}>
                                      <span className={`text-sm font-semibold ${isInbound ? 'text-stone-900' : 'text-white'}`}>
                                        {isInbound ? getSenderName(message.from) : 'Bruno Perez'}
                                      </span>
                                      <span className={`text-xs ${isInbound ? 'text-stone-500' : 'text-stone-300'}`}>
                                        {formatTime(message.createdAt)}
                                      </span>
                                    </div>
                                    {subject && (
                                      <p className={`text-sm font-medium mb-2 ${isInbound ? 'text-stone-800' : 'text-white'}`}>
                                        {subject}
                                      </p>
                                    )}
                                    <div className={`rounded-2xl p-4 ${
                                      isInbound 
                                        ? 'rounded-tl-none bg-stone-100' 
                                        : 'rounded-tr-none bg-stone-900 text-white'
                                    }`}>
                                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                                        isInbound ? 'text-stone-700' : 'text-white'
                                      }`}>
                                        {message.body}
                                      </p>
                                    </div>
                                  </div>
                                  {!isInbound && (
                                    <div className="flex-shrink-0 w-10" />
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* AI Suggestion Section */}
                          {(selectedEmail.aiSuggestion || draft) && (
                            <div className="mt-6 pt-6 border-t border-stone-100">
                              <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                <span className="text-sm font-semibold text-stone-900">
                                  AI Suggested Reply
                                </span>
                                {selectedEmail.aiSuggestion?.confidence && (
                                  <Badge className="bg-violet-100 text-violet-700 text-xs">
                                    {Math.round(
                                      selectedEmail.aiSuggestion.confidence * 100,
                                    )}
                                    % confidence
                                  </Badge>
                                )}
                              </div>

                              {selectedEmail.aiSuggestion?.rationale && (
                                <p className="text-xs text-stone-500 mb-3 bg-stone-50 rounded-lg p-3">
                                  <strong>Analysis:</strong>{' '}
                                  {selectedEmail.aiSuggestion.rationale}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12 text-stone-500 text-sm">
                          No messages found in this thread
                        </div>
                      )}
                    </ScrollArea>

                    {/* Reply Input */}
                    <div className="p-4 border-t border-stone-100">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden focus-within:ring-2 focus-within:ring-stone-300 focus-within:border-stone-300">
                        <div className="relative">
                          <div
                            className="absolute top-2 right-2 cursor-ns-resize p-1 rounded hover:bg-stone-200/50 transition-colors z-10"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const startY = e.clientY;
                              const startHeight = inboxTextareaHeight;
                              
                              const handleMouseMove = (moveEvent: MouseEvent) => {
                                const deltaY = moveEvent.clientY - startY;
                                const newHeight = Math.max(100, Math.min(500, startHeight + deltaY));
                                setInboxTextareaHeight(newHeight);
                              };
                              
                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };
                              
                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }}
                          >
                            <GripVertical className="h-4 w-4 text-stone-400" />
                          </div>
                          <textarea
                            ref={messageInputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Write a message..."
                            style={{ height: `${inboxTextareaHeight}px` }}
                            className="w-full bg-transparent px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-between px-4 py-2 border-t border-stone-100 bg-white">
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition">
                              <Paperclip className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition">
                              <AtSign className="h-4 w-4" />
                            </button>
                            <button className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition">
                              <Smile className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSendReply}
                              disabled={
                                !draft.trim() || sendUnassignedReply.isPending
                              }
                              className="rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                            >
                              {sendUnassignedReply.isPending ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5 mr-1.5" />
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>

                ) : (
                  // Empty State
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                      <Mail className="h-8 w-8 text-stone-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-1">
                      Select a conversation
                    </h3>
                    <p className="text-sm text-stone-500 max-w-sm">
                      Choose an email from the list to view the conversation and reply
                    </p>
                  </div>
                )}
              </div>
            )}

              {/* ============================================================= */}
              {/* RIGHT PANEL - Profile / Order Details */}
              {/* ============================================================= */}
              <div className={`${view === 'orders' ? 'flex-1' : 'w-80'} flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden`}>
                {view === 'inbox' && selectedEmail ? (
                  <>
                    {/* Profile Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                      <span className="text-sm font-semibold text-stone-900">
                        Profile
                      </span>
                      <button className="p-1 rounded-lg hover:bg-stone-100 transition">
                        <X className="h-4 w-4 text-stone-400" />
                      </button>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-6">
                        {/* Avatar & Name */}
                        <div className="flex flex-col items-center text-center mb-6">
                          <div
                            className={`h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 ${getAvatarColor(selectedEmail.from)}`}
                          >
                            {getInitials(null, selectedEmail.from)}
                          </div>
                          <h3 className="text-lg font-semibold text-stone-900">
                            {getSenderName(selectedEmail.from)}
                          </h3>
                          <p className="text-sm text-stone-500">Customer</p>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center">
                              <AtSign className="h-4 w-4 text-stone-500" />
                            </div>
                            <div>
                              <p className="text-xs text-stone-400">
                                Email address
                              </p>
                              <p className="text-stone-900">
                                {extractEmailAddress(selectedEmail.from)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-stone-500" />
                            </div>
                            <div>
                              <p className="text-xs text-stone-400">
                                First contact
                              </p>
                              <p className="text-stone-900">
                                {new Date(
                                  selectedEmail.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>

                          </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Linked Order */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Linked Order
                          </h4>

                          {linkedOrder ? (
                            <div className="rounded-xl border border-stone-200 p-4 bg-stone-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-stone-900">
                                  {linkedOrder.name ||
                                    `#${linkedOrder.shopifyId.slice(-6)}`}
                                </span>
                                <div className="flex gap-1">
                                  <Badge
                                    className={`text-xs ${FULFILLMENT_STATUS_COLORS[linkedOrder.fulfillmentStatus || 'default'] || FULFILLMENT_STATUS_COLORS.default}`}
                                  >
                                    {linkedOrder.fulfillmentStatus ||
                                      'UNFULFILLED'}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${STATUS_COLORS[linkedOrder.status] || STATUS_COLORS.default}`}
                                  >
                                    {linkedOrder.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-stone-500">
                                <span>
                                  {formatCurrency(
                                    linkedOrder.totalAmount,
                                    linkedOrder.currency || 'INR',
                                  )}
                                </span>
                                <span>
                                  {relativeTime(linkedOrder.createdAt)}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3 rounded-lg text-xs"
                                onClick={() => {
                                  setView('orders');
                                  handleSelectOrder(linkedOrder);
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                View Order
                              </Button>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center">
                              <Package className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                              <p className="text-xs text-stone-500">
                                No linked order found
                              </p>
                            </div>
                          )}
                        </div>

                        {/* AI Insights */}
                        {selectedEmail.aiSuggestion && (
                          <>
                            <Separator className="my-4" />
                            <div>
                              <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                AI Insights
                              </h4>
                              <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-800">
                                <p className="text-xs font-medium text-violet-600 mb-1">
                                  Suggested Action
                                </p>
                                <p>
                                  {selectedEmail.aiSuggestion.proposedAction ||
                                    'Respond to inquiry'}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                ) : view === 'orders' && selectedOrderId ? (
                  // Order Details Panel
                  <>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                      <span className="text-sm font-semibold text-stone-900">
                        Order Details
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            refreshOrder.mutate({
                              shop,
                              orderId: selectedOrderId,
                            })
                          }
                          disabled={refreshOrder.isPending}
                          className="h-8 rounded-lg text-xs"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 mr-1.5 ${refreshOrder.isPending ? 'animate-spin' : ''}`}
                          />
                          Sync
                        </Button>
                        <button 
                          className="p-1 rounded-lg hover:bg-stone-100 transition"
                          onClick={() => setSelectedOrderId(null)}
                        >
                          <X className="h-4 w-4 text-stone-400" />
                        </button>
                      </div>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-6">
                        {/* Order data comes from database (ordersAccum) - no loading needed */}
                        <>
                            {/* Order Summary */}
                            <div className="rounded-xl border border-stone-200 p-4 mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-lg font-semibold text-stone-900">
                                  {
                                    ordersAccum.find(
                                      (o) => o.shopifyId === selectedOrderId,
                                    )?.name
                                  }
                                </span>
                                <div className="flex gap-1">
                                  <Badge
                                    className={`${FULFILLMENT_STATUS_COLORS[ordersAccum.find((o) => o.shopifyId === selectedOrderId)?.fulfillmentStatus || 'default'] || FULFILLMENT_STATUS_COLORS.default}`}
                                  >
                                    {ordersAccum.find(
                                      (o) => o.shopifyId === selectedOrderId,
                                    )?.fulfillmentStatus || 'UNFULFILLED'}
                                  </Badge>
                                  <Badge
                                    className={`${STATUS_COLORS[ordersAccum.find((o) => o.shopifyId === selectedOrderId)?.status || 'default'] || STATUS_COLORS.default}`}
                                  >
                                    {
                                      ordersAccum.find(
                                        (o) => o.shopifyId === selectedOrderId,
                                      )?.status
                                    }
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-stone-500">Total</span>
                                  <span className="font-semibold text-stone-900">
                                    {formatCurrency(
                                      ordersAccum.find(
                                        (o) => o.shopifyId === selectedOrderId,
                                      )?.totalAmount || 0,
                                      ordersAccum.find(
                                        (o) => o.shopifyId === selectedOrderId,
                                      )?.currency || 'INR',
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-stone-500">
                                    Customer
                                  </span>
                                  <span className="text-stone-900 text-right max-w-[180px] truncate">
                                    {ordersAccum.find(
                                      (o) => o.shopifyId === selectedOrderId,
                                    )?.customerName ||
                                      ordersAccum.find(
                                        (o) => o.shopifyId === selectedOrderId,
                                      )?.email ||
                                      'Guest Customer'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-stone-500">Date</span>
                                  <span className="text-stone-900">
                                    {new Date(
                                      ordersAccum.find(
                                        (o) => o.shopifyId === selectedOrderId,
                                      )?.createdAt || '',
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Line Items - fetched on demand */}
                            {(() => {
                              if (!selectedOrderId) return null;
                              
                              if (orderDetailsWithItems.isLoading) {
                                return (
                                  <div className="mb-4">
                                    <h4 className="text-sm font-semibold text-stone-900 mb-3">Items</h4>
                                    <div className="space-y-2">
                                      {[1, 2].map((i) => (
                                        <div key={i} className="h-16 rounded-lg bg-stone-100 animate-pulse" />
                                      ))}
                                    </div>
                                  </div>
                                );
                              }

                              const items = orderDetailsWithItems.data?.lineItems || [];
                              
                              if (items.length === 0) return null;
                              
                              return (
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold text-stone-900 mb-3">
                                    Items ({items.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {items.map((item: any) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between rounded-lg bg-stone-50 p-3"
                                      >
                                        <div>
                                          <p className="text-sm font-medium text-stone-900">
                                            {item.title}
                                          </p>
                                          <p className="text-xs text-stone-500">
                                            Qty: {item.quantity}
                                            {item.sku && ` • SKU: ${item.sku}`}
                                          </p>
                                        </div>
                                        <span className="text-sm font-medium text-stone-900">
                                          {formatCurrency(item.price, orderDetailsWithItems.data?.currency || orderDetail.data?.currency || 'INR')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}


                            {/* Linked Emails */}
                            <div>
                              <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Related Emails
                              </h4>
                              {orderMessages.isLoading ? (
                                <div className="space-y-2">
                                  {[1, 2].map((i) => (
                                    <div key={i} className="rounded-lg bg-stone-50 p-3 animate-pulse">
                                      <div className="flex justify-between mb-2">
                                        <div className="h-4 w-16 bg-stone-200 rounded" />
                                        <div className="h-3 w-12 bg-stone-200 rounded" />
                                      </div>
                                      <div className="h-3 w-full bg-stone-200 rounded mb-1" />
                                      <div className="h-3 w-2/3 bg-stone-200 rounded" />
                                    </div>
                                  ))}
                                </div>
                              ) : (orderMessages.data?.messages ?? []).length > 0 ? (
                                <div className="space-y-2">
                                  {(orderMessages.data?.messages as any[])
                                    .slice(0, 3)
                                    .map((msg: any) => (
                                      <button
                                        key={msg.id}
                                        onClick={() => {
                                          setView('inbox');
                                          handleSelectEmail(msg);
                                        }}
                                        className="w-full text-left rounded-lg bg-stone-50 p-3 hover:bg-stone-100 transition-colors"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <Badge
                                            className={`text-xs ${msg.direction === 'INBOUND' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}
                                          >
                                            {msg.direction}
                                          </Badge>
                                          <span className="text-xs text-stone-500">
                                            {relativeTime(msg.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-stone-600 line-clamp-2">
                                          {msg.body}
                                        </p>
                                      </button>
                                    ))}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center">
                                  <Mail className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                                  <p className="text-xs text-stone-500">
                                    No emails linked
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  // Empty State
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <div className="h-12 w-12 rounded-xl bg-stone-100 flex items-center justify-center mb-3">
                      <User className="h-6 w-6 text-stone-400" />
                    </div>
                    <p className="text-sm font-medium text-stone-900">
                      No selection
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Select an item to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Prompt Modal */}
        {emailLimit.data && !emailLimit.data.allowed && (
          <div className="fixed bottom-6 right-6 z-50">
            <UpgradePrompt
              usagePercentage={emailLimit.data.percentage}
              currentUsage={emailLimit.data.current}
              limit={emailLimit.data.limit}
              planName={
                emailLimit.data.planType
                  ?.toLowerCase()
                  .replace(/^\w/, (c) => c.toUpperCase()) || 'Current'
              }
              variant="inline"
              isTrial={emailLimit.data.trial?.isTrial ?? false}
              trialExpired={emailLimit.data.trial?.expired ?? false}
              trialDaysRemaining={emailLimit.data.trial?.daysRemaining ?? null}
            />
          </div>
        )}
      </div>
    </>
  );
}
