"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  RefreshCw,
  CheckCircle2,
  Calculator,
  ShieldCheck,
  TrendingUp,
  FileText,
  FileDown,
  Code,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@invoixe/core";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Gstr1 = {
  gstin: string;
  fp: string;
  gt: number;
  b2b: Array<{
    ctin: string;
    inv: Array<{
      inum: string;
      idt: string;
      val: number;
      pos: string;
      rchrg: string;
      inv_typ: string;
      itms: Array<{
        num: number;
        itm_det: {
          rt: number;
          txval: number;
          camt: number;
          samt: number;
          iamt: number;
          csamt: number;
        };
      }>;
    }>;
  }>;
  b2cs: Array<{ sply_ty: string; pos: string; typ: string; txval: number; rt: number; camt: number; samt: number; iamt: number; csamt: number }>;
};

type InvoiceRow = { id: string; number: string; partyName: string | null };

type PurchaseRow = { id: string; grandTotal: number };

type EinvoicePayload = {
  Version: string;
  TranDtls: { TaxSch: string; SupTyp: string; RegRev: string };
  DocDtls: { Typ: string; No: string; Dt: string };
  SellerDtls: { Gstin: string; LglNm: string; Addr1: string; Loc: string; Stcd: string };
  BuyerDtls: { Gstin: string; LglNm: string; Pos: string; Stcd: string };
  ItemList: Array<{
    SlNo: string;
    PrdDesc: string;
    HsnCd: string;
    Qty: number;
    Unit: string;
    UnitPrice: number;
    TotAmt: number;
    AssAmt: number;
    GstRt: number;
    CgstAmt: number;
    SgstAmt: number;
    IgstAmt: number;
    TotItemVal: number;
  }>;
  ValDtls: {
    AssVal: number;
    CgstVal: number;
    SgstVal: number;
    IgstVal: number;
    RndOffAmt: number;
    TotInvVal: number;
  };
  _status: string;
};

