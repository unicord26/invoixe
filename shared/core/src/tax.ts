/**
 * Leafx GST tax engine.
 *
 * Implements standard Indian GST computation:
 *  - Intra-state supply  -> CGST + SGST (rate split in half each)
 *  - Inter-state supply  -> IGST (full rate)
 *  - Tax-inclusive or exclusive line pricing
 *  - Per-line discount (percent) applied before tax
 *  - Optional cess (percent) on the taxable value
 *  - Invoice round-off to nearest rupee
 *
 * All amounts are integer paise. See ./money.ts for the money rules.
 */

import { percentOf, roundOffToRupee, roundPaise, type Paise } from "./money";

export interface TaxLineInput {
  /** Quantity (may be fractional for weight-based items). */
  qty: number;
  /** Unit rate in paise. */
  rate: Paise;
  /** GST rate percent, e.g. 18. */
  taxRate: number;
  /** Cess percent on taxable value, e.g. 12. Default 0. */
  cessRate?: number;
  /** Line discount percent applied before tax. Default 0. */
  discountPercent?: number;
  /** If true, `rate` already includes GST (+cess) and is back-calculated. */
  taxInclusive?: boolean;
  /** For grouping the HSN summary. */
  hsnSac?: string;
}

export interface TaxLineResult {
  /** qty * rate, before discount, in paise. */
  gross: Paise;
  discount: Paise;
  /** taxable value = gross - discount (tax excluded). */
  taxable: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  cess: Paise;
  totalTax: Paise;
  /** taxable + totalTax. */
  lineTotal: Paise;
  taxRate: number;
  cessRate: number;
  hsnSac?: string;
}

/** Invoice-level adjustments applied after per-line tax, in the totals pipeline. */
export interface InvoiceAdjustments {
  /** Flat (absolute) invoice discount in paise, applied after line tax. */
  discountFlat?: Paise;
  /** Extra charges (freight, packing…) added after tax. Amounts in paise. */
  additionalCharges?: { label: string; amount: Paise }[];
  /** TCS percent — collected on the invoice value incl. GST (after discount+charges). */
  tcsRate?: number;
  /** TDS percent — deducted on the taxable value (pre-GST). */
  tdsRate?: number;
}

export interface InvoiceTotals {
  subTotal: Paise; // sum of taxable values
  totalDiscount: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  cess: Paise;
  totalTax: Paise;
  /** subTotal + totalTax, before invoice-level adjustments & round-off. */
  grandBeforeRound: Paise;
  /** Flat invoice-level discount applied (paise). */
  discountFlat: Paise;
  /** Sum of additional charges (paise). */
  additionalCharges: Paise;
  tcsRate: number;
  tcsAmount: Paise;
  tdsRate: number;
  tdsAmount: Paise;
  /** grandBeforeRound − discountFlat + additionalCharges + tcs − tds, before round-off. */
  netBeforeRound: Paise;
  roundOff: Paise;
  /** Final payable, rounded to nearest rupee. */
  grandTotal: Paise;
}

export interface HsnSummaryRow {
  hsnSac: string;
  taxable: Paise;
  cgstRate: number;
  cgst: Paise;
  sgstRate: number;
  sgst: Paise;
  igstRate: number;
  igst: Paise;
  cess: Paise;
  totalTax: Paise;
}

/**
 * Compute tax for a single line.
 * `interState` decides IGST vs CGST+SGST.
 */
export function computeLine(input: TaxLineInput, interState: boolean): TaxLineResult {
  const {
    qty,
    rate,
    taxRate,
    cessRate = 0,
    discountPercent = 0,
    taxInclusive = false,
    hsnSac,
  } = input;

  const gross = roundPaise(qty * rate);
  const discount = percentOf(gross, discountPercent);
  const grossAfterDiscount = gross - discount;

  // Determine taxable value.
  let taxable: Paise;
  if (taxInclusive) {
    // Back out tax+cess from an inclusive amount:
    // taxable = inclusive / (1 + (taxRate + cessRate)/100)
    const divisor = 1 + (taxRate + cessRate) / 100;
    taxable = roundPaise(grossAfterDiscount / divisor);
  } else {
    taxable = grossAfterDiscount;
  }

  const totalGst = percentOf(taxable, taxRate);
  const cess = percentOf(taxable, cessRate);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (interState) {
    igst = totalGst;
  } else {
    // Split GST in half; put any odd paise on CGST so cgst+sgst == totalGst.
    cgst = Math.ceil(totalGst / 2);
    sgst = totalGst - cgst;
  }

  const totalTax = cgst + sgst + igst + cess;
  const lineTotal = taxable + totalTax;

  return {
    gross,
    discount,
    taxable,
    cgst,
    sgst,
    igst,
    cess,
    totalTax,
    lineTotal,
    taxRate,
    cessRate,
    hsnSac,
  };
}

