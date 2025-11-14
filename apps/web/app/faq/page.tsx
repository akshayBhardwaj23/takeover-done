import { Metadata } from 'next';
import { FAQClient } from './faq-client';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Zyyp AI - Learn how to connect Shopify stores, set up email integration, use AI-powered replies, view analytics, and more.',
};

export default function FAQPage() {
  return <FAQClient />;
}
