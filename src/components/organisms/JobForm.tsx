"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSubCustomers } from '@/hooks/useSubCustomers';
import DynamicLocationList from '@/components/molecules/DynamicLocationList';
import ExtraServicesList from '@/components/molecules/ExtraServicesList';
import { Job, JobFormData, JobStatus, Location } from '@/types/job';
import { useGetCustomerById } from '@/hooks/useCustomers';
import { useGetAllVehicles } from '@/hooks/useVehicles';
import { useGetAllDrivers } from '@/hooks/useDrivers';
import { useGetAllCustomers } from '@/hooks/useCustomers';
import { useGetAllServices } from '@/hooks/useServices';
import { useGetAllVehicleTypes } from '@/hooks/useVehicleTypes';
import { useGetAllContractors } from '@/hooks/useContractors';
import { useContractorServicePricing } from '@/hooks/useContractorServicePricing';
import toast from 'react-hot-toast';
import { QuickAddModal } from '@/components/molecules/QuickAddModal';
import { QuickAddButton } from '@/components/atoms/QuickAddButton';
import { useCustomerServicePricing } from '@/hooks/useCustomerServicePricing';
import { 
  customerQuickAddSchema,
  serviceQuickAddSchema, 
  vehicleQuickAddSchema, 
  driverQuickAddSchema 
} from '@/lib/quickAddSchemas';
import { createCustomer } from '@/services/api/customersApi';
import { createService } from '@/services/api';
import { createVehicle } from '@/services/api';
import { createDriver } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAddressLookup } from '@/hooks/useAddressLookup';
import PhoneInput from '@/components/molecules/PhoneInput';

import { 
  createJob, 
  updateJob, 
  getJobById,
  checkDriverConflict
} from '@/services/api/jobsApi';

import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';

// Utility to get browser country code
function getBrowserCountryCode() {
  const locale = navigator.language || 'en-US';
  // Extract country code from locale (e.g., 'en-US' -> 'us')
  const parts = locale.split('-');
  return parts.length > 1 ? parts[1].toLowerCase() : 'us';
}

// Default job values
const defaultJobValues: JobFormData = {
  // Customer Information
  customer_name: '',
  customer_mobile: '',
  customer_email: null,
  customer_reference: '',
  
  // Passenger Information
  passenger_name: '',
  passenger_mobile: '',
  passenger_email: null,
  
  // Service Details
  service_id: 0,
  service_type: '',
  type_of_service: '',
  
  // Dates and Times
  pickup_date: '',
  pickup_time: '',
  
  // Locations
  pickup_location: '',
  dropoff_location: '',
  
  // Additional Pickup Locations
  pickup_loc1: '',
  pickup_loc2: '',
  pickup_loc3: '',
  pickup_loc4: '',
  pickup_loc5: '',
  pickup_loc1_price: 0,
  pickup_loc2_price: 0,
  pickup_loc3_price: 0,
  pickup_loc4_price: 0,
  pickup_loc5_price: 0,
  
  // Additional Dropoff Locations
  dropoff_loc1: '',
  dropoff_loc2: '',
  dropoff_loc3: '',
  dropoff_loc4: '',
  dropoff_loc5: '',
  dropoff_loc1_price: 0,
  dropoff_loc2_price: 0,
  dropoff_loc3_price: 0,
  dropoff_loc4_price: 0,
  dropoff_loc5_price: 0,
  
  // Vehicle & Driver Information
  vehicle_id: 0,
  vehicle_type: '',
  vehicle_number: '',
  driver_id: 0,
  driver_contact: '',
  
  // Status and Payment
  status: 'new' as JobStatus,
  payment_mode: 'cash',
  
  // Billing Information
  base_price: 0,
  additional_discount: 0,
  extra_charges: 0,
  final_price: 0,
  base_discount_percent: 0,
  customer_discount_percent: 0,
  additional_discount_percent: 0,
  
  // Invoice Information
  invoice_id: null,
  invoice_number: '',
  
  // Extra Services
  extra_services: [],
  
  // Additional Fields
  sub_customer_name: '',
  message: '',
  remarks: '',
  has_additional_stop: false,
  additional_stops: '',
  locations: [],
  reference: '',
  has_request: false,
  
  // Midnight surcharge field - Set default to 0
  midnight_surcharge: 0,
  
  // Cash to collect from passenger
  cash_to_collect: 0,
  
  // Contractor field - Set default to AG contractor
  contractor_id: undefined,

  // Vehicle type id field
  vehicle_type_id: undefined,
};

// Helper function to parse time string to minutes for more reliable parsing
const parseTimeToMinutes = (timeStr: string): number | null => {
  try {
    // Use Date object for more reliable parsing
    const date = new Date(`2000-01-01 ${timeStr}`);
    if (isNaN(date.getTime())) return null;
    return date.getHours() * 60 + date.getMinutes();
  } catch {
    return null;
  }
};

// Helper function to determine if a specific field should be locked based on job status
const shouldLockField = (status: JobStatus, field: string): boolean => {
  // In these statuses, only allow editing of specific fields
  if (["otw", "ots", "pob"].includes(status)) {
    const editableFields = [
      "passenger_name",
      "passenger_mobile",
      "driver_id",
      "vehicle_id",
      "contractor_id"
    ];
    return !editableFields.includes(field);
  }
  // In these statuses, lock all fields
  const lockedStatuses: JobStatus[] = ["jc", "sd", "canceled"];
  return lockedStatuses.includes(status);
};

// Helper function to calculate midnight surcharge based on pickup time
const calculateMidnightSurcharge = (customerServicePricing: any, pickupTime: string): number => {
  // Default surcharge value is 15 when in midnight period
  const surchargeValue = customerServicePricing?.midnight_surcharge || 15;
  
  // If no pickup time, return 0 (no surcharge)
  if (!pickupTime) {
    return 0;
  }

  try {
    // Parse time using the robust parser
    const totalMinutes = parseTimeToMinutes(pickupTime);
    
    if (totalMinutes === null) {
      throw new Error('Invalid time format');
    }
    
    // Midnight period: 23:00 (1380 minutes) to 06:59 (419 minutes)
    // This crosses midnight, so we need to check:
    // 1. From 23:00 to 23:59 (1380-1439 minutes)
    // 2. From 00:00 to 06:59 (0-419 minutes)
    const isMidnightPeriod = (totalMinutes >= 1380 && totalMinutes <= 1439) || // 23:00-23:59
                            (totalMinutes >= 0 && totalMinutes <= 419);      // 00:00-06:59
    
    // Apply surcharge of 15 only during midnight period
    return isMidnightPeriod ? surchargeValue : 0;
  } catch (e) {
    console.warn('Error parsing pickup time for midnight surcharge calculation:', e);
    // If we can't parse the time, don't apply surcharge
    return 0;
  }
};

