"use client";

import React from "react";
import clsx from "clsx";

export interface DriverFilterOption {
  key: string;
  label: string;
  count: number;
}

interface DriverFilterButtonsProps {
  drivers: DriverFilterOption[];
  unassignedCount: number;
  selectedKey: string;
  onChange: (key: string) => void;
}

export const DriverFilterButtons: React.FC<DriverFilterButtonsProps> = ({
  drivers,
  unassignedCount,
  selectedKey,
  onChange,
}) => {
  const totalAssigned = drivers.reduce((s, d) => s + d.count, 0);

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-t-lg bg-background px-2 pb-3 pt-3 sm:mt-4 sm:px-0 sm:pb-4 sm:pt-4">
      <div className="sm:px-4">
        <h3 className="mb-2 text-sm font-bold text-text-main sm:mb-3 sm:text-base">
          By driver
        </h3>
        <div className="flex max-h-[200px] flex-wrap gap-1.5 overflow-y-auto sm:gap-2">
          <button
            type="button"
            onClick={() => onChange("")}
            className={clsx(
              "flex min-w-[88px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-xs transition-all sm:px-3 sm:py-2 sm:text-sm",
              selectedKey === ""
                ? "bg-primary text-white shadow-lg"
                : "border border-border-color bg-transparent text-text-main hover:border-primary"
            )}
          >
            <span className="font-medium">All</span>
            <span className="mt-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs">
              {totalAssigned + unassignedCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange("__unassigned__")}
            className={clsx(
              "flex min-w-[88px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-xs transition-all sm:px-3 sm:py-2 sm:text-sm",
              selectedKey === "__unassigned__"
                ? "bg-primary text-white shadow-lg"
                : "border border-border-color bg-transparent text-text-main hover:border-primary"
            )}
          >
            <span className="font-medium">Unassigned</span>
            <span className="mt-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs">
              {unassignedCount}
            </span>
          </button>
          {drivers.map((d) => (
            <button
              key={d.key}
              type="button"
              title={d.label}
              onClick={() => onChange(d.key)}
              className={clsx(
                "flex max-w-[160px] min-w-[88px] flex-col items-center justify-center rounded-lg px-2 py-2 text-center text-xs transition-all sm:max-w-[200px] sm:px-3 sm:py-2 sm:text-sm",
                selectedKey === d.key
                  ? "bg-primary text-white shadow-lg"
                  : "border border-border-color bg-transparent text-text-main hover:border-primary"
              )}
            >
              <span className="w-full truncate px-1 font-medium">{d.label}</span>
              <span className="mt-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs">
                {d.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
