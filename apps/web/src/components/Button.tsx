import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

const variants = {
  primary: 'bg-accent px-5 text-on-accent data-hovered:bg-accent-hover',
  secondary: 'border border-border bg-surface px-4 text-text data-hovered:bg-background',
  danger: 'border border-danger bg-surface px-4 text-danger data-hovered:bg-background',
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
      className={`min-h-11 cursor-pointer rounded-lg data-disabled:cursor-default data-disabled:opacity-50 data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-focus ${variants[variant]}`}
    />
  );
}
