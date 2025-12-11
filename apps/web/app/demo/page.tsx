'use client';

import { useState } from 'react';
import { Card } from '../../../../@ai-ecom/api/components/ui/card';
import { Button } from '../../../../@ai-ecom/api/components/ui/button';
import { Input } from '../../../../@ai-ecom/api/components/ui/input';
import {
  CheckCircle2,
  Play,
  Upload,
  Link as LinkIcon,
  ArrowRight,
  Mail,
  Store,
  MessageSquare,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    number: 1,
    title: 'Connect Your Shopify Store',
    description:
      'Start by connecting your Shopify store to ZYYP. Navigate to Integrations, click "Connect Shopify", and authorize the connection. This syncs your orders, customers, and order history.',
    icon: Store,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    number: 2,
    title: 'Set Up Your Support Email',
    description:
      'Configure your support inbox (Gmail, Outlook, or custom email via Mailgun). ZYYP will automatically ingest incoming customer emails and match them to orders.',
    icon: Mail,
    color: 'from-rose-500 to-pink-500',
  },
  {
    number: 3,
    title: 'Review Incoming Messages',
    description:
      'Visit the Inbox page to see all customer emails. Each message is automatically matched to its corresponding Shopify order, showing order details, status, and customer history.',
    icon: MessageSquare,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    number: 4,
    title: 'AI Generates Reply Drafts',
    description:
      'Click "Generate AI Reply" on any customer message. ZYYP analyzes the intent, order context, and customer sentiment to draft a personalized response with suggested actions.',
    icon: Sparkles,
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    number: 5,
    title: 'Approve and Send',
    description:
      'Review the AI-generated draft, edit if needed, and approve to send. ZYYP can also suggest Shopify actions like refunds, exchanges, or address updates that you can approve with one click.',
    icon: CheckCircle2,
    color: 'from-amber-500 to-orange-500',
  },
  {
    number: 6,
    title: 'Track Performance',
    description:
      'Monitor your support metrics in the Analytics dashboard. See response times, AI adoption rates, customer satisfaction scores, and revenue impact of your automated workflows.',
    icon: BarChart3,
    color: 'from-cyan-500 to-sky-500',
  },
];

export default function DemoPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleVideoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoInput.trim()) {
      setVideoUrl(videoInput.trim());
      setVideoInput('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real implementation, you would upload to a storage service
    // For now, we'll create a local object URL
    setIsUploading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setVideoUrl(objectUrl);
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const isYouTubeUrl = (url: string) => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(
      url,
    );
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    )?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-36 sm:px-10">
        <header className="space-y-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Demo & Tutorial
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Learn how to use ZYYP in minutes
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-slate-600 sm:text-xl">
            Follow our step-by-step guide to set up your AI-powered support
            workflow. Watch the demo video or follow along with the instructions
            below.
          </p>
        </header>

        {/* Video Section */}
        <Card className="overflow-hidden border border-slate-200 bg-slate-50 p-8 shadow-lg shadow-slate-900/5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Demo Video
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Watch a walkthrough of ZYYP in action
              </p>
            </div>
          </div>

          {videoUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
              {isYouTubeUrl(videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl)}
                  title="ZYYP Demo Video"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  className="h-full w-full"
                  controlsList="nodownload"
                >
                  Your browser does not support the video tag.
                </video>
              )}
              <button
                onClick={() => setVideoUrl('')}
                className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-lg transition hover:bg-white"
              >
                Change Video
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <form
                  onSubmit={handleVideoUrlSubmit}
                  className="flex flex-1 gap-2"
                >
                  <Input
                    type="url"
                    placeholder="Paste YouTube or video URL"
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!videoInput.trim()}
                    className="whitespace-nowrap"
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Load URL
                  </Button>
                </form>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  Upload Video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
              <div className="flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                <div className="text-center">
                  <Play className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    No video loaded
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload a video file or paste a YouTube URL
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Step-by-Step Instructions */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-slate-900">
              Step-by-Step Guide
            </h2>
            <p className="mt-2 text-slate-600">
              Follow these steps to get started with ZYYP
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <Card
                key={step.number}
                className="group relative overflow-hidden border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
                  >
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Step {step.number}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Connect With Us Section */}
        <Card className="border border-slate-200 bg-white p-10 shadow-lg">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-slate-900">
                Have questions? Let's connect
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Our team is here to help you get the most out of ZYYP. Reach out
                for a personalized demo, technical support, or to discuss your
                specific needs.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Email Us
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Send us an email and we'll get back to you within 24 hours.
                </p>
                <a
                  href="mailto:hello@zyyp.ai"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-slate-700"
                >
                  hello@zyyp.ai
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Schedule a Demo
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Book a personalized walkthrough to see ZYYP in action.
                </p>
                <a
                  href="mailto:hello@zyyp.ai?subject=Schedule a Demo"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-slate-700"
                >
                  Book a call
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Need technical support?
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Our support team is available to help with setup,
                    integrations, and troubleshooting. We're committed to
                    ensuring your success with ZYYP.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Start CTA */}
        <Card className="border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white shadow-xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold">Ready to get started?</h2>
            <p className="mt-4 text-lg text-white/80">
              Connect your Shopify store and start automating your customer
              support workflow in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/integrations">
                <Button
                  size="lg"
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Connect Your Store
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/usage">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/30 bg-transparent px-8 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
