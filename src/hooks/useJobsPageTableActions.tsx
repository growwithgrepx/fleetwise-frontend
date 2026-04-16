"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import type { EntityTableAction } from "@/components/organisms/jobs/JobsEntityTable";
import type { Job } from "@/types/job";

interface Params {
  role: string;
  /** Same as Manage Jobs: staff who can update status / cancel / re-instate */
  canManageLifecycle: boolean;
  onToggleDetail: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (id: string | number) => void;
  onCopy: (job: Job) => void;
  onUpdateStatus: (job: Job) => void;
  onCancelJob: (job: Job) => void;
  onReinstate: (job: Job) => void;
  isDeleting: (job: Job) => boolean;
  /** Opens the inline Job Audit Trail modal instead of navigating away */
  onViewAuditTrail?: (job: Job) => void;
}

export function useJobsPageTableActions({
  role,
  canManageLifecycle,
  onToggleDetail,
  onEdit,
  onDelete,
  onCopy,
  onUpdateStatus,
  onCancelJob,
  onReinstate,
  isDeleting,
  onViewAuditTrail,
}: Params): (job: Job) => EntityTableAction<Job>[] {
  const router = useRouter();

  return useMemo(() => {
    const restrictedRolesDelete = ["driver", "customer", "guest"];
    const restrictedRolesEdit = ["driver", "guest"];

    return (job: Job) => {
      let row: EntityTableAction<Job>[] = [
        // {
        //   label: "Detail",
        //   icon: <FileText className="text-sky-400" />,
        //   onClick: onToggleDetail,
        //   ariaLabel: "View job details",
        //   title: "View / details",
        // },
        {
          label: "Edit",
          icon: <Pencil className="text-zinc-300" />,
          onClick: onEdit,
          ariaLabel: "Edit job",
          title: "Edit",
        },
        //{
        //  label: "Copy",
        //  icon: <Copy className="text-blue-400" />,
        //  onClick: onCopy,
        //  ariaLabel: "Duplicate job",
        //  title: "Duplicate",
        //},
        //{
        //  label: "Delete",
        //  icon: <Trash2 className="text-red-400" />,
        //  onClick: (j) => onDelete(j.id),
        //  ariaLabel: "Delete job",
        //  title: "Delete",
        //  disabled: isDeleting,
        //},
      ];

      if (canManageLifecycle) {
        // Always show Update Status — disabled for terminal statuses
        row.push({
          label: "Update Status",
          icon: <RefreshCw className="text-blue-400" />,
          onClick: (j) => onUpdateStatus(j),
          ariaLabel: "Update job status",
          title: "Update Status",
          disabled: (j: Job) => j.status === "sd" || j.status === "jc" || j.status === "canceled",
        });
        // Always show Cancel — disabled for already-canceled / terminal jobs
        row.push({
          label: "Cancel",
          icon: <X className="text-red-500" />,
          onClick: (j) => onCancelJob(j),
          ariaLabel: "Cancel job",
          title: "Cancel",
          disabled: (j: Job) => j.status === "canceled" || j.status === "sd" || j.status === "jc",
        });
    }

      // Copy, Delete, Re-instate, History moved to job card

      if (restrictedRolesEdit.includes(role)) {
        row = row.filter((a) => a.label !== "Edit");
      }

      row = row.map((a) => {
        if (a.label === "Edit") {
          return {
            ...a,
            disabled: (j: Job) => {
              const prev =
                typeof a.disabled === "function" ? a.disabled(j) : !!a.disabled;
              const customerRestricted =
                role === "customer" &&
                ["jc", "sd", "canceled"].includes(j.status);
              return prev || customerRestricted;
            },
          };
        }
        return a;
      });

      return row;
    };
  }, [
    role,
    canManageLifecycle,
    onEdit,
    onUpdateStatus,
    onCancelJob,
    router,
  ]);
}
