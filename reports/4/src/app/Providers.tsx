"use client";

import React from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { UserProvider } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AddressCacheProvider } from '../context/AddressCacheContext';
import { CopiedJobProvider } from '../context/CopiedJobContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AddressCacheProvider>
          <UserProvider>
            <CopiedJobProvider>{children}</CopiedJobProvider>
          </UserProvider>
        </AddressCacheProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'bg-background-light text-text-main border border-border-color shadow-lg',
            style: { fontFamily: 'Inter, system-ui, sans-serif' },
            success: { className: 'bg-accent text-white' },
            error: { className: 'bg-red-600 text-white' },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}