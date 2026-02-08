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
    <div className="flex flex-col gap-3 sm:gap-4 bg-background pt-3 sm:pt-4 pb-3 sm:pb-4 px-2 sm:px-0 rounded-t-lg sm:rounded-t-xl mt-2 sm:mt-4">
      <div className="sm:px-4">
        <h3 className="font-bold text-text-main mb-2 sm:mb-3 text-sm sm:text-base">Filter by customer</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2 max-h-[240px] overflow-y-auto">
          <button
            onClick={() => onChange('')}
            className={`px-2 py-2 sm:px-3 sm:py-3 rounded-lg text-xs sm:text-sm transition-all text-center flex flex-col items-center justify-center
              ${selectedCustomer === ''
                ? 'bg-primary text-white shadow-lg'
                : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
          >
            <span className="truncate w-full px-1 text-xs sm:text-sm font-medium">All</span>
            <span className="text-xs bg-white/20 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 mt-1">
              {customers.length > 0 ? Object.values(counts).reduce((a, b) => a + b, 0) : 0}
            </span>
          </button>
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onChange(customer.name)}
              title={customer.name}
              className={`px-2 py-2 sm:px-3 sm:py-3 rounded-lg text-xs sm:text-sm transition-all text-center flex flex-col items-center justify-center
                ${selectedCustomer === customer.name
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
            >
              <span className="truncate w-full px-1 text-xs sm:text-sm font-medium">{customer.name}</span>
              <span className="text-xs bg-white/20 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 mt-1">
                {counts[customer.name] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
