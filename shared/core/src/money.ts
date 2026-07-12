/**
 * Money math for Leafx.
 *
 * HARD RULE: money is stored and computed as integer paise (1 rupee = 100 paise).
 * Never use floats for currency. All public functions take & return integer paise,
 * except formatting helpers.
 */

export type Paise = number;

/** Round a fractional paise value to the nearest whole paise (banker-free, half-up). */
export function roundPaise(value: number): Paise {
  return Math.round(value);
}

/** Convert rupees (may be fractional) to integer paise. */
export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** Convert integer paise to a rupees number (may be fractional). */
export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

/** Apply a percentage to a paise amount, returning rounded paise. */
export function percentOf(amount: Paise, percent: number): Paise {
  return roundPaise((amount * percent) / 100);
}

/**
 * Round a grand total to the nearest rupee and return the round-off delta.
 * total 4876704 paise -> { rounded: 4876700, roundOff: -4 }
 */
export function roundOffToRupee(totalPaise: Paise): { rounded: Paise; roundOff: Paise } {
  const rounded = Math.round(totalPaise / 100) * 100;
  return { rounded, roundOff: rounded - totalPaise };
}

/** Format paise as an Indian-grouped currency string, e.g. 4876700 -> "₹48,767.00". */
export function formatINR(paise: Paise, withSymbol = true): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const grouped = groupIndian(rupees);
  const sign = negative ? "-" : "";
  return `${sign}${withSymbol ? "₹" : ""}${grouped}.${fraction}`;
}

/** Indian digit grouping: 1234567 -> "12,34,567". */
function groupIndian(n: number): string {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const t = TENS[Math.floor(n / 10)] ?? "";
  const o = ONES[n % 10] ?? "";
  return (t + (o ? " " + o : "")).trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return ((h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "")).trim();
}

/** Whole number to Indian-system words (crore/lakh/thousand). Returns "" for 0. */
export function numberToIndianWords(num: number): string {
  let n = Math.floor(Math.abs(num));
  if (n === 0) return "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const parts: string[] = [];
  if (crore) parts.push(numberToIndianWords(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (n) parts.push(threeDigits(n));
  return parts.join(" ").trim();
}

/** Paise → "Forty Eight Thousand Seven Hundred Sixty Seven Rupees Only". */
export function inWordsINR(paise: Paise): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const pa = Math.abs(paise) % 100;
  let words = rupees ? `${numberToIndianWords(rupees)} Rupees` : "Zero Rupees";
  if (pa) words += ` and ${numberToIndianWords(pa)} Paise`;
  return `${paise < 0 ? "Minus " : ""}${words} Only`;
}
