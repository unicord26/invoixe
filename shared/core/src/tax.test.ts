import { describe, it, expect } from "vitest";
import {
  formatINR,
  rupeesToPaise,
  roundOffToRupee,
  percentOf,
  inWordsINR,
} from "./money.js";
import { computeInvoice, computeLine } from "./tax.js";

describe("money", () => {
  it("converts rupees to paise", () => {
    expect(rupeesToPaise(41)).toBe(4100);
    expect(rupeesToPaise(41.5)).toBe(4150);
  });

  it("formats INR with Indian grouping", () => {
    expect(formatINR(4876700)).toBe("₹48,767.00");
    expect(formatINR(100000000)).toBe("₹10,00,000.00");
    expect(formatINR(-4)).toBe("-₹0.04");
  });

  it("rounds a total to nearest rupee and reports the delta", () => {
    expect(roundOffToRupee(4876704)).toEqual({ rounded: 4876700, roundOff: -4 });
    expect(roundOffToRupee(4876750)).toEqual({ rounded: 4876800, roundOff: 50 });
  });

  it("computes percent of an amount in paise", () => {
    expect(percentOf(4132800, 9)).toBe(371952); // ₹3719.52
  });

  it("spells a grand total in Indian words", () => {
    expect(inWordsINR(4876700)).toBe(
      "Forty Eight Thousand Seven Hundred Sixty Seven Rupees Only"
    );
    expect(inWordsINR(10000000)).toBe("One Lakh Rupees Only");
    expect(inWordsINR(11800)).toBe("One Hundred Eighteen Rupees Only");
    expect(inWordsINR(4876704)).toBe(
      "Forty Eight Thousand Seven Hundred Sixty Seven Rupees and Four Paise Only"
    );
  });
});

describe("GST engine — golden invoice (AVS PLAST reference)", () => {
  // 1008 PCS @ ₹41.00, intra-state (MH 27 -> MH 27), GST 18%.
  const result = computeInvoice({
    sellerStateCode: "27",
    buyerStateCode: "27",
    lines: [
      { qty: 1008, rate: rupeesToPaise(41), taxRate: 18, hsnSac: "39233090" },
    ],
  });

  it("is treated as intra-state", () => {
    expect(result.interState).toBe(false);
  });

  it("computes the taxable value (₹41,328.00)", () => {
    expect(result.totals.subTotal).toBe(4132800);
    expect(formatINR(result.totals.subTotal)).toBe("₹41,328.00");
  });

  it("splits GST into CGST 9% + SGST 9% (₹3,719.52 each)", () => {
    expect(result.totals.cgst).toBe(371952);
    expect(result.totals.sgst).toBe(371952);
    expect(result.totals.igst).toBe(0);
    expect(formatINR(result.totals.cgst)).toBe("₹3,719.52");
  });

  it("applies round-off of -0.04 and lands on ₹48,767.00", () => {
    expect(result.totals.grandBeforeRound).toBe(4876704);
    expect(result.totals.roundOff).toBe(-4);
    expect(result.totals.grandTotal).toBe(4876700);
    expect(formatINR(result.totals.grandTotal)).toBe("₹48,767.00");
  });

  it("builds a matching HSN summary row", () => {
    const [row] = result.hsnSummary;
    expect(row?.hsnSac).toBe("39233090");
    expect(row?.taxable).toBe(4132800);
    expect(row?.cgstRate).toBe(9);
    expect(row?.sgstRate).toBe(9);
    expect(row?.totalTax).toBe(743904); // ₹7,439.04
  });
});