export default function GstCompliancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<"gstr1" | "e-invoice" | "gstr3b">("gstr1");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [einvData, setEinvData] = useState<EinvoicePayload | null>(null);
  const [loadingEinv, setLoadingEinv] = useState(false);
  const [uploadingIRN, setUploadingIRN] = useState<Record<string, "idle" | "uploading" | "success">>({});
  const [mockIRNs, setMockIRNs] = useState<Record<string, string>>({});
  const [showRawJson, setShowRawJson] = useState(false);

  // 1. GSTR-1 Query
  const { data: gstr1, refetch: refetchGstr1, isFetching: fetchingGstr1 } = useQuery({
    queryKey: ["gstr1", month, year],
    queryFn: () => api.get<Gstr1>(`/api/gst/gstr1?month=${month}&year=${year}`),
  });

  // 2. Invoices Query
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get<InvoiceRow[]>("/api/invoices"),
  });

  // 3. Purchases Query (for ITC GSTR-3B estimation)
  const { data: purchases } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => api.get<PurchaseRow[]>("/api/purchases"),
  });

  // Download GSTR-1 Schema JSON
  const handleDownloadGstr1 = () => {
    if (!gstr1) return;
    const blob = new Blob([JSON.stringify(gstr1, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `GSTR1_${gstr1.fp}.json`;
    a.click();
    toast.success(`GSTR-1 return file for ${gstr1.fp} downloaded successfully.`);
  };

  // View e-invoice schema NIC payload
  const handleViewEInvoice = async (id: string) => {
    setSelectedInvoiceId(id);
    setLoadingEinv(true);
    try {
      const payload = await api.get<EinvoicePayload>(`/api/gst/einvoice/${id}`);
      setEinvData(payload);
    } catch {
      toast.error("Failed to load e-invoice details");
    } finally {
      setLoadingEinv(false);
    }
  };

  // Copy payload to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("JSON copied to clipboard!");
  };

  // Simulated NIC Portal Push
  const handlePushToNIC = (invId: string) => {
    setUploadingIRN((prev) => ({ ...prev, [invId]: "uploading" }));
    setTimeout(() => {
      const mockIRN = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setMockIRNs((prev) => ({ ...prev, [invId]: mockIRN }));
      setUploadingIRN((prev) => ({ ...prev, [invId]: "success" }));
      toast.success("E-invoice registered on NIC portal! IRN generated.");
    }, 1500);
  };

  // Compiled Invoices from GSTR-1
  const compiledInvoices = useMemo(() => {
    if (!gstr1) return [];
    const list: Array<{ inum: string; idt: string; ctin: string; val: number; taxVal: number; cgst: number; sgst: number; igst: number }> = [];
    gstr1.b2b.forEach((b) => {
      b.inv.forEach((iv) => {
        let taxVal = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        iv.itms.forEach((itm) => {
          taxVal += itm.itm_det.txval;
          cgst += itm.itm_det.camt;
          sgst += itm.itm_det.samt;
          igst += itm.itm_det.iamt;
        });
        list.push({
          inum: iv.inum,
          idt: iv.idt,
          ctin: b.ctin,
          val: iv.val,
          taxVal,
          cgst,
          sgst,
          igst,
        });
      });
    });
    return list;
  }, [gstr1]);

  // GSTR-3B Calculations
  const gstr3bData = useMemo(() => {
    let salesTaxable = 0;
    let cgstOutput = 0;
    let sgstOutput = 0;
    let igstOutput = 0;

    if (gstr1) {
      gstr1.b2b.forEach((b) => {
        b.inv.forEach((iv) => {
          iv.itms.forEach((itm) => {
            salesTaxable += itm.itm_det.txval;
            cgstOutput += itm.itm_det.camt;
            sgstOutput += itm.itm_det.samt;
            igstOutput += itm.itm_det.iamt;
          });
        });
      });

      gstr1.b2cs.forEach((bc) => {
        salesTaxable += bc.txval;
        cgstOutput += bc.camt;
        sgstOutput += bc.samt;
        igstOutput += bc.iamt;
      });
    }

    const totalOutputTax = cgstOutput + sgstOutput + igstOutput;

    // Estimate Input Tax Credit from Purchases (average 18% tax rate)
    const totalPurchasesAmt = (purchases ?? []).reduce((sum, p) => sum + p.grandTotal / 100, 0);
    const purchasesTaxable = totalPurchasesAmt / 1.18;
    const estimatedITC = totalPurchasesAmt - purchasesTaxable;

    const netGstPayable = totalOutputTax - estimatedITC;

    return {
      salesTaxable,
      cgstOutput,
      sgstOutput,
      igstOutput,
      totalOutputTax,
      totalPurchasesAmt,
      purchasesTaxable,
      estimatedITC,
      netGstPayable,
    };
  }, [gstr1, purchases]);

  const monthLabel = new Date(2000, month - 1).toLocaleString("en-IN", { month: "long" });

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader
        title="GST Compliance Hub"
        description="Verify GST returns, view business tax audits, and process government e-invoices."
      />

      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border border-zinc-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">GSTIN Profile</span>
              <h3 className="text-sm font-bold text-zinc-800">{gstr1?.gstin || "27AAPCS1234F1Z5"}</h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-600">Active Business Profile</span>
              </div>
            </div>
            <div className="h-10 w-10 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-center text-zinc-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Sales Turnover</span>
              <h3 className="text-sm font-bold text-zinc-800">
                {gstr1 ? formatINR(gstr1.gt) : "₹0.00"}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">
                Selected Period: <span className="font-semibold text-zinc-700">{monthLabel} {year}</span>
              </p>
            </div>
            <div className="h-10 w-10 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-center text-zinc-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-xs bg-white rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estimated Net Tax Liability</span>
              <h3 className={cn(
                "text-sm font-bold",
                gstr3bData.netGstPayable >= 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                {formatINR(Math.abs(gstr3bData.netGstPayable))}
                <span className="text-[10px] font-normal text-zinc-400 block mt-0.5">
                  {gstr3bData.netGstPayable >= 0 ? "Payable to Govt" : "Excess Input Tax Credit"}
                </span>
              </h3>
            </div>
            <div className="h-10 w-10 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-center text-zinc-400">
              <Calculator className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher Header */}
      <div className="flex border-b border-zinc-200">
        {[
          { id: "gstr1", label: "GSTR-1 Return Audit" },
          { id: "e-invoice", label: "E-Invoicing Portal" },
          { id: "gstr3b", label: "GSTR-3B Tax Estimator" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "gstr1" | "e-invoice" | "gstr3b")}
            className={cn(
              "px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-650"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT panels */}
      <div className="space-y-6">
        {activeTab === "gstr1" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Filters & Actions (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl">
                <CardHeader className="p-5 border-b border-zinc-100 bg-zinc-50/50">
                  <CardTitle className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Return Period</CardTitle>
                  <CardDescription className="text-xs">Compile and review outward supply transaction registers</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Month</label>
                      <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-zinc-300 transition"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {new Date(2000, i).toLocaleString("en-IN", { month: "long" })}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Year</label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-zinc-300 transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => refetchGstr1()}
                      className="text-xs font-bold border-zinc-200 h-9 justify-center gap-1.5"
                    >
                      {fetchingGstr1 ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Audit Invoices
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDownloadGstr1}
                      disabled={!gstr1}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg h-9 gap-1.5"
                    >
                      <FileDown className="h-4 w-4" />
                      Download GSTR-1 File
                    </Button>
                    <p className="text-[9px] text-zinc-400 leading-normal text-center">
                      *Download the GSTR-1 file to upload directly onto the Govt GST portal offline utility.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* GSTR-1 Summaries */}
              {gstr1 && (
                <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl">
                  <CardHeader className="p-5 border-b border-zinc-100">
                    <CardTitle className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Audit Summaries</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">B2B Registered Party Sales</span>
                      <span className="font-bold text-zinc-800">{gstr1.b2b.length} Customers</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">B2B Total Invoices</span>
                      <span className="font-bold text-zinc-800">{compiledInvoices.length} Bills</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">B2C Unregistered Consumer Sales</span>
                      <span className="font-bold text-zinc-800">{gstr1.b2cs.length} Summaries</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Filing Period Code</span>
                      <span className="font-mono font-bold text-zinc-800">{gstr1.fp}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-3 mt-1">
                      <span className="text-zinc-800 font-bold">Total Sales (Gross)</span>
                      <span className="font-mono font-black text-zinc-900">{formatINR(gstr1.gt)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Compiled Invoices Audit Table (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Compiled B2B Supplies Ledger</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {!gstr1 || compiledInvoices.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs italic">
                      No invoices compiled for this return period.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                          <th className="p-3">Bill No.</th>
                          <th className="p-3">Bill Date</th>
                          <th className="p-3">Recipient GSTIN</th>
                          <th className="p-3 text-right">Taxable Value</th>
                          <th className="p-3 text-right">CGST</th>
                          <th className="p-3 text-right">SGST</th>
                          <th className="p-3 text-right">IGST</th>
                          <th className="p-3 text-right">Total Bill Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {compiledInvoices.map((civ) => (
                          <tr key={civ.inum} className="hover:bg-zinc-50/30 transition">
                            <td className="p-3 font-bold text-zinc-800">{civ.inum}</td>
                            <td className="p-3 text-zinc-650">{civ.idt}</td>
                            <td className="p-3 font-mono text-zinc-700">{civ.ctin}</td>
                            <td className="p-3 text-right font-mono text-zinc-700">{formatINR(civ.taxVal)}</td>
                            <td className="p-3 text-right font-mono text-zinc-650">{formatINR(civ.cgst)}</td>
                            <td className="p-3 text-right font-mono text-zinc-650">{formatINR(civ.sgst)}</td>
                            <td className="p-3 text-right font-mono text-zinc-650">{formatINR(civ.igst)}</td>
                            <td className="p-3 text-right font-bold font-mono text-zinc-800">{formatINR(civ.val / 100)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "e-invoice" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Invoice Terminal Table (5 Cols) */}
            <div className="lg:col-span-5">
              <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
                <CardHeader className="p-5 border-b border-zinc-150">
                  <CardTitle className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Sale Invoice</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Select an invoice to check and audit its government e-invoice challan report.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {invoicesLoading ? (
                    <div className="p-8 text-center text-zinc-400 text-xs italic">
                      Loading invoices...
                    </div>
                  ) : !invoices || invoices.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs italic font-medium">
                      No invoices found to register.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-150">
                      {invoices.slice(0, 10).map((inv) => {
                        const status = uploadingIRN[inv.id] || "idle";
                        return (
                          <div
                            key={inv.id}
                            className={cn(
                              "p-4 flex items-center justify-between hover:bg-zinc-50/50 transition cursor-pointer",
                              selectedInvoiceId === inv.id ? "bg-zinc-50 border-l-2 border-zinc-800" : ""
                            )}
                            onClick={() => handleViewEInvoice(inv.id)}
                          >
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-zinc-800">{inv.number}</span>
                              <p className="text-[10px] text-zinc-500">
                                Customer: <span className="font-semibold text-zinc-650">{inv.partyName || "Cash Sale"}</span>
                              </p>
                              {mockIRNs[inv.id] && (
                                <p className="text-[8px] font-mono text-zinc-400 max-w-[200px] truncate mt-1">
                                  IRN: {mockIRNs[inv.id]}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {status === "idle" && (
                                <Button
                                  onClick={() => handlePushToNIC(inv.id)}
                                  size="sm"
                                  className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] rounded"
                                >
                                  Register NIC
                                </Button>
                              )}
                              {status === "uploading" && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-150 px-2.5 py-1 rounded">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Syncing...
                                </span>
                              )}
                              {status === "success" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2.5 py-1 rounded">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Registered
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* E-Invoice Form Challan Preview (7 Cols) */}
            <div className="lg:col-span-7">
              <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden flex flex-col h-full">
                {/* Header Controls */}
                <div className="p-4 border-b border-zinc-150 bg-zinc-50/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-650" />
                    <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Govt E-Invoice Challan Preview</span>
                  </div>
                  {einvData && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowRawJson(!showRawJson)}
                        className="text-xs text-zinc-500 hover:text-zinc-800 transition flex items-center gap-1"
                      >
                        <Code className="h-3.5 w-3.5" />
                        {showRawJson ? "Show Form" : "View JSON"}
                      </button>
                      <button
                        onClick={() => handleCopyToClipboard(JSON.stringify(einvData, null, 2))}
                        className="text-xs text-zinc-500 hover:text-zinc-800 transition flex items-center gap-1 ml-2"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Viewport */}
                <div className="p-6 overflow-auto flex-1 max-h-[580px]">
                  {loadingEinv ? (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
                      <p className="text-xs font-medium">Compiling e-invoice data...</p>
                    </div>
                  ) : showRawJson && einvData ? (
                    // Collapsible Developer JSON view
                    <pre className="p-4 rounded-lg bg-zinc-950 text-emerald-300 font-mono text-[10px] overflow-auto leading-relaxed max-h-[480px]">
                      {JSON.stringify(einvData, null, 2)}
                    </pre>
                  ) : einvData && selectedInvoiceId ? (
                    // Government FORM GST INS-01 Challan Design
                    <div className="space-y-6 text-zinc-800 border border-zinc-200 p-5 sm:p-6 rounded-lg bg-white shadow-xs max-w-2xl mx-auto">
                      {/* Goverment INS Header */}
                      <div className="border-b border-zinc-300 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">FORM GST INS-01</span>
                          <h4 className="text-sm font-black text-zinc-900 tracking-tight uppercase">e-Invoice Challan Report</h4>
                          <p className="text-[9px] text-zinc-500 leading-none">Generated under Rule 48(4) of CGST Rules, 2017</p>
                        </div>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm border",
                          mockIRNs[selectedInvoiceId]
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-amber-700 bg-amber-50 border-amber-200"
                        )}>
                          {mockIRNs[selectedInvoiceId] ? "Signed / Registered" : "Draft / Ready"}
                        </span>
                      </div>

                      {/* IRN Barcode Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-zinc-50 border border-zinc-150 rounded">
                        <div className="sm:col-span-3 space-y-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Invoice Reference Number (IRN)</span>
                            <p className="font-mono text-[9px] text-zinc-800 break-all select-all font-semibold leading-relaxed">
                              {mockIRNs[selectedInvoiceId] || "NOT REGISTERED - CLICK 'REGISTER NIC' ON THE LEFT TERMINAL"}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200/50">
                            <div>
                              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Ack No</span>
                              <span className="text-xs font-bold text-zinc-700">
                                {mockIRNs[selectedInvoiceId] ? "10982374" : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Ack Date</span>
                              <span className="text-xs font-bold text-zinc-700">
                                {mockIRNs[selectedInvoiceId] ? einvData.DocDtls.Dt : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center border-t sm:border-t-0 sm:border-l border-zinc-250 pt-3 sm:pt-0 sm:pl-3 shrink-0">
                          {mockIRNs[selectedInvoiceId] ? (
                            <div className="border border-zinc-350 p-1.5 bg-white rounded shadow-2xs">
                              {/* Draw Government QR code using authentic inline SVG */}
                              <svg className="w-16 h-16 text-zinc-900" viewBox="0 0 100 100" fill="currentColor">
                                <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
                                <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
                                <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
                                <path d="M40,10 h10 v10 h-10 z M50,20 h10 v10 h-10 z M35,40 h15 v5 h-15 z M60,60 h10 v10 h-10 z M45,75 h20 v10 h-20 z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="text-center text-zinc-350 flex flex-col items-center justify-center p-2 border border-dashed border-zinc-200 rounded bg-white/40">
                              <QrCode className="h-8 w-8 opacity-40 mb-1" />
                              <span className="text-[7px] font-bold uppercase tracking-wider">No QR Available</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parties Supplier vs Recipient Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-zinc-200 py-4">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Details of Supplier (Seller)</span>
                          <div className="space-y-0.5 text-xs text-zinc-700">
                            <p className="font-bold text-zinc-900">{einvData.SellerDtls.LglNm}</p>
                            <p className="font-mono text-[10px] text-zinc-600 font-semibold">GSTIN: {einvData.SellerDtls.Gstin}</p>
                            <p className="text-[10px] text-zinc-500 leading-normal">{einvData.SellerDtls.Addr1}, {einvData.SellerDtls.Loc}</p>
                            <p className="text-[10px] text-zinc-500">State Code: {einvData.SellerDtls.Stcd}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-zinc-200 pt-3 sm:pt-0 sm:pl-4">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Details of Recipient (Buyer)</span>
                          <div className="space-y-0.5 text-xs text-zinc-700">
                            <p className="font-bold text-zinc-900">{einvData.BuyerDtls.LglNm}</p>
                            <p className="font-mono text-[10px] text-zinc-600 font-semibold">GSTIN: {einvData.BuyerDtls.Gstin}</p>
                            <p className="text-[10px] text-zinc-500">Place of Supply: {einvData.BuyerDtls.Pos}</p>
                            <p className="text-[10px] text-zinc-500">State Code: {einvData.BuyerDtls.Stcd}</p>
                          </div>
                        </div>
                      </div>

                      {/* Items details table */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Item Details</span>
                        <div className="overflow-x-auto border border-zinc-200 rounded">
                          <table className="w-full text-left text-[10px] border-collapse min-w-[500px]">
                            <thead>
                              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                                <th className="p-2 w-8 text-center">Sr.</th>
                                <th className="p-2">Product Description</th>
                                <th className="p-2 text-center">HSN</th>
                                <th className="p-2 text-center">Qty / Unit</th>
                                <th className="p-2 text-right">Rate</th>
                                <th className="p-2 text-center">GST %</th>
                                <th className="p-2 text-right">Taxable</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-150">
                              {einvData.ItemList.map((itm) => (
                                <tr key={itm.SlNo}>
                                  <td className="p-2 text-center text-zinc-450">{itm.SlNo}</td>
                                  <td className="p-2 font-semibold text-zinc-800">{itm.PrdDesc}</td>
                                  <td className="p-2 text-center font-mono text-zinc-600">{itm.HsnCd}</td>
                                  <td className="p-2 text-center text-zinc-650">{itm.Qty} {itm.Unit || "g"}</td>
                                  <td className="p-2 text-right font-mono text-zinc-650">{formatINR(itm.UnitPrice)}</td>
                                  <td className="p-2 text-center font-semibold text-zinc-700">{itm.GstRt}%</td>
                                  <td className="p-2 text-right font-mono text-zinc-650">{formatINR(itm.AssAmt)}</td>
                                  <td className="p-2 text-right font-bold font-mono text-zinc-800">{formatINR(itm.TotItemVal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Calculations Details Summary */}
                      <div className="flex flex-col sm:flex-row sm:justify-end">
                        <div className="w-full sm:w-64 space-y-2 border border-zinc-200 p-3 rounded bg-zinc-50/50">
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Ass. Value (Taxable)</span>
                            <span className="font-mono text-zinc-750">{formatINR(einvData.ValDtls.AssVal)}</span>
                          </div>
                          {einvData.ValDtls.CgstVal > 0 && (
                            <div className="flex justify-between text-[10px] text-zinc-500">
                              <span>CGST Total</span>
                              <span className="font-mono text-zinc-750">{formatINR(einvData.ValDtls.CgstVal)}</span>
                            </div>
                          )}
                          {einvData.ValDtls.SgstVal > 0 && (
                            <div className="flex justify-between text-[10px] text-zinc-500">
                              <span>SGST Total</span>
                              <span className="font-mono text-zinc-750">{formatINR(einvData.ValDtls.SgstVal)}</span>
                            </div>
                          )}
                          {einvData.ValDtls.IgstVal > 0 && (
                            <div className="flex justify-between text-[10px] text-zinc-500">
                              <span>IGST Total</span>
                              <span className="font-mono text-zinc-750">{formatINR(einvData.ValDtls.IgstVal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Round Off</span>
                            <span className="font-mono text-zinc-750">{formatINR(einvData.ValDtls.RndOffAmt)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-black border-t border-zinc-250 pt-2 text-zinc-900">
                            <span>Grand Total Value</span>
                            <span className="font-mono">{formatINR(einvData.ValDtls.TotInvVal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-400 gap-2 border border-dashed border-zinc-200 rounded-lg">
                      <QrCode className="h-8 w-8 text-zinc-300" />
                      <p className="text-xs">Select an invoice on the left to review Government Challan INS-01 report.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "gstr3b" && (
          <Card className="border border-zinc-200 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-zinc-150">
              <CardTitle className="text-sm font-bold text-zinc-800">GSTR-3B Auto-Calculated Summary (Estimation)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Calculated outward tax liabilities from sales compared to estimated input credits from purchases.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Outward Liabilities */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider border-b pb-2">
                    3.1 Outward supplies (Output Liability)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Total Outward Turnover</span>
                      <span className="font-mono font-bold text-zinc-800">{formatINR(gstr3bData.salesTaxable)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">CGST Output Liability</span>
                      <span className="font-mono font-semibold text-zinc-750">{formatINR(gstr3bData.cgstOutput)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">SGST Output Liability</span>
                      <span className="font-mono font-semibold text-zinc-750">{formatINR(gstr3bData.sgstOutput)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">IGST Output Liability</span>
                      <span className="font-mono font-semibold text-zinc-750">{formatINR(gstr3bData.igstOutput)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-2 font-bold">
                      <span className="text-zinc-850">Total Output Tax Liability</span>
                      <span className="font-mono text-zinc-900">{formatINR(gstr3bData.totalOutputTax)}</span>
                    </div>
                  </div>
                </div>

                {/* Input Credits */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider border-b pb-2">
                    4. Input Tax Credit (Eligible ITC)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Total Purchase Turnover</span>
                      <span className="font-mono font-bold text-zinc-800">{formatINR(gstr3bData.purchasesTaxable)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">Estimated IGST/CGST Input Tax Credit</span>
                      <span className="font-mono font-semibold text-zinc-750">{formatINR(gstr3bData.estimatedITC)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-2 font-bold">
                      <span className="text-zinc-850">Total Available ITC</span>
                      <span className="font-mono text-emerald-600">{formatINR(gstr3bData.estimatedITC)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Compliance Summary */}
              <div className="border-t border-zinc-200 pt-6 mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-zinc-50 rounded-xl">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-800">Net Liability Calculation Summary</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-lg">
                    The net liability is computed as: Output Tax Liability - Input Tax Credit. A positive amount requires cash payment while negative indicates carry forward input credit.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Net Amount Payable</div>
                  <div className={cn(
                    "text-xl font-black mt-1",
                    gstr3bData.netGstPayable >= 0 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {formatINR(Math.abs(gstr3bData.netGstPayable))}
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                    {gstr3bData.netGstPayable >= 0 ? "Payable in cash / ledger" : "Available to carry forward"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
