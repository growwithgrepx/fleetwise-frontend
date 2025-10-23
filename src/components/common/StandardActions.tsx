"use client";

import React from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { EntityTableAction } from '@/components/organisms/EntityTable';

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
      icon: <Eye className="h-4 w-4" />,
      onClick: (item) => router.push(`/${resource}/${item.id}`),
      ariaLabel: `View ${resourceName}`,
    },
    {
      label: 'Edit',
      icon: <Pencil className="lucide lucide-pencil h-4 w-4 text-gray-600 dark:text-gray-300" />,
      onClick: (item) => router.push(`/${resource}/${item.id}/edit`),
      ariaLabel: `Edit ${resourceName}`,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4 text-red-500" />,
      onClick: (item) => handleDelete(item.id as string),
      ariaLabel: `Delete ${resourceName}`,
      disabled: isDeleting,
    },
  ];
}