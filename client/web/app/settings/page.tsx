"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  SlidersHorizontal,
  Hash,
  Settings2,
  FileText,
  Percent,
  Printer,
  Users,
  Package,
  Copy,
  Check,
  ExternalLink,
  Save,
  Globe,
  Upload,
  Coins
} from "lucide-react";
import type { BusinessSettings } from "@invoixe/types";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/page-header";
import { ImageUpload } from "../../components/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ---------- small building blocks ---------- */

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-slate-50/50 px-2 rounded-lg -mx-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-slate-50/50 px-2 rounded-lg -mx-2">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-44 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ---------- business profile ---------- */

type Business = {
  id: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  stateCode: string | null;
  stateName: string | null;
  address: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  jurisdiction: string | null;
  businessCategory: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
};

const PROFILE_FIELDS: { key: keyof Business; label: string; ph?: string; section: "Firm" | "Bank" }[] = [
  { key: "name", label: "Business Name", ph: "e.g. Acme Corporation", section: "Firm" },
  { key: "gstin", label: "GSTIN/UIN", ph: "e.g. 27ABGFA0472K1ZF", section: "Firm" },
  { key: "pan", label: "PAN", ph: "e.g. ABGFA0472K", section: "Firm" },
  { key: "stateCode", label: "State Code", ph: "e.g. 27", section: "Firm" },
  { key: "stateName", label: "State Name", ph: "e.g. Maharashtra", section: "Firm" },
  { key: "phone", label: "Contact Phone", ph: "e.g. +91 90494 84236", section: "Firm" },
  { key: "email", label: "Contact Email", ph: "e.g. billing@firm.com", section: "Firm" },
  { key: "businessCategory", label: "Business Category", ph: "e.g. Manufacturer", section: "Firm" },
  { key: "jurisdiction", label: "Jurisdiction", ph: "e.g. Palghar", section: "Firm" },
  { key: "pincode", label: "Pincode", ph: "e.g. 401501", section: "Firm" },
  { key: "address", label: "Full Address", ph: "e.g. Shed No 5, Boisar MIDC", section: "Firm" },
  { key: "bankName", label: "Bank Name", ph: "e.g. RBL Bank", section: "Bank" },
  { key: "bankAccountNo", label: "Account Number", ph: "e.g. 409000505463", section: "Bank" },
  { key: "bankIfsc", label: "IFSC Code", ph: "e.g. RATN0000107", section: "Bank" },
  { key: "bankBranch", label: "Bank Branch", ph: "e.g. Boisar", section: "Bank" },
];

function ProfileTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["business"], queryFn: () => api.get<Business>("/api/business/current") });
  const [form, setForm] = useState<Record<string, string>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const f: Record<string, string> = {};
    for (const { key } of PROFILE_FIELDS) f[key] = (data[key] as string | null) ?? "";
    setForm(f);
    setLogoUrl(data.logoUrl);
    setSignatureUrl(data.signatureUrl);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.patch<Business>("/api/business/current", { ...form, logoUrl, signatureUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business"] });
      toast.success("Business profile saved successfully");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-8"
    >
      {/* Branding Assets */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <Upload className="w-4 h-4 text-teal-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Branding Assets</h3>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 p-4 dark:bg-slate-900/20">
            <Label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Logo</Label>
            {data && (
              <ImageUpload value={logoUrl} onChange={setLogoUrl} pathPrefix={`logos/${data.id}`} />
            )}
            <p className="mt-2 text-[11px] text-slate-400">Dimensions should ideally be square (e.g. 512x512). Shown on print invoices.</p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 p-4 dark:bg-slate-900/20">
            <Label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Authorized Signature</Label>
            {data && (
              <ImageUpload value={signatureUrl} onChange={setSignatureUrl} pathPrefix={`signatures/${data.id}`} shape="wide" />
            )}
            <p className="mt-2 text-[11px] text-slate-400">Dimensions should ideally be wide (e.g. 400x120). Placed in signature section.</p>
          </div>
        </div>
      </div>

      {/* Firm Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Firm & Tax Registrations</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.filter((f) => f.section === "Firm").map((f) => (
            <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">{f.label}</Label>
              <Input
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.ph}
                className="h-10 bg-slate-50/30 focus:bg-white dark:bg-slate-900/40 dark:focus:bg-slate-900"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bank Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <Coins className="w-4 h-4 text-teal-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bank Transfer Details</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.filter((f) => f.section === "Bank").map((f) => (
            <div key={f.key}>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">{f.label}</Label>
              <Input
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.ph}
                className="h-10 bg-slate-50/30 focus:bg-white dark:bg-slate-900/40 dark:focus:bg-slate-900"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm">
        <Save className="w-4 h-4 mr-2" />
        {save.isPending ? "Saving Profile…" : "Save Business Profile"}
      </Button>
    </form>
  );
}

/* ---------- numbering ---------- */

type Series = { key: string; label: string; prefix: string; next: number };

function NumberingTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["series"], queryFn: () => api.get<Series[]>("/api/business/current/series") });
  const [edits, setEdits] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (v: { key: string; prefix: string }) => api.patch("/api/business/current/series", v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      toast.success("Document prefix updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update prefix"),
  });

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/30 text-teal-800 dark:border-teal-950/20 dark:bg-teal-950/10 text-xs leading-relaxed">
        The prefix is combined with a running incremental number (e.g. <code>INV-42</code>). Changing a prefix will only affect future created documents. Active serial states will not be modified.
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {data?.map((s) => {
          const val = edits[s.key] ?? s.prefix;
          const dirty = val !== s.prefix;
          return (
            <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live Preview: <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono dark:bg-slate-800 dark:text-slate-300">{val}-{s.next}</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={val}
                  onChange={(e) => setEdits((p) => ({ ...p, [s.key]: e.target.value.toUpperCase() }))}
                  className="w-32 h-10 font-mono tracking-wider text-center"
                />
                <Button
                  size="sm"
                  variant={dirty ? "default" : "outline"}
                  disabled={!dirty || save.isPending}
                  onClick={() => save.mutate({ key: s.key, prefix: val })}
                  className={cn(
                    "h-10 px-4",
                    dirty && "bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  )}
                >
                  Save
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- preferences (settings JSON) ---------- */

function PreferencesTabs() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<BusinessSettings>("/api/business/current/settings"),
  });
  const [draft, setDraft] = useState<BusinessSettings | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("general");

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (s: BusinessSettings) => api.patch<BusinessSettings>("/api/business/current/settings", s),
    onSuccess: (s) => {
      qc.setQueryData(["settings"], s);
      toast.success("Preferences updated successfully");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (!draft) return <p className="p-4 text-sm text-slate-500 animate-pulse">Loading preferences…</p>;

  // Typed group updater: set(group, key, value).
  function set<G extends keyof BusinessSettings, K extends keyof BusinessSettings[G]>(
    group: G,
    key: K,
    value: BusinessSettings[G][K]
  ) {
    setDraft((d) => (d ? { ...d, [group]: { ...d[group], [key]: value } } : d));
  }
  
  function setNested<
    G extends keyof BusinessSettings,
    S extends keyof BusinessSettings[G],
    K extends keyof BusinessSettings[G][S]
  >(group: G, sub: S, key: K, value: BusinessSettings[G][S][K]) {
    setDraft((d) =>
      d ? { ...d, [group]: { ...d[group], [sub]: { ...(d[group][sub] as object), [key]: value } } } : d
    );
  }

  const num = (n: number) => String(n);

  const subTabs = [
    { id: "general", label: "General", icon: Settings2 },
    { id: "transaction", label: "Transactions", icon: FileText },
    { id: "taxes", label: "Taxes & GST", icon: Percent },
    { id: "print", label: "Print & Themes", icon: Printer },
    { id: "party", label: "Parties", icon: Users },
    { id: "item", label: "Inventory Items", icon: Package },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Sub-tabs List */}
      <div className="flex flex-wrap lg:flex-col gap-1 shrink-0 lg:w-48 bg-slate-50/50 p-1.5 rounded-xl border border-slate-100 dark:bg-slate-900/20 dark:border-slate-800">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-all",
                "flex-1 lg:flex-none justify-center lg:justify-start",
                isActive
                  ? "bg-white dark:bg-slate-950 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-100 dark:border-slate-800"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Preferences Content */}
      <div className="flex-1 min-w-0">
        {activeSubTab === "general" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-3"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Global Decimals</h4></div>
            <SelectRow label="Amount Decimals" value={num(draft.general.amountDecimals)} onChange={(v) => set("general", "amountDecimals", Number(v))} options={[0, 1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))} />
            <div className="py-4"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Behavioral Switches</h4></div>
            <ToggleRow label="Show GSTIN on Documents" checked={draft.general.showGstin} onCheckedChange={(v) => set("general", "showGstin", v)} />
            <ToggleRow label="Block Sale on Negative Stock" description="Prevent creating invoices when item quantities fall below 0" checked={draft.general.stopSaleOnNegativeStock} onCheckedChange={(v) => set("general", "stopSaleOnNegativeStock", v)} />
            <div className="py-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Enabled Documents</h4>
              <p className="text-[11px] text-slate-500 mt-1">Activate optional operational document registries:</p>
            </div>
            <ToggleRow label="Estimate / Quotation" checked={draft.general.enabledDocs.estimate} onCheckedChange={(v) => setNested("general", "enabledDocs", "estimate", v)} />
            <ToggleRow label="Proforma Invoice" checked={draft.general.enabledDocs.proforma} onCheckedChange={(v) => setNested("general", "enabledDocs", "proforma", v)} />
            <ToggleRow label="Sale Order Bookings" checked={draft.general.enabledDocs.saleOrder} onCheckedChange={(v) => setNested("general", "enabledDocs", "saleOrder", v)} />
            <ToggleRow label="Purchase Orders" checked={draft.general.enabledDocs.purchaseOrder} onCheckedChange={(v) => setNested("general", "enabledDocs", "purchaseOrder", v)} />
            <ToggleRow label="Delivery Challans" checked={draft.general.enabledDocs.deliveryChallan} onCheckedChange={(v) => setNested("general", "enabledDocs", "deliveryChallan", v)} />
          </div>
        )}

        {activeSubTab === "transaction" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-3"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Formatting & Defaults</h4></div>
            <ToggleRow label="Show Invoice Number" checked={draft.transaction.showInvoiceNo} onCheckedChange={(v) => set("transaction", "showInvoiceNo", v)} />
            <ToggleRow label="Prices Tax-Inclusive by Default" description="Assume entered item prices already incorporate active tax scales" checked={draft.transaction.taxInclusiveByDefault} onCheckedChange={(v) => set("transaction", "taxInclusiveByDefault", v)} />
            
            <div className="py-4"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Invoice Rounding</h4></div>
            <ToggleRow label="Enable Total Round-Off" checked={draft.transaction.roundOff.enabled} onCheckedChange={(v) => setNested("transaction", "roundOff", "enabled", v)} />
            <SelectRow label="Round Off Scale" value={num(draft.transaction.roundOff.to)} onChange={(v) => setNested("transaction", "roundOff", "to", Number(v) as 1 | 10 | 100)} options={[{ value: "1", label: "Nearest ₹1" }, { value: "10", label: "Nearest ₹10" }, { value: "100", label: "Nearest ₹100" }]} />
            
            <div className="py-4"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Regulatory & Charges</h4></div>
            <ToggleRow label="Due Dates & Terms" checked={draft.transaction.dueDatesAndTerms} onCheckedChange={(v) => set("transaction", "dueDatesAndTerms", v)} />
            <ToggleRow label="E-way Bill Reference Field" checked={draft.transaction.enableEwayBill} onCheckedChange={(v) => set("transaction", "enableEwayBill", v)} />
            <ToggleRow label="Transportation Details" checked={draft.transaction.transportDetails} onCheckedChange={(v) => set("transaction", "transportDetails", v)} />
            <ToggleRow label="Additional Logistics Charges" description="Enable ledger columns for shipping, custom duty, packing fees" checked={draft.transaction.additionalCharges} onCheckedChange={(v) => set("transaction", "additionalCharges", v)} />
          </div>
        )}

        {activeSubTab === "taxes" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-3"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Compliance Modules</h4></div>
            <ToggleRow label="Enable GST Controls" checked={draft.taxes.enableGst} onCheckedChange={(v) => set("taxes", "enableGst", v)} />
            <ToggleRow label="Enable HSN/SAC Categories" checked={draft.taxes.enableHsn} onCheckedChange={(v) => set("taxes", "enableHsn", v)} />
            <ToggleRow label="Track Place of Supply" checked={draft.taxes.placeOfSupply} onCheckedChange={(v) => set("taxes", "placeOfSupply", v)} />
            
            <div className="py-4"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tax Options</h4></div>
            <ToggleRow label="Composite Scheme Billing" checked={draft.taxes.compositeScheme} onCheckedChange={(v) => set("taxes", "compositeScheme", v)} />
            <ToggleRow label="Additional Cess Rates" checked={draft.taxes.additionalCess} onCheckedChange={(v) => set("taxes", "additionalCess", v)} />
            <ToggleRow label="Reverse Charge (RCM)" checked={draft.taxes.reverseCharge} onCheckedChange={(v) => set("taxes", "reverseCharge", v)} />
            <ToggleRow label="Enable TCS Collection" checked={draft.taxes.enableTcs} onCheckedChange={(v) => set("taxes", "enableTcs", v)} />
            <ToggleRow label="Enable TDS Deduction" checked={draft.taxes.enableTds} onCheckedChange={(v) => set("taxes", "enableTds", v)} />
          </div>
        )}

        {activeSubTab === "print" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-3"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Invoice Template</h4></div>
            <SelectRow label="Print Layout Theme" value={draft.print.theme} onChange={(v) => set("print", "theme", v as "tally" | "gst1")} options={[{ value: "tally", label: "Tally Style (dense)" }, { value: "gst1", label: "Modern GST Style" }]} />
            
            <div className="py-4"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Print Headers & Fields</h4></div>
            <ToggleRow label="Show Company Logo" checked={draft.print.showLogo} onCheckedChange={(v) => set("print", "showLogo", v)} />
            <ToggleRow label="Show Business GSTIN" checked={draft.print.showGstinOnSale} onCheckedChange={(v) => set("print", "showGstinOnSale", v)} />
            <ToggleRow label="Show Received Amount" checked={draft.print.showReceivedAmount} onCheckedChange={(v) => set("print", "showReceivedAmount", v)} />
            <ToggleRow label="Show Balance Amount" checked={draft.print.showBalanceAmount} onCheckedChange={(v) => set("print", "showBalanceAmount", v)} />
            <ToggleRow label="Show Tax Percentage Breakdown" checked={draft.print.showTaxDetails} onCheckedChange={(v) => set("print", "showTaxDetails", v)} />
            <ToggleRow label="Show Grand Total in Words (INR)" checked={draft.print.showAmountInWords} onCheckedChange={(v) => set("print", "showAmountInWords", v)} />
            <ToggleRow label="Show Signature Section" checked={draft.print.showSignature} onCheckedChange={(v) => set("print", "showSignature", v)} />
          </div>
        )}

        {activeSubTab === "party" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-3"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ledger Settings</h4></div>
            <ToggleRow label="Shipping Address Support" description="Add secondary delivery address fields to customer profiles" checked={draft.party.shippingAddress} onCheckedChange={(v) => set("party", "shippingAddress", v)} />
            <ToggleRow label="Manage Party Status" checked={draft.party.managePartyStatus} onCheckedChange={(v) => set("party", "managePartyStatus", v)} />
            <ToggleRow label="Customer Loyalty Points" checked={draft.party.loyaltyPoints} onCheckedChange={(v) => set("party", "loyaltyPoints", v)} />
          </div>
        )}

        {activeSubTab === "item" && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-3"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Stock Settings</h4></div>
            <ToggleRow label="Maintain Inventory Stock" description="Enable automated decrementing on sales and incrementing on purchases" checked={draft.item.stockMaintenance} onCheckedChange={(v) => set("item", "stockMaintenance", v)} />
            <ToggleRow label="Low-Stock Alert Overlays" checked={draft.item.showLowStockDialog} onCheckedChange={(v) => set("item", "showLowStockDialog", v)} />
            <ToggleRow label="Enable Item Categories" checked={draft.item.itemCategory} onCheckedChange={(v) => set("item", "itemCategory", v)} />
            <ToggleRow label="Wholesale Price Field" checked={draft.item.wholesalePrice} onCheckedChange={(v) => set("item", "wholesalePrice", v)} />
            <ToggleRow label="Additional Item Descriptions" checked={draft.item.description} onCheckedChange={(v) => set("item", "description", v)} />
            
            <div className="py-4"><h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Transaction Columns</h4></div>
            <ToggleRow label="Item-wise Tax Config" description="Allow setting independent tax rates per invoice row" checked={draft.item.itemWiseTax} onCheckedChange={(v) => set("item", "itemWiseTax", v)} />
            <ToggleRow label="Item-wise Discount Columns" description="Enable discount percentages or flat rupee reductions per row" checked={draft.item.itemWiseDiscount} onCheckedChange={(v) => set("item", "itemWiseDiscount", v)} />
            <SelectRow label="Quantity Decimals" value={num(draft.item.qtyDecimals)} onChange={(v) => set("item", "qtyDecimals", Number(v))} options={[0, 1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))} />
          </div>
        )}

        <Separator className="my-6" />

        <Button onClick={() => save.mutate(draft)} disabled={save.isPending} className="w-full sm:w-auto h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm">
          <Save className="w-4 h-4 mr-2" />
          {save.isPending ? "Saving Preferences…" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function SettingsPage() {
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: () => api.get<Business>("/api/business/current") });
  const [copied, setCopied] = useState(false);

  const storeUrl = business ? `${typeof window !== "undefined" ? window.location.origin : ""}/store/${business.id}` : "";

  const handleCopy = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Online store link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 sm:px-6 py-8">
      <PageHeader 
        title="Settings" 
        description="Configure your firm identity, billing rules, tax preferences, and serial structures." 
        backHref="/" 
        backLabel="Dashboard" 
      />

      {business && (
        <Card className="mb-8 border-teal-100 bg-gradient-to-r from-teal-50/50 to-cyan-50/30 dark:border-teal-950/20 dark:from-teal-950/10 dark:to-cyan-950/5 overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Public Online Store</span>
              </div>
              <p className="text-xs text-slate-500">Your customer-facing catalog website is live and connected.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white/80 border border-teal-100/50 dark:border-slate-800 dark:bg-slate-900/60 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono select-all">
                {storeUrl}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy} className="h-9 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
              </Button>
              <Button asChild size="sm" variant="default" className="h-9 px-4 bg-teal-600 hover:bg-teal-700 text-white">
                <Link href={`/store/${business.id}`} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View Store
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="flex flex-col gap-6 md:flex-row items-start">
        {/* Main Tab Switcher Sidebar */}
        <TabsList className="w-full md:w-56 h-auto flex flex-row md:flex-col bg-slate-100 dark:bg-slate-900 p-1 gap-1 rounded-xl shrink-0">
          <TabsTrigger 
            value="profile" 
            className="flex-1 md:flex-initial md:w-full justify-center md:justify-start gap-2.5 py-2.5 px-4 font-bold text-xs rounded-lg transition-all"
          >
            <Building2 className="w-4 h-4 shrink-0" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="flex-1 md:flex-initial md:w-full justify-center md:justify-start gap-2.5 py-2.5 px-4 font-bold text-xs rounded-lg transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            Preferences
          </TabsTrigger>
          <TabsTrigger 
            value="numbering" 
            className="flex-1 md:flex-initial md:w-full justify-center md:justify-start gap-2.5 py-2.5 px-4 font-bold text-xs rounded-lg transition-all"
          >
            <Hash className="w-4 h-4 shrink-0" />
            Numbering
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <div className="min-w-0 flex-1 w-full">
          <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
            <Card className="border-slate-150 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
                <CardTitle className="text-base font-bold">Business Profile</CardTitle>
                <CardDescription className="text-xs">Update your legal firm names, contact handles, business category, address and banking parameters.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ProfileTab />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences" className="mt-0 focus-visible:outline-none">
            <Card className="border-slate-150 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
                <CardTitle className="text-base font-bold">Preferences</CardTitle>
                <CardDescription className="text-xs">Control compliance configurations, decimal places, invoicing structures, rounding limits and document printing toggles.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <PreferencesTabs />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="numbering" className="mt-0 focus-visible:outline-none">
            <Card className="border-slate-150 shadow-sm dark:border-slate-800 bg-white dark:bg-slate-950">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900 pb-4">
                <CardTitle className="text-base font-bold">Document Numbering</CardTitle>
                <CardDescription className="text-xs">Customize sequential numbering patterns, billing code prefixes, and order sequence structures.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <NumberingTab />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
