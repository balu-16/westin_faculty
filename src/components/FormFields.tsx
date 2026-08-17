import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { ChevronDown, Upload } from 'lucide-react'
import { cx } from '../utils'

/* ---------- Shared label ---------- */

interface LabelProps {
  htmlFor?: string
  required?: boolean
  children: ReactNode
}

function FieldLabel({ htmlFor, required, children }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}

const controlClasses = (invalid?: boolean) =>
  cx(
    'h-11 w-full rounded-xl border bg-primary-lighter/60 px-4 text-sm text-ink transition-colors duration-200 placeholder:text-ink-soft/60 focus:bg-white focus:outline-none',
    invalid
      ? 'border-danger focus:border-danger'
      : 'border-line focus:border-primary',
  )

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-danger">
      {message}
    </p>
  )
}

/* ---------- Text input ---------- */

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
  error?: string
}

export function TextField({ label, required, error, id, className, ...props }: TextFieldProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input id={id} aria-invalid={!!error} className={controlClasses(!!error)} {...props} />
      <FieldError message={error} />
    </div>
  )
}

/* ---------- Select ---------- */

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  required?: boolean
  error?: string
  placeholder?: string
  options: Array<{ value: string; label: string }>
}

export function SelectField({
  label,
  required,
  error,
  placeholder,
  options,
  id,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          className={cx(controlClasses(!!error), 'appearance-none pr-10')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
      </div>
      <FieldError message={error} />
    </div>
  )
}

/* ---------- Textarea ---------- */

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  required?: boolean
  error?: string
}

export function TextAreaField({ label, required, error, id, className, ...props }: TextAreaFieldProps) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        aria-invalid={!!error}
        className={cx(controlClasses(!!error), 'h-auto min-h-[88px] resize-y py-2.5')}
        {...props}
      />
      <FieldError message={error} />
    </div>
  )
}

/* ---------- File upload ---------- */

interface FileFieldProps {
  label: string
  required?: boolean
  error?: string
  /** Accepted attribute for the hidden input, e.g. "application/pdf" */
  accept?: string
  hint?: string
  fileName: string | null
  onChange: (_file: File | null) => void
  className?: string
}

export function FileField({
  label,
  required,
  error,
  accept,
  hint = 'PDF, DOC, DOCX, PPT or XLS — up to 25 MB',
  fileName,
  onChange,
  className,
}: FileFieldProps) {
  return (
    <div className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <label
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-200',
          fileName
            ? 'border-primary/50 bg-primary-lighter'
            : 'border-line bg-primary-lighter/40 hover:border-primary/40 hover:bg-primary-lighter/70',
          error && 'border-danger',
        )}
      >
        <Upload size={20} className="text-primary" aria-hidden="true" />
        <span className="max-w-full truncate text-sm font-semibold text-ink">
          {fileName ?? 'Click to upload or drag and drop'}
        </span>
        <span className="text-xs text-ink-soft">{fileName ? 'Click to replace the file' : hint}</span>
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      <FieldError message={error} />
    </div>
  )
}
