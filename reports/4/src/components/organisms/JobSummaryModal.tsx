import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/atoms/Button';

interface JobSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobSummary: string;
}

export default function JobSummaryModal({ isOpen, onClose, jobSummary }: JobSummaryModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      setCopyError(false);
    }
  }, [isOpen]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jobSummary);
      setIsCopied(true);
      setCopyError(false);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setIsCopied(false);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700 bg-gray-900">
          <h2 className="text-2xl font-bold text-white">Generated Job Summary</h2>
        </div>
        
        <div className="p-6 flex-grow overflow-auto">
          <textarea
            ref={textareaRef}
            readOnly
            value={jobSummary}
            className="w-full h-64 p-4 border border-gray-600 rounded-lg bg-gray-900 font-mono text-sm resize-none text-white"
          />
        </div>
        
        <div className="p-6 border-t border-gray-700 bg-gray-800 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white">
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCopyToClipboard}
            className="flex items-center bg-blue-600 hover:bg-blue-700"
          >
            {copyError ? (
              'Copy Failed - Try Again'
            ) : isCopied ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Copied!
              </>
            ) : (
              'Copy to Clipboard'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}