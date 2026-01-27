import { useMemo } from 'react';
import { Eye, Pencil, Copy, Trash2 } from 'lucide-react';
import { EntityTableAction } from '@/components/organisms/EntityTable';

export interface Job {
  id: number;
  status: string;
  [key: string]: any;
}

interface UseJobActionsParams {
  role: string;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (id: string | number) => void;
  onCopy: (job: Job) => void;
  isDeleting: (job: Job) => boolean;
}

export const useJobActions = ({
  role,
  onView,
  onEdit,
  onDelete,
  onCopy,
  isDeleting
}: UseJobActionsParams) => {
  const restrictedRolesDelete = ['driver', 'customer', 'guest'];
  const restrictedRolesEdit = ['driver', 'guest'];

  const actions = useMemo((): EntityTableAction<Job>[] => {
    let baseActions: EntityTableAction<Job>[] = [
      {
        label: 'View',
        icon: <Eye className="w-5 h-5 text-primary" />,
        onClick: onView,
        ariaLabel: 'View job details',
        title: 'View'
      },
      {
        label: 'Edit',
        icon: <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-300" />,
        onClick: onEdit,
        ariaLabel: 'Edit job',
        title: 'Edit'
      },
      {
        label: 'Copy',
        icon: <Copy className="w-5 h-5 text-blue-500" />,
        onClick: onCopy,
        ariaLabel: 'Copy job',
        title: 'Copy'
      },
      {
        label: 'Delete',
        icon: <Trash2 className="w-5 h-5 text-red-500" />,
        onClick: (job) => onDelete(job.id),
        ariaLabel: 'Delete job',
        title: 'Delete',
        disabled: isDeleting
      }
    ];

    // Filter by role restrictions
    if (restrictedRolesDelete.includes(role)) {
      baseActions = baseActions.filter((a) => a.label !== 'Delete');
    }

    if (restrictedRolesEdit.includes(role)) {
      baseActions = baseActions.filter((a) => a.label !== 'Edit' && a.label !== 'Copy');
    }

    // Apply role-based disable rules (compose with existing disabled condition)
    baseActions = baseActions.map((a) => {
      if (a.label === 'Edit' || a.label === 'Delete') {
        return {
          ...a,
          disabled: (job: Job) => {
            const previouslyDisabled =
              typeof a.disabled === 'function' ? a.disabled(job) : !!a.disabled;
            const customerRestricted =
              role === 'customer' && ['jc', 'sd', 'canceled'].includes(job.status);
            return previouslyDisabled || customerRestricted;
          }
        };
      }
      return a;
    });

    return baseActions;
  }, [role, onView, onEdit, onDelete, onCopy, isDeleting]);

  return actions;
};
