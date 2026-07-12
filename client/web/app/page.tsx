import Link from "next/link";
import { CalendarDays, Plus, UserPlus, PackagePlus, Zap, ArrowRight } from "lucide-react";
import { DashboardMetrics } from "../components/DashboardMetrics";
import { flattenLeaves } from "../lib/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Operational modules render from the single nav config (minus Dashboard itself),
// so the grid can never drift from the sidebar.
const modules = flattenLeaves().filter((m) => m.href !== "/");

const quickActions = [
  { href: "/invoices", label: "Create Sale", icon: Plus, primary: true },
  { href: "/parties", label: "Add Party", icon: UserPlus },
  { href: "/items", label: "Add Item", icon: PackagePlus },
  { href: "/pos", label: "Open POS", icon: Zap },
];

export default function Home() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Business Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Here is a quick snapshot of your SME operations today.
          </p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500 sm:flex">
          <CalendarDays className="h-3.5 w-3.5" />
          {today}
        </div>
      </div>

      {/* Live metrics */}
      <DashboardMetrics />

      {/* Quick actions */}
      <Card className="mb-8 rounded-2xl border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-800">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickActions.map((a) => (
              <Button
                key={a.href}
                asChild
                variant={a.primary ? "default" : "outline"}
                className="h-auto justify-center gap-2 rounded-xl py-3 font-semibold"
              >
                <Link href={a.href}>
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Operational modules */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-800">
          Operational Modules
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className="group">
              <Card className="flex min-h-[120px] flex-col justify-between rounded-2xl border-gray-100 shadow-sm transition hover:border-green-500/50 hover:shadow-md">
                <CardContent className="flex h-full flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {m.icon && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                            <m.icon className="h-4 w-4" />
                          </span>
                        )}
                        <h2 className="text-sm font-bold tracking-tight text-gray-900">{m.label}</h2>
                      </div>
                      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                        Ready
                      </span>
                    </div>
                    {m.desc && <p className="mt-2 text-xs leading-normal text-gray-500">{m.desc}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-green-600 transition group-hover:gap-1.5 group-hover:text-green-700">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
