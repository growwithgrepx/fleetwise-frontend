import React from 'react';

interface Customer {
  id: number;
  name: string;
}

interface CustomerFilterButtonsProps {
  customers: Customer[];
  counts: Record<string, number>;
  selectedCustomer: string;
  onChange: (customerName: string) => void;
}

export const CustomerFilterButtons: React.FC<CustomerFilterButtonsProps> = ({
  customers,
  counts,
  selectedCustomer,
  onChange
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => onChange('')}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          selectedCustomer === ''
            ? 'bg-primary text-white'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }`}
      >
        All Customers
      </button>
      {customers.map((customer) => (
        <button
          key={customer.id}
          onClick={() => onChange(customer.name)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            selectedCustomer === customer.name
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {customer.name} ({counts[customer.name] || 0})
        </button>
      ))}
    </div>
  );
};
