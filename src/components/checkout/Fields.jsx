import { useId, useState } from 'react';
import { ChevronDown } from '../Icons';

/** Round "?" with a small popover, as used next to Email / Phone / Shipping in the design. */
export function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="help-tip">
      <button type="button" aria-label="More information" aria-expanded={open} onClick={() => setOpen(!open)} onBlur={() => setOpen(false)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4" /><circle cx="12" cy="16.8" r=".6" fill="currentColor" /></svg>
      </button>
      {open && <span role="tooltip" className="help-tip__pop">{text}</span>}
    </span>
  );
}

/** Text input with a floating label (label sits inside until there is a value). */
export function Field({ label, error, value, onChange, type = 'text', help, prefix, className = '', inputRef, ...rest }) {
  const id = useId();
  return (
    <div className={`cf ${error ? 'cf--error' : ''} ${prefix ? 'cf--prefix' : ''} ${className}`}>
      <div className="cf__box">
        {prefix}
        <div className="cf__control">
          <input
            id={id}
            ref={inputRef}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder=" "
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-err` : undefined}
            {...rest}
          />
          <label htmlFor={id}>{label}</label>
        </div>
        {help && <HelpTip text={help} />}
      </div>
      {error && <p id={`${id}-err`} className="cf__error">{error}</p>}
    </div>
  );
}

/** Select with its label always shown above the value (e.g. "Country/Region"). */
export function SelectField({ label, error, value, onChange, children, className = '', placeholder }) {
  const id = useId();
  return (
    <div className={`cf cf--select ${value ? '' : 'cf--empty'} ${error ? 'cf--error' : ''} ${className}`}>
      <div className="cf__box">
        <div className="cf__control">
          <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}>
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {children}
          </select>
          <label htmlFor={id}>{label}</label>
        </div>
        <ChevronDown width={16} height={16} className="cf__chev" />
      </div>
      {error && <p className="cf__error">{error}</p>}
    </div>
  );
}

export function Check({ checked, onChange, children }) {
  return (
    <label className="cf-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="cf-check__box" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
