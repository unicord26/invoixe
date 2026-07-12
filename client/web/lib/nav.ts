import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Landmark,
  BarChart3,
  ShieldCheck,
  Factory,
  Warehouse,
  DatabaseBackup,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the sidebar navigation. Groups mirror Vyapar's
 * sub-menus but link only to routes that exist today; `soon: true` marks items
 * planned in a later Milestone-1 task (rendered disabled with a "Soon" badge).
 */
export type NavLeaf = {
  label: string;
  href: string;
  icon?: LucideIcon;
  soon?: boolean;
  /** Short blurb shown on the dashboard module cards (and usable as a tooltip). */
  desc?: string;
};
export type NavGroup = { label: string; icon: LucideIcon; items: NavLeaf[] };
export type NavEntry = NavLeaf | NavGroup;

export function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).items !== undefined;
}

/**
 * Flatten the grouped nav into a single list of leaves — the dashboard module
 * grid renders from this so nav and dashboard never drift. Skips "soon" items by
 * default; the leaf carries the group's icon when it has none of its own.
 */
export function flattenLeaves(includeSoon = false): NavLeaf[] {
  const out: NavLeaf[] = [];
  for (const entry of NAV) {
    if (isGroup(entry)) {
      for (const leaf of entry.items) {
        if (leaf.soon && !includeSoon) continue;
        out.push({ icon: entry.icon, ...leaf });
      }
    } else {
      if (entry.soon && !includeSoon) continue;
      out.push(entry);
    }
  }
  return out;
}

/** Is `href` the active route for `pathname`? */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export const NAV: NavEntry[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Parties", href: "/parties", icon: Users, desc: "Customers & suppliers" },
  {
    label: "Items",
    icon: Package,
    items: [
      { label: "Item List", href: "/items", desc: "Products & inventory" },
      { label: "Add Item", href: "/items/new", desc: "Create a new item" },
    ],
  },
  {
    label: "Sale",
    icon: FileText,
    items: [
      { label: "Sale Invoices", href: "/invoices", desc: "GST billing" },
      { label: "POS Billing", href: "/pos", desc: "Fast counter billing" },
      { label: "Estimates & Orders", href: "/documents", desc: "Estimates, orders, notes" },
    ],
  },
  {
    label: "Purchase & Expense",
    icon: ShoppingCart,
    items: [
      { label: "Purchase Bills", href: "/purchases", desc: "Supplier bills" },
      { label: "Expenses", href: "/expenses", desc: "Track spending" },
    ],
  },
  {
    label: "Cash & Bank",
    icon: Landmark,
    items: [
      { label: "Bank Accounts", href: "/bank", desc: "Accounts & transfers" },
      { label: "Cheques", href: "/bank/cheques", desc: "Track cheques" },
      { label: "Loan Accounts", href: "/bank/loans", desc: "Loans & EMIs" },
    ],
  },
  { label: "Reports", href: "/reports", icon: BarChart3, desc: "P&L, GST, stock" },
  { label: "GST Compliance", href: "/gst", icon: ShieldCheck, desc: "GSTR-1, e-invoice" },
  { label: "Manufacturing", href: "/manufacturing", icon: Factory, desc: "BOM & production" },
  { label: "Godowns", href: "/godowns", icon: Warehouse, desc: "Warehouses & transfers" },
  { label: "Backup & Import", href: "/backup", icon: DatabaseBackup, desc: "Export / restore data" },
];
