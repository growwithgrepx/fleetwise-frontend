import React from 'react';
import { render, screen } from '@testing-library/react';
import JobDetailCard from '@/components/organisms/JobDetailCard';

const mockJob = {
  id: 1,
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_mobile: '1234567890',
  type_of_service: 'Airport',
  pickup_location: 'Airport',
  dropoff_location: 'Hotel',
  pickup_date: '2024-01-01',
  pickup_time: '10:00',
  base_price: 100,
  final_price: 120,
  payment_status: 'Pending',
  status: 'Active',
  reference: 'REF1',
  remarks: 'None',
  message: 'Urgent',
  invoice_number: 'INV123',
};

describe('JobDetailCard', () => {
  it('renders all job details', () => {
    render(<JobDetailCard job={mockJob} />);
    expect(screen.getByText('Job Details')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    const airportMatches = screen.getAllByText('Airport');
    expect(airportMatches.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Hotel')).toBeInTheDocument();
    expect(screen.getByText('120.00')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('REF1')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('INV123')).toBeInTheDocument();
  });
}); 