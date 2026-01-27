"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { getUserRole } from '@/utils/roleUtils';

export default function RootPage() {
  const { isLoggedIn, isLoading, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        const userRole = getUserRole(user);
        
        if (userRole === 'admin') {
          router.replace('/dashboard');
        } else if (userRole === 'customer') {
          router.replace('/jobs/dashboard/customer');
        } else if (userRole === 'manager') {
          router.replace('/dashboard');
        } else if (userRole === 'accountant') {
          router.replace('/jobs');
        } else {
          router.replace('/jobs');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isLoggedIn, isLoading, user, router]);

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