// client/src/pages/rent-income.tsx
import React, { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Home,
  Search,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Download,
  ListChecks,
  Columns3,
  ArrowUpDown,
  Wrench,
} from "lucide-react";
import type {
  PropertyWithDetails,
  UnitWithDetails,
  TenantWithDetails,
} from "@/stubs/schema";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

// ✅ unified finance modal (Record / Edit / Adjust / Ledger)
import { FinanceModal } from "@/components/modals/finance-modal";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/** --- Safe helper --- */
function safeSlice(value: unknown, start = 0, end = 8): string {
  return typeof value === "string" ? value.slice(start, end) : "";
}

/* ---------- types ---------- */
type PaymentRow = {
  id?: string | null;
  tenant_id?: string | null;
  unit_id?: string | null;
  invoice_id?: string | null;
  amount?: number | string | null;
  status?: "paid" | "pending" | "overdue" | "failed" | string | null;
  method?: string | null;
  source?: string | null;
  tx_id?: string | null;
  msisdn?: string | null;
  paid_at?: string | null;
  receipt_url?: string | null;
};

// Shape returned by /api/tenants/summary right now
type BackendTenantFinanceSummary = {
  tenantId: string;
  tenantName: string | null;
  unit: string | null;
  rent: number;
  paidThisMonth: number;
  arrearsToDate: number;
  balance: number;
  status: "Cleared" | "Overdue" | "Prepaid";
};

type TenantFinanceRow = {
  tenant_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  property_id?: string | null;
  property_name?: string | null;
  unit_id?: string | null;
  unit_number?: string | null;
  monthly_due?: number | null;
  mtd_paid?: number | null;
  arrears?: number | null;
  current_month_due?: number | null;
  balance_now?: number | null;
  status?: "Cleared" | "Overdue" | "Prepaid" | string | null;
};

/* ---------- helpers ---------- */
const DEFAULT_PAGE_SIZE = 12;

const formatCurrency = (amount?: number | string | null) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));

const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";

const statusBadge = (status?: string | null) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "paid":
    case "cleared":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
          Cleared
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Pending
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
          Overdue
        </Badge>
      );
    case "prepaid":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          Prepaid
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          —
        </Badge>
      );
  }
};

type SortDir = "asc" | "desc";
type SortKeyFinance =
  | "tenant"
  | "property"
  | "unit"
  | "monthly_due"
  | "mtd_paid"
  | "arrears"
  | "balance_now"
  | "status";
type SortKeyPayments =
  | "tenant"
  | "property"
  | "unit"
  | "amount"
  | "status"
  | "paid_at";

type ColumnIdFinance =
  | "tenant"
  | "property_unit"
  | "monthly_due"
  | "mtd_paid"
  | "arrears"
  | "balance_now"
  | "status";
type ColumnIdPayments =
  | "tenant"
  | "property_unit"
  | "amount"
  | "status"
  | "paid_at"
  | "actions";

/* --------------------- local helpers --------------------- */
function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/* ---------- modal ctx type ---------- */
type FinanceModalCtx =
  | { mode: "record"; tenantId?: string; unitId?: string }
  | { mode: "edit"; paymentId: string }
  | { mode: "adjust"; tenantId: string; unitId?: string }
  | null;

/* =========================================================
   Component
   ========================================================= */
