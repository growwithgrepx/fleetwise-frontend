"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import TableSkeleton from "@/components/organisms/TableSkeleton";

export interface EntityTableColumn<T> {
  label: string | React.ReactNode;
  accessor: keyof T | string;
  render?: (row: T) => React.ReactNode;
  filterable?: boolean;
  width?: string;
  stringLabel?: string;
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

export interface JobsEntityTableProps<T extends { id: string | number; status?: string }> {
  columns: EntityTableColumn<T>[];
  data?: T[];
  actions?: EntityTableAction<T>[] | ((row: T) => EntityTableAction<T>[]);
  isLoading?: boolean;
  filters?: Record<string, string>;
  onFilterChange?: (column: string, value: string) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  className?: string;
  containerClassName?: string;
  rowClassName?: string | ((row: T) => string);
  onRowClick?: (row: T) => void;
  expandedRowId?: string | number | null;
  disableRowExpansion?: boolean;
}

export function JobsEntityTable<T extends { id: string | number; status?: string }>({
  columns,
  data = [],
  actions = [],
  isLoading = false,
  filters = {},
  onFilterChange,
  renderExpandedRow,
  onSelectionChange,
  className = "",
  containerClassName = "",
  rowClassName = "",
  onRowClick,
  expandedRowId = null,
  disableRowExpansion = false,
}: JobsEntityTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const hasActionColumn =
    typeof actions === "function" ? true : (actions as EntityTableAction<T>[]).length > 0;

  const totalColumns = React.useMemo(() => {
    return 1 + columns.length + (hasActionColumn ? 1 : 0);
  }, [columns.length, hasActionColumn]);

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

  const setContentRef =
    (rowId: string | number) => (el: HTMLDivElement | null) => {
      if (el) contentRefs.current[String(rowId)] = el;
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

  const isAllSelected = selectedRows.length > 0 && selectedRows.length === data.length;

  const resolveRowClass = (row: T) =>
    typeof rowClassName === "function" ? rowClassName(row) : rowClassName;

  const actionListForRow = (row: T): EntityTableAction<T>[] =>
    typeof actions === "function" ? actions(row) : actions;

  return (
    <div
      className={clsx(
        "rounded-lg border border-border-color/80 bg-background-light/95 shadow-inner backdrop-blur-sm",
        className
      )}
    >
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-3 py-2 sm:px-4">
          <div className="text-xs font-medium text-primary sm:text-sm">
            {selectedRows.length} {selectedRows.length === 1 ? "job" : "jobs"} selected
          </div>
        </div>
      )}
      <div
        ref={tableContainerRef}
        className={clsx(
          "max-h-[calc(100vh-220px)] overflow-x-auto overflow-y-auto",
          containerClassName
        )}
      >
        <table
          className="w-full border-collapse text-left text-[11px] text-text-main sm:text-xs"
          style={{ tableLayout: "auto", minWidth: "1100px" }}
        >
          <thead
            className={clsx(
              "sticky top-0 z-10 border-b border-border-color bg-background-light/95 backdrop-blur-md transition-shadow",
              isScrolled ? "shadow-[0_6px_12px_-4px_rgba(0,0,0,0.45)]" : ""
            )}
          >
            <tr>
              <th className="w-10 min-w-[2.5rem] px-2 py-2 sm:px-3">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                  className="form-checkbox h-3.5 w-3.5 rounded border-border-color bg-background-light text-primary focus:ring-primary/40 sm:h-4 sm:w-4"
                  aria-label="Select all jobs"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.accessor)}
                  className="align-top px-2 py-2 sm:px-3"
                  style={
                    col.width
                      ? { width: col.width, minWidth: col.width }
                      : { minWidth: "96px" }
                  }
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary sm:text-[11px]">
                    {col.label}
                  </div>
                  {col.filterable && onFilterChange && (
                    <input
                      type="text"
                      className="mt-0.5 w-full rounded border border-border-color bg-background-dark/40 px-1.5 py-1 text-[10px] text-text-main placeholder:text-text-secondary/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-xs"
                      placeholder="Filter…"
                      title={`Filter ${(col.stringLabel || col.accessor).toString().toLowerCase()}`}
                      value={filters[col.accessor as string] || ""}
                      onChange={(e) => onFilterChange(col.accessor as string, e.target.value)}
                    />
                  )}
                </th>
              ))}
              {hasActionColumn && (
                <th className="min-w-[140px] px-2 py-2 text-center sm:px-3">
                  <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-text-secondary">
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
                  className="py-10 text-center text-text-secondary"
                >
                  No jobs found.
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowActions = actionListForRow(row);
                const expanded = expandedRowId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={clsx(
                        "border-b border-border-color/50 transition-colors",
                        expanded
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-white/[0.04]",
                        resolveRowClass(row),
                        !disableRowExpansion && "cursor-pointer"
                      )}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("input") ||
                          target.closest("a") ||
                          target.closest('[role="button"]')
                        ) {
                          return;
                        }
                        if (!disableRowExpansion) {
                          onRowClick?.(row);
                        }
                      }}
                      aria-expanded={expanded}
                      role="row"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!disableRowExpansion) onRowClick?.(row);
                        }
                      }}
                    >
                      <td className="w-10 min-w-[2.5rem] px-2 py-2 align-middle sm:px-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="form-checkbox h-3.5 w-3.5 rounded border-border-color text-primary focus:ring-primary/40 sm:h-4 sm:w-4"
                          aria-label={`Select job ${row.id}`}
                        />
                      </td>
                      {columns.map((col) => (
                        <td
                          key={String(col.accessor) + "-" + row.id}
                          className="max-w-[220px] truncate px-2 py-2 align-middle sm:px-3"
                          style={
                            col.width
                              ? { width: col.width, minWidth: col.width }
                              : { minWidth: "96px" }
                          }
                          title={
                            col.render
                              ? undefined
                              : String((row as Record<string, unknown>)[col.accessor as string] ?? "")
                          }
                        >
                          {col.render
                            ? col.render(row)
                            : ((row as Record<string, unknown>)[
                                col.accessor as string
                              ] as React.ReactNode)}
                        </td>
                      ))}
                      {rowActions.length > 0 && (
                        <td className="min-w-[140px] px-2 py-2 text-center align-middle sm:px-3">
                          <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1">
                            {rowActions.map((action) => {
                              const isDisabled = action.disabled
                                ? action.disabled(row)
                                : false;
                              return (
                                <Button
                                  key={action.label}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(row);
                                  }}
                                  disabled={isDisabled}
                                  variant="ghost"
                                  size="sm"
                                  className={clsx(
                                    "h-8 w-8 shrink-0 rounded-md p-0 text-text-main hover:bg-white/10 hover:text-white",
                                    isDisabled && "pointer-events-none opacity-40"
                                  )}
                                  aria-label={action.ariaLabel || action.label}
                                  title={action.title || action.label}
                                >
                                  <span className="flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                                    {action.icon}
                                  </span>
                                </Button>
                              );
                            })}
                          </div>
                        </td>
                      )}
                    </tr>
                    {renderExpandedRow && expanded && (
                      <tr>
                        <td colSpan={totalColumns} className="p-0">
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{
                                opacity: 1,
                                height:
                                  contentRefs.current[String(row.id)]?.scrollHeight ||
                                  "auto",
                              }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div
                                ref={setContentRef(row.id)}
                                className="border-l-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 py-4 sm:px-6"
                              >
                                {renderExpandedRow(row)}
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
