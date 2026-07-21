"use client";

import { useEffect, useState, type ReactNode, Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { Menu, Settings, LogOut, ChevronDown } from "lucide-react";
import { NAV, isGroup, isActiveHref, type NavLeaf, type NavGroup } from "../lib/nav";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ── Leaf link ────────────────────────────────────────────────────────────────
function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate?: () => void;
}) {
  if (item.soon) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 cursor-not-allowed select-none">
        <span className="flex items-center gap-3">
          {item.icon ? (
            <item.icon className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 mx-[6px]" />
          )}
          {item.label}
        </span>
        <span className="text-[9px] uppercase font-bold tracking-wide bg-[#112419] text-zinc-500 px-1.5 py-0.5 rounded border border-[#1b432c]/30">
          Soon
        </span>
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent",
        active
          ? "bg-[#133020] text-zinc-100 shadow-sm border-[#1b432c]/50"
          : "text-zinc-400 hover:text-white hover:bg-white/5"
      )}
    >
      <span className="flex items-center gap-3">
        {item.icon ? (
          <item.icon className="w-[18px] h-[18px] shrink-0" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 mx-[6px]" />
        )}
        <span>{item.label}</span>
      </span>
      {item.new && (
        <span className="text-[9px] uppercase font-extrabold tracking-widest text-emerald-400 shrink-0 pr-1 select-none">
          • New
        </span>
      )}
    </Link>
  );
}

// ── Collapsible group ─────────────────────────────────────────────────────────
function NavGroupItem({
  group,
  pathname,
  category,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  category: string | null;
  onNavigate?: () => void;
}) {
  const hasActive = group.items.some((i) => !i.soon && isActiveHref(pathname, i.href, category));
  const [open, setOpen] = useState(hasActive);
  const Icon = group.icon;
  const contentRef = useRef<HTMLDivElement>(null);
  const isInitial = useRef(true);

  // Auto-open when one of its children becomes the active route.
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  useEffect(() => {
    if (!contentRef.current) return;

    if (isInitial.current) {
      isInitial.current = false;
      if (open) {
        gsap.set(contentRef.current, { height: "auto", opacity: 1, display: "block" });
      } else {
        gsap.set(contentRef.current, { height: 0, opacity: 0, display: "none" });
      }
      return;
    }

    if (open) {
      gsap.killTweensOf(contentRef.current);
      gsap.fromTo(contentRef.current,
        { height: 0, opacity: 0, display: "block" },
        { height: "auto", opacity: 1, duration: 0.25, ease: "power2.out" }
      );
    } else {
      gsap.killTweensOf(contentRef.current);
      gsap.to(contentRef.current,
        { height: 0, opacity: 0, display: "none", duration: 0.2, ease: "power2.in" }
      );
    }
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          hasActive ? "text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn("w-4 h-4 opacity-70 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent forceMount>
        <div ref={contentRef} className="mt-1 ml-4 pl-3 border-l border-[#112419] space-y-1 overflow-hidden">
          {group.items.map((i) => (
            <NavLink
              key={i.label}
              item={i}
              active={!i.soon && isActiveHref(pathname, i.href, category)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavLinksList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  return (
    <div className="space-y-6">
      {NAV.map((section, sIdx) => (
        <div key={sIdx} className="space-y-1.5">
          {section.category && (
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {section.category}
            </h3>
          )}
          <div className="space-y-1">
            {section.items.map((entry) =>
              isGroup(entry) ? (
                <NavGroupItem key={entry.label} group={entry} pathname={pathname} category={category} onNavigate={onNavigate} />
              ) : (
                <NavLink
                  key={entry.label}
                  item={entry}
                  active={isActiveHref(pathname, entry.href, category)}
                  onNavigate={onNavigate}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sidebar content (shared by desktop rail + mobile sheet) ───────────────────
function SidebarContent({
  email,
  onSignOut,
  pathname,
  onNavigate,
}: {
  email?: string;
  onSignOut: () => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#0a160f]">
      {/* Branding */}
      <div className="p-5 border-b border-[#112419]">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Invoixe" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg tracking-tight leading-tight">Invoixe</h2>
            <p className="text-[10px] text-green-400 font-medium tracking-tight">Powered by UniCord Tech</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Suspense fallback={null}>
          <NavLinksList pathname={pathname} onNavigate={onNavigate} />
        </Suspense>
      </nav>

      {/* Footer: user + settings + sign out */}
      <div className="p-4 border-t border-[#112419] bg-[#0a160f]/50">
        <div className="mb-3 min-w-0">
          <p className="text-xs font-semibold text-white truncate" title={email ?? ""}>
            {email?.split("@")[0] || "User"}
          </p>
          <p className="text-[10px] text-gray-400 truncate" title={email ?? ""}>
            {email}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition",
              pathname === "/settings"
                ? "bg-[#133020] border-[#1b432c] text-white"
                : "border-[#1a3322] hover:border-[#22442d] text-zinc-300"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={onSignOut}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-950/50 hover:border-red-900/70 text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
        <div className="mt-3 pt-2.5 border-t border-[#112419] text-center">
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide">
            Invoixe • Powered by <span className="text-zinc-400 font-semibold">UniCord Tech</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * AppShell — the persistent authenticated layout. Desktop: a sticky sidebar
 * rail. Mobile: a top bar with a hamburger that opens a shadcn Sheet holding the
 * same sidebar content. Auth is passed in as props (no providers↔shell cycle).
 */
export function AppShell({
  children,
  email,
  onSignOut,
}: {
  children: ReactNode;
  email?: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile sheet on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Derive a readable page label from the current pathname for the mobile bar.
  const pageLabel = (() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    if (!seg) return "Dashboard";
    return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
  })();

  return (
    <div className="min-h-screen bg-[#f8faf9] lg:grid lg:grid-cols-[260px_1fr]">
      {/* Mobile top bar */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#0a160f] text-white lg:hidden border-b border-[#112419] sticky top-0 z-20">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            {/* 44px min touch target for accessibility */}
            <button className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-white/5" aria-label="Open navigation menu">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-[#0a160f] border-[#112419] text-zinc-300 [&>button]:text-zinc-400 [&>button]:hover:text-white"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              email={email}
              onSignOut={onSignOut}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Invoixe" className="w-6 h-6 shrink-0" />
          <span className="font-bold text-sm tracking-tight text-zinc-300 truncate">{pageLabel}</span>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:h-screen lg:sticky lg:top-0 bg-[#0a160f] border-r border-[#112419] text-zinc-300">
        <SidebarContent email={email} onSignOut={onSignOut} pathname={pathname} />
      </aside>

      {/* Content */}
      <main className="min-h-screen overflow-x-hidden">{children}</main>
    </div>
  );
}
