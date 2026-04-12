import React, { useState, useRef, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface HighlightedCellProps {
  text: string | number | undefined | null;
  searchTerm: string;
  maxWidth?: string;
}

export const HighlightedCell: React.FC<HighlightedCellProps> = ({ 
  text, 
  searchTerm,
  maxWidth = '150px'
}) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const strText = text?.toString() || '';

  useEffect(() => {
    // Check if text is actually truncated
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollWidth > textRef.current.clientWidth
      );
    }
  }, [strText]);

  // Escape regex special characters to prevent invalid regex errors
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const highlightText = () => {
    if (!searchTerm) return strText;
    
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = strText.split(regex);
    
    return parts.map((part, index) => {
      const testRegex = new RegExp(escapedTerm, 'i');
      return testRegex.test(part) ? 
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span> : 
        <span key={index}>{part}</span>;
    });
  };

  // If not truncated, just render the text without tooltip
  if (!isTruncated) {
    return (
      <div
        ref={textRef}
        className="whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ maxWidth }}
      >
        {highlightText()}
      </div>
    );
  }

  // If truncated, wrap with Radix Tooltip
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            ref={textRef}
            className="whitespace-nowrap overflow-hidden text-ellipsis cursor-default"
            style={{ maxWidth }}
          >
            {highlightText()}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700 animate-fade-in"
            side="top"
            sideOffset={8}
            avoidCollisions
            collisionPadding={8}
            style={{
              maxWidth: '300px',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {strText}
            <Tooltip.Arrow className="fill-gray-900" width={12} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
