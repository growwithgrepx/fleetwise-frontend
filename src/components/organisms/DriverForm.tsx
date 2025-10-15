"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDriver, updateDriver, getDriver } from "@/services/api";
import { useRouter } from "next/navigation";
import { useGetAllVehicles } from "@/hooks/useVehicles";
import { useGetAllDrivers } from "@/hooks/useDrivers";

const driverSchema = z.object({
  name: z.string().min(2, "Please enter the driver name."),
  mobile: z
    .string()
    .regex(
      /^(?:\+65)?[89]\d{7}$/,
      "Please enter a valid Singapore mobile number (8 digits, starts with 8 or 9, optional +65)."
    )
    .optional()
    .or(z.literal("")),
  status: z.string().default("Active"),
  vehicle_id: z.number().optional().nullable(),
});

type DriverFormValues = z.infer<typeof driverSchema>;

type DriverFormProps = {
  mode: "create" | "edit";
  id?: string;
  initialData?: Partial<DriverFormValues>;
  onSubmit?: (data: DriverFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
};

export default function DriverForm({
  mode,
  id,
  initialData = {},
}: DriverFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: vehicles = [] } = useGetAllVehicles();
  const { data: allDrivers = [] } = useGetAllDrivers();
  const [vehicleWarning, setVehicleWarning] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, touchedFields, isSubmitting },
    trigger,
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema as any),
    mode: "onBlur",
    defaultValues: { name: "", mobile: "", status: "Active", vehicle_id: null, ...initialData },
  });

  // Watch for vehicle_id changes to show warnings
  const watchedVehicleId = watch("vehicle_id");

  // Check if selected vehicle is already assigned to another driver
  useEffect(() => {
    // Only run when we have both datasets loaded
    if (!watchedVehicleId || !allDrivers.length || !vehicles.length) {
      setVehicleWarning(null);
      return;
    }
    const selectedVehicleId = Number(watchedVehicleId);
    const assignedDriver = allDrivers.find(
      driver => 
        driver.vehicle_id === selectedVehicleId && 
        (mode === "create" || (mode === "edit" && driver.id !== Number(id)))
    );
    if (assignedDriver) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      setVehicleWarning(
        `Warning: This vehicle (${vehicle?.name} - ${vehicle?.number}) is already assigned to driver ${assignedDriver.name}.`
      );
    } else {
      setVehicleWarning(null);
    }
  }, [watchedVehicleId, allDrivers, vehicles]); // Remove mode/id from deps

  // Fetch driver for edit mode
  const { data: driver, isLoading: isLoadingDriver } = useQuery({
    queryKey: ["driver", id],
    queryFn: () => (id ? getDriver(id) : undefined),
    enabled: mode === "edit" && !!id,
  });

  useEffect(() => {
    if (driver) {
      setValue("name", driver.name);
      setValue("mobile", driver.mobile);
      setValue("vehicle_id", driver.vehicle_id || null);
    }
  }, [driver, setValue]);

  const createMutation: any = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries(["drivers"] as any);
      router.push("/drivers");
    },
  });
  const updateMutation: any = useMutation({
    mutationFn: ({ id, ...data }: any) => updateDriver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["drivers"] as any);
      router.push("/drivers");
    },
  });

  const onSubmit = (values: DriverFormValues | any) => {
    let vehicleId = values.vehicle_id ? Number(values.vehicle_id) : null;
    // Validate vehicle_id exists if provided
    if (vehicleId && !vehicles.find(v => v.id === vehicleId)) {
      // Handle invalid vehicle ID - could set form error or reset to null
      console.error('Invalid vehicle_id provided:', vehicleId);
      vehicleId = null;
    }
    const submitValues = {
      ...values,
      vehicle_id: vehicleId
    };
    
    if (mode === "create") {
      createMutation.mutate(submitValues);
    } else if (mode === "edit" && id) {
      updateMutation.mutate({ id, ...submitValues });
    }
  };

  if (mode === "edit" && isLoadingDriver) {
    return <div className="text-gray-400">Loading driver...</div>;
  }

  return (
    <form
      className="max-w-md mx-auto bg-gray-900 p-8 rounded-lg shadow"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="text-2xl font-bold mb-6 text-white">
        {mode === "create" ? "Add Driver" : "Edit Driver"}
      </h2>
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-300 mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          onBlur={(e) => {
            register("name").onBlur(e);
            trigger("name");
          }}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {touchedFields.name && errors.name && (
          <span className="text-red-400 text-sm">{errors.name.message}</span>
        )}
      </div>
      <div className="mb-4">
        <label htmlFor="mobile" className="block text-gray-300 mb-1">
          Mobile
        </label>
        <input
          id="mobile"
          type="text"
          {...register("mobile")}
          onBlur={(e) => {
            register("mobile").onBlur(e);
            trigger("mobile");
          }}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {touchedFields.mobile && errors.mobile && (
          <span className="text-red-400 text-sm">{errors.mobile.message}</span>
        )}
      </div>
      <div className="mb-4">
        <label htmlFor="status" className="block text-gray-300 mb-1">
          Status
        </label>
        <select
          id="status"
          {...register("status")}
          onBlur={(e) => {
            register("status").onBlur(e);
            trigger("status");
          }}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        {touchedFields.status && errors.status && (
          <span className="text-red-400 text-sm">{errors.status.message}</span>
        )}
      </div>
      <div className="mb-4">
        <label htmlFor="vehicle_id" className="block text-gray-300 mb-1">
          Vehicle
        </label>
        <select
          id="vehicle_id"
          {...register("vehicle_id", { setValueAs: (v) => (v === "" || v === "null" ? null : Number(v)) })}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
        >
          <option value="">No Vehicle Assigned</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name} ({vehicle.number})
            </option>
          ))}
        </select>
        {vehicleWarning && (
          <div className="text-yellow-400 text-sm mt-1">{vehicleWarning}</div>
        )}
        {touchedFields.vehicle_id && errors.vehicle_id && (
          <span className="text-red-400 text-sm">{errors.vehicle_id.message}</span>
        )}
      </div>
      <div className="flex gap-4 mt-6">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
          disabled={
            isSubmitting || createMutation.isLoading || updateMutation.isLoading
          }
        >
          {mode === "create" ? "Create" : "Update"}
        </button>
        <button
          type="button"
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          onClick={() => router.push("/drivers")}
        >
          Close
        </button>
      </div>
    </form>
  );
}