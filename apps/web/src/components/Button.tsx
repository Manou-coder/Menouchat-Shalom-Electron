import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

/** The admin's primary button: at least 44 px tall for touch, with a visible focus ring. */
export function Button(props: Omit<ButtonProps, 'className'>) {
  return (
    <AriaButton
      {...props}
      className="min-h-11 cursor-pointer rounded-lg bg-accent px-5 text-on-accent data-disabled:cursor-default data-disabled:opacity-60 data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-focus data-hovered:bg-accent-hover"
    />
  );
}
