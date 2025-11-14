'use client';

import { useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Mail,
  Store,
  Sparkles,
  BarChart3,
  CreditCard,
  Settings,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon?: React.ReactNode;
};

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'getting-started-1',
    category: 'Getting Started',
    question: 'How do I get started with Zyyp AI?',
    answer:
      'Getting started is simple! First, sign in with your Google account. Then, connect your Shopify store from the Integrations page by clicking "Connect Store" and entering your shop domain (e.g., yourshop.myshopify.com). Once connected, set up your email alias to receive customer emails. Your inbox will automatically start syncing orders and emails.',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    id: 'getting-started-2',
    category: 'Getting Started',
    question: 'What do I need to use Zyyp AI?',
    answer:
      "You need: (1) A Shopify store, (2) A Google account for authentication, (3) An email address for receiving customer support emails. That's it! No technical knowledge required.",
  },
  {
    id: 'getting-started-3',
    category: 'Getting Started',
    question: 'Is there a free trial?',
    answer:
      "Yes! We offer a free trial so you can test all features. During the trial, you'll have access to AI-powered replies, order matching, and email automation. Check your email limit in the header to see how many emails you have remaining.",
  },

  // Shopify Integration
  {
    id: 'shopify-1',
    category: 'Shopify Integration',
    question: 'How do I connect my Shopify store?',
    answer:
      'Go to the Integrations page and click "Connect Store". Enter your full Shopify store domain (e.g., dev-yourshop.myshopify.com). You\'ll be redirected to Shopify to authorize the connection. Once authorized, your store will appear in the connected stores list and orders will start syncing automatically.',
    icon: <Store className="h-5 w-5" />,
  },
  {
    id: 'shopify-2',
    category: 'Shopify Integration',
    question: 'Can I connect multiple Shopify stores?',
    answer:
      'Yes! You can connect multiple Shopify stores to your account. Each store will appear separately in your Stores dropdown menu. The number of stores you can connect depends on your plan: Starter (1 store), Growth (up to 3 stores), Pro (up to 10 stores), and Enterprise (unlimited stores).',
  },
  {
    id: 'shopify-3',
    category: 'Shopify Integration',
    question: 'How do I disconnect a Shopify store?',
    answer:
      'Go to the Integrations page, find the store you want to disconnect, and click the "Disconnect" button. You\'ll be asked to confirm the action. Disconnecting will remove the store from your dashboard and stop syncing new orders, but your historical data will be preserved.',
  },
  {
    id: 'shopify-4',
    category: 'Shopify Integration',
    question: 'What happens to my orders when I disconnect a store?',
    answer:
      'When you disconnect a store, new orders will stop syncing, but all existing order data, email threads, and AI suggestions remain in your dashboard. You can reconnect the store at any time to resume syncing.',
  },
  {
    id: 'shopify-5',
    category: 'Shopify Integration',
    question: 'How often are orders synced from Shopify?',
    answer:
      'Orders are synced in real-time via Shopify webhooks. When a new order is created, fulfilled, or refunded in Shopify, it automatically appears in your dashboard within seconds. You can also manually refresh orders using the "Refresh from Shopify" button.',
  },
  {
    id: 'shopify-6',
    category: 'Shopify Integration',
    question: 'Can I see order fulfillment status?',
    answer:
      'Yes! Order fulfillment status from Shopify is automatically synced and displayed in your inbox. When an order is fulfilled in Shopify, the status updates in your dashboard in real-time. You can see the fulfillment status next to each order in the orders list.',
  },

  // Email Setup
  {
    id: 'email-1',
    category: 'Email Setup',
    question: 'How do I set up email integration?',
    answer:
      'On the Integrations page, go to the "Custom Email" section. Click "Create Email Alias" and enter your email address, domain, and associated Shopify store. You\'ll receive a unique email alias (e.g., in+yourstore@mail.zyyp.ai) that you can use to receive customer support emails. Forward emails to this alias or configure it as your support email.',
    icon: <Mail className="h-5 w-5" />,
  },
  {
    id: 'email-2',
    category: 'Email Setup',
    question: 'What is an email alias and why do I need it?',
    answer:
      'An email alias is a unique email address (like in+yourstore@mail.zyyp.ai) that routes customer emails to your Zyyp AI dashboard. When customers email this address, the emails appear in your inbox where AI can analyze them, match them to orders, and suggest replies.',
  },
  {
    id: 'email-3',
    category: 'Email Setup',
    question: 'Can I use my existing support email?',
    answer:
      'Yes! You can forward emails from your existing support email to your Zyyp AI alias. Alternatively, you can update your website\'s contact form or support page to use the Zyyp AI alias directly. The system will automatically process all incoming emails.',
  },
  {
    id: 'email-4',
    category: 'Email Setup',
    question: 'How do I rotate or change my email alias?',
    answer:
      'Go to the Integrations page, find your email alias, and click "Rotate Alias". This generates a new alias while keeping the old one active for a transition period. Update your email forwarding or contact forms with the new alias.',
  },
  {
    id: 'email-5',
    category: 'Email Setup',
    question: 'What does "Email Health" mean?',
    answer:
      'Email Health shows when the last customer email was received. If you see "No deliveries yet", it means no emails have been received at your alias. Check that your email forwarding is configured correctly and that customers are sending emails to your alias address.',
  },
  {
    id: 'email-6',
    category: 'Email Setup',
    question: 'Can I disable an email alias?',
    answer:
      'Yes! You can toggle an email alias on or off using the power button next to each alias. When disabled, emails sent to that alias won\'t be processed. This is useful for temporarily pausing email processing without deleting the alias.',
  },

  // Using the Inbox
  {
    id: 'inbox-1',
    category: 'Using the Inbox',
    question: 'How does the inbox work?',
    answer:
      'The inbox is your unified dashboard for all customer support. It shows orders from your connected Shopify stores and unmatched emails. Click on any order or email to see details, view the email thread, and get AI-suggested replies. You can approve, edit, or reject AI suggestions before sending.',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: 'inbox-2',
    category: 'Using the Inbox',
    question: 'What are "Unmatched Emails"?',
    answer:
      'Unmatched emails are customer emails that couldn\'t be automatically linked to a Shopify order. This might happen if the customer didn\'t mention their order number or used a different email address. You can still reply to these emails, and the AI will generate appropriate responses.',
  },
  {
    id: 'inbox-3',
    category: 'Using the Inbox',
    question: 'How do I reply to a customer email?',
    answer:
      'Click on an order or email in your inbox. The AI will automatically generate a suggested reply based on the customer\'s message and order details. Review the suggestion, edit if needed, and click "Send email" to send your reply. The reply will be sent as a proper email thread reply to the customer.',
  },
  {
    id: 'inbox-4',
    category: 'Using the Inbox',
    question: 'Can I edit AI-generated replies?',
    answer:
      'Absolutely! AI suggestions are just that—suggestions. You can edit the draft reply in the text area before sending. The AI provides a starting point, but you have full control to customize the tone, add details, or make any changes you want.',
  },
  {
    id: 'inbox-5',
    category: 'Using the Inbox',
    question: 'How do I mark emails as replied?',
    answer:
      'When you send a reply, the email is automatically marked with a checkmark icon. The system also automatically moves to the next email requiring a reply. If all emails are replied to, the draft clears and you\'ll see a success message.',
  },
  {
    id: 'inbox-6',
    category: 'Using the Inbox',
    question: 'What happens when I send an email?',
    answer:
      'When you send an email: (1) The button shows a loading state with "Sending…", (2) The email is sent via Mailgun to the customer, (3) The email is marked as replied with a checkmark, (4) The system automatically moves to the next email needing a reply, (5) Your email usage count is updated.',
  },
  {
    id: 'inbox-7',
    category: 'Using the Inbox',
    question: 'How are emails threaded?',
    answer:
      'Emails are automatically threaded using standard email headers (In-Reply-To and References). When you reply to a customer email, your reply appears in the same conversation thread in their email client. The original customer email is also included as quoted text at the bottom of your reply for context.',
  },
  {
    id: 'inbox-8',
    category: 'Using the Inbox',
    question: 'Can I see the full email conversation history?',
    answer:
      'Yes! When you select an order or email, you can see the complete email thread in the "Thread" section. This shows all inbound and outbound messages in chronological order, giving you full context of the conversation.',
  },

  // AI Features
  {
    id: 'ai-1',
    category: 'AI Features',
    question: 'How does AI generate reply suggestions?',
    answer:
      'The AI analyzes the customer\'s email, considers the order details (if available), and generates a personalized, empathetic response. It uses OpenAI GPT-4o-mini to understand context, sentiment, and intent, then drafts a professional reply that matches your store\'s tone.',
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: 'ai-2',
    category: 'AI Features',
    question: 'What is AI confidence score?',
    answer:
      'The confidence score (shown as a percentage) indicates how certain the AI is about its suggestion. Higher confidence (75%+) means the AI is very confident about the suggested action or reply. Lower confidence may require more manual review.',
  },
  {
    id: 'ai-3',
    category: 'AI Features',
    question: 'Can I regenerate an AI suggestion?',
    answer:
      'Yes! Click "Generate AI reply" again to get a new suggestion. The AI will re-analyze the email and generate a fresh response. You can regenerate as many times as you need until you\'re satisfied with the suggestion.',
  },
  {
    id: 'ai-4',
    category: 'AI Features',
    question: 'What actions can the AI suggest?',
    answer:
      'The AI can suggest several Shopify actions: REFUND (full or partial), CANCEL (cancel pending orders), REPLACE_ITEM (replace damaged/wrong items), ADDRESS_CHANGE (update shipping address), INFO_REQUEST (request more information), or NONE (just a reply needed).',
  },
  {
    id: 'ai-5',
    category: 'AI Features',
    question: 'How accurate are AI suggestions?',
    answer:
      'AI suggestions are highly accurate, especially for common support scenarios. The AI considers order context, customer history, and email content. However, you should always review suggestions before sending, especially for high-value orders or complex requests.',
  },
  {
    id: 'ai-6',
    category: 'AI Features',
    question: 'Does the AI use my store name in replies?',
    answer:
      'Yes! The AI automatically uses your actual store name (from Shopify or your custom store name) in email signatures. Replies end with "Warm regards," followed by your store name and "Customer Support Team". No placeholders are used.',
  },

  // Analytics
  {
    id: 'analytics-1',
    category: 'Analytics',
    question: 'What analytics are available?',
    answer:
      'You have access to two types of analytics: (1) Support Analytics - tracks response times, customer satisfaction, AI accuracy, and support volume trends, (2) Business Analytics - shows Shopify revenue, orders, customers, average order value, and growth trends.',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: 'analytics-2',
    category: 'Analytics',
    question: 'How do I view my analytics?',
    answer:
      'Click "Analytics" in the main navigation. You\'ll see a dropdown with "Support Analytics" and "Business Analytics". Support Analytics shows your support performance metrics, while Business Analytics shows your Shopify store performance.',
  },
  {
    id: 'analytics-3',
    category: 'Analytics',
    question: 'What is Support Analytics?',
    answer:
      'Support Analytics tracks your customer support performance: average response time, customer satisfaction scores, AI suggestion accuracy, email volume trends, and automation rates. This helps you understand how well your support team (and AI) is performing.',
  },
  {
    id: 'analytics-4',
    category: 'Analytics',
    question: 'What is Business Analytics?',
    answer:
      'Business Analytics shows your Shopify store metrics: total revenue, number of orders, customer count, average order value (AOV), and growth trends over time. This gives you insights into your business performance alongside your support metrics.',
  },
  {
    id: 'analytics-5',
    category: 'Analytics',
    question: 'How often is analytics data updated?',
    answer:
      'Analytics data is updated in real-time as actions occur. Support metrics update immediately when you send emails or take actions. Business analytics sync with Shopify data and update when new orders are created or fulfilled.',
  },

  // Pricing & Plans
  {
    id: 'pricing-1',
    category: 'Pricing & Plans',
    question: 'What are the pricing plans?',
    answer:
      'We offer four plans: Starter (₹999/mo) - 500 emails/month, 1 store; Growth (₹2,999/mo) - 2,500 emails/month, up to 3 stores; Pro (₹9,999/mo) - 10,000 emails/month, up to 10 stores; Enterprise - Custom pricing for unlimited emails and stores. Prices are shown in INR by default and adjust to USD based on your location.',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: 'pricing-2',
    category: 'Pricing & Plans',
    question: 'How does email counting work?',
    answer:
      'Only outbound emails (emails you send to customers) count toward your limit. Inbound emails (emails you receive) are unlimited. AI suggestions and draft generation don\'t count. You can see your current usage in the header (e.g., "99 emails left").',
  },
  {
    id: 'pricing-3',
    category: 'Pricing & Plans',
    question: 'What happens when I reach my email limit?',
    answer:
      'When you reach your email limit, you\'ll see a warning message and an "Upgrade" button. You won\'t be able to send more emails until you upgrade your plan or wait for the next billing cycle. Your trial period or plan resets monthly.',
  },
  {
    id: 'pricing-4',
    category: 'Pricing & Plans',
    question: 'Can I upgrade or downgrade my plan?',
    answer:
      'Yes! You can upgrade your plan at any time from the Usage page or when you hit your email limit. Upgrades take effect immediately. For downgrades or plan changes, contact support or visit your account settings.',
  },
  {
    id: 'pricing-5',
    category: 'Pricing & Plans',
    question: 'Do prices change based on my location?',
    answer:
      'Yes! Prices are automatically displayed in INR (₹) by default, but adjust to USD ($) based on your browser location. The system detects your location and shows the appropriate currency. All plans are available in both currencies.',
  },
  {
    id: 'pricing-6',
    category: 'Pricing & Plans',
    question: 'What payment methods are accepted?',
    answer:
      'We accept payments through Razorpay, which supports credit cards, debit cards, UPI, net banking, and other popular payment methods in India. International customers can pay with credit/debit cards.',
  },

  // Account & Settings
  {
    id: 'account-1',
    category: 'Account & Settings',
    question: 'How do I update my profile?',
    answer:
      'Click on your profile picture/name in the header, then select "Profile" from the dropdown. You can update your name, email, and other profile information. Changes are saved automatically.',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: 'account-2',
    category: 'Account & Settings',
    question: 'How do I change my store name?',
    answer:
      'Go to the Integrations page, find your connected store, and click the edit icon next to the store name. Enter your custom store name and save. This name will be used in all email signatures and communications.',
  },
  {
    id: 'account-3',
    category: 'Account & Settings',
    question: 'How do I sign out?',
    answer:
      'Click "Sign out" in the header (top right). You\'ll be logged out and redirected to the homepage. You can sign back in anytime with your Google account.',
  },
  {
    id: 'account-4',
    category: 'Account & Settings',
    question: 'Can I use multiple accounts?',
    answer:
      'Each account is tied to a Google account. If you need to manage multiple stores separately, you can use different Google accounts. However, you can also connect multiple stores to a single account (based on your plan limits).',
  },

  // Troubleshooting
  {
    id: 'troubleshooting-1',
    category: 'Troubleshooting',
    question: 'Why aren\'t my orders showing up?',
    answer:
      'Check that: (1) Your Shopify store is connected (Integrations page), (2) Orders exist in your Shopify store, (3) The store connection is active. Try clicking "Refresh" in the inbox to manually sync orders. If issues persist, disconnect and reconnect your store.',
  },
  {
    id: 'troubleshooting-2',
    category: 'Troubleshooting',
    question: 'Why aren\'t emails appearing in my inbox?',
    answer:
      'Verify: (1) Your email alias is active (green badge in Integrations), (2) Emails are being forwarded to your alias address, (3) Check "Email Health" to see when the last email was received. If no emails are coming through, check your email forwarding configuration.',
  },
  {
    id: 'troubleshooting-3',
    category: 'Troubleshooting',
    question: 'Why is the AI not generating suggestions?',
    answer:
      'AI suggestions are generated automatically when emails arrive. If you don\'t see suggestions: (1) Click "Generate AI reply" manually, (2) Check that the email has content to analyze, (3) Ensure you haven\'t exceeded API rate limits. If issues persist, try refreshing the page.',
  },
  {
    id: 'troubleshooting-4',
    category: 'Troubleshooting',
    question: 'My email was sent but the customer didn\'t receive it',
    answer:
      'Check: (1) The recipient email address is correct, (2) Check your email usage limit hasn\'t been exceeded, (3) Verify Mailgun is properly configured. If the email limit is reached, you\'ll need to upgrade your plan. Check spam folders as well.',
  },
  {
    id: 'troubleshooting-5',
    category: 'Troubleshooting',
    question: 'The page is loading slowly',
    answer:
      'We\'ve optimized the inbox for performance with caching and progressive loading. If pages are still slow: (1) Check your internet connection, (2) Try refreshing the page, (3) Clear your browser cache. The first load may take a moment, but subsequent loads should be faster.',
  },
  {
    id: 'troubleshooting-6',
    category: 'Troubleshooting',
    question: 'I see placeholder text in email signatures',
    answer:
      'This shouldn\'t happen! If you see placeholders like [Your Name] or [Your Company], it means an old AI suggestion is being used. Click "Generate AI reply" again to get a fresh suggestion with your actual store name. The system automatically removes placeholders.',
  },
  {
    id: 'troubleshooting-7',
    category: 'Troubleshooting',
    question: 'How do I refresh my data?',
    answer:
      'Click the "Refresh" button in the inbox header to manually refresh all data. This syncs orders from Shopify, updates email threads, and refreshes analytics. The button shows a spinning icon while refreshing.',
  },
];

