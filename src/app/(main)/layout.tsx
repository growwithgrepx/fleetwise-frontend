"use client";
import React from 'react';
import MainNavigation from '@/components/organisms/MainNavigation';
import AuthGuard from '@/components/common/AuthGuard';
import ChatWindow from '@/components/chat/ChatWindow';
import GlobalAlertMonitor from '@/components/common/GlobalAlertMonitor';
import { useState, useEffect } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarState, setSidebarState] = useState({ isCollapsed: false, isMobileOpen: false });

  // Track if component is mounted to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Compute margin-left in px so it always lines up with the sidebar
  const marginLeftPx = mounted && viewportWidth >= 768 ? (sidebarState.isCollapsed ? 80 : 288) : 0;

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