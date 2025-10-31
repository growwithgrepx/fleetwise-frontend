import React, { useMemo, useRef, useState } from 'react';
import { useAddressLookup } from '@/hooks/useAddressLookup';

export interface Location {
  location: string;
  price: number;
}

interface DynamicLocationListProps {
  value: Location[];
  onChange: (value: Location[]) => void;
  maxRows: number;
  type: 'pickup' | 'dropoff';
  defaultPrice?: number; // New prop for custom default price
  disabled?: boolean; // New prop to disable the Add button
}

export const DynamicLocationList: React.FC<DynamicLocationListProps> = ({ 
  value, 
  onChange, 
  maxRows = 5,
  type,
  defaultPrice = 0,
  disabled = false
}) => {
  // Create a fixed number of hooks to comply with React hooks rules
  // Maximum of 5 hooks as per business requirements
  const hook1 = useAddressLookup();
  const hook2 = useAddressLookup();
  const hook3 = useAddressLookup();
  const hook4 = useAddressLookup();
  const hook5 = useAddressLookup();
  
  // Create stable array of hooks using useMemo
  const addressLookupHooks = useMemo(() => {
    const hooks = [hook1, hook2, hook3, hook4, hook5];
    return hooks.slice(0, Math.min(maxRows, 5)); // Ensure we don't exceed our hook count
  }, [hook1, hook2, hook3, hook4, hook5, maxRows]);
  
  // Track user input timestamps to prevent stale data overwrites
  const userInputTimestamps = useRef<{ [key: number]: number }>({});

  // State for validation errors
  const [errors, setErrors] = useState<{[key: number]: string}>({});

  // Helper function to format address display_name
  const formatAddress = (displayName: string): string => {
    // Check if the display_name starts with a postal code (4-8 digits followed by comma)
    const postalCodeMatch = displayName.match(/^(\d{4,8}),\s*(.+)$/);
    if (postalCodeMatch) {
      const postalCode = postalCodeMatch[1];
      const restOfAddress = postalCodeMatch[2];
      return `${restOfAddress} ${postalCode}`;
    }
    return displayName;
  };

  // Handle address lookup results with race condition protection
  React.useEffect(() => {
    addressLookupHooks.forEach((hook, index) => {
      if (hook?.result && hook.result.display_name && index < value.length) {
        // Check if user hasn't modified the field since lookup started
        const currentValue = value[index]?.location || '';
        const userTimestamp = userInputTimestamps.current[index] || 0;
        const lookupTimestamp = hook.lastLookupTimestamp || 0;
        
        // Only update if:
        // 1. The field still contains a postal code (user hasn't typed over it)
        // 2. The lookup is newer than the last user input
        // But allow updates if the field is empty (newly added row)
        if ((/^\d{4,8}$/.test(currentValue.trim()) && lookupTimestamp > userTimestamp) || currentValue.trim() === '') {
          try {
            const formattedAddress = formatAddress(hook.result.display_name);
            console.log(`[DynamicLocationList] Setting ${type} location ${index + 1} to:`, formattedAddress);
            handleChange(index, 'location', formattedAddress);
          } catch (error) {
            console.error(`[DynamicLocationList] Error formatting address for ${type} location ${index + 1}:`, error);
          }
        } else {
          console.log(`[DynamicLocationList] Skipping update for ${type} location ${index + 1} - user has modified field or lookup is stale`);
        }
      }
    });
  }, [
    // Using JSON.stringify for stable comparisons of complex objects
    JSON.stringify(addressLookupHooks.map(hook => ({
      displayName: hook?.result?.display_name || '',
      timestamp: hook?.lastLookupTimestamp || 0
    }))),
    type,
    JSON.stringify(value.map(v => v.location))
    // Note: handleChange and addressLookupHooks are stable and excluded
  ]);

  const handleAdd = () => {
    if (value.length < maxRows) {
      onChange([...value, { location: '', price: defaultPrice }]); // Use defaultPrice prop
    }
  };

  const handleRemove = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    // Also remove error for this index
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
    onChange(updated);
  };

  const handleChange = (index: number, field: keyof Location, newValue: string | number) => {
    try {
      if (field === 'price') {
        // Handle string values (from input fields)
        let priceValue: number;
        if (typeof newValue === 'string') {
          // If empty string, treat as 0
          if (newValue === '') {
            priceValue = 0;
          } else {
            // Convert to number, if invalid then treat as 0
            const parsed = parseFloat(newValue);
            priceValue = isNaN(parsed) ? 0 : parsed;
          }
        } else {
          // Already a number
          priceValue = newValue;
        }
        
        // Validate price range
        if (priceValue < 0) {
          setErrors(prev => ({
            ...prev,
            [index]: "Value cannot be negative"
          }));
        } else if (priceValue > 10000) {
          setErrors(prev => ({
            ...prev,
            [index]: "Price cannot exceed 10,000"
          }));
        } else {
          // Clear error if valid (including 0)
          const newErrors = { ...errors };
          delete newErrors[index];
          setErrors(newErrors);
        }
        
        // Update the value with the parsed number
        const updated = [...value];
        updated[index] = {
          ...updated[index],
          price: priceValue
        };
        
        onChange(updated);
      } else if (field === 'location') {
        // Handle location field
        const updated = [...value];
        updated[index] = {
          ...updated[index],
          location: newValue as string
        };
        
        // Track user input timestamp for location changes
        userInputTimestamps.current[index] = Date.now();
        
        onChange(updated);
      }
    } catch (error) {
      console.error(`[DynamicLocationList] Error updating ${field} for ${type} location ${index + 1}:`, error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-300">
          Additional {type === 'pickup' ? 'Pickup' : 'Drop-off'} Locations ({value.length}/{maxRows})
        </h3>
      </div>

      {value.map((loc, index) => (
        <div key={index} className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-8">
            <div className="relative">
              <input
                type="text"
                value={loc.location}
                onChange={(e) => {
                  try {
                    handleChange(index, 'location', e.target.value);
                  } catch (error) {
                    console.error(`[DynamicLocationList] Error in location onChange for ${type} location ${index + 1}:`, error);
                  }
                }}
                onBlur={(e) => {
                  try {
                    const value = e.target.value.trim();
                    console.log(`[DynamicLocationList] ${type} location ${index + 1} onBlur triggered with value:`, value);
                    // Improved postal code validation - only 4-8 digits
                    if (/^\d{4,8}$/.test(value)) {
                      console.log(`[DynamicLocationList] ${type} location ${index + 1} postal code pattern matched, calling lookup:`, value);
                      // Safe hook access with bounds checking
                      const hook = addressLookupHooks[index];
                      if (hook && typeof hook.lookup === 'function') {
                        hook.lookup(value);
                      } else {
                        console.warn(`[DynamicLocationList] Hook not available for index ${index}`);
                      }
                    } else {
                      console.log(`[DynamicLocationList] ${type} location ${index + 1} value does not match postal code pattern (4-8 digits):`, value);
                    }
                  } catch (error) {
                    console.error(`[DynamicLocationList] Error in onBlur handler for ${type} location ${index + 1}:`, error);
                  }
                }}
                placeholder={`Enter ${type} location ${index + 1} or postal code`}
                maxLength={256}
                disabled={disabled}
                className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors${disabled ? ' bg-gray-600 cursor-not-allowed' : ''}`}
              />
              {(() => {
                const hook = addressLookupHooks[index];
                return hook?.loading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                );
              })()}
            </div>
            {(() => {
              const hook = addressLookupHooks[index];
              return hook?.error && (
                <p className="text-xs text-yellow-400 mt-1">{hook.error}</p>
              );
            })()}
          </div>
          <div className="col-span-3">
            <div className="flex items-center space-x-1">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                value={loc.price}
                onChange={(e) => handleChange(index, 'price', e.target.value)}
                onKeyPress={(e) => {
                  // Allow only digits, decimal point, and control keys
                  const char = String.fromCharCode(e.which);
                  const isControlKey = e.ctrlKey || e.metaKey;
                  const isBackspaceOrDelete = e.key === 'Backspace' || e.key === 'Delete';
                  const isArrowKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
                  if (!isControlKey && !isBackspaceOrDelete && !isArrowKey) {
                    if (!/[\d.]/.test(char)) {
                      e.preventDefault();
                    }
                    // Prevent multiple decimal points
                    const target = e.target as HTMLInputElement;
                    if (char === '.' && target.value.includes('.')) {
                      e.preventDefault();
                    }
                  }
                }}
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={disabled}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors[index] ? 'border-red-500' : 'border-gray-600'
                }${disabled ? ' bg-gray-600 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors[index] && (
              <p className="text-xs text-red-400 mt-1">{errors[index]}</p>
            )}
          </div>
          <div className="col-span-1">
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-red-400 hover:text-red-500 p-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      {value.length < maxRows && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className={`mt-2 px-4 py-2 rounded-lg text-sm ${
            disabled 
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          + Add {type === 'pickup' ? 'Pickup' : 'Drop-off'} Location
        </button>
      )}
    </div>
  );
};

export default DynamicLocationList;