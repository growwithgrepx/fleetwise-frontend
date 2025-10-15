import React from 'react';

export interface ExtraService {
  description: string;
  price: number;
}

interface ExtraServicesListProps {
  value: ExtraService[];
  onChange: (value: ExtraService[]) => void;
  disabled?: boolean;
}

/*
Reusable list input for managing an array of extra services (description + price).
*/
export const ExtraServicesList: React.FC<ExtraServicesListProps> = ({ value, onChange, disabled = false }) => {
  // Ensure value is always an array
  const services = Array.isArray(value) ? value : [];
  
  const handleFieldChange = (index: number, field: keyof ExtraService, newVal: string) => {
    if (disabled) return;
    
    const updated = [...services];
    updated[index] = {
      ...updated[index],
      [field]: field === 'price' ? parseFloat(newVal) || 0 : newVal
    } as ExtraService;
    onChange(updated);
  };

  const addRow = () => {
    if (disabled) return;
    
    if (services.length < 1) {
      onChange([...services, { description: '', price: 0 }]);
    }
  };

  const removeRow = (index: number) => {
    if (disabled) return;
    
    const updated = services.filter((_, i) => i !== index);
    onChange(updated);
  };
  
  return (
    <div className="space-y-3">
      {services.map((svc, idx) => (
        <div key={idx} className="grid grid-cols-5 gap-2 items-center">
          <input
            type="text"
            value={svc.description}
            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
            placeholder="Service description"
            disabled={disabled}
            className="col-span-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <input
            type="number"
            value={svc.price || ''}
            onChange={(e) => handleFieldChange(idx, 'price', e.target.value)}
            placeholder="Price"
            disabled={disabled}
            className="col-span-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => removeRow(idx)}
            disabled={disabled}
            className="text-red-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={disabled || services.length >= 1}
        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Service
      </button>
    </div>
  );
};

export default ExtraServicesList;