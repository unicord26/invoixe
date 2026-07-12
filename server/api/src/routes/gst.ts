import { Router } from "express";
import { prisma } from "@leafx/db";
import { getUserBusinessId } from "../lib/business";

export const gstRouter = Router();

// paise -> rupees number (GST portal expects rupees with 2 decimals)
const rs = (p: number) => Math.round(p) / 100;
const ddmmyyyy = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

// GET /api/gst/gstr1?month=MM&year=YYYY — GSTR-1 return JSON (B2B + B2C summary)
gstRouter.get("/gstr1", async (req, res) => {
  const businessId = await getUserBusinessId(req.authUser!);
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const now = new Date();
  const month = Number(req.query.month ?? now.getMonth() + 1);
  const year = Number(req.query.year ?? now.getFullYear());
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const invoices = await prisma.transaction.findMany({
    where: { businessId, type: "sale", deletedAt: null, date: { gte: from, lt: to } },
    include: { lines: true },
    orderBy: { date: "asc" },
  });

  // B2B: invoices with a buyer GSTIN, grouped by counter-party GSTIN
  const b2bMap = new Map<string, any>();
  const b2cs: any[] = [];
  for (const inv of invoices) {
    const itms = inv.lines.map((l, i) => ({
      num: i + 1,
      itm_det: {
        rt: l.taxRate,
        txval: rs(l.taxable),
        camt: rs(l.cgst),
        samt: rs(l.sgst),
        iamt: rs(l.igst),
        csamt: rs(l.cess),
      },
    }));
    if (inv.partyGstin) {
      const entry = b2bMap.get(inv.partyGstin) ?? { ctin: inv.partyGstin, inv: [] };
      entry.inv.push({
        inum: inv.number,
        idt: ddmmyyyy(inv.date),
        val: rs(inv.grandTotal),
        pos: inv.placeOfSupply ?? business.stateCode,
        rchrg: inv.reverseCharge ? "Y" : "N",
        inv_typ: "R",
        itms,
      });
      b2bMap.set(inv.partyGstin, entry);
    } else {
      b2cs.push({
        sply_ty: inv.interState ? "INTER" : "INTRA",
        pos: inv.placeOfSupply ?? business.stateCode,
        typ: "OE",
        txval: rs(inv.subTotal),
        rt: inv.lines[0]?.taxRate ?? 0,
        camt: rs(inv.cgst),
        samt: rs(inv.sgst),
        iamt: rs(inv.igst),
        csamt: rs(inv.cess),
      });
    }
  }

  res.json({
    gstin: business.gstin ?? "",
    fp: `${String(month).padStart(2, "0")}${year}`,
    gt: rs(invoices.reduce((s, i) => s + i.grandTotal, 0)),
    b2b: [...b2bMap.values()],
    b2cs,
  });
});

// GET /api/gst/einvoice/:id — NIC e-invoice JSON payload for one invoice
gstRouter.get("/einvoice/:id", async (req, res) => {
  const businessId = await getUserBusinessId(req.authUser!);
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const inv = await prisma.transaction.findFirst({
    where: { id: req.params.id, businessId, type: "sale", deletedAt: null },
    include: { party: true, lines: { orderBy: { lineNo: "asc" } } },
  });
  if (!inv) return res.status(404).json({ error: "not_found" });

  const payload = {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: inv.reverseCharge ? "Y" : "N" },
    DocDtls: { Typ: "INV", No: inv.number, Dt: ddmmyyyy(inv.date) },
    SellerDtls: {
      Gstin: business.gstin ?? "",
      LglNm: business.name,
      Addr1: business.address ?? "",
      Loc: business.jurisdiction ?? "",
      Stcd: business.stateCode ?? "",
    },
    BuyerDtls: {
      Gstin: inv.partyGstin ?? "URP",
      LglNm: inv.partyName ?? "Unregistered",
      Pos: inv.placeOfSupply ?? business.stateCode ?? "",
      Stcd: inv.party?.stateCode ?? business.stateCode ?? "",
    },
    ItemList: inv.lines.map((l) => ({
      SlNo: String(l.lineNo),
      PrdDesc: l.description,
      HsnCd: l.hsnSac ?? "",
      Qty: l.qty,
      Unit: l.unit,
      UnitPrice: rs(l.rate),
      TotAmt: rs(l.taxable),
      AssAmt: rs(l.taxable),
      GstRt: l.taxRate,
      CgstAmt: rs(l.cgst),
      SgstAmt: rs(l.sgst),
      IgstAmt: rs(l.igst),
      TotItemVal: rs(l.lineTotal),
    })),
    ValDtls: {
      AssVal: rs(inv.subTotal),
      CgstVal: rs(inv.cgst),
      SgstVal: rs(inv.sgst),
      IgstVal: rs(inv.igst),
      RndOffAmt: rs(inv.roundOff),
      TotInvVal: rs(inv.grandTotal),
    },
    // NOTE: obtaining an IRN + signed QR requires submitting this to a GSP/IRP with
    // production credentials. That integration is a deploy-time configuration.
    _status: "payload_ready_not_submitted",
  };
  res.json(payload);
});