export default function RentIncome() {
  const queryClient = useQueryClient();

  // ---------------- Invoices modal state ----------------
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<"bulk" | "single">("bulk");
  const [invoiceMonth, setInvoiceMonth] = useState(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [invoiceTenantId, setInvoiceTenantId] = useState<string>("");
  const [invoiceExtraAmount, setInvoiceExtraAmount] = useState<string>("");
  const [invoiceExtraType, setInvoiceExtraType] = useState<
    "arrears" | "utility" | "breakage" | "other"
  >("arrears");
  const [invoiceExtraDesc, setInvoiceExtraDesc] = useState<string>("");

  // 🔧 FinanceModal state (inside component)
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeModalCtx, setFinanceModalCtx] = useState<FinanceModalCtx>(null);

  function openRecordPayment(tenantId?: string, unitId?: string) {
    setFinanceModalCtx({ mode: "record", tenantId, unitId });
    setFinanceModalOpen(true);
  }
  function openEditPayment(paymentId: string) {
    setFinanceModalCtx({ mode: "edit", paymentId });
    setFinanceModalOpen(true);
  }
  function openAdjustBalance(tenantId: string, unitId?: string) {
    setFinanceModalCtx({ mode: "adjust", tenantId, unitId });
    setFinanceModalOpen(true);
  }

  /** Add Rent */
  const addRentMutation = useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      unitId?: string;
      amount: number;
      method?: string;
      source?: string;
      txId?: string;
      msisdn?: string;
      paidAt?: string;
      status?: "paid" | "pending" | "failed";
      description?: string;
      notes?: string;
    }) => apiRequest("POST", "/api/payments", payload),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
  });

  /** Adjust Arrears */
  const adjustArrearsMutation = useMutation({
    mutationFn: async (payload: {
      tenantId: string;
      unitId?: string;
      propertyId?: string;
      amount: number;
      reason?: string;
      kind?: "debit" | "credit";
    }) => apiRequest("POST", "/api/ledger/adjustments", payload),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
    },
  });

  /** Invoices engine (bulk + single) */
  const generateInvoicesMutation = useMutation({
    mutationFn: async (payload: any) =>
      apiRequest("POST", "/api/invoices/generate", payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
      const count = data?.generated ?? data?.count ?? 0;
      const label = data?.monthLabel ?? "";
      alert(
        `Invoices generated${
          count ? ` for ${count} tenant(s)` : ""
        }${label ? ` (${label})` : ""}.`
      );
    },
    onError: (err: any) => {
      alert(
        `Failed to generate invoices: ${
          err?.message || err?.response?.data?.detail || "unknown error"
        }`
      );
    },
  });

  // ---------------- state ----------------
  const [viewMode, setViewMode] = useState<"finance" | "payments">("finance");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");
  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [selectedTenantId, setSelectedTenantId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortFinanceBy, setSortFinanceBy] =
    useState<SortKeyFinance>("tenant");
  const [sortFinanceDir, setSortFinanceDir] = useState<SortDir>("asc");
  const [sortPaymentsBy, setSortPaymentsBy] =
    useState<SortKeyPayments>("paid_at");
  const [sortPaymentsDir, setSortPaymentsDir] = useState<SortDir>("desc");

  // Column visibility
  const [financeCols, setFinanceCols] = useState<
    Record<ColumnIdFinance, boolean>
  >({
    tenant: true,
    property_unit: true,
    monthly_due: true,
    mtd_paid: true,
    arrears: true,
    balance_now: true,
    status: true,
  });
  const [paymentCols, setPaymentCols] = useState<
    Record<ColumnIdPayments, boolean>
  >({
    tenant: true,
    property_unit: true,
    amount: true,
    status: true,
    paid_at: true,
    actions: true,
  });

  // ---------------- data ----------------
  const { data: properties = [], isLoading: propertiesLoading } =
    useQuery<PropertyWithDetails[]>({
      queryKey: ["/api/properties"],
      queryFn: () => apiRequest<PropertyWithDetails[]>("GET", "/api/properties"),
      staleTime: 60_000,
    });

  const { data: units = [], isLoading: unitsLoading } =
    useQuery<UnitWithDetails[]>({
      queryKey: ["/api/units"],
      queryFn: () => apiRequest<UnitWithDetails[]>("GET", "/api/units"),
      staleTime: 60_000,
    });

  const { data: tenants = [], isLoading: tenantsLoading } =
    useQuery<TenantWithDetails[]>({
      queryKey: ["/api/tenants"],
      queryFn: () => apiRequest<TenantWithDetails[]>("GET", "/api/tenants"),
      staleTime: 60_000,
    });

  const { data: payments = [], isLoading: paymentsLoading } =
    useQuery<PaymentRow[]>({
      queryKey: ["/api/payments"],
      queryFn: () => apiRequest<PaymentRow[]>("GET", "/api/payments"),
      staleTime: 60_000,
    });

  // 1) fetch raw summary from backend
  const {
    data: financeRaw = [],
    isLoading: financeLoading,
  } = useQuery<BackendTenantFinanceSummary[]>({
    queryKey: ["/api/tenants/summary"],
    queryFn: () =>
      apiRequest<BackendTenantFinanceSummary[]>("GET", "/api/tenants/summary"),
    staleTime: 60_000,
  });

  // ---------- ID -> entity maps (O(1) lookups instead of repeated .find) ----------
  const tenantById = useMemo(() => {
    const m = new Map<string, TenantWithDetails>();
    tenants.forEach((t) => m.set(t.id, t));
    return m;
  }, [tenants]);

  const unitById = useMemo(() => {
    const m = new Map<string, UnitWithDetails>();
    units.forEach((u) => m.set(u.id, u));
    return m;
  }, [units]);

  const propertyById = useMemo(() => {
    const m = new Map<string, PropertyWithDetails>();
    properties.forEach((p) => m.set(p.id, p));
    return m;
  }, [properties]);

  // 2) map raw data -> rich TenantFinanceRow used by the UI
  const finance: TenantFinanceRow[] = useMemo(() => {
    return financeRaw.map((row) => {
      const tenant = tenantById.get(row.tenantId);
      const unit = tenant?.unit || undefined;
      const propertyId = unit?.propertyId ?? null;
      const property = propertyId ? propertyById.get(propertyId) : undefined;

      // 🔑 Try to read the contractual monthly rent from the unit,
      // fall back to the ledger "rent" if it's missing.
      const monthlyRent =
        (unit as any)?.monthlyRent ??
        (unit as any)?.rent ??
        (unit as any)?.rentAmount ??
        row.rent;

      return {
        tenant_id: row.tenantId,
        first_name: tenant?.firstName ?? null,
        last_name: tenant?.lastName ?? null,
        property_id: propertyId,
        property_name: property?.name ?? null,
        unit_id: unit?.id ?? null,
        unit_number: unit?.unitNumber ?? null,
        monthly_due: monthlyRent,
        mtd_paid: row.paidThisMonth,
        arrears: row.arrearsToDate,
        current_month_due: row.rent,
        balance_now: row.balance,
        status: row.status,
      };
    });
  }, [financeRaw, tenantById, propertyById]);

  const filteredUnits = useMemo(() => {
    if (selectedPropertyId === "all") return units;
    return units.filter((u) => u.propertyId === selectedPropertyId);
  }, [units, selectedPropertyId]);

  /* ---------- filtering ---------- */
  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return payments.filter((p) => {
      const tenant = p.tenant_id ? tenantById.get(p.tenant_id) : undefined;
      const unit = p.unit_id ? unitById.get(p.unit_id) : undefined;
      const property = unit?.propertyId
        ? propertyById.get(unit.propertyId)
        : undefined;

      if (
        selectedPropertyId !== "all" &&
        (!unit || unit.propertyId !== selectedPropertyId)
      )
        return false;
      if (
        selectedUnitId !== "all" &&
        (!unit || unit.id !== selectedUnitId)
      )
        return false;
      if (
        selectedTenantId !== "all" &&
        (!tenant || tenant.id !== selectedTenantId)
      )
        return false;
      if (
        selectedStatus !== "all" &&
        (p.status ?? "").toLowerCase() !== selectedStatus
      )
        return false;
      if (
        selectedMethod !== "all" &&
        (p.method ?? "").toLowerCase() !== selectedMethod
      )
        return false;
      if (
        selectedSource !== "all" &&
        (p.source ?? "").toLowerCase() !== selectedSource
      )
        return false;

      if (term) {
        const tName = `${tenant?.firstName ?? ""} ${
          tenant?.lastName ?? ""
        }`.toLowerCase();
        const uName = unit?.unitNumber?.toLowerCase() ?? "";
        const pName = property?.name?.toLowerCase() ?? "";
        const tx = (p.tx_id ?? "").toLowerCase();
        const phone = (p.msisdn ?? "").toLowerCase();
        if (
          ![tName, uName, pName, tx, phone].some((s) => s.includes(term))
        )
          return false;
      }
      return true;
    });
  }, [
    payments,
    searchTerm,
    selectedPropertyId,
    selectedUnitId,
    selectedTenantId,
    selectedStatus,
    selectedMethod,
    selectedSource,
    tenantById,
    unitById,
    propertyById,
  ]);

  const filteredFinance = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return finance.filter((r) => {
      const propertyId = r.property_id ?? undefined;
      const unitId = r.unit_id ?? undefined;
      const tenantId = r.tenant_id ?? undefined;

      if (selectedPropertyId !== "all" && propertyId !== selectedPropertyId)
        return false;
      if (selectedUnitId !== "all" && unitId !== selectedUnitId) return false;
      if (selectedTenantId !== "all" && tenantId !== selectedTenantId)
        return false;
      if (
        selectedStatus !== "all" &&
        (r.status ?? "").toLowerCase() !== selectedStatus
      )
        return false;

      if (term) {
        const tName = `${r.first_name ?? ""} ${
          r.last_name ?? ""
        }`.toLowerCase();
        const uName = (r.unit_number ?? "").toLowerCase();
        const pName = (r.property_name ?? "").toLowerCase();
        if (![tName, uName, pName].some((s) => s.includes(term))) return false;
      }
      return true;
    });
  }, [
    finance,
    searchTerm,
    selectedPropertyId,
    selectedUnitId,
    selectedTenantId,
    selectedStatus,
  ]);

  /* ---------- analytics ---------- */
  const analyticsFinance = useMemo(() => {
    const totalTenants = filteredFinance.length;
    const totalMonthly = filteredFinance.reduce(
      (sum, r) => sum + Number(r.monthly_due ?? 0),
      0
    );
    const totalMTD = filteredFinance.reduce(
      (sum, r) => sum + Number(r.mtd_paid ?? 0),
      0
    );
    const totalArrears = filteredFinance.reduce(
      (sum, r) => sum + Number(r.arrears ?? 0),
      0
    );
    const totalBalance = filteredFinance.reduce(
      (sum, r) => sum + Number(r.balance_now ?? 0),
      0
    );
    const numCleared = filteredFinance.filter(
      (r) => (r.status ?? "").toLowerCase() === "cleared"
    ).length;
    return {
      totalTenants,
      totalMonthly,
      totalMTD,
      totalArrears,
      totalBalance,
      clearedRate:
        totalTenants > 0 ? Math.round((numCleared / totalTenants) * 100) : 0,
    };
  }, [filteredFinance]);

  const analyticsPayments = useMemo(() => {
    const totalPayments = filteredPayments.length;
    const numPaid = filteredPayments.filter(
      (p) => (p.status ?? "").toLowerCase() === "paid"
    ).length;
    const numLate = filteredPayments.filter(
      (p) => (p.status ?? "").toLowerCase() === "overdue"
    ).length;
    const numPending = filteredPayments.filter(
      (p) => (p.status ?? "").toLowerCase() === "pending"
    ).length;
    const totalRevenue = filteredPayments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    );
    const collectedRevenue = filteredPayments
      .filter((p) => (p.status ?? "").toLowerCase() === "paid")
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const paymentRate =
      totalPayments > 0 ? Math.round((numPaid / totalPayments) * 100) : 0;
    return {
      totalPayments,
      numPaid,
      numLate,
      numPending,
      totalRevenue,
      collectedRevenue,
      paymentRate,
      outstandingAmount: totalRevenue - collectedRevenue,
    };
  }, [filteredPayments]);

  /* ---------- sorting ---------- */
  function sortByDir<T>(arr: T[], getter: (x: T) => any, dir: SortDir): T[] {
    const a = [...arr];
    a.sort((l, r) => {
      const L = getter(l);
      const R = getter(r);
      if (L == null && R == null) return 0;
      if (L == null) return dir === "asc" ? -1 : 1;
      if (R == null) return dir === "asc" ? 1 : -1;
      if (typeof L === "number" && typeof R === "number")
        return dir === "asc" ? L - R : R - L;
      const sL = String(L).toLowerCase();
      const sR = String(R).toLowerCase();
      return dir === "asc" ? sL.localeCompare(sR) : sR.localeCompare(sL);
    });
    return a;
  }

  const sortedFinance = useMemo(() => {
    const getter: Record<SortKeyFinance, (r: TenantFinanceRow) => any> = {
      tenant: (r) =>
        `${
          r.first_name ??
          tenantById.get(r.tenant_id ?? "")?.firstName ??
          ""
        } ${
          r.last_name ?? tenantById.get(r.tenant_id ?? "")?.lastName ?? ""
        }`,
      property: (r) =>
        propertyById.get(r.property_id ?? "")?.name ??
        r.property_name ??
        "",
      unit: (r) =>
        unitById.get(r.unit_id ?? "")?.unitNumber ?? r.unit_number ?? "",
      monthly_due: (r) => Number(r.monthly_due ?? 0),
      mtd_paid: (r) => Number(r.mtd_paid ?? 0),
      arrears: (r) => Number(r.arrears ?? 0),
      balance_now: (r) => Number(r.balance_now ?? 0),
      status: (r) => r.status ?? "",
    };
    return sortByDir(filteredFinance, getter[sortFinanceBy], sortFinanceDir);
  }, [
    filteredFinance,
    sortFinanceBy,
    sortFinanceDir,
    tenantById,
    propertyById,
    unitById,
  ]);

  const sortedPayments = useMemo(() => {
    const getter: Record<SortKeyPayments, (r: PaymentRow) => any> = {
      tenant: (r) => {
        const t = r.tenant_id ? tenantById.get(r.tenant_id) : undefined;
        return `${t?.firstName ?? ""} ${t?.lastName ?? ""}`;
      },
      property: (r) => {
        const u = r.unit_id ? unitById.get(r.unit_id) : undefined;
        const p = u?.propertyId ? propertyById.get(u.propertyId) : undefined;
        return p?.name ?? "";
      },
      unit: (r) =>
        r.unit_id ? unitById.get(r.unit_id)?.unitNumber ?? "" : "",
      amount: (r) => Number(r.amount ?? 0),
      status: (r) => r.status ?? "",
      paid_at: (r) => r.paid_at ?? "",
    };
    return sortByDir(filteredPayments, getter[sortPaymentsBy], sortPaymentsDir);
  }, [
    filteredPayments,
    sortPaymentsBy,
    sortPaymentsDir,
    tenantById,
    propertyById,
    unitById,
  ]);

  /* ---------- pagination + selection ---------- */
  const dataForView = viewMode === "finance" ? sortedFinance : sortedPayments;
  const pageCount = Math.max(1, Math.ceil(dataForView.length / pageSize));
  const current = dataForView.slice((page - 1) * pageSize, page * pageSize);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const nudge = (dx: number) =>
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  const allVisibleChecked =
    current.length > 0 &&
    current.every((r: any) => checkedIds.has(r.id ?? r.tenant_id ?? ""));
  const anyChecked = checkedIds.size > 0;

  const toggleCheckAllVisible = () =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked)
        current.forEach((r: any) =>
          next.delete(r.id ?? r.tenant_id ?? "")
        );
      else
        current.forEach((r: any) =>
          next.add(r.id ?? r.tenant_id ?? "")
        );
      return next;
    });

  const toggleCheckOne = (id?: string | null) => {
    if (!id) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openReceiptByTx = (txId: string) =>
    window.open(
      `/api/payments/${encodeURIComponent(txId)}/receipt.pdf`,
      "_blank",
      "noopener"
    );
  const openReceiptById = (paymentId: string) =>
    window.open(
      `/api/payments/id/${encodeURIComponent(paymentId)}/receipt.pdf`,
      "_blank",
      "noopener"
    );

  const handleQuickAddRent = async () => {
    const tenantId = window.prompt("Tenant ID (paste exact ID):");
    if (!tenantId) return;
    const amount = Number(window.prompt("Amount (KES):") || 0);
    if (!amount || amount <= 0) return;
    await addRentMutation.mutateAsync({
      tenantId,
      amount,
      method: "manual",
      source: "counter",
      status: "paid",
      description: "Quick Add Rent",
    });
    alert("Rent recorded.");
  };

  const handleAdjustArrears = async (targetTenantId?: string) => {
    const tenantId =
      targetTenantId ??
      window.prompt("Tenant ID to adjust (arrears DEBIT/CREDIT):");
    if (!tenantId) return;
    const amount = Number(
      window.prompt(
        "Amount (KES, use positive for debit / negative for credit):"
      ) || 0
    );
    if (!amount) return;
    const reason = window.prompt("Reason (optional):") || undefined;
    const kind: "debit" | "credit" = amount >= 0 ? "debit" : "credit";
    await adjustArrearsMutation.mutateAsync({
      tenantId,
      amount: Math.abs(amount),
      reason,
      kind,
    });
    alert("Arrears adjusted.");
  };

  const exportCSV = () => {
    const rows = dataForView;
    const toCSV = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const headers =
      viewMode === "finance"
        ? [
            "tenant_name",
            "property",
            "unit",
            "monthly_due",
            "mtd_paid",
            "arrears",
            "balance_now",
            "status",
          ]
        : [
            "tenant_name",
            "property",
            "unit",
            "amount",
            "status",
            "paid_at",
            "tx_id",
          ];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      if (viewMode === "finance") {
        const t = tenantById.get(r.tenant_id ?? "");
        const u = r.unit_id ? unitById.get(r.unit_id) : undefined;
        const p = u?.propertyId ? propertyById.get(u.propertyId) : undefined;
        lines.push(
          [
            toCSV(`${t?.firstName ?? ""} ${t?.lastName ?? ""}`.trim()),
            toCSV(p?.name ?? ""),
            toCSV(u?.unitNumber ?? ""),
            toCSV(r.monthly_due),
            toCSV(r.mtd_paid),
            toCSV(r.arrears),
            toCSV(r.balance_now),
            toCSV(r.status),
          ].join(",")
        );
      } else {
        const t = r.tenant_id ? tenantById.get(r.tenant_id) : undefined;
        const u = r.unit_id ? unitById.get(r.unit_id) : undefined;
        const p = u?.propertyId ? propertyById.get(u.propertyId) : undefined;
        lines.push(
          [
            toCSV(`${t?.firstName ?? ""} ${t?.lastName ?? ""}`.trim()),
            toCSV(p?.name ?? ""),
            toCSV(u?.unitNumber ?? ""),
            toCSV(r.amount),
            toCSV(r.status),
            toCSV(r.paid_at ? new Date(r.paid_at).toISOString() : ""),
            toCSV(r.tx_id ?? ""),
          ].join(",")
        );
      }
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      viewMode === "finance" ? "tenant_finance.csv" : "payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading =
    propertiesLoading ||
    unitsLoading ||
    tenantsLoading ||
    paymentsLoading ||
    financeLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // ----- helpers for table header sort toggles -----
  const SortButton = ({
    active,
    onClick,
  }: {
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        active ? "text-slate-900 dark:text-slate-100" : "text-slate-400"
      }`}
      title="Sort"
    >
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  const FinanceTh = ({
    id,
    label,
    sortKey,
  }: {
    id: ColumnIdFinance;
    label: string;
    sortKey?: SortKeyFinance;
  }) =>
    financeCols[id] ? (
      <th className="px-4 py-2 text-left whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {sortKey && (
            <SortButton
              active={sortFinanceBy === sortKey}
              onClick={() => {
                if (sortFinanceBy !== sortKey) {
                  setSortFinanceBy(sortKey);
                  setSortFinanceDir("asc");
                } else {
                  setSortFinanceDir((d) =>
                    d === "asc" ? "desc" : "asc"
                  );
                }
              }}
            />
          )}
        </div>
      </th>
    ) : null;

  const PaymentTh = ({
    id,
    label,
    sortKey,
  }: {
    id: ColumnIdPayments;
    label: string;
    sortKey?: SortKeyPayments;
  }) =>
    paymentCols[id] ? (
      <th className="px-4 py-2 text-left whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {sortKey && (
            <SortButton
              active={sortPaymentsBy === sortKey}
              onClick={() => {
                if (sortPaymentsBy !== sortKey) {
                  setSortPaymentsBy(sortKey);
                  setSortPaymentsDir("asc");
                } else {
                  setSortPaymentsDir((d) =>
                    d === "asc" ? "desc" : "asc"
                  );
                }
              }}
            />
          )}
        </div>
      </th>
    ) : null;

  // -------------- RENDER --------------
  return (
    <div
      className="p-6 max-w-7xl mx-auto space-y-6"
      data-testid="rent-income-page"
    >
      {/* Header + actions */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Rent Income
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track rent collections, tenant balances, and receipts
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {/* Add Rent opens FinanceModal with tenant + unit from finance summary */}
          <Button
            onClick={() => {
              if (selectedTenantId === "all") {
                alert(
                  "Please select a tenant in the filters, or use the Manage button on a row."
                );
                return;
              }

              const rowForTenant = finance.find(
                (r) => r.tenant_id === selectedTenantId
              );
              const unitId = rowForTenant?.unit_id ?? undefined;

              setFinanceModalCtx({
                mode: "record",
                tenantId: selectedTenantId,
                unitId,
              });
              setFinanceModalOpen(true);
            }}
            className="bg-[#1a73e8] hover:bg-[#1666cc]"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Add Rent
          </Button>

          {/* Invoices engine button (opens modal) */}
          <Button
            variant="outline"
            onClick={() => setInvoiceModalOpen(true)}
          >
            <ListChecks className="w-4 h-4 mr-2" />
            Generate Invoices
          </Button>

          <Button variant="outline" onClick={handleQuickAddRent}>
            Quick Add
          </Button>
          <Button variant="outline" onClick={() => handleAdjustArrears()}>
            Adjust Arrears
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI tiles (tgt_table style) */}
      {viewMode === "finance" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-tr from-blue-50 to-white dark:from-blue-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">MTD Collected</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsFinance.totalMTD)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-indigo-50 to-white dark:from-indigo-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Monthly Due</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsFinance.totalMonthly)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-rose-50 to-white dark:from-rose-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Arrears</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsFinance.totalArrears)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-amber-50 to-white dark:from-amber-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Running Balance</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsFinance.totalBalance)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-emerald-50 to-white dark:from-emerald-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Cleared Tenants</div>
              <div className="mt-1 text-xl font-semibold">
                {analyticsFinance.clearedRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-tr from-emerald-50 to-white dark:from-emerald-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Payments (PAID)</div>
              <div className="mt-1 text-xl font-semibold">
                {analyticsPayments.numPaid}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-blue-50 to-white dark:from-blue-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Collected</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsPayments.collectedRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-indigo-50 to-white dark:from-indigo-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Total (All rows)</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsPayments.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-amber-50 to-white dark:from-amber-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Outstanding</div>
              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(analyticsPayments.outstandingAmount)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-tr from-slate-50 to-white dark:from-slate-900/20">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">Payment Rate</div>
              <div className="mt-1 text-xl font-semibold">
                {analyticsPayments.paymentRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls bar (search + filters + view + column picker) */}
      <Card className="ui-content">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tenant / unit / property / tx / phone"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={selectedPropertyId}
              onValueChange={(v) => {
                setSelectedPropertyId(v);
                setSelectedUnitId("all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent className="ui-dropdown">
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedUnitId}
              onValueChange={(v) => {
                setSelectedUnitId(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent className="ui-dropdown">
                <SelectItem value="all">All Units</SelectItem>
                {filteredUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.unitNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedTenantId}
              onValueChange={(v) => {
                setSelectedTenantId(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent className="ui-dropdown">
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View switch */}
            <div className="flex rounded-xl overflow-hidden border">
              <Button
                variant={viewMode === "finance" ? "default" : "ghost"}
                onClick={() => {
                  setViewMode("finance");
                  setPage(1);
                }}
                className="rounded-none"
              >
                <Home className="mr-2 h-4 w-4" /> Finance
              </Button>
              <Button
                variant={viewMode === "payments" ? "default" : "ghost"}
                onClick={() => {
                  setViewMode("payments");
                  setPage(1);
                }}
                className="rounded-none"
              >
                <Receipt className="mr-2 h-4 w-4" /> Payments
              </Button>
            </div>

            {/* Status filter */}
            <Select
              value={selectedStatus}
              onValueChange={(v) => {
                setSelectedStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="ui-dropdown">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                {viewMode === "payments" && (
                  <>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Payments-only method/source filters */}
            {viewMode === "payments" && (
              <>
                <Select
                  value={selectedMethod}
                  onValueChange={(v) => {
                    setSelectedMethod(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent className="ui-dropdown">
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedSource}
                  onValueChange={(v) => {
                    setSelectedSource(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent className="ui-dropdown">
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="counter">Counter</SelectItem>
                    <SelectItem value="portal">Tenant Portal</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Column picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <Columns3 className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="ui-popover w-64">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500">
                    Toggle visible columns
                  </div>
                  {(viewMode === "finance"
                    ? (Object.keys(financeCols) as ColumnIdFinance[])
                    : (Object.keys(paymentCols) as ColumnIdPayments[])
                  ).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={
                          viewMode === "finance"
                            ? financeCols[key as ColumnIdFinance]
                            : paymentCols[key as ColumnIdPayments]
                        }
                        onCheckedChange={(c) => {
                          if (viewMode === "finance") {
                            setFinanceCols((prev) => ({
                              ...prev,
                              [key]: Boolean(c),
                            }));
                          } else {
                            setPaymentCols((prev) => ({
                              ...prev,
                              [key]: Boolean(c),
                            }));
                          }
                        }}
                      />
                      <span className="capitalize">
                        {String(key).replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Page size */}
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent className="ui-dropdown">
                {[10, 12, 20, 30, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bulk actions */}
            <Button
              variant="outline"
              disabled={!anyChecked}
              onClick={() => {
                if (!anyChecked) return;

                if (viewMode === "finance") {
                  const firstTenantId = [...checkedIds][0];
                  if (firstTenantId) handleAdjustArrears(firstTenantId);
                } else {
                  const firstPaymentId = [...checkedIds][0];
                  const payment = filteredPayments.find(
                    (p) => (p.id ?? "") === firstPaymentId
                  );
                  const tenantId = payment?.tenant_id ?? undefined;
                  if (tenantId) handleAdjustArrears(tenantId);
                }
              }}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Bulk Adjust
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card className="ui-content">
        <div ref={scrollerRef} className="overflow-x-auto scroll-smooth">
          <table className="min-w-[1200px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr className="border-b">
                <th className="px-4 py-2">
                  <Checkbox
                    checked={allVisibleChecked}
                    onCheckedChange={toggleCheckAllVisible}
                  />
                </th>
                {viewMode === "finance" ? (
                  <>
                    <FinanceTh id="tenant" label="Tenant" sortKey="tenant" />
                    <FinanceTh
                      id="property_unit"
                      label="Property / Unit"
                      sortKey="property"
                    />
                    <FinanceTh
                      id="monthly_due"
                      label="Monthly Due"
                      sortKey="monthly_due"
                    />
                    <FinanceTh
                      id="mtd_paid"
                      label="MTD Paid"
                      sortKey="mtd_paid"
                    />
                    <FinanceTh
                      id="arrears"
                      label="Arrears"
                      sortKey="arrears"
                    />
                    <FinanceTh
                      id="balance_now"
                      label="Balance"
                      sortKey="balance_now"
                    />
                    <FinanceTh
                      id="status"
                      label="Status"
                      sortKey="status"
                    />
                    <th className="px-4 py-2 text-left whitespace-nowrap">
                      <span>Actions</span>
                    </th>
                  </>
                ) : (
                  <>
                    <PaymentTh id="tenant" label="Tenant" sortKey="tenant" />
                    <PaymentTh
                      id="property_unit"
                      label="Property / Unit"
                      sortKey="property"
                    />
                    <PaymentTh
                      id="amount"
                      label="Amount"
                      sortKey="amount"
                    />
                    <PaymentTh
                      id="status"
                      label="Status"
                      sortKey="status"
                    />
                    <PaymentTh
                      id="paid_at"
                      label="Paid At"
                      sortKey="paid_at"
                    />
                    <PaymentTh id="actions" label="Actions" />
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {current.map((r: any) => {
                const key = r.id ?? r.tenant_id ?? "";
                if (viewMode === "finance") {
                  const t = tenantById.get(r.tenant_id ?? "");
                  const u = r.unit_id ? unitById.get(r.unit_id) : undefined;
                  const p = u?.propertyId
                    ? propertyById.get(u.propertyId)
                    : undefined;

                  return (
                    <tr
                      key={key}
                      className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2 align-top">
                        <Checkbox
                          checked={checkedIds.has(r.tenant_id ?? "")}
                          onCheckedChange={() => toggleCheckOne(r.tenant_id)}
                        />
                      </td>

                      {financeCols.tenant && (
                        <td className="px-4 py-2 align-top">
                          {(r.first_name ?? t?.firstName ?? "—") +
                            " " +
                            (r.last_name ?? t?.lastName ?? "")}
                          <div className="text-xs text-slate-500">
                            ID: {safeSlice(r.tenant_id, 0, 8) || "—"}
                          </div>
                        </td>
                      )}

                      {financeCols.property_unit && (
                        <td className="px-4 py-2 align-top">
                          {(r.property_name ?? p?.name ?? "—") +
                            " / " +
                            (r.unit_number ?? u?.unitNumber ?? "—")}
                        </td>
                      )}

                      {financeCols.monthly_due && (
                        <td className="px-4 py-2 align-top">
                          {formatCurrency(r.monthly_due)}
                        </td>
                      )}
                      {financeCols.mtd_paid && (
                        <td className="px-4 py-2 align-top">
                          {formatCurrency(r.mtd_paid)}
                        </td>
                      )}
                      {financeCols.arrears && (
                        <td className="px-4 py-2 align-top">
                          {formatCurrency(r.arrears)}
                        </td>
                      )}
                      {financeCols.balance_now && (
                        <td className="px-4 py-2 align-top">
                          {formatCurrency(r.balance_now)}
                        </td>
                      )}
                      {financeCols.status && (
                        <td className="px-4 py-2 align-top">
                          {statusBadge(r.status)}
                        </td>
                      )}

                      <td className="px-4 py-2 align-top">
                        <Button
                          size="sm"
                          onClick={() =>
                            openRecordPayment(
                              r.tenant_id ?? undefined,
                              r.unit_id ?? undefined
                            )
                          }
                          className="inline-flex items-center"
                          title="Manage (Record / Adjust / History)"
                        >
                          <Wrench className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                } else {
                  const t = r.tenant_id ? tenantById.get(r.tenant_id) : undefined;
                  const u = r.unit_id ? unitById.get(r.unit_id) : undefined;
                  const p = u?.propertyId
                    ? propertyById.get(u.propertyId)
                    : undefined;

                  return (
                    <tr
                      key={key}
                      className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2 align-top">
                        <Checkbox
                          checked={checkedIds.has(r.id ?? "")}
                          onCheckedChange={() => toggleCheckOne(r.id)}
                        />
                      </td>

                      {paymentCols.tenant && (
                        <td className="px-4 py-2 align-top">
                          {(t?.firstName ?? "—") + " " + (t?.lastName ?? "")}
                          <div className="text-xs text-slate-500">
                            TID: {safeSlice(r.tenant_id, 0, 8) || "—"}
                          </div>
                        </td>
                      )}

                      {paymentCols.property_unit && (
                        <td className="px-4 py-2 align-top">
                          {(p?.name ?? "—") + " / " + (u?.unitNumber ?? "—")}
                        </td>
                      )}

                      {paymentCols.amount && (
                        <td className="px-4 py-2 align-top">
                          {formatCurrency(r.amount)}
                        </td>
                      )}

                      {paymentCols.status && (
                        <td className="px-4 py-2 align-top">
                          {statusBadge(r.status)}
                        </td>
                      )}

                      {paymentCols.paid_at && (
                        <td className="px-4 py-2 align-top">
                          {formatDateTime(r.paid_at)}
                        </td>
                      )}

                      {paymentCols.actions && (
                        <td className="px-4 py-2 align-top">
                          <div className="flex flex-wrap gap-2">
                            {r.tx_id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReceiptByTx(r.tx_id!)}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                            ) : r.id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReceiptById(r.id!)}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                            ) : null}

                            {r.tenant_id && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  openRecordPayment(
                                    r.tenant_id ?? undefined,
                                    r.unit_id ?? undefined
                                  )
                                }
                                title="Manage (Record / Adjust / History)"
                              >
                                <Wrench className="h-4 w-4 mr-1" />
                                Manage
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between p-3">
          <div className="text-xs text-slate-500">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, dataForView.length)} of{" "}
            {dataForView.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <div className="text-xs">
              {page} / {pageCount}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Invoices Modal */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Invoices</DialogTitle>
            <DialogDescription>
              Bulk-generate monthly rent invoices or create a custom invoice
              for a single tenant. All invoices update balances via the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode switch */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Mode</Label>
              <RadioGroup
                value={invoiceMode}
                onValueChange={(v) =>
                  setInvoiceMode(v as "bulk" | "single")
                }
                className="flex gap-4"
              >
                <Label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="bulk" />
                  Bulk – All active tenants (monthly rent)
                </Label>
                <Label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="single" />
                  Single tenant – Custom invoice
                </Label>
              </RadioGroup>
            </div>

            {/* Month */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Billing Month</Label>
              <Input
                type="month"
                value={invoiceMonth}
                onChange={(e) => setInvoiceMonth(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Used as the billing period label (e.g. &quot;2025-11&quot;).
              </p>
            </div>

            {invoiceMode === "bulk" ? (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Scope</Label>
                <p className="text-xs text-slate-500">
                  All active tenants with an active lease and monthly rent will
                  be invoiced for the selected month. Existing rent invoices for
                  that month are skipped.
                </p>
              </div>
            ) : (
              <>
                {/* Single tenant selector */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Tenant</Label>
                  <Select
                    value={invoiceTenantId}
                    onValueChange={(v) => setInvoiceTenantId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose tenant" />
                    </SelectTrigger>
                    <SelectContent className="ui-dropdown max-h-64">
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Extra charge type */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      Charge Type
                    </Label>
                    <Select
                      value={invoiceExtraType}
                      onValueChange={(v) =>
                        setInvoiceExtraType(
                          v as "arrears" | "utility" | "breakage" | "other"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="ui-dropdown">
                        <SelectItem value="arrears">Arrears</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="breakage">Breakage</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      Amount (KES)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={invoiceExtraAmount}
                      onChange={(e) =>
                        setInvoiceExtraAmount(e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Description</Label>
                  <Input
                    value={invoiceExtraDesc}
                    onChange={(e) =>
                      setInvoiceExtraDesc(e.target.value)
                    }
                    placeholder="e.g. Water bill Nov 2025, Breakages, etc."
                  />
                </div>

                <p className="text-xs text-slate-500">
                  This creates a ledger DEBIT for the selected tenant. You can
                  later extend this to support multiple line items.
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInvoiceModalOpen(false)}
              disabled={generateInvoicesMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (invoiceMode === "bulk") {
                    await generateInvoicesMutation.mutateAsync({
                      mode: "bulk-monthly",
                      month: invoiceMonth,
                    });
                  } else {
                    if (!invoiceTenantId) {
                      alert(
                        "Please choose a tenant for the single invoice."
                      );
                      return;
                    }
                    const amount = Number(invoiceExtraAmount || 0);
                    if (!amount || amount <= 0) {
                      alert("Please enter a positive amount.");
                      return;
                    }
                    const desc =
                      invoiceExtraDesc ||
                      `${invoiceExtraType} charge – ${invoiceMonth}`;
                    await generateInvoicesMutation.mutateAsync({
                      mode: "single",
                      tenantId: invoiceTenantId,
                      items: [
                        {
                          kind: invoiceExtraType,
                          description: desc,
                          amount,
                        },
                      ],
                      month: invoiceMonth,
                    });
                  }
                  setInvoiceModalOpen(false);
                } catch {
                  // error handled in mutation onError
                }
              }}
              disabled={generateInvoicesMutation.isPending}
            >
              {generateInvoicesMutation.isPending
                ? "Generating..."
                : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified modal with tabs: Record Payment / Adjust Balance / Edit + History */}
      <FinanceModal
        open={financeModalOpen}
        onOpenChange={(v) => {
          setFinanceModalOpen(v);
          if (!v) {
            queryClient.invalidateQueries({ queryKey: ["/api/tenants/summary"] });
            queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
          }
        }}
        ctx={financeModalCtx}
        onSuccess={() => {
          setFinanceModalOpen(false);
        }}
      />
    </div>
  );
}
