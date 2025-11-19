import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Plus, Droplets, HandCoins, Send, Home, Users, RefreshCcw } from "lucide-react";

type Property = { id: string; name: string };
type Unit = { id: string; unitNumber: string; propertyId: string };
type Tenant = { id: string; userId: string; firstName?: string; lastName?: string; unitId?: string };

export function QuickActions() {
  const qc = useQueryClient();

  // lightweight lists for selects/prompts
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties?lite=1"],
    queryFn: async () => (await apiRequest("GET", "/api/properties")).json(),
    staleTime: 120_000,
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units?lite=1"],
    queryFn: async () => (await apiRequest("GET", "/api/units")).json(),
    staleTime: 120_000,
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants?lite=1"],
    queryFn: async () => (await apiRequest("GET", "/api/tenants")).json(),
    staleTime: 120_000,
  });

  const invalidateDashboard = () => {
    qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard/recent-payments"] });
    qc.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
    // also common lists
    qc.invalidateQueries({ queryKey: ["/api/properties"] });
    qc.invalidateQueries({ queryKey: ["/api/units"] });
    qc.invalidateQueries({ queryKey: ["/api/tenants"] });
    qc.invalidateQueries({ queryKey: ["/api/invoices"] });
    qc.invalidateQueries({ queryKey: ["/api/payments"] });
  };

  async function runBillingNow() {
    const prop = pickProperty(properties);
    if (!prop) return;
    const period = prompt("Billing period (YYYY-MM):", new Date().toISOString().slice(0, 7));
    if (!period) return;
    const resp = await apiRequest("POST", `/api/billing/property/${prop.id}/run`, { period });
    if (!resp.ok) alert(`Billing error: ${resp.status} ${await resp.text()}`);
    invalidateDashboard();
  }

  async function recordPayment() {
    const tenant = pickTenant(tenants);
    if (!tenant) return;
    const amount = Number(prompt("Amount received:", "5000") || "0");
    if (!amount || isNaN(amount)) return;
    const method = (prompt(`Method (mpesa|cash|bank):`, "cash") || "cash") as "mpesa" | "cash" | "bank";
    const invoiceId = prompt("Invoice ID (optional, to reconcile a specific invoice):", "") || undefined;

    const resp = await apiRequest("POST", "/api/payments/record", {
      tenantId: tenant.id,
      unitId: tenant.unitId,
      amount,
      method,
      invoiceId,
      reference: `quick-${Date.now()}`
    });
    if (!resp.ok) alert(`Payment error: ${resp.status} ${await resp.text()}`);
    invalidateDashboard();
  }

  async function addWaterReading() {
    const unit = pickUnit(units);
    if (!unit) return;
    const reading = Number(prompt(`Current reading for ${unit.unitNumber}:`, "") || "0");
    if (!reading || isNaN(reading)) return;
    const period = prompt("Billing period (YYYY-MM):", new Date().toISOString().slice(0, 7))!;
    const resp = await apiRequest("POST", "/api/utilities/readings", {
      unitId: unit.id,
      utility_type: "water",
      reading,
      billing_period: period
    });
    if (!resp.ok) alert(`Reading error: ${resp.status} ${await resp.text()}`);
    invalidateDashboard();
  }

  async function addProperty() {
    const name = prompt("Property name:", "New Property");
    if (!name) return;
    const location = prompt("Location:", "Nairobi") || "";
    const resp = await apiRequest("POST", "/api/properties", { name, location });
    if (!resp.ok) alert(`Create property error: ${resp.status} ${await resp.text()}`);
    invalidateDashboard();
  }

  async function addUnit() {
    const prop = pickProperty(properties);
    if (!prop) return;
    const unitNumber = prompt(`Unit number for ${prop.name}:`, "A1") || "";
    const rentAmount = Number(prompt("Rent amount:", "15000") || "0");
    if (!unitNumber || !rentAmount) return;
    const resp = await apiRequest("POST", `/api/properties/${prop.id}/units/bulk`, [
      { unitNumber, rentAmount }
    ]);
    if (!resp.ok) alert(`Add unit error: ${resp.status} ${await resp.text()}`);
    invalidateDashboard();
  }

  async function addTenant() {
    const unit = pickUnit(units);
    if (!unit) return;
    const email = prompt("Tenant email:", "tenant@example.com")!;
    const firstName = prompt("First name:", "Jane")!;
    const lastName = prompt("Last name:", "Doe")!;
    const phone = prompt("Phone (+254...):", "+2547...")!;
    const startDate = prompt("Lease start (YYYY-MM-DD):", new Date().toISOString().slice(0, 10))!;
    const security_deposit = Number(prompt("Security deposit:", "15000") || "0");

    const resp = await apiRequest("POST", `/api/properties/${unit.propertyId}/tenants`, {
      email, firstName, lastName, phone, unitId: unit.id, startDate, security_deposit
    });
    if (!resp.ok) alert(`Add tenant error: ${resp.status} ${await resp.text()}`);
    invalidateDashboard();
  }

  function sendReminders() {
    alert("Sending reminders (stub). Wire /api/notifications/reminders server-side to enable.");
    invalidateDashboard();
  }

  return (
    <Card className="p-3 flex flex-wrap gap-2">
      <Button size="sm" onClick={addProperty}><Home className="h-4 w-4 mr-1" /> Add Property</Button>
      <Button size="sm" onClick={addUnit}><Plus className="h-4 w-4 mr-1" /> Add Unit</Button>
      <Button size="sm" onClick={addTenant}><Users className="h-4 w-4 mr-1" /> Add Tenant</Button>
      <Button size="sm" onClick={runBillingNow}><Play className="h-4 w-4 mr-1" /> Run Billing</Button>
      <Button size="sm" onClick={recordPayment}><HandCoins className="h-4 w-4 mr-1" /> Record Payment</Button>
      <Button size="sm" onClick={addWaterReading}><Droplets className="h-4 w-4 mr-1" /> Add Water Reading</Button>
      <Button size="sm" variant="secondary" onClick={sendReminders}><Send className="h-4 w-4 mr-1" /> Send Reminders</Button>
      <Button size="sm" variant="outline" onClick={()=>{
        // one-tap refresh
        qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        qc.invalidateQueries({ queryKey: ["/api/dashboard/recent-payments"] });
        qc.invalidateQueries({ queryKey: ["/api/maintenance-requests"] });
      }}>
        <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
      </Button>
    </Card>
  );
}

