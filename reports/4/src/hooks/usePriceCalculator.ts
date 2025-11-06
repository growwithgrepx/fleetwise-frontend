import { useEffect } from 'react';
import { UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { JobFormData } from '@/types/job';

interface UsePriceCalculatorProps {
  watch: UseFormWatch<JobFormData> | any;
  setValue: UseFormSetValue<JobFormData>;
}

export function usePriceCalculator({ watch, setValue }: UsePriceCalculatorProps) {
  const basePrice = watch('base_price');
  const baseDiscountPercent = watch('base_discount_percent');
  const agentDiscountPercent = watch('agent_discount_percent');
  const additionalDiscountPercent = watch('additional_discount_percent');
  const additionalCharges = watch('additional_charges');

  useEffect(() => {
    const calculateFinalPrice = () => {
      let price = basePrice;
      
      // Apply discounts
      const totalDiscountPercent = baseDiscountPercent + agentDiscountPercent + additionalDiscountPercent;
      const discountAmount = (price * totalDiscountPercent) / 100;
      price -= discountAmount;
      
      // Add additional charges
      price += additionalCharges;
      
      return Math.max(0, price);
    };

    setValue('final_price', calculateFinalPrice());
  }, [
    basePrice,
    baseDiscountPercent,
    agentDiscountPercent,
    additionalDiscountPercent,
    additionalCharges,
    setValue,
  ]);
}
