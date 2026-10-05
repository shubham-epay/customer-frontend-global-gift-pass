import { useEffect, useId, useRef, useState } from 'react';
import { SelectField } from '../checkout/Fields';
import { Amex, Mastercard, Visa } from '../checkout/Badges';
import { CheckIcon, ChevronDown, LockIcon } from '../Icons';

export const METHOD_OPTIONS = [
  {
    id: 'CARD',
    label: 'Hosted Checkout',
    hint: 'Pay on SynraPay’s secure page',
    note: 'After you click “Pay now”, you’ll be taken to SynraPay’s secure payment page to enter your card, then brought back here.',
  },
  {
    id: 'HOSTED_SESSION',
    label: 'Hosted Session',
    hint: 'Card form embedded on this site',
    note: 'Pay by card in a secure form on the next step, without leaving this site. Card details go straight to SynraPay and never touch our servers.',
  },
  {
    id: 'DIRECT_CARD',
    label: 'Direct API',
    hint: 'Our own card form, with 3-D Secure',
    note: 'Enter your card details in our own form on the next step. Your bank may ask you to verify the payment (3-D Secure).',
  },
  {
    id: 'PAY_BY_LINK',
    label: 'Pay By Link',
    hint: 'Get a link to pay now or share',
    note: 'We create a secure payment link you can pay now, or share by email, WhatsApp or SMS.',
  },
];

export const LINK_TYPES = [
  { id: 'STANDARD', title: 'Standard link', text: 'Includes your order details. After paying you come back to Global Gift Pass.' },
  { id: 'QUICK', title: 'Quick link', text: 'Just the amount and your contact details, like an invoice. You’ll see the result on the payment page.' },
];

export const LINK_EXPIRY = [
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
];

/**
 * Styled dropdown (listbox) for the payment method: each option shows its name and a one-line hint.
 * Keyboard: Enter/Space/Arrow keys open it, arrows move, Enter selects, Escape closes.
 */
function MethodSelect({ options, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const btn = useRef(null);
  const id = useId();
  const index = Math.max(options.findIndex((o) => o.id === value), 0);
  const current = options[index];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openList = () => { setActive(index); setOpen(true); };
  const choose = (i) => { onChange(options[i].id); setOpen(false); btn.current?.focus(); };
  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
  };

  return (
    <div className={`pm-select${open ? ' is-open' : ''}`} ref={root}>
      <button
        type="button"
        ref={btn}
        className="pm-select__btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        disabled={disabled || options.length < 2}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="pm-select__text">
          <small>Payment method</small>
          <b>{current?.label}</b>
        </span>
        {options.length > 1 && <ChevronDown width={18} height={18} className="pm-select__chev" />}
      </button>
      {open && (
        <ul className="pm-select__list" role="listbox" id={`${id}-list`} aria-label="Payment method">
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.id === value}
              className={`pm-select__opt${i === active ? ' is-active' : ''}${o.id === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              <span className="pm-select__opt-text"><b>{o.label}</b><small>{o.hint}</small></span>
              {o.id === value && <CheckIcon width={18} height={18} className="pm-select__tick" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Payment method dropdown. Pay By Link reveals its two link types and how long the link stays valid. */
export default function PaymentMethodPicker({ value, onChange, methods, disabled, children }) {
  const options = METHOD_OPTIONS.filter((m) => !methods || methods.includes(m.id));
  const current = options.find((m) => m.id === value.method) || options[0];
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="pm">
      <MethodSelect options={options} value={current?.id} onChange={(method) => set({ method })} disabled={disabled} />

      <div className="co-pay-opt__body pm__body">
        <div className="pm__head">
          <p className="co-pay-note"><LockIcon width={16} height={16} />{current?.note}</p>
          {current?.id !== 'PAY_BY_LINK' && <span className="co-pay-opt__badges"><Mastercard /><Visa /><Amex /></span>}
        </div>

        {current?.id === 'PAY_BY_LINK' && (
          <>
            <div className="pm-links" role="radiogroup" aria-label="Link type">
              {LINK_TYPES.map((t) => (
                <label key={t.id} className={`pm-link${value.linkType === t.id ? ' is-active' : ''}`}>
                  <input type="radio" name="linkType" value={t.id} checked={value.linkType === t.id} onChange={() => set({ linkType: t.id })} disabled={disabled} />
                  <span className="co-radio" aria-hidden="true" />
                  <span><b>{t.title}</b><small>{t.text}</small></span>
                </label>
              ))}
            </div>
            <SelectField label="Link valid for" value={String(value.expiresInHours)} onChange={(h) => set({ expiresInHours: Number(h) })}>
              {LINK_EXPIRY.map((o) => <option key={o.hours} value={o.hours}>{o.label}</option>)}
            </SelectField>
          </>
        )}
        {children}
      </div>
    </div>
  );
}
