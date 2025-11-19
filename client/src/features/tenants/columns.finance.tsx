
/**
 * File: client/src/features/tenants/columns.finance.tsx
 * Adds finance columns that expect GET /api/tenants/summary shape.
 * Uses user's 'tgt_table style' conventions: badges, right-aligned numbers.
 */
import { Badge } from "@/components/ui/badge";

export type TenantFinanceSummary = {
  tenantId: string;
  amountPaidMtd: number;
  arrearsToDate: number;
  currentMonthDue: number;
  balanceNow: number;
  status: "Cleared" | "Overdue" | "Prepaid";
};

export function StatusBadge({ status }: { status: TenantFinanceSummary["status"] }) {
  if (status === "Cleared") return <span className="badge-cleared">Cleared</span>;
  if (status === "Prepaid") return <span className="badge-prepaid">Prepaid</span>;
  return <span className="badge-overdue">Overdue</span>;
}

export const financeColumns = [
  {
    id: "amountPaidMtd",
    header: "Paid (MTD)",
    cell: (row: any) => <div className="text-right tabular-nums">{Number(row.original.amountPaidMtd).toLocaleString()}</div>,
    meta: { align: "right" },
  },
  {
    id: "arrearsToDate",
    header: "Arrears (to date)",
    cell: (row: any) => <div className="text-right tabular-nums">{Number(row.original.arrearsToDate).toLocaleString()}</div>,
    meta: { align: "right" },
  },
  {
    id: "currentMonthDue",
    header: "Current Month Due",
    cell: (row: any) => <div className="text-right tabular-nums">{Number(row.original.currentMonthDue).toLocaleString()}</div>,
    meta: { align: "right" },
  },
  {
    id: "balanceNow",
    header: "Balance Now",
    cell: (row: any) => <div className="text-right font-medium tabular-nums">{Number(row.original.balanceNow).toLocaleString()}</div>,
    meta: { align: "right" },
  },
  {
    id: "status",
    header: "Status",
    cell: (row: any) => <StatusBadge status={row.original.status} />,
  },
];
