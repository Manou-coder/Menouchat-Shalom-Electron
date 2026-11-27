import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { SwitchButton, SwitchField } from 'react-aria-components';

const fieldClass =
  'min-h-11 w-full min-w-0 rounded-xl border px-3 text-text shadow-xs outline-none transition-colors focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-focus/40 user-invalid:border-danger disabled:opacity-60';
const inputClass = `${fieldClass} border-border bg-surface`;
/** A field the user changed but has not saved yet. */
const changedInputClass = `${fieldClass} border-accent bg-accent-soft`;

/** For inputs laid out without a visible label of their own, such as the rows of a list. */
export function inputClassFor(changed: boolean): string {
  return changed ? changedInputClass : inputClass;
}

interface FieldProps {
  label: string;
  /** Shown under the field, e.g. a unit or a hint. */
  description?: string;
  children: (props: { id: string; describedBy: string | undefined }) => ReactNode;
}

/** A visible label above its control, linked for screen readers (plan §9). */
function Field({ label, description, children }: FieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text-muted">
        {label}
      </label>
      {children({ id, describedBy: description === undefined ? undefined : descriptionId })}
      {description !== undefined && (
        <p id={descriptionId} className="text-sm text-text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>;

export function TextInput({
  label,
  description,
  value,
  onChange,
  ...rest
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
} & NativeInputProps) {
  return (
    <Field label={label} {...(description === undefined ? {} : { description })}>
      {({ id, describedBy }) => (
        <input
          {...rest}
          id={id}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className={inputClass}
        />
      )}
    </Field>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      {({ id }) => (
        <input
          id={id}
          type="number"
          inputMode={step < 1 ? 'decimal' : 'numeric'}
          required
          dir="ltr"
          min={min}
          max={max}
          step={step}
          value={Number.isNaN(value) ? '' : value}
          onChange={(event) => {
            onChange(event.target.valueAsNumber);
          }}
          className={`${inputClass} tabular-nums`}
        />
      )}
    </Field>
  );
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** `ltr` for Latin values such as time zone names. */
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <Field label={label}>
      {({ id }) => (
        <select
          id={id}
          dir={dir}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className={inputClass}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Toggle({
  label,
  isSelected,
  onChange,
  isDisabled = false,
}: {
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  isDisabled?: boolean;
}) {
  return (
    <SwitchField isSelected={isSelected} onChange={onChange} isDisabled={isDisabled}>
      <SwitchButton className="group flex min-h-11 cursor-pointer items-center gap-3 whitespace-nowrap data-disabled:cursor-default data-disabled:opacity-60">
        <span className="flex h-7 w-12 shrink-0 items-center rounded-full bg-border px-1 transition-colors group-data-focus-visible:ring-3 group-data-focus-visible:ring-focus group-data-selected:bg-accent">
          <span className="size-5 rounded-full bg-white shadow transition-transform group-data-selected:-translate-x-5 ltr:group-data-selected:translate-x-5" />
        </span>
        {label}
      </SwitchButton>
    </SwitchField>
  );
}
