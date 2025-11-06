import React, { useState } from 'react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { parseJobText } from '@/utils/jobTextParser';
import { JobFormData } from '@/types/job';

interface CreateFromTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<JobFormData>) => void;
}

export const CreateFromTextModal: React.FC<CreateFromTextModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateParsedData = (data: Partial<JobFormData>): string | null => {
    // Check for required fields
    if (!data.pickup_date) {
      return 'Pickup date is required';
    }
    
    if (!data.pickup_location) {
      return 'Pickup location is required';
    }
    
    if (!data.dropoff_location) {
      return 'Drop-off location is required';
    }
    
    if (!data.customer_name) {
      return 'Customer name is required';
    }
    
    return null;
  };

  const handleSubmit = () => {
    setError(null);
    
    const parseResult = parseJobText(rawText);
    
    if (parseResult.errors) {
      setError(parseResult.errors[0] || 'Failed to parse text');
      return;
    }
    
    if (parseResult.data) {
      // Validate required fields
      const validationError = validateParsedData(parseResult.data);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      onSubmit(parseResult.data);
      setRawText('');
    } else {
      setError('No data found in the parsed text');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background-light rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 relative">
        <button
          className="absolute top-4 right-4 text-text-secondary hover:text-text-main text-2xl"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold text-text-main mb-4">Create Job from Text</h2>
        <p className="text-text-secondary mb-4">Paste the booking details below to automatically parse and create a new job.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}
        
        <textarea
          className="w-full h-64 p-4 bg-background border border-border-color rounded-lg text-text-main resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Paste booking details here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 rounded bg-background-light border border-border-color text-text-main hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={onClose}
          >
            Cancel
          </button>
          <AnimatedButton 
            onClick={handleSubmit}
            disabled={!rawText.trim()}
            className="flex items-center"
          >
            Parse and Create Job
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};