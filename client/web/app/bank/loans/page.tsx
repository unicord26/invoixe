"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoansRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/bank/cheques");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-xs text-zinc-400">
      Redirecting to Cheques &amp; Loans portal...
    </div>
  );
}
