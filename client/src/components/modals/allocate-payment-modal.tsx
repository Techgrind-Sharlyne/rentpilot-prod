import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { open: boolean; onOpenChange: (v:boolean)=>void; paymentId: string|null; };

export function AllocatePaymentModal({ open, onOpenChange, paymentId }: Props) {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/payments/${paymentId}/allocate`, {
        tenantId,
        amount: Number(amount),
      }),
    onSuccess: () => {
      toast({ title: "Allocated", description: "Payment allocated to tenant." });
      onOpenChange(false);
    },
    onError: (e:any) => toast({ title: "Error", description: e?.message || "Failed", variant:"destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Allocate Payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Payment ID</Label><Input value={paymentId ?? ""} disabled /></div>
          <div><Label>Tenant ID</Label><Input value={tenantId} onChange={e=>setTenantId(e.target.value)} /></div>
          <div><Label>Amount (KES)</Label><Input type="number" min={0} value={amount} onChange={e=>setAmount(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button onClick={()=>mutateAsync()} disabled={isPending || !paymentId || !tenantId || !Number(amount)}>Allocate</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
