// src/components/CustomerForm.tsx
"use client";

import React, {useState, useEffect} from "react";
import { useForm, Controller,Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { FormSection } from "@/components/molecules/FormSection";
import { FormField } from "@/components/molecules/FormField";
import { useRouter } from "next/navigation";


type Service = {
  id: number;
  name: string;
  status?: string;
};


const pricingSchema = z
  .record(
    z.string(),                    // vehicle_type_id as string
    z.record(
      z.string(),                  // service_id as string
      z.number().min(0).max(10000) // price
    )
  )
  .default({});

export const customerSchema = z.object({
  name: z.string().min(1, "Please enter the customer name."),
  email: z
    .string()
    .transform((val) => val === "" ? undefined : val)
    .optional()
    .refine((val) => val === undefined || z.string().email().safeParse(val).success, {
      message: "Please enter a valid email address."
    }),
  mobile: z
    .string()
    .regex(
      /^(?:\+65)?[89]\d{7}$/,
      "Please enter a valid Singapore mobile number (8 digits, starts with 8 or 9, optional +65)."
    )
    .optional()
    .or(z.literal("")),
  company_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().default("Singapore"),
  type: z.string().default("regular"),
  customer_discount_percent: z
    .number()
    .nonnegative("Discount must be 0 or more.")
    .default(0),
  status: z
    .enum(["Active", "Inactive"])
    .default("Active")
    .refine((val) => val === "Active" || val === "Inactive", {
      message: "Please select status: Active or Inactive.",
    }),
  pricing: pricingSchema,
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormValues>;
  onSubmit: (data: CustomerFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitted },
    trigger,
    setValue,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema as any),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      company_name: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "Singapore",
      type: "regular",
      customer_discount_percent: 0,
      status: "Active",
      pricing: {
      },
      ...initialData,
    },
    mode: "onBlur",
  });

  const router = useRouter();
  type VehicleType = { id: number; name: string };
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  
  
  type MatrixRow = {
    vehicle_type_id: number;
    vehicle_type_name: string;
    prices: Record<string, number | null>; // key = service_id as string
  };
  
  type MatrixResponse = {
    services: { id: number; name: string }[];       // “service categories” (Transfer Per Way, etc.)
    vehicle_types: VehicleType[];                    // actual vehicles (E-Class, etc.)
    matrix: MatrixRow[];                             // per-vehicle row with prices keyed by service_id
  };
  
  const normKey = (s: string) => s.replace(/\s+/g, "_").toLowerCase();
  
const onValid = (values: CustomerFormValues) => {
  console.log("onValid submit payload:", values);
  return onSubmit(values);
};

const onInvalid = (errs: any) => {
  console.log("onInvalid validation errors:", errs);
};



const handlePricingChange = (
  category: keyof CustomerFormValues["pricing"],
  vehicle: string,
  value: string
) => {
  // Check if the value is a valid number
  if (value === "" || value === "-") {
    const field = `pricing.${category}.${vehicle}` as unknown as Path<CustomerFormValues>;
    setValue(field, 0, { shouldValidate: true });
    trigger(field);
    return;
  }

  const numValue = parseFloat(value);
  
  // If not a valid number, set to 0
  if (isNaN(numValue)) {
    const field = `pricing.${category}.${vehicle}` as unknown as Path<CustomerFormValues>;
    setValue(field, 0, { shouldValidate: true });
    trigger(field);
    return;
  }
  
  // Validate that the value is not negative
  if (numValue < 0) {
    // Set a negative value to trigger validation error
    const field = `pricing.${category}.${vehicle}` as unknown as Path<CustomerFormValues>;
    setValue(field, numValue, { shouldValidate: true });
    trigger(field);
    return;
  }
  
  // Validate that the value is not exceeding 10000
  if (numValue > 10000) {
    // Set the invalid value to trigger validation error
    const field = `pricing.${category}.${vehicle}` as unknown as Path<CustomerFormValues>;
    setValue(field, numValue, { shouldValidate: true });
    trigger(field);
    return;
  }
  
  const field = `pricing.${category}.${vehicle}` as unknown as Path<CustomerFormValues>;
  setValue(field, numValue, { shouldValidate: true });
  trigger(field);
};

const [services, setServices] = useState<Service[]>([]);
const [loading, setLoading] = useState(true);


useEffect(() => {
  let alive = true;
  (async () => {
    try {
      const res = await fetch("/api/pricing-matrix/defaults");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!alive) return;

      // always set headers
      setServices(data.services);
      setVehicleTypes(data.vehicle_types);

      if (initialData) return;

      // set default prices only for NEW customer
      for (const row of data.matrix) {
  const vKey = `v_${row.vehicle_type_id}`;
  for (const svc of data.services) {
    const sKey = `s_${svc.id}`;
    const val = row.prices[String(svc.id)] ?? 0;
    const path = `pricing.${vKey}.${sKey}` as const;
    setValue(path, val, { shouldValidate: false, shouldDirty: false });
  }
}
    } catch (e) {
      console.error("Failed to load pricing defaults", e);
    }
  })();
  return () => { alive = false; };
}, [setValue, initialData]); // 👈 add initialData here




  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-6">
    <div className="grid grid-cols-2 gap-8">
