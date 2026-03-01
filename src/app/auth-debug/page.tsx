'use client';

import { useState } from 'react';
import { checkAuthStatus, testJobCreation, logSessionInfo } from '@/utils/authDebug';

export default function AuthDebugPage() {
  const [results, setResults] = useState<any[]>([]);
  
  const addResult = (result: any) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };
  
  const runAuthCheck = async () => {
    const result = await checkAuthStatus();
    addResult({ type: 'Auth Check', result });
  };
  
  const runJobTest = async () => {
    const result = await testJobCreation();
    addResult({ type: 'Job Test', result });
  };
  
  const runSessionLog = () => {
    logSessionInfo();
    addResult({ type: 'Session Log', result: 'Logged to console' });
  };
  
  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug Tool</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={runAuthCheck}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
          >
            Check Auth Status
          </button>
          
          <button
            onClick={runJobTest}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition"
          >
            Test Job Creation
          </button>
          
          <button
            onClick={runSessionLog}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
          >
            Log Session Info
          </button>
        </div>
        
        <button
          onClick={clearResults}
          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg mb-6 transition"
        >
          Clear Results
        </button>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="bg-gray-700 rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-blue-300">{result.type}</span>
                  <span className="text-sm text-gray-400">{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900 p-3 rounded">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
            ))}
            
            {results.length === 0 && (
              <div className="text-gray-400 text-center py-8">
                No debug results yet. Click the buttons above to run tests.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}