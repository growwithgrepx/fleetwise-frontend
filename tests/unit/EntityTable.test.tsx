/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntityTable, EntityTableColumn, EntityTableAction } from '@/components/organisms/EntityTable';


// Mock data
interface MockData {
  id: number;
  name: string;
  value: number;
}

const mockData: MockData[] = [
  { id: 1, name: 'Item 1', value: 100 },
  { id: 2, name: 'Item 2', value: 200 },
  { id: 3, name: 'Item 3', value: 300 },
];

const mockColumns: EntityTableColumn<MockData>[] = [
  { label: 'ID', accessor: 'id' },
  { label: 'Name', accessor: 'name' },
  { label: 'Value', accessor: 'value', render: (row) => `$${row.value}` },
];

describe('EntityTable', () => {
  it('renders correctly with basic data', () => {
    render(<EntityTable columns={mockColumns} data={mockData} />);
    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('$200')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<EntityTable columns={mockColumns} isLoading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument(); // Assuming TableSkeleton has a role of 'status'
  });

  it('renders "No data found" when data is an empty array', () => {
    render(<EntityTable columns={mockColumns} data={[]} />);
    expect(screen.getByText('No data found.')).toBeInTheDocument();
  });

  it('renders "No data found" when data is null', () => {
    render(<EntityTable columns={mockColumns} data={null as any} />);
    expect(screen.getByText('No data found.')).toBeInTheDocument();
  });

  it('renders "No data found" when data is undefined', () => {
    render(<EntityTable columns={mockColumns} data={undefined} />);
    expect(screen.getByText('No data found.')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const handleSelectionChange = jest.fn();
    render(<EntityTable columns={mockColumns} data={mockData} onSelectionChange={handleSelectionChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // [0] is the header checkbox, [1] is the first row
    fireEvent.click(checkboxes[1]);

    expect(handleSelectionChange).toHaveBeenCalledWith([1]);
  });

  it('handles select all rows', () => {
    const handleSelectionChange = jest.fn();
    render(<EntityTable columns={mockColumns} data={mockData} onSelectionChange={handleSelectionChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Header checkbox

    expect(handleSelectionChange).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('calls action onClick handler', () => {
    const mockActionClick = jest.fn();
    const mockActions: EntityTableAction<MockData>[] = [
      { label: 'Edit', icon: <span>Edit</span>, onClick: mockActionClick },
    ];

    render(<EntityTable columns={mockColumns} data={mockData} actions={mockActions} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockActionClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('renders expanded row content', () => {
    const renderExpandedRow = (row: MockData) => <div>Expanded content for {row.name}</div>;
    render(<EntityTable columns={mockColumns} data={mockData} renderExpandedRow={renderExpandedRow} />);

    const expandButtons = screen.getAllByRole('button', { name: '' }); // Buttons to expand rows
    fireEvent.click(expandButtons[1]); // Click the expand button on the first row

    expect(screen.getByText('Expanded content for Item 1')).toBeInTheDocument();
  });
});
