"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requestPasswordReset } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastAttempt, setLastAttempt] = useState(0);
  const [backoffTime, setBackoffTime] = useState(1000);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    const now = Date.now();
    if (now - lastAttempt < backoffTime) {
      const remainingTime = Math.ceil((backoffTime - (now - lastAttempt)) / 1000);
      setError(`Please wait ${remainingTime} seconds before trying again`);
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await requestPasswordReset(email);
      
      if ('error' in response) {
        // Check if it's a server-side error that shouldn't trigger rate limiting
        if (response.error.includes('Failed to send')) {
          // For server errors, provide clearer messaging
          setError('Unable to send password reset email at the moment. Please try again.');
        } else {
          // For client-related errors, show the error and apply rate limiting
          setError(response.error);
          // Increase backoff time on client-related errors, capped at 30 seconds
          setBackoffTime(Math.min(backoffTime * 2, 30000));
          setLastAttempt(now);
        }
      } else {
        setMessage(response.message);
        // Reset backoff time on success
        setBackoffTime(1000);
        setLastAttempt(now);
      }
    } catch (err) {
      setError('Unable to send password reset email at the moment. Please try again.');
      // Increase backoff time on network errors, capped at 30 seconds
      setBackoffTime(Math.min(backoffTime * 2, 30000));
      setLastAttempt(now);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black">
      <div className="bg-gray-900 shadow-2xl rounded-xl p-8 w-full max-w-md space-y-6 border border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-center text-blue-400 mb-2">Reset Your Password</h1>
          <p className="text-gray-400 text-sm mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        {message && (
          <div className="bg-green-900 text-green-200 px-4 py-3 rounded mb-4 text-center border border-green-700">
            {message}
          </div>
        )}
        
        {error && (
          <div className="bg-red-900 text-red-200 px-4 py-3 rounded mb-4 text-center border border-red-700">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="your.email@example.com"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded transition disabled:opacity-50"
          >
            {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="text-center text-xs text-gray-500 mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="mb-1 font-medium text-gray-400">Important:</p>
          <p>For security reasons, you can only request a password reset once every 15 minutes.</p>
    
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}