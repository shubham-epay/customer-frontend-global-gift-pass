/**
 * Card form validation for the Direct API checkout.
 *
 * Everything the shopper types into the card form goes through this file before it is sent:
 *  - card number: digits only, a known card brand (from the BIN table), the right length for that
 *    brand, not a run of one repeated digit, and a valid Luhn checksum;
 *  - expiry: a real month, not in the past and not unreasonably far in the future;
 *  - security code: digits only, exactly as long as the brand uses (4 for Amex, 3 for the rest);
 *  - name on card: an allowlist of letters, spaces and . ' - plus explicit checks for SQL / NoSQL
 *    injection, HTML / script injection, control and invisible characters.
 *
 * These checks run in the browser only and give the shopper instant feedback; the backend keeps its
 * own basic card checks. Error messages never echo what was typed.
 *
 * Every check is logged to the console in development (see logCheck below) so you can watch the
 * validation run. Card data is masked in those logs: the number shows only its last 4 digits and the
 * security code / name only their length. Nothing is logged in a production build.
 */
import binTable from '../data/cardBins.json';

/* ------------------------------------------------------------------------------------------------
 * Debug logging
 * ---------------------------------------------------------------------------------------------- */

// Logs only in `vite dev`; a production build skips every log call.
const LOG_ENABLED = import.meta.env.DEV;

/**
 * Logs one validation check and returns whether it passed, so validators can write
 * `if (!logCheck('number', 'Luhn checksum', luhnCheck(d))) return '...'`.
 * `detail` must never hold a full card number, security code or name - pass a masked value.
 */
function logCheck(field, check, passed, detail = '') {
  if (LOG_ENABLED) console.log(`[cardValidation] ${field} | ${check}: ${passed ? 'PASS' : 'FAIL'}${detail ? ` (${detail})` : ''}`);
  return passed;
}

/** "•••• 1111 (16 digits)": safe to log, never the whole number. */
const maskNumber = (digitsOnly) => `•••• ${digitsOnly.slice(-4)} (${digitsOnly.length} digits)`;

/* ------------------------------------------------------------------------------------------------
 * BIN table
 * ---------------------------------------------------------------------------------------------- */

/**
 * Checks each cardBins.json entry and turns it into { brand, label, start, end, prefixLength, lengths, cvvLength }.
 * The JSON is bundled with the app at build time, so there is no network request and nobody can swap
 * it at runtime. prefixStart / prefixEnd are strings so their digit count is kept ("2221" = 4 digits).
 * A malformed entry is skipped rather than breaking the checkout page.
 */
function loadBinTable(entries) {
  const rows = [];
  (Array.isArray(entries) ? entries : []).forEach((r, i) => {
    const ok = r && /^[a-z]+$/.test(r.brand || '')
      && /^\d{1,6}$/.test(r.prefixStart || '') && /^\d{1,6}$/.test(r.prefixEnd || '')
      // Both ends of a range must have the same number of digits so they can be compared as numbers.
      && r.prefixStart.length === r.prefixEnd.length
      && Number(r.prefixStart) <= Number(r.prefixEnd)
      && Array.isArray(r.lengths) && r.lengths.length > 0
      && r.lengths.every((n) => Number.isInteger(n) && n >= 12 && n <= 19)
      && (r.cvvLength === 3 || r.cvvLength === 4);
    if (!ok) {
      if (LOG_ENABLED) console.warn(`cardBins.json: skipping malformed entry at index ${i}`);
      return;
    }
    rows.push({
      brand: r.brand,
      label: r.label || r.brand,
      start: Number(r.prefixStart),
      end: Number(r.prefixEnd),
      prefixLength: r.prefixStart.length,
      lengths: r.lengths,
      cvvLength: r.cvvLength,
    });
  });
  return rows;
}

const BIN_ROWS = loadBinTable(binTable);
if (LOG_ENABLED) console.log(`[cardValidation] BIN table loaded: ${BIN_ROWS.length} ranges`);

/** The brands we accept: { visa: { brand, label, lengths, cvvLength }, ... } (lengths merged over all ranges). */
export const CARD_BRANDS = BIN_ROWS.reduce((acc, r) => {
  const b = acc[r.brand] || { brand: r.brand, label: r.label, lengths: [], cvvLength: r.cvvLength };
  b.lengths = [...new Set([...b.lengths, ...r.lengths])].sort((x, y) => x - y);
  return { ...acc, [r.brand]: b };
}, {});

