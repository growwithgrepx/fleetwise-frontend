import React from 'react';
import { render, screen } from '@testing-library/react';
import TableSkeleton from '@/components/organisms/TableSkeleton';

describe('TableSkeleton', () => {
  it('renders default skeleton with 6 rows and 8 columns', () => {
    render(<TableSkeleton />);
    expect(screen.getAllByRole('row')).toHaveLength(7); // 1 header + 6 rows
  });
  it('renders custom skeleton with 3 rows and 4 columns', () => {
    render(<TableSkeleton rows={3} columns={4} />);
    expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 rows
  });
}); 