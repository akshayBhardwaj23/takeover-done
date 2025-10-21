'use client';

import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
}

const tabs: Tab[] = [
  {
    id: 'automation',
    label: 'AI Support',
    icon: '🤖',
    title: 'Intelligent Customer Support',
    description: 'Let AI handle your Shopify customer inquiries with smart responses that understand order context and customer history.',
    features: [
      'Auto-draft responses using order data',
      'Smart refund and cancellation handling',
      'Sentiment analysis and priority routing',
      '24/7 customer support coverage'
    ]
  },
  {
    id: 'analytics',
    label: 'Insights',
    icon: '📊',
    title: 'Support Analytics',
    description: 'Track your support performance with detailed analytics on response times, customer satisfaction, and automation rates.',
    features: [
      'Real-time support metrics',
      'Customer satisfaction tracking',
      'AI accuracy monitoring',
      'Performance dashboards'
    ]
  },
  {
    id: 'integration',
    label: 'Shopify',
    icon: '🛍️',
    title: 'Shopify Integration',
    description: 'Seamlessly connect your Shopify store with Gmail to create a unified support experience for your customers.',
    features: [
      'Direct Shopify order access',
      'Gmail integration',
      'One-click refund processing',
      'Order status updates'
    ]
  }
];

export default function FeatureTabs() {
  const [activeTab, setActiveTab] = useState('automation');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`transition-all duration-500 ${
              activeTab === tab.id
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8 absolute inset-0 pointer-events-none'
            }`}
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="section-headline text-gray-900">
                  {tab.title}
                </h3>
                <p className="body-text text-gray-600">
                  {tab.description}
                </p>
                <ul className="space-y-3">
                  {tab.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center space-x-3"
                      style={{
                        animationDelay: `${index * 0.1}s`
                      }}
                    >
                      <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 flex items-center justify-center">
                  <div className="text-6xl opacity-20">
                    {tab.icon}
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