/* ------------------------------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------------------------------- */

/** Keeps only 0-9. Any letter, symbol or emoji the shopper (or a script) puts in is dropped. */
export const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');

/**
 * Luhn (mod 10) checksum: every card number ends in a check digit, so a single mistyped digit or two
 * swapped neighbours are caught here instead of being declined by the bank.
 * Walking from the right, every second digit is doubled (minus 9 if that is over 9); the sum must end in 0.
 */
export function luhnCheck(number) {
  if (!/^\d+$/.test(number)) return false;
  let sum = 0;
  for (let i = number.length - 1, double = false; i >= 0; i -= 1, double = !double) {
    let n = number.charCodeAt(i) - 48;
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  if (LOG_ENABLED) console.log(`[cardValidation] Luhn sum = ${sum}, sum % 10 = ${sum % 10}`);
  return sum % 10 === 0;
}

/**
 * Finds the brand of a (possibly partly typed) card number from its leading digits (the BIN).
 * When ranges overlap (e.g. Discover 622126-622925 inside UnionPay 62) the longest prefix wins.
 * Returns null until enough digits are typed or when no brand matches.
 */
export function detectCardBrand(value) {
  const d = onlyDigits(value);
  let best = null;
  BIN_ROWS.forEach((r) => {
    if (d.length < r.prefixLength) return;
    const prefix = Number(d.slice(0, r.prefixLength));
    if (prefix >= r.start && prefix <= r.end && (!best || r.prefixLength > best.prefixLength)) best = r;
  });
  return best ? CARD_BRANDS[best.brand] : null;
}

/* ------------------------------------------------------------------------------------------------
 * Formatting while typing (also strips anything that isn't a digit)
 * ---------------------------------------------------------------------------------------------- */

// How the digits are grouped on the physical card; everything else uses groups of 4.
const GROUPS = { amex: [4, 6, 5], diners14: [4, 6, 4] };

/** Card number as "4111 1111 1111 1111" (Amex "3782 822463 10005"), cut at the brand's longest length. */
export function formatCardNumber(value) {
  const brand = detectCardBrand(value);
  const max = brand ? Math.max(...brand.lengths) : 19;
  const d = onlyDigits(value).slice(0, max);
  const groups = brand?.brand === 'amex' ? GROUPS.amex
    : brand?.brand === 'diners' && d.length <= 14 ? GROUPS.diners14 : null;
  if (!groups) return d.replace(/(\d{4})(?=\d)/g, '$1 ');
  const parts = [];
  let pos = 0;
  groups.forEach((n) => { if (pos < d.length) { parts.push(d.slice(pos, pos + n)); pos += n; } });
  return parts.join(' ');
}

/** Characters the card number field may hold once formatted (digits plus grouping spaces). */
export const cardNumberMaxLength = (value) => {
  const brand = detectCardBrand(value);
  const max = brand ? Math.max(...brand.lengths) : 19;
  return max + Math.ceil(max / 4); // room for the spaces between groups
};

/** Expiry as "MM/YY"; a leading 2-9 becomes "0X" so "4" is read as April. */
export function formatExpiry(value) {
  let d = onlyDigits(value).slice(0, 4);
  if (/^[2-9]$/.test(d)) d = `0${d}`;
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Security code: digits only, as long as the detected brand allows (4 when the brand is unknown). */
export const formatCvv = (value, brand) => onlyDigits(value).slice(0, brand?.cvvLength ?? 4);

/* ------------------------------------------------------------------------------------------------
 * Keyboard / paste / drop guards for the numeric fields
 * ---------------------------------------------------------------------------------------------- */

/**
 * onKeyDown for numeric fields: refuses any printable key that isn't a digit, so letters never appear.
 * Editing keys (Backspace, arrows, Tab...) and shortcuts (Ctrl/Cmd + C, V, A...) still work.
 * `extra` lists other characters to let through, e.g. "/" for the expiry.
 * Mobile keyboards and autofill don't always fire keydown, which is why every onChange also runs
 * the value through onlyDigits() - this guard is only the first layer.
 */
export const digitKeysOnly = (extra = '') => (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  if (!/\d/.test(e.key) && !extra.includes(e.key)) e.preventDefault();
};

/** onPaste for numeric fields: refuses clipboard text containing anything but digits, spaces, - and /. */
export const digitPasteOnly = (e) => {
  const text = e.clipboardData?.getData('text') ?? '';
  if (!/^[\d\s/-]*$/.test(text) || text.length > 40) e.preventDefault();
};

/** onDrop: dragging text into a card field is never needed, so it is refused. */
export const blockDrop = (e) => e.preventDefault();

/* ------------------------------------------------------------------------------------------------
 * Field validators: each returns an error message, or null when the value is fine
 * ---------------------------------------------------------------------------------------------- */

/** Card number: digits (spaces allowed), known brand, brand's length, not repeated digits, Luhn. */
export function validateCardNumber(value) {
  const generic = 'Enter a valid card number';
  if (!logCheck('number', 'is text, at most 40 characters', typeof value === 'string' && value.length <= 40)) return generic;
  // Anything besides digits and spaces means the value didn't come from our formatter: refuse it.
  if (!logCheck('number', 'digits and spaces only', /^[\d ]+$/.test(value))) return 'The card number can only contain digits';
  const d = onlyDigits(value);
  if (!logCheck('number', 'at least 12 digits', d.length >= 12, maskNumber(d))) return 'Enter the full card number';
  const brand = detectCardBrand(d);
  if (!logCheck('number', 'BIN matches a brand in cardBins.json', Boolean(brand), brand ? brand.label : 'no match')) {
    return 'We don’t accept this type of card';
  }
  const n = brand.lengths;
  if (!logCheck('number', `length allowed for ${brand.label}`, n.includes(d.length), `${d.length} digits, allowed ${n.join('/')}`)) {
    return `A ${brand.label} card number has ${n.length > 1 ? `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}` : n[0]} digits`;
  }
  // 0000... and 4444...: 0000... even passes Luhn.
  if (!logCheck('number', 'not one repeated digit', !/^(\d)\1+$/.test(d))) return generic;
  if (!logCheck('number', 'Luhn checksum', luhnCheck(d), maskNumber(d))) return 'Check the card number - it doesn’t look right';
  return null;
}

// Cards are not issued for more than this many years ahead; later dates are typos or probing.
const MAX_YEARS_AHEAD = 20;

/** Expiry "MM/YY": real month, not expired (valid through the end of that month), not too far ahead. */
export function validateExpiry(value, now = new Date()) {
  if (!logCheck('expiry', 'format MM/YY', typeof value === 'string' && /^\d{2}\/\d{2}$/.test(value), String(value))) {
    return 'Enter the expiry date as MM/YY';
  }
  const [mm, yy] = value.split('/').map(Number);
  if (!logCheck('expiry', 'month 01-12', mm >= 1 && mm <= 12)) return 'Enter a month from 01 to 12';
  const year = 2000 + yy;
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const today = `today ${String(thisMonth).padStart(2, '0')}/${thisYear}`;
  if (!logCheck('expiry', 'not expired', year > thisYear || (year === thisYear && mm >= thisMonth), today)) return 'This card has expired';
  if (!logCheck('expiry', `within ${MAX_YEARS_AHEAD} years`, year <= thisYear + MAX_YEARS_AHEAD)) return 'Check the expiry year';
  return null;
}

/** Security code: digits only and exactly the brand's length (Amex 4, others 3). */
export function validateCvv(value, brand) {
  if (!logCheck('cvv', 'digits only', typeof value === 'string' && /^\d+$/.test(value))) return 'The security code can only contain digits';
  const len = brand?.cvvLength;
  const lengthOk = len ? value.length === len : /^\d{3,4}$/.test(value);
  if (!logCheck('cvv', `length ${len || '3 or 4'}${brand ? ` for ${brand.label}` : ''}`, lengthOk, `${value.length} digits`)) {
    return `Enter the ${len || '3 or 4'} digit security code`;
  }
  return null;
}

/*
 * Name on card - the only free-text field, so it gets the most checks.
 * The allowlist alone (letters, spaces, . ' -) already rules out the characters attacks need;
 * the explicit patterns below are defence in depth, so the field stays safe even if the allowlist
 * is ever loosened, and they make it obvious in review what is being guarded against.
 */
const NAME_MIN = 2;
const NAME_MAX = 100;
// Letters from any language (incl. accents / combining marks), separated by single spaces, dots, apostrophes or hyphens.
// Must start with a letter and end with a letter or dot ("J. R. Smith Jr.").
const NAME_ALLOWED = /^[\p{L}\p{M}]+(?:[ .'-]{1,2}[\p{L}\p{M}]+)*\.?$/u;
const CONTROL_CHARS = /\p{Cc}/u; // null byte, CR/LF (log & header injection), tabs, escapes...
const INVISIBLE_CHARS = /\p{Cf}/u; // zero-width spaces/joiners and right-to-left overrides that disguise text
const HTML_SCRIPT = /[<>&"`]|javascript:|data:|on\w+\s*=/i; // XSS if the name is ever shown back unescaped
const NOSQL = /[$\{\}\[\]]/; // MongoDB operators ($gt, $where) and object/array syntax
const SQL_PATTERNS = [
  /--/, // comment that cuts off the rest of a query
  /\/\*|\*\//, // block comment
  /;/, // statement separator / stacked queries
  /'{2,}/, // quote escaping tricks
  /'\s*(or|and)\b/i, // ' OR '1'='1
  /\b(or|and)\s+\d+\s*=\s*\d+/i, // OR 1=1
  /\bunion\b[\s\S]*\bselect\b/i,
  /\bselect\b[\s\S]*\bfrom\b/i,
  /\binsert\s+into\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\b[\s\S]*\bset\b/i,
  /\b(drop|alter|truncate|create)\s+(table|database|schema|user)\b/i,
  /\b(exec|execute)\b\s*\(?/i,
  /\bxp_\w+/i, // SQL Server extended procedures
  /\b(sleep|benchmark|pg_sleep)\s*\(|\bwaitfor\s+delay\b/i, // time-based blind injection
];

/** Turns look-alike characters (fullwidth ＳＥＬＥＣＴ, ligatures) into plain ones and tidies spaces. */
export const normalizeName = (value) => String(value ?? '').normalize('NFKC').replace(/ +/g, ' ').trim();

/** Name on card: length, allowlist, and explicit injection / control-character checks. */
export function validateCardholderName(value) {
  const generic = 'Enter the name as shown on the card';
  const notAllowed = 'The name contains characters that aren’t allowed';
  if (!logCheck('name', `is text, at most ${NAME_MAX * 2} characters`, typeof value === 'string' && value.length <= NAME_MAX * 2)) return generic;
  if (!logCheck('name', 'no control characters (null byte, line breaks)', !CONTROL_CHARS.test(value))) return notAllowed;
  if (!logCheck('name', 'no invisible / right-to-left characters', !INVISIBLE_CHARS.test(value))) return notAllowed;
  const name = normalizeName(value);
  if (!logCheck('name', `length ${NAME_MIN}-${NAME_MAX}`, name.length >= NAME_MIN && name.length <= NAME_MAX, `${name.length} characters`)) return generic;
  if (!logCheck('name', 'no HTML / script injection', !HTML_SCRIPT.test(name))) return notAllowed;
  if (!logCheck('name', 'no NoSQL operators ($ { } [ ])', !NOSQL.test(name))) return notAllowed;
  const sqlHit = SQL_PATTERNS.findIndex((re) => re.test(name));
  if (!logCheck('name', 'no SQL injection patterns', sqlHit === -1, sqlHit === -1 ? '' : `matched ${SQL_PATTERNS[sqlHit]}`)) return notAllowed;
  if (!logCheck('name', "only letters, spaces and . ' -", NAME_ALLOWED.test(name))) return 'Use only letters, spaces and . \' -';
  if (!logCheck('name', `at least ${NAME_MIN} letters`, (name.match(/[\p{L}\p{M}]/gu) || []).length >= NAME_MIN)) return generic;
  return null;
}

/**
 * Validates the whole card form { number, expiry, cvv, name } and returns { field: message } for each
 * field that failed (an empty object means the card can be sent). The security code is checked
 * against the brand found from the card number.
 */
export function validateCard(card) {
  const brand = detectCardBrand(card.number);
  if (LOG_ENABLED) console.log(`[cardValidation] validating card, brand from BIN: ${brand ? brand.label : 'unknown'}`);
  const errors = {
    number: validateCardNumber(card.number),
    expiry: validateExpiry(card.expiry),
    cvv: validateCvv(card.cvv, brand),
    name: validateCardholderName(card.name),
  };
  const failed = Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
  if (LOG_ENABLED) {
    const fields = Object.keys(failed);
    console.log(`[cardValidation] result: ${fields.length ? `FAILED (${fields.join(', ')})` : 'all checks passed'}`);
  }
  return failed;
}
