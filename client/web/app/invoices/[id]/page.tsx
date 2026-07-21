"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatINR, inWordsINR } from "@invoixe/core";
import type { BusinessSettings } from "@invoixe/types";
import { api } from "../../../lib/api";

type Line = {
  lineNo: number;
  description: string;
  hsnSac: string | null;
  qty: number;
  unit: string;
  rate: number;
  taxRate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  lineTotal: number;
};
type Business = {
  name: string; gstin: string | null; pan: string | null; address: string | null;
  phone: string | null; email: string | null; stateCode: string | null; jurisdiction: string | null;
  bankName: string | null; bankAccountNo: string | null; bankIfsc: string | null; bankBranch: string | null;
  logoUrl: string | null; signatureUrl: string | null;
};
type Invoice = {
  number: string; date: string; dueDate: string | null; placeOfSupply: string | null;
  interState: boolean; partyName: string | null; partyGstin: string | null;
  subTotal: number; totalDiscount: number; cgst: number; sgst: number; igst: number; cess: number;
  roundOff: number; grandTotal: number;
  discountFlat: number; additionalCharges: { label: string; amount: number }[] | null;
  tcsRate: number; tcsAmount: number; tdsRate: number; tdsAmount: number;
  reverseCharge: boolean; ewayBillNo: string | null; transporterName: string | null;
  vehicleNo: string | null; transportDistanceKm: number | null; termsConditions: string | null;
  business: Business;
  party: { name: string; gstin: string | null; billingAddress: string | null; stateCode: string | null } | null;
  lines: Line[];
};

