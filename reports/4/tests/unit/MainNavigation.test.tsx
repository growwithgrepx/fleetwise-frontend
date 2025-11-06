import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainNavigation } from '@/components/organisms/MainNavigation';

describe('MainNavigation', () => {
  it('renders navigation bar', () => {
    render(<MainNavigation />);
    expect(screen.getByText('Fleet Management')).toBeInTheDocument();
  });
}); 