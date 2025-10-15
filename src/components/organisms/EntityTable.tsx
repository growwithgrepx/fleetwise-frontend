import React, { useState, useEffect, Fragment, useRef } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import TableSkeleton from "./TableSkeleton";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface EntityTableColumn<T> {
  label: string | React.ReactNode;
  accessor: keyof T | string;
  render?: (row: T) => React.ReactNode;
  filterable?: boolean;
  width?: string;
  stringLabel?: string; // Added for filter placeholder
}

export interface EntityTableAction<T> {
  label: string;
  icon: React.ReactNode;
  onClick: (row: T) => void;
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
  actions?: EntityTableAction<T>[] | ((row: T) => EntityTableAction<T>[]);
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  filters?: Record<string, string>;
  onFilterChange?: (column: string, value: string) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T) => string);
  onRowClick?: (row: T) => void;
  expandedRowId?: string | number | null;
  // Processing states for specific jobs
  processingJobId?: string | number | null;
  processingJobIds?: (string | number)[];
  disableRowExpansion?: boolean; 
}

export function EntityTable<
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
  className = "",
  containerClassName = "",
  headerClassName = "",
  rowClassName = "",
  processingJobId = null,
  processingJobIds = [],
  disableRowExpansion = false, 
  onRowClick,
}: EntityTableProps<T>) {
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(
    null
  );
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const totalColumns = React.useMemo(() => {
    return (
      1 +
      (renderExpandedRow && !disableRowExpansion ? 1 : 0) +
      columns.length +
      (actions.length > 0 ? 1 : 0)
    );
  }, [columns.length, actions.length, renderExpandedRow, disableRowExpansion]);

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
    
    if (disableRowExpansion) return;
    
    setExpandedRowId(prev => {
      const isExpanding = prev !== rowId;
      return isExpanding ? rowId : null;
    });
  };

  const setContentRef =
    (rowId: string | number) => (el: HTMLDivElement | null) => {
      if (el) contentRefs.current[rowId] = el;
    };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedRows = e.target.checked ? data.map((row) => row.id) : [];
    setSelectedRows(newSelectedRows);
    onSelectionChange?.(newSelectedRows);
  };

  const handleSelectRow = (rowId: string | number) => {
    const newSelectedRows = selectedRows.includes(rowId)
      ? selectedRows.filter((id) => id !== rowId)
      : [...selectedRows, rowId];
    setSelectedRows(newSelectedRows);
    onSelectionChange?.(newSelectedRows);
  };

  const totalPages = total && pageSize ? Math.ceil(total / pageSize) : 1;
  const isAllSelected =
    selectedRows.length > 0 && selectedRows.length === data.length;

  return (
    <div
      className={clsx(
        "bg-background-light backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-border-color h-full",
        className
      )}
    >
      {selectedRows.length > 0 && (
        <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 flex justify-between items-center">
          <div className="text-sm font-medium text-primary">
            {selectedRows.length} {selectedRows.length === 1 ? "item" : "items"}{" "}
            selected
          </div>
        </div>
      )}
      <div
        ref={tableContainerRef}
        className={clsx(
          "overflow-x-auto max-h-[calc(100vh-200px)]",
          containerClassName
        )}
        style={{ overflowX: 'auto' }}
      >
        <table className="w-full text-sm text-left text-text-main">
          <thead
            className={clsx(
              "text-xs font-medium text-text-secondary bg-background-light/95 backdrop-blur-md sticky top-0 z-10 transition-all duration-200",
              isScrolled ? "shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)]" : ""
            )}
            style={{ position: 'sticky', top: 0 }}
          >
            <tr className="border-b border-border-color">
              <th className="px-6 py-3 w-10 bg-inherit sticky left-0 z-10" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                  className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded-md focus:ring-2 focus:ring-primary/40 focus:ring-offset-0"
                />
              </th>
              {renderExpandedRow && !disableRowExpansion && <th className="px-2 py-3 w-10 sticky left-10 bg-inherit z-10" style={{ position: 'sticky', left: '2.5rem', zIndex: 10 }}></th>}
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
                  )}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 py-3 min-w-[120px] whitespace-normal break-words sticky right-0 bg-inherit z-10" style={{ position: 'sticky', right: 0, zIndex: 10 }}>
                  <div className="font-bold text-base text-text-secondary flex justify-end">
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
                      if (!target.closest('button') && !target.closest('input') && !target.closest('a') && !target.closest('[role="button"]')) {
                        // Only toggle row if expansion is not disabled
                        if (!disableRowExpansion) {
                          handleRowToggle(row.id);
                        }
                        // Call onRowClick if provided
                        onRowClick?.(row);
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
                    <td className="px-6 py-3.5 w-10 sticky left-0 bg-inherit z-10" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
                      />
                    </td>
                    {renderExpandedRow && !disableRowExpansion && (
                      <td className="px-2 py-3 w-10 sticky left-10 bg-inherit z-10" style={{ position: 'sticky', left: '2.5rem', zIndex: 10 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                        style={col.width ? { width: col.width } : {}}
                      >
                        {col.render
                          ? col.render(row)
                          : (row[col.accessor as keyof T] as React.ReactNode)}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-4 py-3 whitespace-normal break-words sticky right-0 bg-inherit z-10 min-w-[120px]" style={{ position: 'sticky', right: 0, zIndex: 10 }}>
                        <div className="flex gap-2 items-center justify-end w-full">
                          {typeof actions === 'function' ? (
                            // Handle dynamic actions per row
                            (actions as (row: T) => EntityTableAction<T>[])(row).map((action) => {
                              const isDisabled = action.disabled
                                ? action.disabled(row)
                                : false;
                              const isViewAction = action.label === "View";
                              return (
                                <Button
                                  key={action.label}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isViewAction) {
                                      handleRowToggle(row.id);
                                    } else {
                                      action.onClick(row);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  variant="ghost"
                                  size="sm"
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
                                  {action.label === "CustomAction" ? (
                                    (row as any).status === 'canceled' ? (
                                      <span className={clsx(
                                        "px-3 py-1 rounded-md font-medium transition-colors text-white text-sm bg-green-500 hover:bg-green-600",
                                        processingJobId === row.id 
                                          ? "bg-green-400 opacity-75 cursor-not-allowed" 
                                          : ""
                                      )}>
                                        {processingJobId === row.id ? 'Re-instating...' : 'Re-instate'}
                                      </span>
                                    ) : (
                                      <span className={clsx(
                                        "px-3 py-1 rounded-md font-medium transition-colors text-white text-sm bg-red-500 hover:bg-red-600",
                                        processingJobId === row.id 
                                          ? "bg-red-400 opacity-75 cursor-not-allowed" 
                                          : ""
                                      )}>
                                        {processingJobId === row.id ? 'Canceling...' : 'Cancel'}
                                      </span>
                                    )
                                  ) : isViewAction ? (
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
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      {action.icon}
                                    </div>
                                  )}
                                </Button>
                              );
                            })
                          ) : (
                            // Handle static actions for all rows
                            (actions as EntityTableAction<T>[]).map((action) => {
                              const isDisabled = action.disabled
                                ? action.disabled(row)
                                : false;
                              const isViewAction = action.label === "View";
                              return (
                                <Button
                                  key={action.label}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isViewAction) {
                                      handleRowToggle(row.id);
                                    } else {
                                      action.onClick(row);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  variant="ghost"
                                  size="sm"
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
                                  {action.label === "CustomAction" ? (
                                    (row as any).status === 'canceled' ? (
                                      <span className={clsx(
                                        "px-3 py-1 rounded-md font-medium transition-colors text-white text-sm bg-green-500 hover:bg-green-600",
                                        processingJobId === row.id 
                                          ? "bg-green-400 opacity-75 cursor-not-allowed" 
                                          : ""
                                      )}>
                                        {processingJobId === row.id ? 'Re-instating...' : 'Re-instate'}
                                      </span>
                                    ) : (
                                      <span className={clsx(
                                        "px-3 py-1 rounded-md font-medium transition-colors text-white text-sm bg-red-500 hover:bg-red-600",
                                        processingJobId === row.id 
                                          ? "bg-red-400 opacity-75 cursor-not-allowed" 
                                          : ""
                                      )}>
                                        {processingJobId === row.id ? 'Canceling...' : 'Cancel'}
                                      </span>
                                    )
                                  ) : isViewAction ? (
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
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      {action.icon}
                                    </div>
                                  )}
                                </Button>
                              );
                            })
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {renderExpandedRow && !disableRowExpansion && expandedRowId === row.id && (
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
            className="px-3 py-1 rounded bg-background-light border-border-color text-text-secondary hover:bg-background-dark disabled:opacity-50"
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
                  : "bg-background-light border-border-color text-text-secondary hover:bg-background-dark"
              }`}
              onClick={() => onPageChange(i + 1)}
              disabled={page === i + 1}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="px-3 py-1 rounded bg-background-light border-border-color text-text-secondary hover:bg-background-dark disabled:opacity-50"
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