const categories = [
  'Getting Started',
  'Shopify Integration',
  'Email Setup',
  'Using the Inbox',
  'AI Features',
  'Analytics',
  'Pricing & Plans',
  'Account & Settings',
  'Troubleshooting',
];

export function FAQClient() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFAQs = selectedCategory
    ? faqData.filter((faq) => faq.category === selectedCategory)
    : faqData;

  const categoryCounts = categories.reduce(
    (acc, cat) => {
      acc[cat] = faqData.filter((faq) => faq.category === cat).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <main className="min-h-screen bg-slate-100 py-28 lg:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Frequently Asked Questions
            </h1>
          </div>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Everything you need to know about using Zyyp AI to automate your
            customer support and grow your business.
          </p>
        </header>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              selectedCategory === null
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            All ({faqData.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                selectedCategory === category
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {category} ({categoryCounts[category]})
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq) => {
            const isOpen = openItems.has(faq.id);
            return (
              <Card
                key={faq.id}
                className="overflow-hidden border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {faq.icon && (
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        {faq.icon}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-900">
                        {faq.question}
                      </h3>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">
                    <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <Card className="mt-12 border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-3 text-xl font-semibold text-slate-900">
            Still have questions?
          </h2>
          <p className="mb-6 text-sm text-slate-600">
            Can't find the answer you're looking for? We're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/integrations"
              className="rounded-full border border-slate-900/20 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900/40 hover:bg-slate-50"
            >
              Get Started
            </a>
            <a
              href="mailto:support@zyyp.ai"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Contact Support
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}

