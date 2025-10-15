"use client";

import React from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { EntityTableAction } from '@/components/organisms/EntityTable';
import { Button } from '@/components/ui/button';

type ID = string | number;

interface ActionConfig<T extends { id: ID }> {
  router: AppRouterInstance;
  resource: string;
  handleDelete: (id: ID) => void;
  isDeleting?: (item: T) => boolean;
}

export function createStandardEntityActions<T extends { id: ID }>({
  router,
  resource,
  handleDelete,
  isDeleting,
}: ActionConfig<T>): EntityTableAction<T>[] {
  const resourceName = resource.slice(0, -1);

  return [
    {
      label: 'View',
      icon: (
        <Button variant="ghost" size="icon" aria-label={`View ${resourceName}`}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
      onClick: (item) => router.push(`/${resource}/${item.id}`),
      ariaLabel: `View ${resourceName}`,
    },
    {
      label: 'Edit',
      icon: (
        <Button variant="ghost" size="icon" aria-label={`Edit ${resourceName}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
      onClick: (item) => router.push(`/${resource}/${item.id}/edit`),
      ariaLabel: `Edit ${resourceName}`,
    },
    {
      label: 'Delete',
      icon: (
        <Button variant="ghost" size="icon" aria-label={`Delete ${resourceName}`}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      ),
      onClick: (item) => handleDelete(item.id as string),
      ariaLabel: `Delete ${resourceName}`,
      disabled: isDeleting,
    },
  ];
}
