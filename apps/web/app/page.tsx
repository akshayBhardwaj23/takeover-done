'use client';

import dynamic from 'next/dynamic';
import Hero from './components/Hero';

const DemoLoop = dynamic(() => import('./components/landing/DemoLoop'));
const InsightsDashboard = dynamic(
  () => import('./components/landing/InsightsDashboard'),
);
const MailingEngine = dynamic(
  () => import('./components/landing/MailingEngine'),
);
const FounderSection = dynamic(
  () => import('./components/landing/FounderSection'),
);
const Logos = dynamic(() => import('./components/landing/Logos'));
const HowItWorks = dynamic(() => import('./components/landing/HowItWorks'));
const Features = dynamic(() => import('./components/landing/Features'));
const UseCases = dynamic(() => import('./components/landing/UseCases'));
const Benefits = dynamic(() => import('./components/landing/Benefits'));
const LiveFeed = dynamic(() => import('./components/landing/LiveFeed'));
const Pricing = dynamic(() => import('./components/landing/Pricing'));
const Security = dynamic(() => import('./components/landing/Security'));
const FAQ = dynamic(() => import('./components/landing/FAQ'));
const CTA = dynamic(() => import('./components/landing/CTA'));

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Hero />
      <DemoLoop />
      <InsightsDashboard />
      <MailingEngine />
      <FounderSection />
      <Logos />
      <HowItWorks />
      <Features />
      <UseCases />
      <Benefits />
      <LiveFeed />
      <Pricing />
      <Security />
      <FAQ />
      <CTA />
    </div>
  );
}
