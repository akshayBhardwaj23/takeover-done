'use client';

import { useEffect, useState } from 'react';

interface StatProps {
  value: string;
  label: string;
  suffix?: string;
  className?: string;
}

function AnimatedNumber({ value, suffix = '', className = '' }: { value: string; suffix?: string; className?: string }) {
  const [displayValue, setDisplayValue] = useState('0');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          animateNumber();
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`stat-${value}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [value]);

  const animateNumber = () => {
    const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current).toLocaleString());
      }
    }, duration / steps);
  };

  return (
    <div id={`stat-${value}`} className={className}>
      <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-2">
        {displayValue}{suffix}
      </div>
    </div>
  );
}

export default function InteractiveStats() {
  const stats = [
    { value: '2.5K+', label: 'Shopify Stores', suffix: '' },
    { value: '95%', label: 'AI Accuracy', suffix: '' },
    { value: '30s', label: 'Avg Response', suffix: '' },
    { value: '24/7', label: 'AI Support', suffix: '' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="text-center group cursor-pointer"
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        >
          <div className="relative">
            <AnimatedNumber
              value={stat.value}
              suffix={stat.suffix}
              className="transition-all duration-500 group-hover:scale-110"
            />
            <div className="text-sm font-medium text-gray-600 mt-2 group-hover:text-gray-900 transition-colors duration-300">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
