import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        sync: 'border-transparent bg-blue-100 text-blue-800',
        stakeholder: 'border-transparent bg-purple-100 text-purple-800',
        dryrun: 'border-transparent bg-orange-100 text-orange-800',
        review: 'border-transparent bg-green-100 text-green-800',
        external: 'border-transparent bg-gray-100 text-gray-800',
        count: 'border-transparent bg-secondary text-secondary-foreground tabular-nums',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