describe("GST engine — inter-state, inclusive & cess", () => {
  it("uses IGST for inter-state supply", () => {
    const r = computeInvoice({
      sellerStateCode: "27",
      buyerStateCode: "29",
      lines: [{ qty: 10, rate: rupeesToPaise(100), taxRate: 18 }],
    });
    expect(r.totals.igst).toBe(18000); // 18% of ₹1000 = ₹180
    expect(r.totals.cgst).toBe(0);
    expect(r.totals.sgst).toBe(0);
  });

  it("back-calculates taxable value from a tax-inclusive rate", () => {
    // ₹118 inclusive @ 18% -> ₹100 taxable, ₹18 tax
    const line = computeLine(
      { qty: 1, rate: rupeesToPaise(118), taxRate: 18, taxInclusive: true },
      false
    );
    expect(line.taxable).toBe(10000);
    expect(line.totalTax).toBe(1800);
  });

  it("applies discount before tax and adds cess", () => {
    // ₹1000, 10% discount -> ₹900 taxable; 18% GST = 162; 12% cess = 108
    const line = computeLine(
      { qty: 1, rate: rupeesToPaise(1000), taxRate: 18, cessRate: 12, discountPercent: 10 },
      false
    );
    expect(line.taxable).toBe(90000);
    expect(line.cgst + line.sgst).toBe(16200);
    expect(line.cess).toBe(10800);
  });
});

describe("GST engine — invoice-level adjustments (flat discount, charges, TCS/TDS)", () => {
  // Base: ₹1000 taxable @18% -> tax ₹180 -> grandBeforeRound ₹1180 (118000 paise).
  const base = {
    sellerStateCode: "27",
    buyerStateCode: "27",
    lines: [{ qty: 1, rate: rupeesToPaise(1000), taxRate: 18 }],
  };

  it("no adjustments → identical to before (backward compatible)", () => {
    const r = computeInvoice(base);
    expect(r.totals.grandBeforeRound).toBe(118000);
    expect(r.totals.netBeforeRound).toBe(118000);
    expect(r.totals.grandTotal).toBe(118000);
    expect(r.totals.discountFlat).toBe(0);
    expect(r.totals.additionalCharges).toBe(0);
    expect(r.totals.tcsAmount).toBe(0);
    expect(r.totals.tdsAmount).toBe(0);
  });

  it("subtracts a flat discount post-tax", () => {
    const r = computeInvoice({ ...base, adjustments: { discountFlat: 18000 } }); // −₹180
    expect(r.totals.discountFlat).toBe(18000);
    expect(r.totals.grandTotal).toBe(100000); // ₹1000
  });

  it("clamps a flat discount to the pre-adjustment total", () => {
    const r = computeInvoice({ ...base, adjustments: { discountFlat: 999999 } });
    expect(r.totals.discountFlat).toBe(118000);
    expect(r.totals.grandTotal).toBe(0);
  });

  it("adds additional charges post-tax", () => {
    const r = computeInvoice({
      ...base,
      adjustments: { additionalCharges: [{ label: "Freight", amount: 5000 }, { label: "Packing", amount: 2500 }] },
    });
    expect(r.totals.additionalCharges).toBe(7500);
    expect(r.totals.grandTotal).toBe(125500); // 118000 + 7500
  });

  it("adds TCS on invoice value (incl GST, after discount+charges)", () => {
    // 1% TCS on (118000 − 0 + 2000) = 120000 → 1200
    const r = computeInvoice({
      ...base,
      adjustments: { additionalCharges: [{ label: "Freight", amount: 2000 }], tcsRate: 1 },
    });
    expect(r.totals.tcsAmount).toBe(1200);
    expect(r.totals.grandTotal).toBe(121200); // 120000 + 1200
  });

  it("deducts TDS on the taxable (pre-GST) value", () => {
    // 2% TDS on subTotal ₹1000 (100000) = 2000
    const r = computeInvoice({ ...base, adjustments: { tdsRate: 2 } });
    expect(r.totals.tdsAmount).toBe(2000);
    expect(r.totals.grandTotal).toBe(116000); // 118000 − 2000
  });

  it("combines discount + charges + TCS − TDS then round-off", () => {
    const r = computeInvoice({
      ...base,
      adjustments: {
        discountFlat: 8000, // −₹80
        additionalCharges: [{ label: "Freight", amount: 3000 }], // +₹30
        tcsRate: 1, // 1% of (118000−8000+3000)=113000 → 1130
        tdsRate: 2, // 2% of 100000 → 2000
      },
    });
    // 118000 − 8000 + 3000 + 1130 − 2000 = 112130 → round to 112100 (−30)
    expect(r.totals.netBeforeRound).toBe(112130);
    expect(r.totals.roundOff).toBe(-30);
    expect(r.totals.grandTotal).toBe(112100);
  });
});
