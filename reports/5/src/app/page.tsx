"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';

export default function RootPage() {
  const { isLoggedIn, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoggedIn, isLoading, router]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-300">{isLoading ? 'Loading...' : 'Redirecting...'}</p>
      </div>
    </div>
  );
} 