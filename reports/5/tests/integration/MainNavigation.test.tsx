import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MainNavigation from '@/components/organisms/MainNavigation';
import * as nextNavigation from 'next/navigation';

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  usePathname: jest.fn(),
}));

const links = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Drivers', href: '/drivers' },
  { label: 'Agents', href: '/agents' },
  { label: 'Services', href: '/services' },
  { label: 'Vehicles', href: '/vehicles' },
];

describe('MainNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to dashboard
    (nextNavigation.usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('renders all navigation links with correct hrefs', () => {
    render(<MainNavigation />);
    const desktopNav = screen.getByTestId('desktop-nav');
    links.forEach(({ label, href }) => {
      const link = screen.getAllByRole('link', { name: label }).find(l => desktopNav.contains(l));
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', href);
    });
  });

  it('applies active styling to the current page link', () => {
    (nextNavigation.usePathname as jest.Mock).mockReturnValue('/jobs');
    render(<MainNavigation />);
    const desktopNav = screen.getByTestId('desktop-nav');
    const jobsLink = screen.getAllByRole('link', { name: 'Jobs' }).find(l => desktopNav.contains(l));
    expect(jobsLink).toHaveAttribute('data-active', 'true');
    // All other links should not be active
    links.filter(l => l.label !== 'Jobs').forEach(({ label }) => {
      const link = screen.getAllByRole('link', { name: label }).find(l => desktopNav.contains(l));
      expect(link).not.toHaveAttribute('data-active', 'true');
    });
  });

  it('shows hamburger menu and hides nav links on mobile', () => {
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    render(<MainNavigation />);
    const hamburger = screen.getByLabelText(/open navigation menu/i);
    expect(hamburger).toBeVisible();
    const mobileNav = screen.getByTestId('mobile-nav');
    expect(mobileNav).not.toBeVisible();
    links.forEach(({ label }) => {
      const link = screen.getAllByRole('link', { name: label }).find(l => mobileNav.contains(l));
      if (link) expect(link).not.toBeVisible();
    });
  });

  it('toggles mobile menu when hamburger is clicked', () => {
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    render(<MainNavigation />);
    const hamburger = screen.getByLabelText(/open navigation menu/i);
    fireEvent.click(hamburger);
    const mobileNav = screen.getByTestId('mobile-nav');
    expect(mobileNav).toBeVisible();
    links.forEach(({ label }) => {
      const link = screen.getAllByRole('link', { name: label }).find(l => mobileNav.contains(l));
      expect(link).toBeVisible();
    });
    fireEvent.click(hamburger);
    expect(mobileNav).not.toBeVisible();
    links.forEach(({ label }) => {
      const link = screen.getAllByRole('link', { name: label }).find(l => mobileNav.contains(l));
      if (link) expect(link).not.toBeVisible();
      else expect(link).toBeUndefined();
    });
  });
}); 