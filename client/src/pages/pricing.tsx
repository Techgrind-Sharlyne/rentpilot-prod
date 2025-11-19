import React, { useState } from "react";
import { Link } from "wouter";
import { Check, Building2, Home, Sparkles, ArrowRight } from "lucide-react";

// Tailwind-only primitives; swap to shadcn/ui if you wish.

type Plan = {
  name: string;
  monthlyPrice?: number; // in KES
  yearlyPrice?: number; // in KES (already discounted)
  unitRange?: string;
  cta?: string; // default: "Request Demo"
  highlight?: boolean;
  contactOnly?: boolean;
};

const landlordPlans: Plan[] = [
  {
    name: "Lite",
    monthlyPrice: 3000,
    yearlyPrice: 2550,
    unitRange: "1 - 50",
  },
  {
    name: "Bronze",
    monthlyPrice: 5000,
    yearlyPrice: 4250,
    unitRange: "51 - 100",
    highlight: true,
  },
  {
    name: "Silver",
    monthlyPrice: 7000,
    yearlyPrice: 5950,
    unitRange: "101 - 150",
  },
  {
    name: "Gold",
    contactOnly: true,
    unitRange: "Unlimited",
    cta: "Contact Us For a Quote",
  },
];

const featureRows = [
  { label: "Unlimited Users", landlords: true, agents: true },
  { label: "Unlimited Branch Offices", landlords: true, agents: true },
  { label: "Core Property Management Platform", landlords: true, agents: true },
  { label: "Lease Management", landlords: true, agents: true },
  { label: "Multiple Landlords", landlords: false, agents: true },
  { label: "Commissions Management", landlords: false, agents: true },
  { label: "Landlord Loans & Advance Payments", landlords: false, agents: true },
  { label: "Remittance Statements", landlords: false, agents: true },
  { label: "Accounts", landlords: true, agents: true },
  { label: "Payroll", landlords: true, agents: true },
  { label: "Document Management", landlords: true, agents: true },
  { label: "USSD App", landlords: true, agents: true },
  { label: "Residents Portal", landlords: true, agents: true },
  { label: "Landlords Portal", landlords: true, agents: false },
  { label: "M-Pesa and Bank Integration", landlords: true, agents: true },
  { label: "Real Time Disbursements", landlords: true, agents: true },
  { label: "Bulk SMS & Email", landlords: true, agents: true },
  { label: "Debt Control", landlords: true, agents: true },
  { label: "Marketing", landlords: true, agents: true },
];

