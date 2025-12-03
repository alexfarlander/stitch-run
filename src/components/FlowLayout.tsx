/**
 * Flow Layout Component
 * 
 * Client-side wrapper for flow pages with navigation
 */

'use client';

import { Navigation } from './Navigation';

interface FlowLayoutProps {
  children: React.ReactNode;
}

export function FlowLayout({ children }: FlowLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950">
      <Navigation />
      {children}
    </div>
  );
}