export interface JobFormProps {
  job?: Job;
  initialData?: Partial<JobFormData>;
  onSave: (job: JobFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (jobId: string | number) => Promise<void>;
  isLoading?: boolean;
}

const JobForm: React.FC<JobFormProps> = (props) => {
  const { job, initialData, onSave, onCancel, onDelete, isLoading = false } = props;

  // Debug: log initialData provided to the form (copied job context)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[JobForm] initialData from context:', {
      customer_id: (initialData as any)?.customer_id,
      service_type: (initialData as any)?.service_type,
      vehicle_type: (initialData as any)?.vehicle_type,
      vehicle_type_id: (initialData as any)?.vehicle_type_id,
    });
  }, [initialData]);
  
  // Determine if fields should be locked based on job status
  // Helper to check if a field should be locked
  const isFieldLocked = (field: string) => job ? shouldLockField(job.status, field) : false;
  // For legacy code, fieldsLocked is true if any lockable status
  const fieldsLocked = job && ["jc", "sd", "canceled", "otw", "ots", "pob"].includes(job.status);

  // Multiple address lookup hooks for different fields
  // Refs to track previous values
  const prevCustomerIdRef = useRef<number>(0);
  const prevServiceTypeRef = useRef<string>('');
  const prevVehicleTypeRef = useRef<string>('');
  const isCheckingConflict = useRef(false);

  // Address lookup hooks
  const { lookup: pickupLookup, result: pickupAddressResult, loading: pickupAddressLoading, error: pickupAddressError } = useAddressLookup();

  // When job prop changes (edit mode), update formData and reset userModifiedPricing to trigger pricing effect
  useEffect(() => {
    if (job) {
      // Use vehicle_type_id to find the correct vehicle type name from allVehicleTypes
      let vehicleTypeName = '';
      if (job.vehicle_type_id && Array.isArray(allVehicleTypes)) {
        const vt = allVehicleTypes.find(vt => vt.id === job.vehicle_type_id);
        if (vt) vehicleTypeName = vt.name;
      }
      // Fallbacks if not found
      if (!vehicleTypeName) {
        const vt = job.vehicle_type;
        if (vt != null && typeof vt === 'object' && 'name' in (vt as any) && typeof (vt as any).name === 'string') {
          vehicleTypeName = (vt as any).name;
        } else if (typeof vt === 'string') {
          vehicleTypeName = vt;
        } else {
          vehicleTypeName = '';
        }
      }
      setFormData(prev => ({
        ...prev,
        customer_id: job.customer_id || prev.customer_id,
        sub_customer_name: job.sub_customer_name || prev.sub_customer_name,
        service_type: job.service_type || prev.service_type,
        vehicle_type: vehicleTypeName,
      }));
  setUserModifiedPricing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  // Safeguard: ensure vehicle_type is always a string on mount (catches copied object shapes)
  useEffect(() => {
    setFormData(prev => {
      if (prev.vehicle_type && typeof prev.vehicle_type !== 'string') {
        const vt = prev.vehicle_type as any;
        return {
          ...prev,
          vehicle_type: vt && (vt.name || vt.label || vt.value) ? (vt.name || vt.label || vt.value) : String(vt)
        };
      }
      return prev;
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { lookup: dropoffLookup, result: dropoffAddressResult, loading: dropoffAddressLoading, error: dropoffAddressError } = useAddressLookup();
  
  const router = useRouter();
  const { subCustomers } = useSubCustomers(job?.customer_id ?? 0);
  const { data: customer } = useGetCustomerById(job?.customer_id ?? "");
  const { data: allVehicles = [] } = useGetAllVehicles();
  const { data: allDrivers = [] } = useGetAllDrivers();
  const { data: allCustomers = [] } = useGetAllCustomers();
  const { data: allServices = [] } = useGetAllServices();
  const { data: allVehicleTypes = [] } = useGetAllVehicleTypes();
  const { data: allContractors = [] } = useGetAllContractors();
  
  
  // State
  // Normalize incoming initialData.vehicle_type to string if provided as object
  const normalizedInitialData = { ...initialData } as Partial<JobFormData>;
  if (normalizedInitialData && (normalizedInitialData as any).vehicle_type && typeof (normalizedInitialData as any).vehicle_type !== 'string') {
    const vt = (normalizedInitialData as any).vehicle_type;
    normalizedInitialData.vehicle_type = vt && (vt.name || vt.label || vt.value) ? (vt.name || vt.label || vt.value) : String(vt);
  }

  const [formData, setFormData] = useState<JobFormData>({ ...defaultJobValues, ...normalizedInitialData });
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'conflict'>('idle');
  const [driverConflictWarning, setDriverConflictWarning] = useState<string>('');
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean; type: 'customer' | 'service' | 'vehicle' | 'driver' | null }>({ isOpen: false, type: null });
  const [uiAdditionalPickupLocations, setUiAdditionalPickupLocations] = useState<Location[]>([]);
  const [uiAdditionalDropoffLocations, setUiAdditionalDropoffLocations] = useState<Location[]>([]);
  const [userModifiedPricing, setUserModifiedPricing] = useState<boolean>(false);
  const [initialFormData, setInitialFormData] = useState<Partial<JobFormData> | null>(null);

   // Get current date and time for defaults
   const getCurrentDateTime = () => {
     const now = new Date();
     const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format
     const time = now.toTimeString().slice(0, 5); // HH:MM format
     return { date, time };
   };

  // Reset userModifiedPricing flag when service_type or vehicle_type changes
  useEffect(() => {
    // Check if service_type or vehicle_type has actually changed
    if (
      (formData.customer_id && formData.customer_id !== prevCustomerIdRef.current) ||
      (formData.service_type && formData.service_type !== prevServiceTypeRef.current) ||
      (formData.vehicle_type && formData.vehicle_type !== prevVehicleTypeRef.current)
    ) {
      // Reset the userModifiedPricing flag to allow automatic pricing updates
      setUserModifiedPricing(false);
        // Optional: Log the change for debugging
      console.log('[Pricing Reset] Field changed - resetting userModifiedPricing flag', {
      customer: { old: prevCustomerIdRef.current, new: formData.customer_id },
      service: { old: prevServiceTypeRef.current, new: formData.service_type },
      vehicle: { old: prevVehicleTypeRef.current, new: formData.vehicle_type }
    });
    }

    // Update the refs with current values
    prevCustomerIdRef.current = formData.customer_id || 0;
    prevServiceTypeRef.current = formData.service_type || '';
    prevVehicleTypeRef.current = formData.vehicle_type || '';
  }, [formData.customer_id, formData.service_type, formData.vehicle_type]); // Fixed dependencies to only include the specific fields we're checking
  

  // Only call pricing API when vehicle type changes, not on service change
  // const [pricingServiceType, setPricingServiceType] = useState<string>(formData.service_type);
  // Update pricingServiceType only when vehicle_type changes, and only if different
  // useEffect(() => {
  //   if (pricingServiceType !== formData.service_type) {
  //     setPricingServiceType(formData.service_type);
  //   }
  // }, [formData.vehicle_type]);

  const { data: customerServicePricing } = useCustomerServicePricing(
    formData.customer_id ?? 0,
    formData.service_type,
    formData.vehicle_type
  );

  // Contractor pricing (move after formData is initialized)
  const { data: contractorPricing = [], refetch: refetchPricing } = useContractorServicePricing(
    formData.contractor_id as number | undefined
  );

  // Function to determine job status based on form data
  const determineJobStatus = (data: JobFormData): JobStatus => {
    // If current status is not a basic state, don't change it
    const currentStatus = data.status as JobStatus;
    if (currentStatus && !['new', 'pending', 'confirmed'].includes(currentStatus)) {
      return currentStatus;
    }

    // Check if all mandatory fields are populated using proper type checking
    const mandatoryFieldsComplete = Boolean(
      // Convert customer_id to number and check if greater than 0
      Number(data.customer_id) > 0 && 
      // Check string fields with optional chaining and trim
      data.passenger_name?.trim() && 
      data.service_type?.trim() && 
      data.pickup_date && 
      data.pickup_time && 
      data.pickup_location?.trim() && 
      data.dropoff_location?.trim()
    );

    // Check if both vehicle and driver are selected using proper number comparison
    const vehicleAndDriverSelected = Boolean(
      // Convert to number and check if greater than 0
      Number(data.vehicle_id) > 0 &&
      Number(data.driver_id) > 0 &&
      Number(data.contractor_id) > 0
    );

    if (mandatoryFieldsComplete && vehicleAndDriverSelected) {
      return 'confirmed';
    } else if (mandatoryFieldsComplete) {
      return 'pending';
    } else {
      return 'new';
    }
  };

  // Initialize form data with job data if editing
  useEffect(() => {
    if (job) {
      const jobData: JobFormData = {
        // Customer Information
        customer_id: job.customer_id,
        customer_name: job.customer_name || '',
        customer_mobile: job.customer_mobile || '',
        customer_email: undefined, // Fix: customer_email doesn't exist on Job
        customer_reference: '',

        // Passenger Information
        passenger_name: job.passenger_name || '',
        passenger_mobile: job.passenger_mobile || '',
        passenger_email: job.passenger_email || null,

        // Service Details
        service_id: job.service_id || 0,
        service_type: job.service_type || '',
        type_of_service: job.service_type || '',

        // Dates and Times
        pickup_date: job.pickup_date || '',
        pickup_time: job.pickup_time || '',

        // Locations
        pickup_location: job.pickup_location || '',
        dropoff_location: job.dropoff_location || '',

        // Additional Pickup Locations
        pickup_loc1: job.pickup_loc1 || '',
        pickup_loc2: job.pickup_loc2 || '',
        pickup_loc3: job.pickup_loc3 || '',
        pickup_loc4: job.pickup_loc4 || '',
        pickup_loc5: job.pickup_loc5 || '',
        pickup_loc1_price: job.pickup_loc1_price || 0,
        pickup_loc2_price: job.pickup_loc2_price || 0,
        pickup_loc3_price: job.pickup_loc3_price || 0,
        pickup_loc4_price: job.pickup_loc4_price || 0,
        pickup_loc5_price: job.pickup_loc5_price || 0,

        // Additional Dropoff Locations
        dropoff_loc1: job.dropoff_loc1 || '',
        dropoff_loc2: job.dropoff_loc2 || '',
        dropoff_loc3: job.dropoff_loc3 || '',
        dropoff_loc4: job.dropoff_loc4 || '',
        dropoff_loc5: job.dropoff_loc5 || '',
        dropoff_loc1_price: job.dropoff_loc1_price || 0,
        dropoff_loc2_price: job.dropoff_loc2_price || 0,
        dropoff_loc3_price: job.dropoff_loc3_price || 0,
        dropoff_loc4_price: job.dropoff_loc4_price || 0,
        dropoff_loc5_price: job.dropoff_loc5_price || 0,

        // Vehicle & Driver Information
        vehicle_id: job.vehicle_id || 0,
        vehicle_type:
          (() => {
            const vt = job.vehicle_type;
            if (vt != null && typeof vt === 'object' && 'name' in (vt as any) && typeof (vt as any).name === 'string') {
              return (vt as any).name;
            } else if (typeof vt === 'string') {
              return vt;
            } else {
              return '';
            }
          })(),
        vehicle_number: '',
        driver_id: job.driver_id || 0,
        driver_contact: '',

        // Status and Payment
        status: job.status || "new",
        payment_mode: "cash",

        // Billing Information
        base_price: job.base_price || 0,
        additional_discount: job.additional_discount || 0,
        extra_charges: job.extra_charges || 0,
        final_price: job.final_price || 0,

        // Additional pricing fields
        base_discount_percent: job.base_discount_percent || 0,
        customer_discount_percent: job.customer_discount_percent || 0,
        additional_discount_percent: job.additional_discount_percent || 0,
        // Invoice Information
        invoice_id: job.invoice_id || null,
        invoice_number: job.invoice_number || '',

        // Extra Services
        extra_services: job.extra_services || [],

        // Additional Fields
        sub_customer_name: job.sub_customer_name || '',
        message: '',
        remarks: job.customer_remark || '', // Map customer_remark to remarks
        has_additional_stop: false,
        additional_stops: '',
        locations: [],
        reference: '',
        has_request: false,
        midnight_surcharge: job.midnight_surcharge !== undefined ? job.midnight_surcharge : 0,
        contractor_id: job.contractor_id, // This field now exists
        cash_to_collect: job.cash_to_collect !== undefined ? job.cash_to_collect : 0, // Add cash_to_collect field
      };

      // Only update if the job data has actually changed
      const currentFormDataString = JSON.stringify(formData);
      const newFormDataString = JSON.stringify(jobData);

      if (currentFormDataString !== newFormDataString) {
        setFormData(jobData);
        // Track initial form data for pricing comparison
        setInitialFormData({
          pickup_time: jobData.pickup_time,
          service_type: jobData.service_type,
          vehicle_type: jobData.vehicle_type,
          customer_id: jobData.customer_id,
          base_price: jobData.base_price,
          midnight_surcharge: jobData.midnight_surcharge
        });
      }
    } else {
      // Set default values for new job
      const { date, time } = getCurrentDateTime();
      
      // Create initial form data with default values
      // Normalize any vehicle_type from initialData before merging
      const normalizedInit = { ...initialData } as Partial<JobFormData>;
      if (normalizedInit && (normalizedInit as any).vehicle_type && typeof (normalizedInit as any).vehicle_type !== 'string') {
        const vt = (normalizedInit as any).vehicle_type;
        normalizedInit.vehicle_type = vt && (vt.name || vt.label || vt.value) ? (vt.name || vt.label || vt.value) : String(vt);
      }

      const initialFormData = {
        ...defaultJobValues,
        pickup_date: date,
        pickup_time: time,
        contractor_id: undefined,
        ...normalizedInit
      };
      
      // Determine initial status
      const initialStatus = determineJobStatus(initialFormData);
      
      // Only update if the initial form data has actually changed
      const currentFormDataString = JSON.stringify(formData);
      const newFormDataString = JSON.stringify({ ...initialFormData, status: initialStatus });
      
      if (currentFormDataString !== newFormDataString) {
        setFormData({ ...initialFormData, status: initialStatus });
      }
    }
  }, [job, initialData]); // Fixed dependencies to properly respond to job data changes
  // Helper function to safely convert values to numbers  
  const safeNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Add useEffect to check for driver conflicts
  useEffect(() => {
    const checkDriverConflictWarning = async () => {
      // Only check if we have a driver, date, and time selected
      if (formData.driver_id && formData.pickup_date && formData.pickup_time) {
        console.log('Checking for driver conflict:', {
          driver_id: formData.driver_id,
          pickup_date: formData.pickup_date,
          pickup_time: formData.pickup_time,
          job_id: job?.id
        });
        
        try {
          const conflictData = {
            driver_id: formData.driver_id,
            pickup_date: formData.pickup_date,
            pickup_time: formData.pickup_time,
            job_id: job?.id // Pass job ID for updates to exclude current job
          };
          
          const response = await checkDriverConflict(conflictData);
          console.log('Driver conflict check response:', response);
          
          if (response.conflict) {
            setDriverConflictWarning(response.message);
          } else {
            setDriverConflictWarning(null);
          }
        } catch (error) {
          console.error('Error checking driver conflict:', error);
          setDriverConflictWarning(null);
        }
      } else {
        setDriverConflictWarning(null);
      }
    };

    // Add a small delay to avoid too many API calls while user is typing
    const timeoutId = setTimeout(() => {
      checkDriverConflictWarning();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.driver_id, formData.pickup_date, formData.pickup_time, job?.id]);
  // Base price, additional discount, extra charges, penalty
  const basePrice = safeNumber(formData.base_price);
  const additionalDiscount = safeNumber(formData.additional_discount);
  const midnightSurcharge = safeNumber(formData.midnight_surcharge);
  const extraServicesTotal = formData.extra_services?.reduce((sum, svc) => sum + safeNumber(svc.price), 0) || 0;
  
  // Primary dropoff location (dropoff_location field) - this doesn't have a price field
  // Additional dropoff locations (dropoff_loc1 through dropoff_loc5) with prices
  const dropoffLoc1Price = safeNumber(formData.dropoff_loc1_price);
  const dropoffLoc2Price = safeNumber(formData.dropoff_loc2_price);
  const dropoffLoc3Price = safeNumber(formData.dropoff_loc3_price);
  const dropoffLoc4Price = safeNumber(formData.dropoff_loc4_price);
  const dropoffLoc5Price = safeNumber(formData.dropoff_loc5_price);
  
  // Pickup locations prices
  const pickupLoc1Price = safeNumber(formData.pickup_loc1_price);
  const pickupLoc2Price = safeNumber(formData.pickup_loc2_price);
  const pickupLoc3Price = safeNumber(formData.pickup_loc3_price);
  const pickupLoc4Price = safeNumber(formData.pickup_loc4_price);
  const pickupLoc5Price = safeNumber(formData.pickup_loc5_price);
  

  const subtotal = basePrice + extraServicesTotal + midnightSurcharge +
    pickupLoc1Price + pickupLoc2Price + pickupLoc3Price + pickupLoc4Price + pickupLoc5Price +
    dropoffLoc1Price + dropoffLoc2Price + dropoffLoc3Price + dropoffLoc4Price + dropoffLoc5Price;
  
  const calculatedPrice = subtotal - additionalDiscount;
  const finalPrice = job?.id ? safeNumber(job.final_price) : calculatedPrice;

  // Handle input changes
  const handleInputChange = (field: keyof JobFormData, value: any) => {
    // Set user modified pricing flag for specific fields
    if (['base_price', 'midnight_surcharge'].includes(field)) {
      setUserModifiedPricing(true);
    }
    
    // Auto-populate driver when vehicle is selected
    if (field === 'vehicle_id' && value) {
      const selectedVehicleId = Number(value);
      const driverForVehicle = allDrivers.find(driver => 
        driver.vehicle_id === selectedVehicleId
      );
      
      if (driverForVehicle) {
        setFormData(prev => {
          const updated = { ...prev, driver_id: driverForVehicle.id, [field]: value };
          // Auto-update status based on form completion
          updated.status = determineJobStatus(updated);
          return updated;
        });
        // Clear error for this field
        if (errors[field]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
        return;
      }
    }
    
    // Auto-populate vehicle when driver is selected
    if (field === 'driver_id' && value) {
      const selectedDriverId = Number(value);
      const driver = allDrivers.find(d => d.id === selectedDriverId);
      
      if (driver && driver.vehicle_id) {
        setFormData(prev => {
          const updated = { ...prev, vehicle_id: driver.vehicle_id, [field]: value };
          // Auto-update status based on form completion
          updated.status = determineJobStatus(updated);
          return updated;
        });
        // Clear error for this field
        if (errors[field]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
        return;
      }
    }
    
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-update status based on form completion for relevant fields
      const statusRelevantFields = [
        'customer_id', 'passenger_name', 'service_type', 
        'pickup_date', 'pickup_time', 'pickup_location', 
        'dropoff_location', 'vehicle_id', 'driver_id','contractor_id'
      ];
      if (statusRelevantFields.includes(field as string)) {
        updated.status = determineJobStatus(updated);
      }
      return updated;
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle additional pickup locations change
  const handleAdditionalPickupLocationsChange = (locations: Location[]) => {
    setUiAdditionalPickupLocations(locations);
    const updates: any = {};
    
    // Clear all pickup fields first
    for (let i = 1; i <= 5; i++) {
      updates[`pickup_loc${i}`] = '';
      updates[`pickup_loc${i}_price`] = 0;
    }
    
    // Update with new locations
    locations.forEach((loc, index) => {
      if (index < 5) {
        updates[`pickup_loc${index + 1}`] = loc.location;
        updates[`pickup_loc${index + 1}_price`] = loc.price;
      }
    });
    
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      // Auto-update status based on form completion
      updated.status = determineJobStatus(updated);
      return updated;
    });
  };

  // Handle additional dropoff locations change
  const handleAdditionalDropoffLocationsChange = (locations: Location[]) => {
    setUiAdditionalDropoffLocations(locations);
    const updates: any = {};
    
    // Clear additional dropoff fields first
    for (let i = 1; i <= 5; i++) {
      updates[`dropoff_loc${i}`] = '';
      updates[`dropoff_loc${i}_price`] = 0;
    }
    
    // Set the new values
    locations.forEach((loc, index) => {
      if (index < 5) {
        updates[`dropoff_loc${index + 1}`] = loc.location;
        updates[`dropoff_loc${index + 1}_price`] = loc.price;
      }
    });
    
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      // Auto-update status based on form completion
      updated.status = determineJobStatus(updated);
      return updated;
    });
  };

  // Format address
  const formatAddress = (displayName: string): string => {
    const postalCodeMatch = displayName.match(/^(\d{4,8}),\s*(.+)$/);
    if (postalCodeMatch) {
      const postalCode = postalCodeMatch[1];
      const restOfAddress = postalCodeMatch[2];
      return `${restOfAddress} ${postalCode}`;
    }
    return displayName;
  };

  // Handle address lookup result
  useEffect(() => {
    if (pickupAddressResult && pickupAddressResult.display_name) {
      const formattedAddress = formatAddress(pickupAddressResult.display_name);
      // Only update if the address has actually changed
      if (formData.pickup_location !== formattedAddress) {
        setFormData(prev => ({ ...prev, pickup_location: formattedAddress }));
      }
    }
  }, [pickupAddressResult, formData.pickup_location]);

  useEffect(() => {
    if (dropoffAddressResult && dropoffAddressResult.display_name) {
      const formattedAddress = formatAddress(dropoffAddressResult.display_name);
      // Only update if the address has actually changed
      if (formData.dropoff_location !== formattedAddress) {
        setFormData(prev => ({ ...prev, dropoff_location: formattedAddress }));
      }
    }
  }, [dropoffAddressResult, formData.dropoff_location]);

  // Apply customer service pricing
  // Always update base price and midnight surcharge when vehicle type or service type changes
  useEffect(() => {
    if (userModifiedPricing) return;

    // For existing jobs, only skip if no pricing-relevant fields changed
    if (job && job.id && initialFormData) {
      if (safeNumber(formData.base_price) !== 0 && formData.base_price !== undefined) {
        // Check if any pricing-relevant field changed
        const pricingFieldsChanged =
          formData.pickup_time !== initialFormData.pickup_time ||
          formData.service_type !== initialFormData.service_type ||
          formData.vehicle_type !== initialFormData.vehicle_type ||
          formData.customer_id !== initialFormData.customer_id;

        // If nothing changed, keep stored prices
        if (!pricingFieldsChanged) return;

        // If only pickup_time changed, update only midnight_surcharge
        if (formData.pickup_time !== initialFormData.pickup_time &&
            formData.service_type === initialFormData.service_type &&
            formData.vehicle_type === initialFormData.vehicle_type &&
            formData.customer_id === initialFormData.customer_id) {
          if (customerServicePricing) {
            const calculatedMidnightSurchargeValue = calculateMidnightSurcharge(customerServicePricing, formData.pickup_time);
            if (formData.midnight_surcharge !== calculatedMidnightSurchargeValue) {
              setFormData(prev => ({
                ...prev,
                midnight_surcharge: calculatedMidnightSurchargeValue
              }));
            }
          }
          return;
        }
      }
    }

    // For new jobs or when pricing fields changed, update all pricing
    if (formData.customer_id && formData.service_type && formData.vehicle_type) {
      if (customerServicePricing) {
        const calculatedMidnightSurchargeValue = calculateMidnightSurcharge(customerServicePricing, formData.pickup_time);
        const basePriceValue = customerServicePricing.price || 0;
        // Only update if values have actually changed to prevent infinite loops
        if (formData.base_price !== basePriceValue || formData.midnight_surcharge !== calculatedMidnightSurchargeValue) {
          setFormData(prev => ({
            ...prev,
            base_price: basePriceValue,
            midnight_surcharge: calculatedMidnightSurchargeValue
          }));
        }
      } else {
        const calculatedMidnightSurchargeValue = calculateMidnightSurcharge(null, formData.pickup_time);
        // Only update if values have actually changed to prevent infinite loops
        if (formData.base_price !== 0 || formData.midnight_surcharge !== calculatedMidnightSurchargeValue) {
          setFormData(prev => ({
            ...prev,
            base_price: 0,
            midnight_surcharge: calculatedMidnightSurchargeValue
          }));
        }
      }
    }
  }, [customerServicePricing, formData.customer_id, formData.service_type, formData.vehicle_type, formData.pickup_time, userModifiedPricing, job, initialFormData, formData.base_price, formData.midnight_surcharge]);

  // Apply contractor pricing to populate job_cost when contractor and service are selected
  // Refetch pricing when editing and contractor_id becomes available to avoid race
  useEffect(() => {
    if (job && formData.contractor_id) {
      try {
        refetchPricing();
      } catch (e) {
        // ignore refetch errors; effect below will handle empty results
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, formData.contractor_id]);

  useEffect(() => {
    if (userModifiedPricing) return; // don't overwrite if user manually changed prices
    if (!formData.contractor_id || !formData.service_type) return;

    // contractorPricing is an array of { service_id, service_name, cost }
    const matching = (contractorPricing || []).find((p: any) => {
      if (!p) return false;
      // Prefer matching by service_id when we have it
      if (p.service_id && formData.service_id) {
        return Number(p.service_id) === Number(formData.service_id);
      }
      // Fallback to matching by service_name
      if (p.service_name && formData.service_type) {
        return String(p.service_name).toLowerCase() === String(formData.service_type).toLowerCase();
      }
      return false;
    });

    if (matching && matching.cost !== undefined && matching.cost !== null) {
      const cost = Number(matching.cost) || 0;
      setFormData(prev => ({ ...prev, job_cost: cost }));
    }
  }, [contractorPricing, formData.contractor_id, formData.service_type, formData.service_id, userModifiedPricing, job, refetchPricing]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};

    // Required field validation
    if (!formData.customer_id) newErrors.customer_id = "Customer is required";
    if (!formData.passenger_name?.trim()) newErrors.passenger_name = "Passenger name is required";
    if (!formData.service_type?.trim()) newErrors.service_type = "Service is required";
    if (!formData.vehicle_type?.trim()) newErrors.vehicle_type = "Vehicle type is required";
    if (!formData.pickup_date) newErrors.pickup_date = "Pickup date is required";
    if (!formData.pickup_time) newErrors.pickup_time = "Pickup time is required";
    if (!formData.pickup_location?.trim()) newErrors.pickup_location = "Pickup location is required";
    if (!formData.dropoff_location?.trim()) newErrors.dropoff_location = "Drop-off location is required";
    if (!formData.contractor_id) newErrors.contractor_id = "Assigned To (Contractor) is required"; 
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    const isValid = validateForm();
    if (!isValid) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastSaveTime < 1000) return;
    setLastSaveTime(now);

    setSaveStatus("saving");
    try {
      // Determine the final status before saving
      const finalStatus = determineJobStatus(formData);
      
      const jobData: JobFormData = {
        ...formData,
        status: finalStatus, // Use the determined status
        // Ensure all numeric fields are properly converted
        base_price: safeNumber(formData.base_price),
        additional_discount: safeNumber(formData.additional_discount),
        extra_charges: safeNumber(formData.extra_charges),
        midnight_surcharge: safeNumber(formData.midnight_surcharge),
        cash_to_collect: safeNumber(formData.cash_to_collect),
        pickup_loc1_price: safeNumber(formData.pickup_loc1_price),
        pickup_loc2_price: safeNumber(formData.pickup_loc2_price),
        pickup_loc3_price: safeNumber(formData.pickup_loc3_price),
        pickup_loc4_price: safeNumber(formData.pickup_loc4_price),
        pickup_loc5_price: safeNumber(formData.pickup_loc5_price),
        dropoff_loc1_price: safeNumber(formData.dropoff_loc1_price),
        dropoff_loc2_price: safeNumber(formData.dropoff_loc2_price),
        dropoff_loc3_price: safeNumber(formData.dropoff_loc3_price),
        dropoff_loc4_price: safeNumber(formData.dropoff_loc4_price),
        dropoff_loc5_price: safeNumber(formData.dropoff_loc5_price),
        vehicle_type: typeof formData.vehicle_type === 'string'
          ? formData.vehicle_type
          : (formData.vehicle_type && ((formData as any).vehicle_type.name || (formData as any).vehicle_type.label)) || '',
        vehicle_type_id: formData.vehicle_type_id
      };
      // Remove final_price so backend always recalculates
      delete jobData.final_price;

      await onSave(jobData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Save error:', error);
      
      // Enhanced error handling for production
      let errorMessage = 'Failed to save job. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network') || error.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid data provided. Please check your inputs.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message.includes('403')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Show error to user (you might want to add a toast notification here)
      toast.error(errorMessage);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!job?.id || !onDelete) return;

    if (
      window.confirm(
        "Are you sure you want to delete this job? This action cannot be undone."
      )
    ) {
      try {
        await onDelete(job.id);
      } catch (error) {
        console.error("Failed to delete job:", error);
        toast.error('Failed to delete job. Please try again.');
      }
    }
  };

  // Quick add modal functions
  const openQuickAddModal = (type: 'customer' | 'service' | 'vehicle' | 'driver') => {
    setQuickAddModal({ isOpen: true, type });
  };

  const closeQuickAddModal: () => void = () => {
    setQuickAddModal({ isOpen: false, type: null });
  };

  const handleQuickAddSuccess = () => {
    closeQuickAddModal();
    toast.success('Item created successfully');
  };

  // Input field component
  const InputField: React.FC<{
    label: string;
    value: string | number | null | undefined;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
    error?: string;
    placeholder?: string;
    className?: string;
    min?: number;
    step?: string;
    readOnly?: boolean;
  }> = ({ label, value, onChange, type = 'text', required, error, placeholder, className = '', readOnly = false }) => (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly || fieldsLocked} // Add fieldsLocked check here
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? "0.01" : undefined}
        className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : ''
        } ${(readOnly || fieldsLocked) ? 'bg-gray-600 cursor-not-allowed' : ''}`} // Add fieldsLocked styling
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );

  // Select field component
  const SelectField: React.FC<{
    label: string;
    value: string | number | undefined;
    onChange: (value: string) => void;
    options: { value: string | number; label: string }[];
    required?: boolean;
    error?: string;
    className?: string;
    showQuickAdd?: boolean;
    quickAddType?: 'customer' | 'service' | 'vehicle' | 'driver';
    disabled?: boolean; // Add disabled prop
  }> = ({
    label,
    value,
    onChange,
    options,
    required,
    error,
    className = "",
    showQuickAdd = false,
    quickAddType,
    disabled = false, // Add disabled prop
  }) => (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {showQuickAdd && quickAddType && !disabled && (
          <QuickAddButton
            onClick={() => openQuickAddModal(quickAddType)}
            label={label}
          />
        )}
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-500" : ""
        } ${disabled ? "bg-gray-600 cursor-not-allowed" : ""}`}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.value === ""}
            className="bg-gray-700"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );


  // Initialize UI location states based on form data
  useEffect(() => {
    // Update pickup locations UI
    const pickupLocations = [
      { location: formData.pickup_loc1 || '', price: safeNumber(formData.pickup_loc1_price) },
      { location: formData.pickup_loc2 || '', price: safeNumber(formData.pickup_loc2_price) },
      { location: formData.pickup_loc3 || '', price: safeNumber(formData.pickup_loc3_price) },
      { location: formData.pickup_loc4 || '', price: safeNumber(formData.pickup_loc4_price) },
      { location: formData.pickup_loc5 || '', price: safeNumber(formData.pickup_loc5_price) },
    ].filter(loc => loc.location.trim() !== '' || loc.price > 0);
    
    // Update dropoff locations UI
    const dropoffLocations = [
      { location: formData.dropoff_loc1 || '', price: safeNumber(formData.dropoff_loc1_price) },
      { location: formData.dropoff_loc2 || '', price: safeNumber(formData.dropoff_loc2_price) },
      { location: formData.dropoff_loc3 || '', price: safeNumber(formData.dropoff_loc3_price) },
      { location: formData.dropoff_loc4 || '', price: safeNumber(formData.dropoff_loc4_price) },
      { location: formData.dropoff_loc5 || '', price: safeNumber(formData.dropoff_loc5_price) },
    ].filter(loc => loc.location.trim() !== '' || loc.price > 0);
    
    // Only update if the locations have actually changed
    const currentPickupLocations = uiAdditionalPickupLocations;
    const currentDropoffLocations = uiAdditionalDropoffLocations;
    
    const pickupLocationsChanged = JSON.stringify(pickupLocations) !== JSON.stringify(currentPickupLocations);
    const dropoffLocationsChanged = JSON.stringify(dropoffLocations) !== JSON.stringify(currentDropoffLocations);
    
    if (pickupLocationsChanged || dropoffLocationsChanged) {
      setUiAdditionalPickupLocations(pickupLocations);
      setUiAdditionalDropoffLocations(dropoffLocations);
    }
  }, [formData.pickup_loc1, formData.pickup_loc2, formData.pickup_loc3, formData.pickup_loc4, formData.pickup_loc5, 
      formData.pickup_loc1_price, formData.pickup_loc2_price, formData.pickup_loc3_price, formData.pickup_loc4_price, formData.pickup_loc5_price,
      formData.dropoff_loc1, formData.dropoff_loc2, formData.dropoff_loc3, formData.dropoff_loc4, formData.dropoff_loc5,
      formData.dropoff_loc1_price, formData.dropoff_loc2_price, formData.dropoff_loc3_price, formData.dropoff_loc4_price, formData.dropoff_loc5_price]);

  // Reset userModifiedPricing flag when service_type or vehicle_type changes
  // This allows automatic pricing updates when these fields change
  useEffect(() => {
    // We don't need to do anything here, just track the dependencies
    // The effect will run whenever service_type or vehicle_type changes
  }, [formData.service_type, formData.vehicle_type]); // Fixed dependencies to only include the specific fields we're checking

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Back to Jobs</span>
            </button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold">
                {job ? `Edit Job #${job.id}` : "Create New Job"}
              </h1>
              {/* Show status for both new and existing jobs */}
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                formData.status === 'new' ? 'bg-gray-600 text-gray-100' :
                formData.status === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                formData.status === 'confirmed' ? 'bg-green-600 text-green-100' :
                formData.status === 'otw' ? 'bg-purple-600 text-purple-100' :
                formData.status === 'ots' ? 'bg-indigo-600 text-indigo-100' :
                formData.status === 'pob' ? 'bg-orange-600 text-orange-100' :
                formData.status === 'jc' ? 'bg-green-600 text-green-100' :
                formData.status === 'sd' ? 'bg-red-600 text-red-100' :
                formData.status === 'canceled' ? 'bg-red-700 text-red-100' :
                'bg-gray-600 text-gray-100'
              }`}>
                {formData.status === 'new' ? 'New' :
                 formData.status === 'pending' ? 'Pending' :
                 formData.status === 'confirmed' ? 'Confirmed' :
                 formData.status === 'otw' ? 'On The Way' :
                 formData.status === 'ots' ? 'On The Site' :
                 formData.status === 'pob' ? 'Person On Board' :
                 formData.status === 'jc' ? 'Job Completed' :
                 formData.status === 'sd' ? 'Stand-Down' :
                 formData.status === 'canceled' ? 'Canceled' :
                 formData.status || 'New'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {saveStatus === "success" && (
              <div className="flex items-center space-x-1 text-green-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm">Saved</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || saveStatus === "saving"}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isLoading || saveStatus === "saving"
                  ? 'bg-blue-800 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>
                {saveStatus === "saving" ? "Saving..." : "Save Changes"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="max-w-7xl w-full mx-auto bg-gray-900 rounded-xl shadow-2xl p-6 md:p-8 relative"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <form
          className="flex flex-col gap-6 items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Main Content and Billing Sidebar Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Form Content - Left Side */}
            <div className="xl:col-span-3 space-y-6">
              {/* Core Job Info */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2 text-gray-100">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Core Job Info</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectField
                    label="Customer"
                    value={formData.customer_id || ""}
                    onChange={(v) => {
                      // Only allow changes if fields are not locked
                      if (!fieldsLocked) {
                        handleInputChange("customer_id", Number(v));
                      }
                    }}
                    required
                    error={errors.customer_id}
                    showQuickAdd={!fieldsLocked}
                    quickAddType="customer"
                    options={[
                      { value: "", label: "Select Customer" },
                      ...(allCustomers || []).map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    className={fieldsLocked ? "opacity-75" : ""}
                    disabled={fieldsLocked}
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Sub Customer
                    </label>
                    <input
                      type="text"
                      value={formData.sub_customer_name || ""}
                      onChange={(e) => {
                        // Only allow changes if fields are not locked
                        if (!fieldsLocked) {
                          handleInputChange("sub_customer_name", e.target.value);
                        }
                      }}
                      readOnly={fieldsLocked}
                      className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                      placeholder="Enter sub-customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Passenger Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="passenger_name"
                      value={formData.passenger_name || ""}
                      onChange={(e) => {
                        if (!isFieldLocked("passenger_name")) {
                          handleInputChange("passenger_name", e.target.value);
                        }
                      }}
                      readOnly={isFieldLocked("passenger_name")}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.passenger_name ? 'border-red-500' : 'border-gray-600'
                      } ${isFieldLocked("passenger_name") ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                      placeholder="Enter passenger name"
                    />
                    {errors.passenger_name && <p className="text-sm text-red-400">{errors.passenger_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Passenger Mobile
                    </label>
                    <PhoneInput
                      value={formData.passenger_mobile || ""}
                      onChange={(phone) => {
                        if (!isFieldLocked("passenger_mobile")) {
                          handleInputChange("passenger_mobile", phone);
                        }
                      }}
                      error={errors.passenger_mobile}
                      placeholder="Enter mobile number"
                      name="passenger_mobile"
                      className="w-full"
                      disabled={isFieldLocked("passenger_mobile")}
                    />
                  </div>
                  
                  {/* Service Field - Below Passenger Mobile */}
                  <SelectField 
                    label="Service" 
                    value={formData.service_type || ''} 
                    onChange={v => {
                      // Only allow changes if fields are not locked
                      if (!fieldsLocked) {
                        handleInputChange('service_type', v);
                        // Find the selected service for service_id reference
                        const selectedService = allServices.find(s => s.name === v);
                        if (selectedService) {
                          // Set service_id for backend reference
                          handleInputChange('service_id', selectedService.id);
                          
                          // Don't set any pricing when only service is selected
                          // Pricing should only be set when both customer AND service AND vehicle_type are selected
                          // This will be handled by the CustomerServicePricing useEffect
                        }
                      }
                    }} 
                    required 
                    error={errors.service_type}
                    showQuickAdd={!fieldsLocked}
                    quickAddType="service"
                    options={[
                      { value: '', label: 'Select Service' },
                      ...allServices.map(s => ({ value: s.name, label: s.name }))
                    ]} 
                    className={fieldsLocked ? "opacity-75" : ""}
                    disabled={fieldsLocked}
                  />
                  
                  <SelectField 
                    label="Vehicle Type" 
                    value={formData.vehicle_type || ''} 
                    onChange={v => {
                      const selected = allVehicleTypes.find(vt => vt.name === v);
                      setFormData(prev => {
                        const updated = {
                          ...prev,
                          vehicle_type: v,
                          vehicle_type_id: selected ? selected.id : undefined
                        };
                        console.log('[VehicleTypeSelect] Changed:', { vehicle_type: updated.vehicle_type, vehicle_type_id: updated.vehicle_type_id });
                        return updated;
                      });
                    }} 
                    required 
                    error={errors.vehicle_type}
                    options={[ 
                      { value: '', label: 'Select Vehicle Type' }, 
                      ...allVehicleTypes.map(vt => ({ value: vt.name, label: vt.name })) 
                    ]} 
                    disabled={isFieldLocked("vehicle_type")}
                  />
                </div>
              
                
                {/* Pickup Date and Time in separate row - outside main grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Pickup Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.pickup_date || ''}
                      onChange={(e) => {
                        // Only allow changes if fields are not locked
                        if (!fieldsLocked) {
                          handleInputChange('pickup_date', e.target.value);
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      readOnly={fieldsLocked}
                      className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {errors.pickup_date && <p className="text-sm text-red-400">{errors.pickup_date}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Pickup Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.pickup_time || ''}
                      onChange={(e) => {
                        // Only allow changes if fields are not locked
                        if (!fieldsLocked) {
                          handleInputChange('pickup_time', e.target.value);
                        }
                      }}
                      readOnly={fieldsLocked}
                      className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {errors.pickup_time && <p className="text-sm text-red-400">{errors.pickup_time}</p>}
                  </div>
                </div>

                {/* Contractor / Driver Billing moved to right sidebar */}
              </div>
              
              {/* Trip Details */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2 text-gray-100">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Trip Details</span>
                </h2>
                
                {/* Primary Locations */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-300">
      Pickup Location <span className="text-red-400">*</span>
    </label>
    <div className="relative">
      <input
        type="text"
        value={formData.pickup_location || ""}
        onChange={(e) => {
          // Only allow changes if fields are not locked
          if (!fieldsLocked) {
            handleInputChange("pickup_location", e.target.value);
          }
        }}
        onBlur={(e) => {
          // Only allow lookup if fields are not locked
          if (!fieldsLocked) {
            const value = e.target.value.trim();
            console.log('[JobForm] pickup onBlur triggered with value:', value);
            // Log only if value is all digits and length 4-8 (postal code)
            if (/^\d{4,8}$/.test(value)) {
              console.log('[JobForm] Pickup postal code pattern matched, calling pickupLookup:', value);
              pickupLookup(value);
            } else {
              console.log('[JobForm] Pickup value does not match postal code pattern (4-8 digits):', value);
            }
          }
        }}
        readOnly={fieldsLocked}
        className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
        placeholder="Enter pickup location or postal code"
      />
      {pickupAddressLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
    {errors.pickup_location && <p className="text-sm text-red-400">{errors.pickup_location}</p>}
    {pickupAddressError && <p className="text-sm text-yellow-400">{pickupAddressError}</p>}
  </div>
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-300">
      Drop-off Location <span className="text-red-400">*</span>
    </label>
    <div className="relative">
      <input
        type="text"
        value={formData.dropoff_location || ""}
        onChange={(e) => {
          // Only allow changes if fields are not locked
          if (!fieldsLocked) {
            handleInputChange("dropoff_location", e.target.value);
          }
        }}
        onBlur={(e) => {
          // Only allow lookup if fields are not locked
          if (!fieldsLocked) {
            const value = e.target.value.trim();
            console.log('[JobForm] dropoff onBlur triggered with value:', value);
            // Log only if value is all digits and length 4-8 (postal code)
            if (/^\d{4,8}$/.test(value)) {
              console.log('[JobForm] Dropoff postal code pattern matched, calling dropoffLookup:', value);
              dropoffLookup(value);
            } else {
              console.log('[JobForm] Dropoff value does not match postal code pattern (4-8 digits):', value);
            }
          }
        }}
        readOnly={fieldsLocked}
        className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
        placeholder="Enter drop-off location or postal code"
      />
      {dropoffAddressLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
    {errors.dropoff_location && <p className="text-sm text-red-400">{errors.dropoff_location}</p>}
    {dropoffAddressError && <p className="text-sm text-yellow-400">{dropoffAddressError}</p>}
  </div>
</div>

                {/* Additional Pickup Locations */}
                <div className="mb-6">
                  <DynamicLocationList
                    value={uiAdditionalPickupLocations}
                    onChange={(locations) => {
                      // Only allow changes if fields are not locked
                      if (!fieldsLocked) {
                        handleAdditionalPickupLocationsChange(locations);
                      }
                    }}
                    maxRows={5}
                    type="pickup"
                    defaultPrice={10}
                    disabled={fieldsLocked  || !formData.customer_id || !formData.service_type}
                  />
                </div>

                {/* Additional Dropoff Locations */}
                <div className="mb-6">
                  <DynamicLocationList
                    value={uiAdditionalDropoffLocations}
                    onChange={(locations) => {
                      // Only allow changes if fields are not locked
                      if (!fieldsLocked) {
                        handleAdditionalDropoffLocationsChange(locations);
                      }
                    }}
                    maxRows={5}
                    type="dropoff"
                    defaultPrice={10}
                    disabled={fieldsLocked || !formData.customer_id || !formData.service_type}
                  />
                </div>

                {/* Vehicle and Driver Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectField
                    label="Vehicle"
                    value={formData.vehicle_id || ""}
                    onChange={(v) => {
                      if (!isFieldLocked("vehicle_id")) {
                        handleInputChange("vehicle_id", Number(v));
                      }
                    }}
                    error={errors.vehicle_id}
                    showQuickAdd={!isFieldLocked("vehicle_id")}
                    quickAddType="vehicle"
                    options={[
                      { value: "", label: "Select Vehicle" },
                      ...allVehicles.map((v) => ({
                        value: v.id,
                        label: `${v.name} (${v.number})`,
                      })),
                    ]}
                    className={isFieldLocked("vehicle_id") ? "opacity-75" : ""}
                    disabled={isFieldLocked("vehicle_id")}
                  />
                  <div className="space-y-1">
                    <SelectField
                      label="Driver"
                      value={formData.driver_id || ""}
                      onChange={(v) => {
                        if (!isFieldLocked("driver_id")) {
                          handleInputChange("driver_id", parseInt(v, 10));
                        }
                      }}
                      error={errors.driver_id}
                      showQuickAdd={!isFieldLocked("driver_id")}
                      quickAddType="driver"
                      options={[
                        { value: "", label: "Select Driver" },
                        ...allDrivers.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                      className={isFieldLocked("driver_id") ? "opacity-75" : ""}
                      disabled={isFieldLocked("driver_id")}
                    />
                    {/* Driver Conflict Warning */}
                    {driverConflictWarning && (
                      <div className="mt-2 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-sm text-yellow-200">
                            {driverConflictWarning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <SelectField
                    label="Assigned To"
                    value={formData.contractor_id || ""}
                    onChange={(v) => {
                      if (!isFieldLocked("contractor_id")) {
                        handleInputChange("contractor_id", v ? Number(v) : undefined);
                      }
                    }}
                    required  
                    error={errors.contractor_id}  
                    options={[
                      { value: "", label: "Select Contractor" },
                      ...allContractors
                        .filter(contractor => contractor.status === "Active")
                        .map((contractor) => ({
                          value: contractor.id,
                          label: contractor.name,
                        }))
                    ]}
                    showQuickAdd={!isFieldLocked("contractor_id")}
                    disabled={isFieldLocked("contractor_id")}
                  />
                </div>
              </div>

              {/* Extra Services & Requests */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2 text-gray-100">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Extra Services & Requests</span>
                </h2>
                <ExtraServicesList
                  value={formData.extra_services}
                  onChange={(svcs) => {
                    // Extra services should remain editable even when fields are locked
                    handleInputChange("extra_services", svcs.slice(0, 1));
                  }}
                />
              </div>
              
              {/* Customer Remarks */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2 text-gray-100">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Customer Remarks</span>
                </h2>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks || ''}
                    onChange={(e) => {
                      // Remarks should remain editable even when fields are locked
                      handleInputChange('remarks', e.target.value);
                    }}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter any additional remarks or notes for this job"
                  />
                </div>
              </div>

              {/* Contractor / Driver Billing Card intentionally moved to the right sidebar */}

            </div>

            {/* Billing Information Sidebar - Right Side */}
            <div className="xl:col-span-1 space-y-6">
              {/* Customer Billing Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2 text-gray-100">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599 1" />
                  </svg>
                  <span>Customer Billing</span>
                </h2>
                
                <div className="space-y-4">
                  {/* Base Price Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-300">
                        Base Price
                      </label>
                      {/* Only show pricing indicators for NEW jobs, not when editing */}
                      {!job?.id && formData.customer_id && formData.service_type && (
                        customerServicePricing ? (
                          <span className="px-2 py-1 text-xs bg-blue-600 text-blue-100 rounded-full">
                            Pricing Applied
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-600 text-gray-100 rounded-full">
                            No Pricing
                          </span>
                        )
                      )}
                    </div>
                    <input
                      type="number" 
                      name="base_price"
                      value={formData.base_price || ''}
                      onChange={(e) => {
                        if (!fieldsLocked) {
                          handleInputChange('base_price', e.target.value);
                        }
                      }}
                      step="0.01" 
                      min={0}
                      placeholder="0.00"
                      readOnly={fieldsLocked}
                      className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {errors.base_price && <p className="text-sm text-red-400">{errors.base_price}</p>}
                  </div>
                  
                  {/* Additional Discount */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Additional Discount
                      {!job?.id && finalPrice < 0 && (
                        <span className="ml-2 text-xs text-yellow-400">
                          (Results in negative price)
                        </span>
                      )}
                    </label>
                    <input
                      type="number" 
                      name="additional_discount"
                      value={formData.additional_discount || ''}
                      onChange={(e) => {
                        if (!fieldsLocked) {
                          handleInputChange('additional_discount', e.target.value);
                        }
                      }}
                      step="0.01" 
                      min={0}
                      placeholder="0.00"
                      readOnly={fieldsLocked}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.additional_discount ? 'border-red-500' : (!job?.id && finalPrice < 0 ? 'border-yellow-500' : 'border-gray-600')
                      } ${fieldsLocked ? 'bg-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {errors.additional_discount && <p className="text-sm text-red-400">{errors.additional_discount}</p>}
                  </div>
                  
                  {/* Midnight Surcharge */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Midnight Surcharge
                    </label>
                    <input
                      type="number"
                      value={formData.midnight_surcharge || ''}
                      onChange={(e) => {
                        handleInputChange('midnight_surcharge', e.target.value);
                      }}
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    {errors.midnight_surcharge && <p className="text-sm text-red-400">{errors.midnight_surcharge}</p>}
                    {customerServicePricing && (
                      <p className="text-xs text-blue-300">
                        Customer rate: S$ {calculateMidnightSurcharge(customerServicePricing, formData.pickup_time || '').toFixed(2)}
                      </p>
                    )}
                    {formData.pickup_time && customerServicePricing && (
                      <p className="text-xs text-gray-400">
                        {formData.midnight_surcharge > 0 
                          ? `Applied (Pickup time ${formData.pickup_time})` 
                          : `Pickup time ${formData.pickup_time} is outside 23:00-06:59`}
                      </p>
                    )}
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-600 my-6"></div>
                  
                  {/* Pricing Breakdown */}
                  <div className="mt-6">
                    <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-600/40 rounded-lg p-4">
                      <div className="text-sm text-blue-300 font-medium mb-3">Pricing Breakdown:</div>
                      <div className="text-xs text-blue-200 space-y-2">
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>S$ {basePrice.toFixed(2)}</span>
                        </div>
                        
                        {extraServicesTotal > 0 && (
                          <div className="flex justify-between">
                            <span>Extra Services:</span>
                            <span>S$ {extraServicesTotal.toFixed(2)}</span>
                          </div>
                        )}
                        
                        {midnightSurcharge > 0 && (
                          <div className="flex justify-between">
                            <span>Midnight Surcharge:</span>
                            <span>S$ {midnightSurcharge.toFixed(2)}</span>
                          </div>
                        )}
                        
                        {pickupLoc1Price > 0 && (
                          <div className="flex justify-between">
                            <span>Pickup Stop 1:</span>
                            <span>S$ {pickupLoc1Price.toFixed(2)}</span>
                          </div>
                        )}
                        {pickupLoc2Price > 0 && (
                          <div className="flex justify-between">
                            <span>Pickup Stop 2:</span>
                            <span>S$ {pickupLoc2Price.toFixed(2)}</span>
                          </div>
                        )}
                        {pickupLoc3Price > 0 && (
                          <div className="flex justify-between">
                            <span>Pickup Stop 3:</span>
                            <span>S$ {pickupLoc3Price.toFixed(2)}</span>
                          </div>
                        )}
                        {pickupLoc4Price > 0 && (
                          <div className="flex justify-between">
                            <span>Pickup Stop 4:</span>
                            <span>S$ {pickupLoc4Price.toFixed(2)}</span>
                          </div>
                        )}
                        {pickupLoc5Price > 0 && (
                          <div className="flex justify-between">
                            <span>Pickup Stop 5:</span>
                            <span>S$ {pickupLoc5Price.toFixed(2)}</span>
                          </div>
                        )}

                        {dropoffLoc1Price > 0 && (
                          <div className="flex justify-between">
                            <span>Dropoff Stop 1:</span>
                            <span>S$ {dropoffLoc1Price.toFixed(2)}</span>
                          </div>
                        )}
                        {dropoffLoc2Price > 0 && (
                          <div className="flex justify-between">
                            <span>Dropoff Stop 2:</span>
                            <span>S$ {dropoffLoc2Price.toFixed(2)}</span>
                          </div>
                        )}
                        {dropoffLoc3Price > 0 && (
                          <div className="flex justify-between">
                            <span>Dropoff Stop 3:</span>
                            <span>S$ {dropoffLoc3Price.toFixed(2)}</span>
                          </div>
                        )}
                        {dropoffLoc4Price > 0 && (
                          <div className="flex justify-between">
                            <span>Dropoff Stop 4:</span>
                            <span>S$ {dropoffLoc4Price.toFixed(2)}</span>
                          </div>
                        )}
                        {dropoffLoc5Price > 0 && (
                          <div className="flex justify-between">
                            <span>Dropoff Stop 5:</span>
                            <span>S$ {dropoffLoc5Price.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="border-t border-blue-600 pt-2 mt-2">
                          <div className="flex justify-between text-blue-300 font-medium">
                            <span>Subtotal:</span>
                            <span>S$ {subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                        {additionalDiscount > 0 && (
                          <div className="flex justify-between text-red-400">
                            <span>Additional Discount:</span>
                            <span>-S$ {additionalDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-blue-600 pt-2 mt-2">
                          {job?.id ? (
                            <>
                              <div className={`flex justify-between text-sm ${
                                calculatedPrice < 0 ? 'text-red-400' : 'text-blue-400'
                              }`}>
                                <span>Final Price (New):</span>
                                <span>S$ {calculatedPrice.toFixed(2)}</span>
                              </div>
                              <div className={`flex justify-between font-semibold text-xs mt-3 ${
                                finalPrice < 0 ? 'text-red-400' : 'text-green-400'
                              }`}>
                                <span>Final Price (Stored):</span>
                                <span>S$ {finalPrice.toFixed(2)}</span>
                              </div>
                            </>
                          ) : (
                            <div className={`flex justify-between font-semibold text-sm ${
                              finalPrice < 0 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              <span>Final Price (Calculated):</span>
                              <span>S$ {finalPrice.toFixed(2)}</span>
                            </div>
                          )}
                          {calculatedPrice < 0 && (
                            <div className="text-xs text-red-400 mt-1">
                              ⚠️ Negative price detected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contractor/Driver Billing Card */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2 text-gray-100">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Contractor/Driver Billing</span>
                </h2>
                
                <div className="space-y-4">
                  {/* Job Cost (Contractor's Claim) - Editable */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Contractor/Driver&apos;s Claim
                    </label>
                    <input
                      type="number"
                      value={safeNumber(formData.job_cost) || ''}
                      onChange={(e) => {
                        handleInputChange('job_cost', e.target.value);
                      }}
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.contractor_id && contractorPricing && contractorPricing.length > 0 && (
                      <p className="text-xs text-blue-300">
                        Auto-populated from contractor pricing
                      </p>
                    )}
                  </div>
                  
                  {/* Cash to Collect from Passenger */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Collect from Passenger
                    </label>
                    <input
                      type="number"
                      value={formData.cash_to_collect || ''}
                      onChange={(e) => {
                        handleInputChange('cash_to_collect', e.target.value);
                      }}
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                    <p className="text-xs text-gray-400">
                      Amount driver/contractor should collect from passenger
                    </p>
                  </div>
                  
                  {/* Show difference box (always visible) */}
                  <div className="bg-purple-900/30 border border-purple-600/40 rounded-lg p-3">
                    <div className="text-xs text-purple-200 space-y-1">
                      <div className="flex justify-between">
                        <span>Contractor Claim:</span>
                        <span>S$ {safeNumber(formData.job_cost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash to Collect:</span>
                        <span>S$ {safeNumber(formData.cash_to_collect).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-purple-600 pt-1 mt-1">
                        <div className="flex justify-between font-medium">
                          <span>Net to Company:</span>
                          <span className={
                            (safeNumber(formData.cash_to_collect) - safeNumber(formData.job_cost)) >= 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }>
                            S$ {(safeNumber(formData.cash_to_collect) - safeNumber(formData.job_cost)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              {/* Contractor / Driver Billing moved to the right sidebar */}
          </div>
        </form>
      </div>

      {/* Quick Add Modals */}
      {quickAddModal.isOpen && quickAddModal.type === 'customer' && (
        <QuickAddModal
          isOpen={quickAddModal.isOpen}
          onClose={closeQuickAddModal}
          title="Quick Add Customer"
          schema={customerQuickAddSchema}
          onSubmit={createCustomer}
          onSuccess={handleQuickAddSuccess}
          fields={[
            { name: 'name', label: 'Customer Name', type: 'text', required: true, placeholder: 'Enter customer name' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email address' },
            { name: 'mobile', label: 'Mobile', type: 'tel', placeholder: 'Enter mobile number' },
            { name: 'company_name', label: 'Company Name', type: 'text', placeholder: 'Enter company name' },
            { name: 'status', label: 'Status', type: 'select', options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          ]}
        />
      )}

      {quickAddModal.isOpen && quickAddModal.type === 'service' && (
        <QuickAddModal
          isOpen={quickAddModal.isOpen}
          onClose={closeQuickAddModal}
          title="Quick Add Service"
          schema={serviceQuickAddSchema}
          onSubmit={createService}
          onSuccess={handleQuickAddSuccess}
          fields={[
            { name: 'name', label: 'Service Name', type: 'text', required: true, placeholder: 'Enter service name' },
            { name: 'description', label: 'Description', type: 'text', placeholder: 'Enter service description' },
            { name: 'base_price', label: 'Base Price', type: 'number', required: true, placeholder: '0.00' },
            { name: 'status', label: 'Status', type: 'select', options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          ]}
        />
      )}

      {quickAddModal.isOpen && quickAddModal.type === 'vehicle' && (
        <QuickAddModal
          isOpen={quickAddModal.isOpen}
          onClose={closeQuickAddModal}
          title="Quick Add Vehicle"
          schema={vehicleQuickAddSchema}
          onSubmit={createVehicle}
          onSuccess={handleQuickAddSuccess}
          fields={[
            { name: 'name', label: 'Vehicle Name', type: 'text', required: true, placeholder: 'Enter vehicle name' },
            { name: 'number', label: 'Vehicle Number', type: 'text', required: true, placeholder: 'Enter vehicle number' },
            { name: 'type', label: 'Vehicle Type', type: 'select', options: [
              { value: 'Sedan', label: 'Sedan' },
              { value: 'SUV', label: 'SUV' },
              { value: 'Van', label: 'Van' },
              { value: 'Bus', label: 'Bus' }
            ]},
            { name: 'status', label: 'Status', type: 'select', options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          ]}
        />
      )}

      {quickAddModal.isOpen && quickAddModal.type === 'driver' && (
        <QuickAddModal
          isOpen={quickAddModal.isOpen}
          onClose={closeQuickAddModal}
          title="Quick Add Driver"
          schema={driverQuickAddSchema}
          onSubmit={createDriver}
          onSuccess={handleQuickAddSuccess}
          fields={[
            { name: 'name', label: 'Driver Name', type: 'text', required: true, placeholder: 'Enter driver name' },
            { name: 'mobile', label: 'Mobile', type: 'tel', placeholder: 'Enter mobile number' },
            { name: 'status', label: 'Status', type: 'select', options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          ]}
        />
      )}
    </div>
  );
};

export default JobForm;