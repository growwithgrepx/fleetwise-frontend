import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('rounded-lg border border-border-color bg-background-light text-text-main shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export { Card };

