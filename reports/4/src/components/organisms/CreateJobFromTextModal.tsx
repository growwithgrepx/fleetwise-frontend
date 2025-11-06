import React, { useState } from 'react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Textarea } from '@/components/atoms/Textarea';

interface CreateJobFromTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

export const CreateJobFromTextModal: React.FC<CreateJobFromTextModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    onSubmit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background-light border border-border-color rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 animate-fade-in" role="dialog" aria-modal="true">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-text-main">Create Job from Text</h2>
          <button
            className="text-text-secondary hover:text-text-main"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        <div className="mb-6">
          <label htmlFor="jobText" className="block text-sm font-medium text-text-main mb-2">
            Paste booking details
          </label>
          <Textarea
            id="jobText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste the booking details here..."
            rows={10}
            className="w-full"
          />
          <p className="text-xs text-text-secondary mt-2">
            Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to submit quickly
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <AnimatedButton
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            className="flex items-center"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              'Parse and Create Job'
            )}
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};