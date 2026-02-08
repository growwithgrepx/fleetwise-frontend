"use client";

import React, { useState, useEffect, Fragment, useRef } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import TableSkeleton from "./TableSkeleton";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Invoice } from "@/types/types";
import { Job } from "@/types/job";

export interface EntityTableColumn<T> {
  label: string | React.ReactNode;
  accessor: keyof T | string;
  render?: (row: T) => React.ReactNode;
  filterable?: boolean;
  width?: string;
  stringLabel?: string; // Added for filter placeholder
  renderFilter?: (value: string, onChange: (v: string) => void) => React.ReactNode; // Add this line
}

export interface EntityTableAction<T> {
  label: string;
  icon: React.ReactNode;
  onClick: (row: T) => void | Promise<void>;
  ariaLabel?: string;
  title?: string;
  colorClass?: string;
  disabled?: (row: T) => boolean;
}

export interface EntityTableProps<
  T extends { id: string | number; status?: string }
> {
  columns: EntityTableColumn<T>[];
  data?: T[];
  actions?: EntityTableAction<T>[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  filters?: Record<string, string>;
  onFilterChange?: (column: string, value: string) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  onSelectionChange?: (selectedRows: T[]) => void;
  onSelectionRow?: (row: T[]) => void;
  selectedRowIds?: (string | number)[]; 
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T) => string);
  onRowClick?: (row: T) => void | Promise<void>;
  expandedRowId?: string | number | null;
  // Generate Invoice button props
  showGenerateInvoice?: boolean;
  onGenerateInvoice?: () => void;
  isGenerateInvoiceDisabled?: boolean;
  generateInvoiceTooltip?: string;
}

export function JobEntityTable<
  T extends { id: string | number; status?: string }
>({
  columns,
  data = [],
  actions = [],
  isLoading = false,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  filters = {},
  onFilterChange,
  renderExpandedRow,
  onSelectionChange,
  onSelectionRow,
  selectedRowIds = [],
  className = "",
  containerClassName = "",
  headerClassName = "",
  rowClassName = "",
  showGenerateInvoice = false,
  onGenerateInvoice,
  isGenerateInvoiceDisabled = false,
  generateInvoiceTooltip,
}: EntityTableProps<T>) {
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(
    null
  );
  // const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const totalColumns = React.useMemo(() => {
    return (
      1 +
      (renderExpandedRow ? 1 : 0) +
      columns.length +
      (actions.length > 0 ? 1 : 0)
    );
  }, [columns.length, actions.length, renderExpandedRow]);

  useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current) {
        setIsScrolled(tableContainerRef.current.scrollTop > 0);
      }
    };
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleRowToggle = (rowId: string | number) => {
    console.log("rowId", rowId);

    setExpandedRowId((prev) => {
      const isExpanding = prev !== rowId;
      if (isExpanding && contentRefs.current[rowId]) {
        const height = contentRefs.current[rowId]?.scrollHeight || 0;
      }
      return isExpanding ? rowId : null;
    });
  };

  const handleRowIdSeclection = (rowId: string | number) => {
    const unPaidInvoicesJobs:any = data?.find(
      (invoice: Invoice | any) => invoice.id == rowId
    );
    console.log("Selected Invoice Jobs: ", unPaidInvoicesJobs?.jobs);
    onSelectionRow?.(unPaidInvoicesJobs?.jobs ?? []);
  };
//   const handleRowIdSeclection = (rowId: string | number) => {
//   const selectedInvoice = data?.find(
//     (invoice: any) => invoice.id == rowId
//   ) as any;

//   if (!selectedInvoice) {
//     onSelectionRow?.([]);
//     return;
//   }

//   // Ensure jobs exist, otherwise empty array
//   const jobsToPass = selectedInvoice ?? [];
//   console.log("Selected Invoice Jobs: ", jobsToPass);

//   onSelectionRow?.(jobsToPass);
// };

// (no need)
// Fix in JobBillingTable.tsx - Replace the handleRowIdSeclection function
// const handleRowIdSeclection = (rowId: string | number) => {
//   const selectedInvoice = data?.find(
//     (invoice: any) => invoice.id == rowId
//   ) as any;
  
//   if (!selectedInvoice) {
//     onSelectionRow?.([]);
//     return;
//   }
//   console.log("Selected Invoice Jobs: ", selectedInvoice.jobs);
//   const jobsToPass = selectedInvoice.jobs || [];
//   onSelectionRow?.(jobsToPass);
// };

  const setContentRef =
    (rowId: string | number) => (el: HTMLDivElement | null) => {
      if (el) contentRefs.current[rowId] = el;
    };
