import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { open: boolean; onOpenChange: (v:boolean)=>void; };

export function AdjustArrearsModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/ledger/adjustments", {
        tenantId,
        amount: Number(amount),
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Adjusted", description: "Arrears updated." });
      onOpenChange(false);
    },
    onError: (e:any) => toast({ title: "Error", description: e?.message || "Failed", variant:"destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Adjust Arrears (Debit)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tenant ID</Label>
            <Input value={tenantId} onChange={e=>setTenantId(e.target.value)} placeholder="paste tenant UUID" />
          </div>
          <div>
            <Label>Amount (KES)</Label>
            <Input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min={0} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button onClick={()=>mutateAsync()} disabled={isPending || !tenantId || Number(amount)<0}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
