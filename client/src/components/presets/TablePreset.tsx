import React from 'react';

type Row = { id: string; tenant: string; unit: string; status: 'paid'|'arrears'|'due'; balance: string };

const DATA: Row[] = [
  { id: '1', tenant: 'Amina Yusuf', unit: 'A-12', status: 'paid', balance: '0.00' },
  { id: '2', tenant: 'Brian K', unit: 'B-03', status: 'arrears', balance: '12,500.00' },
  { id: '3', tenant: 'Carol O', unit: 'C-08', status: 'due', balance: '6,000.00' },
];

const statusBadge = (s: Row['status']) => {
  if (s === 'paid') return <span className="ui-badge bg-green-50 text-green-700 border-green-300">Paid</span>;
  if (s === 'arrears') return <span className="ui-badge bg-red-50 text-red-700 border-red-300">Arrears</span>;
  return <span className="ui-badge bg-yellow-50 text-yellow-700 border-yellow-300">Due</span>;
};

export default function TablePreset() {
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(
    () => DATA.filter(r => r.tenant.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="rounded-lg border bg-background px-3 py-2 w-64"
          placeholder="Search tenants..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select className="rounded-lg border bg-background px-3 py-2">
          <option>All status</option>
          <option>Paid</option>
          <option>Due</option>
          <option>Arrears</option>
        </select>
        <button className="ui-btn-primary">Columns</button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-sticky-header">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-2"><input type="checkbox" /></th>
              <th className="text-left py-2 pr-2">Tenant</th>
              <th className="text-left py-2 pr-2">Unit</th>
              <th className="text-left py-2 pr-2">Status</th>
              <th className="text-right py-2 pl-2">Balance (KSh)</th>
              <th className="text-right py-2 pl-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/40">
                <td className="py-2 pr-2 align-middle"><input type="checkbox" /></td>
                <td className="py-2 pr-2 align-middle">{r.tenant}</td>
                <td className="py-2 pr-2 align-middle">{r.unit}</td>
                <td className="py-2 pr-2 align-middle">{statusBadge(r.status)}</td>
                <td className="py-2 pl-2 text-right align-middle font-medium">{r.balance}</td>
                <td className="py-2 pl-2 text-right align-middle">
                  <div className="flex justify-end gap-2">
                    <button className="ui-btn-primary">Open</button>
                    <button className="rounded-lg px-3 py-2 border">More</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">Showing {filtered.length} of {DATA.length}</div>
        <div className="flex gap-2">
          <button className="rounded-lg px-3 py-2 border">Prev</button>
          <button className="rounded-lg px-3 py-2 border">Next</button>
        </div>
      </div>
    </div>
  );
}
