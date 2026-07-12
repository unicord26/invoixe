"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatINR, rupeesToPaise } from "@leafx/core";
import { api } from "../../lib/api";

type Account = { id: string; name: string; type: string; accountNo: string | null; balance: number };

export default function BankPage() {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ["bank"], queryFn: () => api.get<Account[]>("/api/bank") });
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [opening, setOpening] = useState("");
  const [xfer, setXfer] = useState({ fromId: "", toId: "", amount: "" });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["bank"] });

  const addAcct = useMutation({
    mutationFn: () => api.post("/api/bank", { name: name.trim(), type, openingBalance: opening ? rupeesToPaise(Number(opening)) : 0 }),
    onSuccess: () => { invalidate(); setName(""); setOpening(""); },
  });
  const entry = useMutation({
    mutationFn: (v: { id: string; amount: number; kind: string }) => api.post(`/api/bank/${v.id}/entry`, { amount: v.amount, kind: v.kind }),
    onSuccess: invalidate,
  });
  const transfer = useMutation({
    mutationFn: () => api.post("/api/bank/transfer", { fromId: xfer.fromId, toId: xfer.toId, amount: rupeesToPaise(Number(xfer.amount)) }),
    onSuccess: () => { invalidate(); setXfer({ fromId: "", toId: "", amount: "" }); },
  });

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500";
  const move = (id: string, kind: "deposit" | "withdraw") => {
    const v = window.prompt(`${kind === "deposit" ? "Deposit to" : "Withdraw from"} account (₹)`);
    const n = v ? Number(v) : NaN;
    if (Number.isFinite(n) && n > 0) entry.mutate({ id, amount: rupeesToPaise(n), kind });
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8"><Link href="/" className="text-sm text-green-700 hover:underline">← Leafx</Link>
        <h1 className="text-2xl font-extrabold text-gray-900">Cash &amp; Bank</h1></header>

      {/* accounts */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {accounts?.map((a) => (
          <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div><div className="font-semibold text-gray-900">{a.name}</div>
                <div className="text-xs capitalize text-gray-400">{a.type}{a.accountNo ? ` · ${a.accountNo}` : ""}</div></div>
              <div className={`text-lg font-extrabold ${a.balance < 0 ? "text-red-500" : "text-green-600"}`}>{formatINR(a.balance)}</div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => move(a.id, "deposit")} className="rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50">+ Deposit</button>
              <button onClick={() => move(a.id, "withdraw")} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-red-400 hover:text-red-600">− Withdraw</button>
            </div>
          </div>
        ))}
        {accounts?.length === 0 && <p className="text-sm text-gray-500">No accounts yet — add one below.</p>}
      </div>

      {/* add account */}
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) addAcct.mutate(); }} className="mb-6 grid gap-3 rounded-xl border border-green-200 bg-white p-4 sm:grid-cols-4">
        <div><label className="mb-1 block text-xs font-medium text-gray-600">Account name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="RBL Bank / Cash" className={input} /></div>
        <div><label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={input}><option value="bank">Bank</option><option value="cash">Cash</option><option value="upi">UPI</option></select></div>
        <div><label className="mb-1 block text-xs font-medium text-gray-600">Opening (₹)</label>
          <input type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0.00" className={input} /></div>
        <div className="flex items-end"><button type="submit" disabled={addAcct.isPending || !name.trim()} className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">Add account</button></div>
      </form>

      {/* transfer */}
      {accounts && accounts.length >= 2 && (
        <form onSubmit={(e) => { e.preventDefault(); if (xfer.fromId && xfer.toId && Number(xfer.amount) > 0) transfer.mutate(); }} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
          <div className="sm:col-span-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Transfer between accounts</div>
          <select value={xfer.fromId} onChange={(e) => setXfer({ ...xfer, fromId: e.target.value })} className={input}><option value="">From…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select value={xfer.toId} onChange={(e) => setXfer({ ...xfer, toId: e.target.value })} className={input}><option value="">To…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input type="number" step="0.01" value={xfer.amount} onChange={(e) => setXfer({ ...xfer, amount: e.target.value })} placeholder="Amount ₹" className={input} />
          <button type="submit" disabled={transfer.isPending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">Transfer</button>
        </form>
      )}
    </main>
  );
}