export default function InvoiceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: inv, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.get<Invoice>(`/api/invoices/${id}`),
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<BusinessSettings>("/api/business/current/settings"),
  });

  if (isLoading) return <p className="p-8 text-sm text-zinc-500">Loading…</p>;
  if (error || !inv) return <p className="p-8 text-sm text-red-650">Invoice not found.</p>;

  const P = settings?.print;
  const show = {
    logo: P?.showLogo ?? true,
    gstin: P?.showGstinOnSale ?? true,
    taxDetails: P?.showTaxDetails ?? true,
    amountInWords: P?.showAmountInWords ?? true,
    signature: P?.showSignature ?? true,
  };
  const charges = inv.additionalCharges ?? [];

  const rates = [...new Set(inv.lines.map((l) => l.taxRate))];
  const uniformRate = rates.length === 1 ? rates[0]! : null;

  // HSN/SAC summary grouped by code + rate
  const hsnMap = new Map<string, { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const l of inv.lines) {
    const key = `${l.hsnSac ?? "-"}|${l.taxRate}`;
    const e = hsnMap.get(key) ?? { hsn: l.hsnSac ?? "-", rate: l.taxRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    e.taxable += l.taxable; e.cgst += l.cgst; e.sgst += l.sgst; e.igst += l.igst;
    hsnMap.set(key, e);
  }
  const hsnRows = [...hsnMap.values()];
  const taxTotal = inv.cgst + inv.sgst + inv.igst + inv.cess;

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8">
      <style>{`
        .inv-container {
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #27272a;
          background-color: #ffffff;
        }
        .inv-table {
          width: 100%;
          border-collapse: collapse;
        }
        .inv-table th {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: #71717a;
          background-color: #f4f4f5;
          border-top: 1px solid #e4e4e7;
          border-bottom: 1px solid #e4e4e7;
          padding: 8px 12px;
          text-align: left;
        }
        .inv-table td {
          font-size: 12px;
          color: #3f3f46;
          border-bottom: 1px solid #f4f4f5;
          padding: 10px 12px;
          vertical-align: top;
        }
        .inv-table tr.total-row td {
          font-weight: 700;
          color: #18181b;
          background-color: #fafafa;
          border-top: 1px solid #e4e4e7;
          border-bottom: 1px solid #e4e4e7;
        }
        .inv-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }
        .inv-meta-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #a1a1aa;
        }
        .inv-meta-value {
          font-size: 13px;
          font-weight: 600;
          color: #27272a;
          margin-top: 2px;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .inv-container {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      {/* Action Buttons Header */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition">
          ← Back to Invoices
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/invoices/${id}/thermal`} className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-bold text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900 transition">
            Thermal Receipt
          </Link>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Modern Redesigned Invoice Sheet */}
      <div className="inv-container border border-zinc-200 rounded-2xl p-8 shadow-xs">
        {/* Row 1: Header / Logo & Tax Invoice title */}
        <div className="flex justify-between items-start border-b border-zinc-100 pb-6">
          <div className="flex items-start gap-4">
            {show.logo && inv.business.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inv.business.logoUrl} alt="" className="h-12 w-12 rounded-lg object-contain border border-zinc-100 p-1" />
            )}
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">{inv.business.name}</h2>
              {inv.business.address && <p className="text-[11px] text-zinc-400 mt-1 max-w-[280px] leading-relaxed">{inv.business.address}</p>}
              <div className="flex flex-wrap gap-x-4 mt-2 text-[10px] text-zinc-400 font-semibold">
                {inv.business.phone && <span>Contact: {inv.business.phone}</span>}
                {inv.business.email && <span>Email: {inv.business.email}</span>}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block rounded-md bg-zinc-50 border border-zinc-200/50 px-2 py-0.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Original for Buyer
            </span>
            <h1 className="text-2xl font-black tracking-tight text-zinc-800 mt-3">TAX INVOICE</h1>
            {show.gstin && inv.business.gstin && (
              <p className="text-[10px] font-bold text-zinc-400 tracking-wide mt-1 uppercase">GSTIN: {inv.business.gstin}</p>
            )}
          </div>
        </div>

        {/* Row 2: Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-b border-zinc-100">
          <div>
            <div className="inv-meta-label">Invoice Number</div>
            <div className="inv-meta-value font-mono">{inv.number}</div>
          </div>
          <div>
            <div className="inv-meta-label">Invoice Date</div>
            <div className="inv-meta-value">{new Date(inv.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
          <div>
            <div className="inv-meta-label">Place of Supply</div>
            <div className="inv-meta-value">{inv.placeOfSupply ?? "—"}</div>
          </div>
          <div>
            <div className="inv-meta-label">Due Date</div>
            <div className="inv-meta-value">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
          </div>
        </div>

        {/* Row 3: Billing Address Card */}
        <div className="py-6 border-b border-zinc-100">
          <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4">
            <span className="inv-meta-label block mb-2">Billing Details (Consignee)</span>
            <h3 className="text-sm font-bold text-zinc-900">{inv.party?.name ?? inv.partyName ?? "Cash Sale"}</h3>
            {inv.party?.billingAddress && (
              <p className="text-xs text-zinc-500 mt-1 max-w-[500px] leading-relaxed">{inv.party.billingAddress}</p>
            )}
            {(inv.party?.gstin ?? inv.partyGstin) && (
              <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-wide">
                GSTIN/UIN: {inv.party?.gstin ?? inv.partyGstin}
              </p>
            )}
          </div>
        </div>

        {/* Row 4: Line Items Table */}
        <div className="py-6">
          <table className="inv-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }} className="text-center">#</th>
                <th>Description</th>
                <th style={{ width: "90px" }} className="text-center">HSN/SAC</th>
                <th style={{ width: "70px" }} className="text-center">Qty</th>
                <th style={{ width: "90px" }} className="text-right">Rate</th>
                <th style={{ width: "60px" }} className="text-center">Per</th>
                <th style={{ width: "110px" }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, index) => (
                <tr key={l.lineNo}>
                  <td className="text-center font-medium text-zinc-400">{index + 1}</td>
                  <td className="font-semibold text-zinc-800">{l.description}</td>
                  <td className="text-center font-mono">{l.hsnSac ?? "—"}</td>
                  <td className="text-center">{l.qty}</td>
                  <td className="text-right font-mono">{formatINR(l.rate, false)}</td>
                  <td className="text-center text-zinc-400">{l.unit}</td>
                  <td className="text-right font-mono font-semibold">{formatINR(l.taxable, false)}</td>
                </tr>
              ))}

              {/* Aggregation summary rows */}
              <tr>
                <td colSpan={4} className="border-none"></td>
                <td colSpan={2} className="text-zinc-400 font-bold text-xs text-right whitespace-nowrap">Subtotal</td>
                <td className="text-right font-mono font-bold text-zinc-700 whitespace-nowrap">{formatINR(inv.subTotal, false)}</td>
              </tr>
              {!inv.interState && (
                <>
                  <tr>
                    <td colSpan={4} className="border-none"></td>
                    <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">CGST{uniformRate != null ? ` (${uniformRate / 2}%)` : ""}</td>
                    <td className="text-right font-mono text-zinc-650 whitespace-nowrap">{formatINR(inv.cgst, false)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border-none"></td>
                    <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">SGST{uniformRate != null ? ` (${uniformRate / 2}%)` : ""}</td>
                    <td className="text-right font-mono text-zinc-650 whitespace-nowrap">{formatINR(inv.sgst, false)}</td>
                  </tr>
                </>
              )}
              {inv.interState && (
                <tr>
                  <td colSpan={4} className="border-none"></td>
                  <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">IGST{uniformRate != null ? ` (${uniformRate}%)` : ""}</td>
                  <td className="text-right font-mono text-zinc-650 whitespace-nowrap">{formatINR(inv.igst, false)}</td>
                </tr>
              )}
              {inv.discountFlat > 0 && (
                <tr>
                  <td colSpan={4} className="border-none"></td>
                  <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">Discount</td>
                  <td className="text-right font-mono text-red-500 whitespace-nowrap">− {formatINR(inv.discountFlat, false)}</td>
                </tr>
              )}
              {charges.map((c, i) => (
                <tr key={`ch-${i}`}>
                  <td colSpan={4} className="border-none"></td>
                  <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">{c.label}</td>
                  <td className="text-right font-mono text-zinc-650 whitespace-nowrap">{formatINR(c.amount, false)}</td>
                </tr>
              ))}
              {inv.tcsAmount > 0 && (
                <tr>
                  <td colSpan={4} className="border-none"></td>
                  <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">TCS ({inv.tcsRate}%)</td>
                  <td className="text-right font-mono text-zinc-650 whitespace-nowrap">{formatINR(inv.tcsAmount, false)}</td>
                </tr>
              )}
              {inv.tdsAmount > 0 && (
                <tr>
                  <td colSpan={4} className="border-none"></td>
                  <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">TDS ({inv.tdsRate}%)</td>
                  <td className="text-right font-mono text-red-500 whitespace-nowrap">− {formatINR(inv.tdsAmount, false)}</td>
                </tr>
              )}
              {inv.roundOff !== 0 && (
                <tr>
                  <td colSpan={4} className="border-none"></td>
                  <td colSpan={2} className="text-zinc-400 text-xs text-right whitespace-nowrap">Round Off</td>
                  <td className="text-right font-mono text-zinc-650 whitespace-nowrap">{formatINR(inv.roundOff, false)}</td>
                </tr>
              )}
              <tr className="total-row">
                <td colSpan={4} className="border-none"></td>
                <td colSpan={2} className="text-zinc-900 font-extrabold text-sm text-right whitespace-nowrap">Total</td>
                <td className="text-right font-mono font-extrabold text-sm text-zinc-900 whitespace-nowrap">₹ {formatINR(inv.grandTotal, false)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Row 5: Amount in Words */}
        {show.amountInWords && (
          <div className="mb-6 p-4 rounded-xl border border-zinc-200 bg-zinc-50/30 text-xs text-zinc-700">
            <span className="font-bold text-zinc-400 uppercase tracking-wide text-[9px] block mb-1">Amount (in words)</span>
            <span className="font-bold text-zinc-800">{inWordsINR(inv.grandTotal)}</span>
          </div>
        )}

        {/* Row 6: HSN/SAC Summary Section */}
        {show.taxDetails && (
          <div className="py-6 border-t border-zinc-100">
            <span className="inv-meta-label block mb-3">Tax Computation Ledger</span>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-center">CGST Rate</th>
                  <th className="text-right">CGST Amt</th>
                  <th className="text-center">SGST Rate</th>
                  <th className="text-right">SGST Amt</th>
                  <th className="text-right">IGST Amt</th>
                </tr>
              </thead>
              <tbody>
                {hsnRows.map((h, i) => (
                  <tr key={i}>
                    <td className="font-mono">{h.hsn}</td>
                    <td className="text-right font-mono">{formatINR(h.taxable, false)}</td>
                    <td className="text-center text-zinc-550">{inv.interState ? "-" : `${h.rate / 2}%`}</td>
                    <td className="text-right font-mono">{formatINR(h.cgst, false)}</td>
                    <td className="text-center text-zinc-550">{inv.interState ? "-" : `${h.rate / 2}%`}</td>
                    <td className="text-right font-mono">{formatINR(h.sgst, false)}</td>
                    <td className="text-right font-mono">{formatINR(h.igst, false)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td className="font-bold">TOTAL</td>
                  <td className="text-right font-mono">{formatINR(inv.subTotal, false)}</td>
                  <td></td>
                  <td className="text-right font-mono">{formatINR(inv.cgst, false)}</td>
                  <td></td>
                  <td className="text-right font-mono">{formatINR(inv.sgst, false)}</td>
                  <td className="text-right font-mono">{formatINR(inv.igst, false)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Row 7: Transportation details */}
        {(inv.ewayBillNo || inv.transporterName || inv.vehicleNo || inv.transportDistanceKm || inv.reverseCharge) && (
          <div className="py-4 px-4 bg-zinc-50/50 border border-zinc-200 rounded-xl text-xs space-y-1.5 text-zinc-500 my-6">
            <span className="font-bold text-zinc-400 uppercase tracking-wide text-[9px] block">Shipping &amp; Logistics</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-medium">
              {inv.ewayBillNo && <div><span className="text-zinc-400">E-Way Bill:</span> <span className="font-mono font-bold text-zinc-800">{inv.ewayBillNo}</span></div>}
              {inv.transporterName && <div><span className="text-zinc-400">Transporter:</span> <span className="text-zinc-850">{inv.transporterName}</span></div>}
              {inv.vehicleNo && <div><span className="text-zinc-400">Vehicle:</span> <span className="font-mono text-zinc-850">{inv.vehicleNo}</span></div>}
              {inv.transportDistanceKm != null && <div><span className="text-zinc-400">Distance:</span> <span className="text-zinc-850">{inv.transportDistanceKm} km</span></div>}
            </div>
            {inv.reverseCharge && <div className="text-zinc-800 font-bold mt-1.5">★ Reverse charge applicable</div>}
          </div>
        )}

        {/* Terms & Conditions */}
        {inv.termsConditions && (
          <div className="py-4 border-t border-zinc-100">
            <span className="font-bold text-zinc-400 uppercase tracking-wide text-[9px] block mb-1">Terms &amp; Conditions</span>
            <div className="text-[10px] leading-relaxed text-zinc-500 whitespace-pre-line">{inv.termsConditions}</div>
          </div>
        )}

        {/* Row 8: Footer — Declaration, Bank Details & Signature */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-200 mt-6 items-end">
          <div className="space-y-4">
            {inv.business.pan && (
              <div className="text-xs">
                <span className="text-zinc-400 font-medium">Company PAN:</span> <span className="font-mono font-bold text-zinc-850">{inv.business.pan}</span>
              </div>
            )}
            
            {(inv.business.bankName || inv.business.bankAccountNo) && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                <span className="font-bold text-zinc-400 uppercase tracking-wide text-[9px] block mb-2">Company Bank Details</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {inv.business.bankName && <div><span className="text-zinc-400">Bank:</span> <span className="font-bold text-zinc-850">{inv.business.bankName}</span></div>}
                  {inv.business.bankAccountNo && <div><span className="text-zinc-400">A/c No:</span> <span className="font-mono text-zinc-850">{inv.business.bankAccountNo}</span></div>}
                  {inv.business.bankIfsc && <div><span className="text-zinc-400">IFSC:</span> <span className="font-mono text-zinc-850">{inv.business.bankIfsc}</span></div>}
                  {inv.business.bankBranch && <div><span className="text-zinc-400">Branch:</span> <span className="text-zinc-850">{inv.business.bankBranch}</span></div>}
                </div>
              </div>
            )}

            <div>
              <span className="font-bold text-zinc-400 uppercase tracking-wide text-[9px] block mb-1">Declaration</span>
              <p className="text-[9px] leading-relaxed text-zinc-400">
                Goods once sold will not be taken back. Interest @18% p.a. will be charged on overdue payments.
                Our risk &amp; responsibility ceases as soon as goods leave our premises.
              </p>
              <div className="text-[9px] font-bold text-zinc-400 mt-2">Total tax: {formatINR(taxTotal)}</div>
            </div>
          </div>

          <div className="text-right flex flex-col justify-end h-full pt-6 md:pt-0">
            <span className="text-xs font-bold text-zinc-800 block mb-3">for {inv.business.name}</span>
            {show.signature && inv.business.signatureUrl ? (
              <div className="my-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={inv.business.signatureUrl} alt="" className="h-12 object-contain inline-block border border-dashed border-zinc-200 p-1 rounded bg-zinc-50/50" />
              </div>
            ) : (
              <div className="h-12 border-b border-dashed border-zinc-300 w-48 ml-auto my-2" />
            )}
            <span className="text-[10px] font-semibold text-zinc-400 block mt-2">Authorised Signatory</span>
          </div>
        </div>

        {/* Row 9: Print Sheet Disclaimer */}
        <div className="flex justify-between items-center text-[9px] text-zinc-450 font-semibold border-t border-zinc-100 pt-4 mt-6">
          <span>This is a computer generated invoice.</span>
          <span>Invoixe — Powered by UniCord Tech</span>
          <span>Subject to {inv.business.jurisdiction ?? "local"} Jurisdiction</span>
        </div>
      </div>
    </div>
  );
}