function formatKES(n?: number) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [activeTab, setActiveTab] = useState<"landlord" | "agent">("landlord");

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      {/* Header (kept minimal; routes via wouter Link) */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-black text-white grid place-items-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">REMIS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="opacity-70 hover:opacity-100">
              Home
            </Link>
            <Link href="/pricing#features" className="opacity-70 hover:opacity-100">
              Features
            </Link>
            <Link href="/pricing" className="opacity-70 hover:opacity-100">
              Pricing
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Pricing based on number of units managed
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl font-extrabold">OUR PRICING PLANS</h1>
          <p className="mt-3 text-neutral-700 max-w-2xl">
            Choose a plan that grows with your portfolio. Save up to{" "}
            <span className="font-semibold">15%</span> when you pay yearly.
          </p>
        </div>
{/* Setup Options */}
<div className="mt-6 grid gap-6 lg:grid-cols-2">
  {/* One-off Installation (Minimal Support) */}
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm ring-1 ring-black/5">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold tracking-tight">One-off Installation</h3>
      <span className="rounded-full bg-neutral-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">On-Prem</span>
    </div>
    <p className="mt-1 text-sm text-neutral-600">
      Perpetual license setup with minimal support. Pay support fees only when the need arises.
    </p>
    <div className="mt-5 flex items-end justify-between">
      <div>
        <div className="text-3xl font-extrabold">Kshs 85,000</div>
        <div className="text-xs text-neutral-500">One-time installation fee</div>
      </div>
      <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
        <li>Base install & environment setup</li>
        <li>Core configuration</li>
        <li>Support: <span className="font-semibold">on-demand (charged per case)</span></li>
      </ul>
    </div>
  </div>

  {/* SaaS Onboarding (Full Support) */}
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm ring-1 ring-black/5">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold tracking-tight">SaaS Onboarding</h3>
      <span className="rounded-full bg-neutral-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Cloud</span>
    </div>
    <p className="mt-1 text-sm text-neutral-600">
      Guided onboarding with 24/7 support. Monthly charges apply based on the package chosen.
    </p>
    <div className="mt-5 flex items-end justify-between">
      <div>
        <div className="text-3xl font-extrabold">Kshs 60,000</div>
        <div className="text-xs text-neutral-500">One-time onboarding fee</div>
      </div>
      <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
        <li>Data import & user role setup</li>
        <li>Billing & collections configuration</li>
        <li><span className="font-semibold">24/7 support</span> included</li>
      </ul>
    </div>

    <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm">
      <div className="font-semibold">Monthly Subscription</div>
      <div className="text-neutral-600">Billed per package (Lite, Bronze, Silver, Gold).</div>
    </div>
  </div>
</div>

{/* Add-ons Section */}
<div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm ring-1 ring-black/5">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-bold tracking-tight">Add-ons</h3>
    <span className="rounded-full bg-neutral-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Optional</span>
  </div>
  <p className="mt-1 text-sm text-neutral-600">Extend your solution with communication & branding extras.</p>

  <ul className="mt-4 divide-y">
    <li className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
      <div className="text-sm">
        <div className="font-medium">SMS Sender ID (Rent Invoice Billing)</div>
        <div className="text-neutral-600">Branded SMS for invoices, reminders & receipts.</div>
      </div>
      <div className="text-sm">
        <span className="rounded-lg bg-neutral-100 px-2 py-1">
          One-off Fee: <span className="font-semibold">Kshs 18,500</span>
        </span>
        <span className="ml-2 text-neutral-500">+ normal SMS/text rates</span>
      </div>
    </li>
  </ul>
</div>

        {/* Tabs */}
        <div className="mt-6 flex w-full items-center gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5 max-w-md">
          <button
            onClick={() => setActiveTab("landlord")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "landlord"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            Landlord Packages
          </button>
          <button
            onClick={() => setActiveTab("agent")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === "agent"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            Agent Packages
          </button>
        </div>

        {/* Billing toggle */}
        {activeTab === "landlord" && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 text-xs font-medium shadow-sm ring-1 ring-black/5">
            <button
              className={`rounded-full px-3 py-1 ${
                billing === "monthly" ? "bg-neutral-900 text-white" : "text-neutral-700"
              }`}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              className={`rounded-full px-3 py-1 ${
                billing === "yearly" ? "bg-neutral-900 text-white" : "text-neutral-700"
              }`}
              onClick={() => setBilling("yearly")}
            >
              Yearly <span className="opacity-70">(Save 15%)</span>
            </button>
          </div>
        )}

        {/* Cards */}
        <div id="pricing" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {activeTab === "landlord" ? (
            landlordPlans.map((plan) => (
              <div
                key={plan.name}
                className={`group relative rounded-3xl border bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md ${
                  plan.highlight ? "border-neutral-900" : "border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight">{plan.name}</h3>
                  <div className="rounded-full bg-neutral-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Landlords
                  </div>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Units Managed {plan.unitRange}
                </p>

                <div className="mt-5">
                  {plan.contactOnly ? (
                    <div className="text-xl font-semibold">Contact Us For a Quote</div>
                  ) : (
                    <>
                      <div className="text-3xl font-extrabold">
                        {formatKES(billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice)}
                        <span className="text-base font-semibold">/month</span>
                      </div>
                      {plan.yearlyPrice && (
                        <div className="mt-1 text-xs text-neutral-500">
                          Or {formatKES(plan.yearlyPrice)}/month{" "}
                          <span className="opacity-70">(Billed Yearly)</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-6">
                  {plan.contactOnly ? (
                    <Link
                      href="/contact"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
                    >
                      {plan.cta ?? "Contact Sales"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/contact"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
                    >
                      Request Demo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            // Agent Packages → drive to sales for now
            [
              {
                name: "Agent Basic",
                blurb: "Perfect for growing agencies managing multiple landlords.",
              },
              {
                name: "Agent Pro",
                blurb: "Advanced commissions, remittances, and disbursements.",
              },
              {
                name: "Agent Enterprise",
                blurb: "Unlimited portfolios, dedicated success, custom integrations.",
              },
            ].map(({ name, blurb }) => (
              <div
                key={name}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold tracking-tight">{name}</h3>
                  <div className="rounded-full bg-neutral-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Agents
                  </div>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{blurb}</p>
                <div className="mt-5 text-2xl font-extrabold">Custom Pricing</div>
                <p className="mt-1 text-xs text-neutral-500">
                  Talk to us for per-portfolio pricing.
                </p>
                <div className="mt-6">
                  <Link
                    href="/contact"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
                  >
                    Contact Sales <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Feature Comparison */}
        <div id="features" className="mt-16">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
            <Home className="h-4 w-4" /> Landlords / Residential Associations Pricing Plan
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold">Explore the top Features</h2>

          <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm ring-1 ring-black/5">
            <div className="grid grid-cols-12 gap-0 border-b bg-neutral-50 px-4 py-3 text-sm font-semibold">
              <div className="col-span-6 md:col-span-8">Feature</div>
              <div className="col-span-3 md:col-span-2 flex items-center gap-1">
                <Building2 className="h-4 w-4" /> Landlords
              </div>
              <div className="col-span-3 md:col-span-2 flex items-center gap-1">
                <Building2 className="h-4 w-4" /> Agents
              </div>
            </div>
            <ul className="divide-y">
              {featureRows.map((row, idx) => (
                <li
                  key={row.label}
                  className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${
                    idx % 2 === 0 ? "bg-white" : "bg-neutral-50/60"
                  }`}
                >
                  <div className="col-span-6 md:col-span-8 font-medium">{row.label}</div>
                  <div className="col-span-3 md:col-span-2">
                    {row.landlords ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full border border-neutral-300" />
                    )}
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    {row.agents ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full border border-neutral-300" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-neutral-600">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} REMIS. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/contact" className="hover:underline">
                Request Demo
              </Link>
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
              <Link href="#" className="hover:underline">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
