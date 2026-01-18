"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';

export default function RootPage() {
  const { isLoggedIn, isLoading, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isLoggedIn && user) {
      // Extract role from user data
      const roles = user?.roles || [];
      const primaryRole = Array.isArray(roles) && roles.length > 0 
        ? typeof roles[0] === 'string' ? roles[0] : roles[0]?.name || roles[0]?.role || 'guest'
        : 'guest';
      
      console.log('Root page redirect - user:', user);
      console.log('Root page redirect - roles:', roles);
      console.log('Root page redirect - primaryRole:', primaryRole);
      
      if (primaryRole === 'admin') {
        router.replace('/dashboard');
      } else if (primaryRole === 'customer') {
        router.replace('/jobs/dashboard/customer');
      } else {
        router.replace('/jobs');
      }
    } else if (!isLoading && !isLoggedIn) {
      router.replace('/login');
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