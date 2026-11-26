import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

const variants = {
  primary: 'bg-accent px-5 font-medium text-on-accent shadow-sm data-hovered:bg-accent-hover',
  secondary:
    'border border-border bg-surface px-4 font-medium text-text shadow-sm data-hovered:bg-background',
  danger:
    'border border-danger/40 bg-surface px-4 font-medium text-danger data-hovered:bg-danger-soft',
  /** Square, for an icon or a single character; give it an aria-label. */
  icon: 'w-11 border border-border bg-surface text-text data-hovered:bg-background',
} as const;

/** At least 44 px tall for touch, with a visible focus ring (plan §9). */
export function Button({
  variant = 'primary',
  ...props
}: Omit<ButtonProps, 'className'> & { variant?: keyof typeof variants }) {
  return (
    <AriaButton
      {...props}
      className={`min-h-11 cursor-pointer rounded-xl transition-colors data-disabled:cursor-default data-disabled:opacity-50 data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-focus data-pending:cursor-wait ${variants[variant]}`}
    />
  );
}
