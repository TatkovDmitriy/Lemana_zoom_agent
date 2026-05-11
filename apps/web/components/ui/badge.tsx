import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground ring-transparent',
        secondary: 'bg-secondary text-secondary-foreground ring-transparent',
        outline: 'bg-transparent text-foreground ring-border',
        count: 'bg-muted text-muted-foreground ring-transparent',
        sync: 'bg-blue-50 text-blue-700 ring-blue-200',
        stakeholder: 'bg-violet-50 text-violet-700 ring-violet-200',
        dryrun: 'bg-amber-50 text-amber-700 ring-amber-200',
        review: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        external: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