<FormSection title="Customer Information">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
    <FormField
      label="Customer Name *"
      error={(touchedFields.name || isSubmitted) && errors.name?.message}
    >
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("name");
            }}
          />
        )}
      />
    </FormField>

    {/* Contact Person uses company_name */}
    <FormField
      label="Company Name *"
      error={touchedFields.company_name && errors.company_name?.message}
    >
      <Controller
        name="company_name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("company_name");
            }}
          />
        )}
      />
    </FormField>

    <FormField
      label="Email"
      error={touchedFields.email && errors.email?.message}
    >
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="email"
            id="customer-email"
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("email");
            }}
          />
        )}
      />
    </FormField>

    <FormField
      label="Mobile"
      error={touchedFields.mobile && errors.mobile?.message}
    >
      <Controller
        name="mobile"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("mobile");
            }}
          />
        )}
      />
    </FormField>

    <FormField
      label="Type"
      error={touchedFields.type && errors.type?.message}
    >
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <select
            {...field}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
            onBlur={(e) => {
              field.onBlur();
              trigger("type");
            }}
          >
            <option value="regular">Regular</option>
            <option value="vip">VIP</option>
            <option value="corporate">Corporate</option>
          </select>
        )}
      />
    </FormField>

    <FormField
      label="Status *"
      error={touchedFields.status && errors.status?.message}
    >
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <select
            {...field}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
            onBlur={(e) => {
              field.onBlur();
              trigger("status");
            }}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        )}
      />
    </FormField>
  </div>
</FormSection>

<FormSection title="Address">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
    <div className="md:col-span-2">
      <FormField
        label="Address"
        error={touchedFields.address && errors.address?.message}
      >
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              className="w-full"
              onBlur={(e) => {
                field.onBlur();
                trigger("address");
              }}
            />
          )}
        />
      </FormField>
    </div>

    <FormField
      label="City"
      error={touchedFields.city && errors.city?.message}
    >
      <Controller
        name="city"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("city");
            }}
          />
        )}
      />
    </FormField>

    <FormField
      label="Zip Code"
      error={touchedFields.zip_code && errors.zip_code?.message}
    >
      <Controller
        name="zip_code"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("zip_code");
            }}
          />
        )}
      />
    </FormField>

    <FormField
      label="State"
      error={touchedFields.state && errors.state?.message}
    >
      <Controller
        name="state"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("state");
            }}
          />
        )}
      />
    </FormField>

    <FormField
      label="Country"
      error={touchedFields.country && errors.country?.message}
    >
      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            className="w-full"
            onBlur={(e) => {
              field.onBlur();
              trigger("country");
            }}
          />
        )}
      />
    </FormField>
  </div>
</FormSection>

    </div>

<FormSection title="Pricing">
  <div className="overflow-x-auto">
    <table className="w-full table-auto border-collapse">
      <thead>
  <tr className="bg-gray-800 text-white">
    <th className="p-2 border border-gray-700 text-left">Service</th>
    {vehicleTypes.map((vt) => (
      <th key={vt.id} className="p-2 border border-gray-700">
        {vt.name}
      </th>
    ))}
  </tr>
</thead>

<tbody>
  {services.map((svc, rowIdx) => (
    <React.Fragment key={svc.id}>
      {/* Optional divider before certain service rows */}
      {/* {rowIdx === 3 && (
        <tr>
          <td colSpan={vehicleTypes.length + 1} className="p-0">
            <div className="border-t-2 border-gray-500 my-2" />
          </td>
        </tr>
      )} */}

      <tr className="border-t border-gray-700">
        <td className="p-2">{svc.name}</td>

        {vehicleTypes.map((vt) => {
          const fieldName = `pricing.v_${vt.id}.s_${svc.id}` as const;
          return (
            <td key={`${svc.id}-${vt.id}`} className="p-2">
              <Controller
                name={fieldName}
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <>
                    <Input
                      {...field}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 rounded-lg bg-gray-800 text-white border ${
                        error ? "border-red-500" : "border-gray-700"
                      }`}
                      onChange={(e) => {
                      const raw = e.target.value;
                      // Treat empty or "-" as null (unset), not 0
                      if (raw.trim() === "" || raw === "-") {
                        field.onChange(null);
                        return; }
                      const n = Number(raw);
                      const safe = Number.isFinite(n)
                       ? Math.min(Math.max(n, 0), 10000)
                       : null;
                      field.onChange(safe);}}
                      onBlur={() => trigger(fieldName)}
                      value={field.value === null || field.value === undefined ? "" : field.value}
                    />
                    {error && (
                      <div className="text-red-500 text-xs mt-1">{error.message}</div>
                    )}
                  </>
                )}
              />
            </td>
          );
        })}
      </tr>
    </React.Fragment>
  ))}
</tbody>

    </table>
  </div>
</FormSection>



      <div className="flex justify-end mt-8 gap-3">
        <Button
    type="button"
    variant="secondary"
    onClick={() => router.back()}
  >
    Back
  </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;