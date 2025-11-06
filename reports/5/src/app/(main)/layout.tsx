"use client";
import React from 'react';
import MainNavigation from '@/components/organisms/MainNavigation';
import AuthGuard from '@/components/common/AuthGuard';
import ChatWindow from '@/components/chat/ChatWindow';
import { useState } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarState, setSidebarState] = useState({ isCollapsed: false, isMobileOpen: false });
  const sidebarWidth = sidebarState.isCollapsed ? 80 : 256; // px (w-20 or w-64);
  
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <MainNavigation onSidebarStateChange={setSidebarState} />
        <main
          className="flex-1 min-w-0 w-full py-4 transition-all duration-300"
          style={{
            marginLeft: sidebarState.isMobileOpen
              ? sidebarWidth
              : sidebarState.isCollapsed
              ? 80
              : 256
          }}
        >
          {children}
        </main>
      </div>
      <ChatWindow />
    </AuthGuard>
  );
}