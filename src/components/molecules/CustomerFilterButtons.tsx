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
    <div className="flex flex-col gap-4 bg-background pt-4 pb-4 rounded-t-xl mt-4">
      <div className="px-4">
        <h3 className="font-bold text-text-main mb-3">Filter by customer</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
          <button
            onClick={() => onChange('')}
            className={`px-2 py-3 sm:px-3 sm:py-2 rounded-lg text-sm transition-all text-center flex flex-col items-center justify-center
              ${selectedCustomer === ''
                ? 'bg-primary text-white shadow-lg'
                : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
          >
            <span className="truncate w-full px-1">All Customers</span>
            <span className="text-xs bg-white/20 rounded-full px-2 py-1 mt-1">
              {customers.length > 0 ? Object.values(counts).reduce((a, b) => a + b, 0) : 0}
            </span>
          </button>
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onChange(customer.name)}
              className={`px-2 py-3 sm:px-3 sm:py-2 rounded-lg text-sm transition-all text-center flex flex-col items-center justify-center
                ${selectedCustomer === customer.name
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
            >
              <span className="truncate w-full px-1">{customer.name}</span>
              <span className="text-xs bg-white/20 rounded-full px-2 py-1 mt-1">
                {counts[customer.name] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
