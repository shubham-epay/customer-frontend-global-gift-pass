/* Payment brand marks and the "Secure SSL" seal used on the checkout page (drawn inline, no image files). */

export const Mastercard = () => (
  <span className="pay-badge pay-badge--dark" aria-label="Mastercard">
    <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true"><circle cx="9" cy="8" r="7" fill="#EB001B" /><circle cx="17" cy="8" r="7" fill="#F79E1B" /><path d="M13 2.6a7 7 0 0 1 0 10.8 7 7 0 0 1 0-10.8Z" fill="#FF5F00" /></svg>
  </span>
);
export const Visa = () => <span className="pay-badge pay-badge--visa" aria-label="Visa">VISA</span>;
export const Amex = () => <span className="pay-badge pay-badge--amex" aria-label="American Express">AM<br />EX</span>;
export const UnionPay = () => <span className="pay-badge pay-badge--unionpay" aria-label="UnionPay">Union<br />Pay</span>;
export const Tabby = () => <span className="pay-badge pay-badge--tabby" aria-label="Tabby">tabby</span>;
export const Tamara = () => (
  <span className="pay-badge pay-badge--tamara" aria-label="Tamara">
    <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true"><ellipse cx="7.5" cy="7" rx="6" ry="5" fill="#fff" /><ellipse cx="18.5" cy="7" rx="6" ry="5" fill="#fff" /></svg>
  </span>
);

export function SecureSeal() {
  return (
    <span className="secure-seal" aria-label="Secure SSL encryption">
      <svg width="40" height="46" viewBox="0 0 40 46" aria-hidden="true">
        <path d="M20 2 36 8v13c0 11-7 19-16 23C11 40 4 32 4 21V8l16-6Z" fill="#7CB342" stroke="#558B2F" strokeWidth="2" />
        <path d="M20 7 31 11v10c0 8-5 14-11 17C14 35 9 29 9 21V11l11-4Z" fill="#9CCC65" />
        <rect x="14" y="21" width="12" height="9" rx="1.5" fill="#F9A825" />
        <path d="M16.5 21v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="#F9A825" strokeWidth="2" />
      </svg>
      <span className="secure-seal__text"><b>SECURE</b><small>SSL ENCRYPTION</small></span>
    </span>
  );
}