/**
 * Compute invoice-level totals from computed lines, with optional invoice-level
 * adjustments (flat discount, additional charges, TCS, TDS) and round-off.
 *
 * Pipeline: grandBeforeRound (= subTotal + totalTax) − discountFlat
 *           + additionalCharges + TCS − TDS = netBeforeRound → round to rupee.
 * With no adjustments, netBeforeRound === grandBeforeRound (backward compatible).
 */
export function computeInvoiceTotals(
  lines: TaxLineResult[],
  adjustments: InvoiceAdjustments = {}
): InvoiceTotals {
  const acc = lines.reduce(
    (a, l) => {
      a.subTotal += l.taxable;
      a.totalDiscount += l.discount;
      a.cgst += l.cgst;
      a.sgst += l.sgst;
      a.igst += l.igst;
      a.cess += l.cess;
      return a;
    },
    { subTotal: 0, totalDiscount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 }
  );

  const totalTax = acc.cgst + acc.sgst + acc.igst + acc.cess;
  const grandBeforeRound = acc.subTotal + totalTax;

  // Non-negative, and a flat discount can't exceed the pre-adjustment total.
  const additionalCharges = (adjustments.additionalCharges ?? []).reduce(
    (s, c) => s + Math.max(0, Math.round(c.amount || 0)),
    0
  );
  const discountFlat = Math.min(
    Math.max(0, Math.round(adjustments.discountFlat ?? 0)),
    grandBeforeRound
  );
  const tcsRate = Math.max(0, adjustments.tcsRate ?? 0);
  const tdsRate = Math.max(0, adjustments.tdsRate ?? 0);

  const afterDiscountCharges = grandBeforeRound - discountFlat + additionalCharges;
  // TCS is levied on the invoice value (incl. GST) after discount & charges.
  const tcsAmount = percentOf(afterDiscountCharges, tcsRate);
  // TDS is deducted on the taxable value (pre-GST).
  const tdsAmount = percentOf(acc.subTotal, tdsRate);

  const netBeforeRound = afterDiscountCharges + tcsAmount - tdsAmount;
  const { rounded, roundOff } = roundOffToRupee(netBeforeRound);

  return {
    subTotal: acc.subTotal,
    totalDiscount: acc.totalDiscount,
    cgst: acc.cgst,
    sgst: acc.sgst,
    igst: acc.igst,
    cess: acc.cess,
    totalTax,
    grandBeforeRound,
    discountFlat,
    additionalCharges,
    tcsRate,
    tcsAmount,
    tdsRate,
    tdsAmount,
    netBeforeRound,
    roundOff,
    grandTotal: rounded,
  };
}

/** Group computed lines into an HSN/SAC-wise tax summary (for the invoice footer & GSTR). */
export function buildHsnSummary(lines: TaxLineResult[]): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();
  for (const l of lines) {
    const key = `${l.hsnSac ?? "-"}|${l.taxRate}|${l.cessRate}`;
    const half = l.taxRate / 2;
    const existing = map.get(key);
    if (existing) {
      existing.taxable += l.taxable;
      existing.cgst += l.cgst;
      existing.sgst += l.sgst;
      existing.igst += l.igst;
      existing.cess += l.cess;
      existing.totalTax += l.totalTax;
    } else {
      map.set(key, {
        hsnSac: l.hsnSac ?? "-",
        taxable: l.taxable,
        cgstRate: l.igst > 0 ? 0 : half,
        cgst: l.cgst,
        sgstRate: l.igst > 0 ? 0 : half,
        sgst: l.sgst,
        igstRate: l.igst > 0 ? l.taxRate : 0,
        igst: l.igst,
        cess: l.cess,
        totalTax: l.totalTax,
      });
    }
  }
  return [...map.values()];
}

/**
 * Full invoice computation in one call.
 * Supply is intra-state when seller & buyer state codes match.
 */
export function computeInvoice(params: {
  sellerStateCode: string;
  buyerStateCode: string;
  lines: TaxLineInput[];
  adjustments?: InvoiceAdjustments;
}): {
  lines: TaxLineResult[];
  totals: InvoiceTotals;
  hsnSummary: HsnSummaryRow[];
  interState: boolean;
} {
  const interState = params.sellerStateCode !== params.buyerStateCode;
  const lines = params.lines.map((l) => computeLine(l, interState));
  const totals = computeInvoiceTotals(lines, params.adjustments);
  const hsnSummary = buildHsnSummary(lines);
  return { lines, totals, hsnSummary, interState };
}
