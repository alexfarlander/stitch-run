/**
 * Home Layout Component
 * 
 * Client-side wrapper for home page with navigation
 */

'use client';

import { Navigation } from './Navigation';

interface HomeLayoutProps {
  children: React.ReactNode;
}

export function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
