// client/src/components/modals/finance-modal.tsx
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TenantWithDetails, UnitWithDetails } from "@/stubs/schema";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTenantFinanceSummary } from "@/hooks/useTenantFinanceSummary";
import { useTenantFinanceHistory } from "@/hooks/useTenantFinanceHistory";

// ---- types ----
type Ctx =
  | { mode: "record"; tenantId: string; unitId?: string }
  | { mode: "edit"; paymentId: string }
  | { mode: "adjust"; tenantId: string; unitId?: string }
  | null;

type FinanceHistoryItem = {
  id?: string;
  type?: "payment" | "adjustment" | "charge" | string;
  kind?: "debit" | "credit" | string;
  amount?: number | null;
  description?: string | null;
  source?: string | null;
  method?: string | null;
  createdAt?: string | null;
  // optional running balance if backend provides it
  runningBalance?: number | null;
  // new: billing period so we can show the month an invoice belongs to
  invoiceMonth?: string | null; // "YYYY-MM"
};

function formatKES(amount?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Show just YYYY-MM for invoice period
function formatMonth(value?: string | null) {
  if (!value) return "—";
  // If backend gave "YYYY-MM", use it directly
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

function entryLabel(h: FinanceHistoryItem) {
  if (h.type === "payment") return "Payment";
  if (h.type === "charge") return "Invoice / Charge";
  if (h.type === "adjustment") {
    if (h.kind === "debit") return "Adj. (Debit)";
    if (h.kind === "credit") return "Adj. (Credit)";
    return "Adjustment";
  }
  return h.type || "Entry";
}

export function FinanceModal({
  open,
  onOpenChange,
  ctx,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctx: Ctx;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  // ---------- base data ----------
  const { data: tenants = [] } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: units = [] } = useQuery<UnitWithDetails[]>({
    queryKey: ["/api/units"],
  });

  // ---------- derived active tenant/unit ----------
  const activeTenantId =
    ctx && "tenantId" in ctx && ctx.mode !== "edit" ? ctx.tenantId : undefined;

  const activeUnitId =
    ctx && "unitId" in ctx && ctx.mode !== "edit" ? ctx.unitId : undefined;

  // 🔍 Finance snapshot (per-tenant) via shared hook
  const { tenantSummary: activeFinance } =
    useTenantFinanceSummary(activeTenantId);

  // 🔍 Finance history (payments + adjustments + charges)
  const {
    history: financeHistory,
    isLoading: historyLoading,
    isError: historyError,
  } = useTenantFinanceHistory(activeTenantId, activeUnitId, 50);

  const historyItems: FinanceHistoryItem[] = Array.isArray(financeHistory)
    ? (financeHistory as FinanceHistoryItem[])
    : [];

  const tenantMap = React.useMemo(() => {
    const m = new Map<string, TenantWithDetails>();
    tenants.forEach((t) => m.set(t.id, t));
    return m;
  }, [tenants]);

  const unitMap = React.useMemo(() => {
    const m = new Map<string, UnitWithDetails>();
    units.forEach((u) => m.set(u.id, u));
    return m;
  }, [units]);

  const activeTenant = activeTenantId ? tenantMap.get(activeTenantId) : undefined;
  const activeUnit = activeUnitId ? unitMap.get(activeUnitId) : undefined;

  // ---------- which tab ----------
  type TabId = "record" | "adjust" | "ledger";

  const initialTab: TabId =
    (ctx?.mode ?? "record") === "adjust" ? "adjust" : "record";

  const [tab, setTab] = React.useState<TabId>(initialTab);
  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // ---------- Record Payment form ----------
  const [rAmount, setRAmount] = React.useState<string>("");
  const [rMethod, setRMethod] =
    React.useState<"mpesa" | "bank" | "manual">("manual");
  const [rSource, setRSource] =
    React.useState<"counter" | "portal" | "import">("counter");
  const [rTxId, setRTxId] = React.useState("");
  const [rMsisdn, setRMsisdn] = React.useState("");
  const [rPaidAt, setRPaidAt] = React.useState<string>("");
  const [rDesc, setRDesc] = React.useState("");
  const [rNotes, setRNotes] = React.useState("");

  // reset forms when ctx changes
  React.useEffect(() => {
    setRAmount("");
    setRMethod("manual");
    setRSource("counter");
    setRTxId("");
    setRMsisdn("");
    setRPaidAt("");
    setRDesc("");
    setRNotes("");
  }, [ctx]);

  // ---------- Adjust Balance form ----------
  const [aKind, setAKind] = React.useState<"debit" | "credit">("debit");
  const [aAmount, setAAmount] = React.useState<string>("");
  const [aReason, setAReason] = React.useState<string>("");

  React.useEffect(() => {
    setAKind("debit");
    setAAmount("");
    setAReason("");
  }, [ctx]);

  const recordPayment = useMutation({
    mutationFn: (body: {
      tenantId: string;
      unitId?: string;
      amount: number;
      method?: "mpesa" | "bank" | "manual";
      source?: "counter" | "portal" | "import";
      txId?: string;
      msisdn?: string;
      paidAt?: string; // ISO
      description?: string;
      notes?: string;
      status?: "paid" | "pending" | "failed";
    }) => apiRequest("POST", "/api/payments", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", activeTenantId, "finance-history"],
      });
      onSuccess?.();
    },
  });

  const adjustBalance = useMutation({
    mutationFn: (body: {
      tenantId: string;
      unitId?: string;
      amount: number; // positive
      kind?: "debit" | "credit";
      reason?: string;
    }) => apiRequest("POST", "/api/ledger/adjustments", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", activeTenantId, "finance-history"],
      });
      onSuccess?.();
    },
  });

  function submitRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenantId) return;
    const amt = Number(rAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    recordPayment.mutate({
      tenantId: activeTenantId,
      unitId: activeUnitId || undefined,
      amount: amt,
      method: rMethod,
      source: rSource,
      txId: rTxId || undefined,
      msisdn: rMsisdn || undefined,
      paidAt: rPaidAt ? new Date(rPaidAt).toISOString() : undefined,
      description: rDesc || undefined,
      notes: rNotes || undefined,
      status: "paid",
    });
  }

  function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTenantId) return;
    const amt = Math.abs(Number(aAmount));
    if (!Number.isFinite(amt) || amt <= 0) return;
    adjustBalance.mutate({
      tenantId: activeTenantId,
      unitId: activeUnitId || undefined,
      amount: amt,
      kind: aKind,
      reason: aReason || undefined,
    });
  }

  const disableRecord =
    !activeTenantId ||
    !rAmount ||
    !Number(rAmount) ||
    recordPayment.isPending ||
    !open;

  const disableAdjust =
    !activeTenantId ||
    !aAmount ||
    !Number(aAmount) ||
    adjustBalance.isPending ||
    !open;

  // If opened with no tenant context at all, show a warning
  const missingCtx = !ctx || (ctx.mode !== "edit" && !activeTenantId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tenant Finance</DialogTitle>
          <DialogDescription>
            Record payments, adjust balances, and review full ledger activity for this account.
          </DialogDescription>
        </DialogHeader>

        {missingCtx ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This finance modal needs a tenant context. Use the{" "}
            <strong>Manage</strong> button from a tenant row in the Finance or
            Tenants page.
          </div>
        ) : null}

        {!missingCtx && (
          <>
            {/* Header: tenant + unit + finance snapshot */}
            <div className="mb-4 space-y-2 rounded-xl border bg-slate-50 p-3 text-xs md:text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Tenant
                  </div>
                  <div className="font-medium text-slate-900">
                    {activeTenant
                      ? `${activeTenant.firstName ?? ""} ${
                          activeTenant.lastName ?? ""
                        }`.trim()
                      : "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Unit
                  </div>
                  <div className="font-medium text-slate-900">
                    {activeUnit ? activeUnit.unitNumber : "—"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  {activeFinance ? (
                    <Badge
                      className={
                        activeFinance.status === "Cleared"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                          : activeFinance.status === "Prepaid"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                      }
                    >
                      {activeFinance.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline">—</Badge>
                  )}
                </div>
              </div>

              {activeFinance && (
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <div className="text-[11px] text-slate-500">Monthly Due</div>
                    <div className="font-semibold">
                      {formatKES(activeFinance.currentMonthDue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">MTD Paid</div>
                    <div className="font-semibold">
                      {formatKES(activeFinance.amountPaidMtd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Arrears</div>
                    <div className="font-semibold">
                      {formatKES(activeFinance.arrearsToDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Balance Now</div>
                    <div className="font-semibold">
                      {formatKES(activeFinance.balanceNow)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as TabId)}
              className="w-full"
            >
              <TabsList className="mb-4">
                <TabsTrigger value="record">Record Payment</TabsTrigger>
                <TabsTrigger value="adjust">Adjust Balance</TabsTrigger>
                <TabsTrigger value="ledger">Ledger</TabsTrigger>
              </TabsList>

              {/* -------- Record Payment -------- */}
              <TabsContent value="record">
                <form className="space-y-4" onSubmit={submitRecordPayment}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Amount (KES)</Label>
                      <Input
                        inputMode="numeric"
                        value={rAmount}
                        onChange={(e) => setRAmount(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>

                    <div>
                      <Label>Method</Label>
                      <select
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={rMethod}
                        onChange={(e) =>
                          setRMethod(e.target.value as "mpesa" | "bank" | "manual")
                        }
                      >
                        <option value="manual">Manual</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="bank">Bank</option>
                      </select>
                    </div>

                    <div>
                      <Label>Source</Label>
                      <select
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={rSource}
                        onChange={(e) =>
                          setRSource(
                            e.target.value as "counter" | "portal" | "import"
                          )
                        }
                      >
                        <option value="counter">Counter</option>
                        <option value="portal">Tenant Portal</option>
                        <option value="import">Import</option>
                      </select>
                    </div>

                    <div>
                      <Label>Paid At (optional)</Label>
                      <Input
                        type="datetime-local"
                        value={rPaidAt}
                        onChange={(e) => setRPaidAt(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Tx ID (optional)</Label>
                      <Input
                        value={rTxId}
                        onChange={(e) => setRTxId(e.target.value)}
                        placeholder="M-Pesa / Bank ref"
                      />
                    </div>

                    <div>
                      <Label>MSISDN (optional)</Label>
                      <Input
                        value={rMsisdn}
                        onChange={(e) => setRMsisdn(e.target.value)}
                        placeholder="2547XXXXXXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description (optional)</Label>
                    <Input
                      value={rDesc}
                      onChange={(e) => setRDesc(e.target.value)}
                      placeholder="e.g. Rent Nov 2025"
                    />
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={rNotes}
                      onChange={(e) => setRNotes(e.target.value)}
                      placeholder="Internal notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={disableRecord}>
                      {recordPayment.isPending ? "Saving..." : "Save Payment"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* -------- Adjust Balance -------- */}
              <TabsContent value="adjust">
                <form className="space-y-4" onSubmit={submitAdjust}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Kind</Label>
                      <select
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={aKind}
                        onChange={(e) =>
                          setAKind(e.target.value as "debit" | "credit")
                        }
                      >
                        <option value="debit">Debit (+ arrears)</option>
                        <option value="credit">Credit (− arrears)</option>
                      </select>
                    </div>

                    <div>
                      <Label>Amount (KES)</Label>
                      <Input
                        inputMode="numeric"
                        value={aAmount}
                        onChange={(e) => setAAmount(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Reason (optional)</Label>
                    <Textarea
                      value={aReason}
                      onChange={(e) => setAReason(e.target.value)}
                      placeholder="e.g. Backdated service charge, waiver, etc."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={disableAdjust}>
                      {adjustBalance.isPending ? "Applying..." : "Apply Adjustment"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* -------- Ledger (full activity timeline) -------- */}
              <TabsContent value="ledger">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Ledger entries
                    </h3>
                    {historyLoading && (
                      <span className="text-xs text-slate-500">Loading…</span>
                    )}
                    {historyError && (
                      <span className="text-xs text-red-500">
                        Failed to load ledger
                      </span>
                    )}
                  </div>

                  {historyItems.length === 0 && !historyLoading && !historyError ? (
                    <div className="text-xs text-slate-500 rounded-md border bg-slate-50 px-3 py-2">
                      No ledger activity recorded for this tenant yet.
                    </div>
                  ) : null}

                  {historyItems.length > 0 && (
                    <div className="max-h-72 overflow-y-auto rounded-md border bg-slate-50/60">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-1 text-left">When</th>
                            <th className="px-3 py-1 text-left">Period</th>
                            <th className="px-3 py-1 text-left">Entry</th>
                            <th className="px-3 py-1 text-right">Amount</th>
                            {historyItems.some(
                              (h) => typeof h.runningBalance === "number"
                            ) && (
                              <th className="px-3 py-1 text-right">
                                Running Balance
                              </th>
                            )}
                            <th className="px-3 py-1 text-left">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyItems.map((h) => (
                            <tr
                              key={h.id ?? `${h.type}-${h.kind}-${h.createdAt}`}
                              className="odd:bg-slate-50/60"
                            >
                              <td className="px-3 py-1 align-top whitespace-nowrap">
                                {formatDateTime(h.createdAt)}
                              </td>
                              <td className="px-3 py-1 align-top whitespace-nowrap">
                                {formatMonth(h.invoiceMonth ?? h.createdAt)}
                              </td>
                              <td className="px-3 py-1 align-top">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                >
                                  {entryLabel(h)}
                                </Badge>
                              </td>
                              <td className="px-3 py-1 align-top text-right font-semibold">
                                {formatKES(h.amount ?? 0)}
                              </td>
                              {historyItems.some(
                                (x) => typeof x.runningBalance === "number"
                              ) && (
                                <td className="px-3 py-1 align-top text-right">
                                  {typeof h.runningBalance === "number"
                                    ? formatKES(h.runningBalance)
                                    : "—"}
                                </td>
                              )}
                              <td className="px-3 py-1 align-top">
                                {h.description ||
                                  h.source ||
                                  h.method ||
                                  "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
