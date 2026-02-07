"use client";
import React from 'react';
import MainNavigation from '@/components/organisms/MainNavigation';
import AuthGuard from '@/components/common/AuthGuard';
import ChatWindow from '@/components/chat/ChatWindow';
import GlobalAlertMonitor from '@/components/common/GlobalAlertMonitor';
import { useState, useEffect } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarState, setSidebarState] = useState({ isCollapsed: false, isMobileOpen: false });

  // Track viewport width to reliably compute main content margin
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Compute margin-left in px so it always lines up with the sidebar
  const marginLeftPx = viewportWidth >= 768 ? (sidebarState.isCollapsed ? 80 : 288) : 0;

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <MainNavigation onSidebarStateChange={setSidebarState} />
        <main
          className={"flex-1 min-w-0 w-full py-4 pl-4"}
          style={{ marginLeft: marginLeftPx, transition: 'margin-left 300ms ease' }}
        >
          {children}
        </main>
      </div>
      <ChatWindow />
      <GlobalAlertMonitor />
    </AuthGuard>
  );
}