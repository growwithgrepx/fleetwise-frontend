"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';

export default function RootPage() {
  const { isLoggedIn, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      // Determine user role and redirect appropriately
      const fetchUserRole = async () => {
        try {
          const userData = await fetch('/api/auth/me', { credentials: 'include' }).then(res => res.json());
          const roles = userData.response?.user?.roles || [];
          const primaryRole = Array.isArray(roles) && roles.length > 0 
            ? typeof roles[0] === 'string' ? roles[0] : roles[0]?.name || roles[0]?.role || 'guest'
            : 'guest';
          
          if (primaryRole === 'admin') {
            router.replace('/dashboard');
          } else if (primaryRole === 'customer') {
            router.replace('/jobs/dashboard/customer');
          } else {
            router.replace('/jobs');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          router.replace('/login');
        }
      };
      
      fetchUserRole();
    } else if (!isLoading && !isLoggedIn) {
      router.replace('/login');
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