"use client";

import React, { useState, useCallback } from 'react';
import ReactPhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string, country: any) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onBlur,
  error,
  placeholder = "Enter mobile number",
  disabled = false,
  className = "",
  name
}) => {
  const [touched, setTouched] = useState(false);

  // Validate phone number in real-time
  const validatePhone = useCallback((phone: string, country: any) => {
    if (!phone || phone.length === 0) return null; // Empty is valid (optional field)
    
    // Must start with + and be at least 8 characters total
    if (!phone.startsWith('+') || phone.length < 8) {
      return 'Please enter a valid mobile number';
    }
    
    // Check for reasonable maximum length (15 digits is international standard)
    if (phone.length > 16) { // +15 digits = 16 characters max
      return 'Mobile number is too long';
    }
    
    return null; // Valid
  }, []);

  const handleChange = useCallback((phone: string, country: any) => {
    const formattedPhone = phone ? `+${phone}` : '';
    
    // Validate before calling onChange
    const error = validatePhone(formattedPhone, country);
    
    // Only call onChange if phone is valid or empty
    if (!error || formattedPhone === '') {
      onChange(formattedPhone, country);
    }
  }, [onChange, validatePhone]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  // Clean the value for the input (remove + prefix for the component)
  const cleanValue = value ? value.replace(/^\+/, '') : '';

  return (
    <div className={`space-y-1 ${className} w-full`}>
      <div className="relative w-full">
        <ReactPhoneInput
          country={'sg'} // Default to Singapore
          value={cleanValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          inputProps={{
            name: name,
            required: false,
            'aria-invalid': error ? 'true' : 'false',
            'aria-describedby': error ? `${name}-error` : undefined
          }}
          containerClass="phone-input-container w-full"
          inputClass={`phone-input-field ${error ? 'phone-input-error' : ''} w-full`}
          buttonClass="phone-input-button"
          dropdownClass="phone-input-dropdown"
          searchClass="phone-input-search"
          preferredCountries={['sg', 'my', 'id', 'th', 'ph', 'vn']}
          enableSearch={true}
          searchPlaceholder="Search country"
          disableSearchIcon={false}
        />
      </div>
      {error && touched && (
        <p id={`${name}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PhoneInput;