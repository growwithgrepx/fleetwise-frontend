import React from 'react';

interface HighlightedCellProps {
  text: string | number | undefined | null;
  searchTerm: string;
}

export const HighlightedCell: React.FC<HighlightedCellProps> = ({ text, searchTerm }) => {
  if (!text || !searchTerm) return <>{text?.toString() || ''}</>;

  const strText = text.toString();
  // Escape regex special characters to prevent invalid regex errors
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  const parts = strText.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Create a fresh regex for each test to avoid state mutation issues
        const testRegex = new RegExp(escapedTerm, 'i');
        return testRegex.test(part) ? 
          <span key={index} className="bg-yellow-200 font-semibold">{part}</span> : 
          <span key={index}>{part}</span>;
      })}
    </>
  );
};