function pickProperty(props?: { id: string; name: string }[]) {
  if (!props?.length) { alert("No properties yet."); return null; }
  if (props.length === 1) return props[0];
  const choice = prompt("Choose property by name:\n" + props.map(p => `- ${p.name}`).join("\n"));
  return props.find(p => p.name.toLowerCase() === (choice || "").toLowerCase()) || props[0];
}
function pickUnit(units?: { id: string; unitNumber: string; propertyId: string }[]) {
  if (!units?.length) { alert("No units yet."); return null; }
  if (units.length === 1) return units[0];
  const choice = prompt("Choose unit (e.g., A1):\n" + units.map(u => `- ${u.unitNumber}`).join("\n"));
  return units.find(u => u.unitNumber.toLowerCase() === (choice || "").toLowerCase()) || units[0];
}
function pickTenant(t?: { id: string; firstName?: string; lastName?: string }[]) {
  if (!t?.length) { alert("No tenants yet."); return null; }
  if (t.length === 1) return t[0];
  const choice = prompt("Choose tenant:\n" + t.map(x => `- ${`${x.firstName || ""} ${x.lastName || ""}`.trim()}`).join("\n"));
  return t.find(x => (`${x.firstName || ""} ${x.lastName || ""}`).trim().toLowerCase() === (choice || "").toLowerCase()) || t[0];
}
