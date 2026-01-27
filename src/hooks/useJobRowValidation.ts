import { useCallback, useState } from 'react';

export interface ValidationErrors {
  [key: string]: string;
}

export function useJobRowValidation() {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((field: string, value: any): boolean => {
    const errors: ValidationErrors = { ...validationErrors };

    switch (field) {
      case 'customer':
        if (!value) {
          errors.customer = 'Customer is required';
        } else {
          delete errors.customer;
        }
        break;
      case 'service':
        if (!value) {
          errors.service = 'Service is required';
        } else {
          delete errors.service;
        }
        break;
      case 'pickup_date':
        if (!value) {
          errors.pickup_date = 'Pickup date is required';
        } else {
          delete errors.pickup_date;
        }
        break;
      case 'pickup_time':
        if (!value) {
          errors.pickup_time = 'Pickup time is required';
        } else {
          delete errors.pickup_time;
        }
        break;
      case 'pickup_location':
        if (!value) {
          errors.pickup_location = 'Pickup location is required';
        } else {
          delete errors.pickup_location;
        }
        break;
      case 'dropoff_location':
        if (!value) {
          errors.dropoff_location = 'Dropoff location is required';
        } else {
          delete errors.dropoff_location;
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [validationErrors]);

  const clearErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    validationErrors,
    setValidationErrors,
    validateField,
    clearErrors
  };
}