// (real)
  // const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const newSelectedRows = e.target.checked ? data.map((row) => row.id) : [];
  //   setSelectedRows(newSelectedRows);
  //   const selectedJobObjects:any = data
  //     .filter((row) => newSelectedRows.includes(row.id))
  //     .map((row:any) => ({
  //       id: row.id,
  //       customer_id: row.customer_id,
  //     }));
  //   onSelectionChange?.(selectedJobObjects);
  // };
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newSelectedIds = e.target.checked ? data.map((row) => row.id) : [];
  const newSelectedRows = data.filter((row) => newSelectedIds.includes(row.id));
  onSelectionChange?.(newSelectedRows);
};


  // const handleSelectRow = (rowId: string | number) => {
  //   const newSelectedRows = selectedRows.includes(rowId)
  //     ? selectedRows.filter((id) => id !== rowId)
  //     : [...selectedRows, rowId];

  //   const selectedJobObjects:any = data
  //     .filter((row) => newSelectedRows.includes(row.id))
  //     .map((row:any) => ({
  //       id: row.id,
  //       customer_id: row.customer_id,
  //     }));

  //   setSelectedRows(newSelectedRows);
  //   onSelectionChange?.(selectedJobObjects);
  // };
  const handleSelectRow = (rowId: string | number) => {
  const currentSelectedIds = selectedRowIds || [];
  const newSelectedIds = currentSelectedIds.includes(rowId)
    ? currentSelectedIds.filter((id) => id !== rowId)
    : [...currentSelectedIds, rowId];
  const newSelectedRows = data.filter((row) => newSelectedIds.includes(row.id));
  onSelectionChange?.(newSelectedRows);
};
  const totalPages = total && pageSize ? Math.ceil(total / pageSize) : 1;
  const isAllSelected =
    selectedRowIds.length > 0 && selectedRowIds.length === data.length;

  return (
    <div
      className={clsx(
        "bg-background-light backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-border-color h-full",
        className
      )}
    >
      {/* Always visible Generate Invoice button in table header */}
      {showGenerateInvoice && (
        <div className="px-6 py-3 flex justify-end items-center border-b border-border-color">
          <div className="relative group">
            <button
              onClick={onGenerateInvoice}
              disabled={isGenerateInvoiceDisabled}
              className={`px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Generate Invoice
            </button>
            {isGenerateInvoiceDisabled && generateInvoiceTooltip && (
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                {generateInvoiceTooltip}
                <div className="absolute top-full right-3 -mt-1 w-2 h-2 bg-gray-800 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Selection count display, only visible when rows are selected */}
      {selectedRowIds.length > 0 && (
        <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 flex justify-between items-center">
          <div className="text-sm font-medium text-primary">
            {selectedRowIds.length} {selectedRowIds.length === 1 ? "item" : "items"}{" "}
            selected
          </div>
        </div>
      )}
      <div
        ref={tableContainerRef}
        className={clsx(
          "overflow-auto max-h-[calc(100vh-200px)]",
          containerClassName
        )}
      >
        <table className="w-full text-sm text-left text-text-main">
          <thead
            className={clsx(
              "text-xs font-medium text-text-secondary bg-background-light/95 backdrop-blur-md sticky top-0 z-10 transition-all duration-200",
              isScrolled ? "shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)]" : ""
            )}
          >
            <tr className="border-b border-border-color">
              <th className="px-6 py-3 w-10 bg-inherit">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                  className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded-md focus:ring-2 focus:ring-primary/40 focus:ring-offset-0"
                />
              </th>
              {renderExpandedRow && <th className="px-2 py-3 w-10"></th>}
              {columns.map((col) => (
                <th
                  key={String(col.accessor)}
                  className="px-4 py-3 min-w-[120px] whitespace-normal break-words"
                  style={col.width ? { width: col.width } : {}}
                >
                  <div className="font-bold text-base text-text-main whitespace-normal break-words">
                    {col.label}
                  </div>
                  {col.filterable && onFilterChange && (
                    col.renderFilter ? (
                      col.renderFilter(
                        filters[col.accessor as string] || "",
                        (value) => onFilterChange(col.accessor as string, value)
                      )
                    ) : (
                      <input
                        type="text"
                        className="w-full bg-background-light border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1"
                        placeholder={`Filter ${(col.stringLabel || col.accessor)
                          .toString()
                          .toLowerCase()}...`}
                        value={filters[col.accessor as string] || ""}
                        onChange={(e) =>
                          onFilterChange(col.accessor as string, e.target.value)
                        }
                      />
                    )
                  )}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 py-3 min-w-[100px] sm:min-w-[140px] text-right" style={{ minWidth: '100px' }}>
                  <div className="font-bold text-base text-text-secondary">
                    Actions
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={totalColumns}>
                  <TableSkeleton columns={totalColumns} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColumns}
                  className="text-center py-8 text-text-secondary"
                >
                  No data found.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    className={clsx(
                      "border-b border-border-color/60 transition-all duration-200 cursor-pointer group relative",
                      rowClassName,
                      expandedRowId === row.id
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-background-light/70"
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        !target.closest("button") &&
                        !target.closest("input") &&
                        !target.closest("a") &&
                        !target.closest('[role="button"]')
                      ) {
                        console.log("Row clicked, toggling row", row.id);
                        handleRowIdSeclection(row.id);
                        handleRowToggle(row.id);
                      }
                    }}
                    aria-expanded={expandedRowId === row.id}
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowToggle(row.id);
                      }
                    }}
                  >
                    <td className="px-6 py-3.5 w-10">
                      {/* <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
                      /> */}
                      <input
  type="checkbox"
  checked={selectedRowIds.includes(row.id)}
  onChange={() => handleSelectRow(row.id)}
  onClick={(e) => e.stopPropagation()}
  className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
/>
                    </td>
                    {renderExpandedRow && (
                      <td className="px-2 py-3 w-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowIdSeclection(row.id);
                            handleRowToggle(row.id);
                          }}
                          className="rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-text-secondary hover:text-white hover:bg-background-light/50 transition-colors"
                          aria-label={
                            expandedRowId === row.id
                              ? "Collapse row"
                              : "Expand row"
                          }
                        >
                          {expandedRowId === row.id ? (
                            <ChevronDownIcon className="w-5 h-5" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={String(col.accessor) + "-" + row.id}
                        className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md"
                      >
                        {col.render ? (
                          col.render(row)
                        ) : col.accessor === "total_amount" ? (
                          <>${row[col.accessor as keyof T]}</>
                        ) : col.accessor === "date" ? (
                          <>
                            {String(row[col.accessor as keyof T]).split("T")[0]}
                          </>
                        ) : (
                          (row[col.accessor as keyof T] as React.ReactNode)
                        )}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-4 py-3 min-w-[100px] sm:min-w-[140px] align-middle" style={{ minWidth: '100px' }}>
                        <div className="flex gap-2 items-center justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                          {actions.map((action) => {
                            const isDisabled = action.disabled
                              ? action.disabled(row)
                              : false;
                            const isViewAction = action.label === "View";
                            return (
                              <button
                                key={action.label}
                                onClick={async (e) => {
    e.stopPropagation();
    const isDisabled = action.disabled ? action.disabled(row) : false;
    if (isDisabled) return;

    const isViewAction = action.label === "View";
    if (isViewAction) {
      // 1) Hydrate from parent (your handleView)
      const maybe = action.onClick?.(row);
      if (maybe && typeof (maybe as any).then === "function") {
        await (maybe as any); // await if async
      }

      // 2) (Optional) only seed selection if jobs already exist on the row
      const inv: any = (data as any[])?.find((x: any) => x.id == row.id);
      if (inv?.jobs?.length) onSelectionRow?.(inv.jobs);

      // 3) Now toggle open, so the panel has data on first go
      handleRowToggle(row.id);
      return;
    }

    // non-View actions
    action.onClick?.(row);
  }}
                                disabled={isDisabled}
                                className={clsx(
                                  "p-1.5 rounded-lg hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-center",
                                  isDisabled
                                    ? "opacity-50 cursor-not-allowed hover:scale-100"
                                    : "",
                                  isViewAction && expandedRowId === row.id
                                    ? "bg-primary/20"
                                    : "bg-transparent"
                                )}
                                aria-label={action.ariaLabel || action.label}
                                title={action.title || action.label}
                              >
                                {isViewAction ? (
                                  <div
                                    className={clsx(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                      expandedRowId === row.id
                                        ? "bg-primary text-white"
                                        : "bg-primary/20 text-primary hover:bg-primary/30"
                                    )}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </div>
                                ) : action.label === "Edit" ? (
                                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 flex items-center justify-center transition-colors">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2 2 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                      />
                                    </svg>
                                  </div>
                                ) : action.label === "Delete" ? (
                                  <div className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H7V4a1 1 0 00-1-1H2a1 1 0 00-1 1v3h15.5z"
                                      />
                                    </svg>
                                  </div>
                                ) : (
                                  action.icon
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                  {renderExpandedRow && expandedRowId === row.id && (
                    <tr>
                      <td colSpan={totalColumns} className="p-0">
                        <AnimatePresence>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{
                              opacity: 1,
                              height:
                                contentRefs.current[row.id]?.scrollHeight ||
                                "auto",
                            }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div
                              ref={setContentRef(row.id)}
                              className="pl-16 pr-6 py-4 border-l-2 border-primary/30 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent"
                            >
                              {renderExpandedRow(row)}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex justify-end items-center gap-2 mt-4 px-4">
          <button
            className="px-3 py-1 rounded bg-background-light text-text-secondary hover:bg-background-dark disabled:opacity-50"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            {"<"}
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`px-3 py-1 rounded ${
                page === i + 1
                  ? "bg-primary text-white"
                  : "bg-background-light text-text-secondary hover:bg-background-dark"
              }`}
              onClick={() => onPageChange(i + 1)}
              disabled={page === i + 1}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="px-3 py-1 rounded bg-background-light text-text-secondary hover:bg-background-dark disabled:opacity-50"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            {">"}
          </button>
        </div>
      )}
    </div>
  );
}
