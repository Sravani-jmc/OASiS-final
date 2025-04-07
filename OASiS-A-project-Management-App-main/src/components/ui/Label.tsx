import { LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  error?: string;
}

export function Label({ className, error, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'block text-sm font-medium text-ink-700 mb-1',
        error && 'text-red-600',
        className
      )}
      {...props}
    >
      {children}
      {error && <span className="ml-1 text-sm text-red-600">{error}</span>}
    </label>
  );
} 