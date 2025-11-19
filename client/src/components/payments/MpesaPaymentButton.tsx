import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MpesaPaymentButtonProps {
  tenantId: string;
  unitId: string;
  amount: number;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

interface PaymentStatus {
  status: 'idle' | 'initiating' | 'pending' | 'checking' | 'success' | 'failed';
  message?: string;
  paymentId?: string;
  checkoutRequestId?: string;
}

export function MpesaPaymentButton({
  tenantId,
  unitId,
  amount,
  description = "Rent Payment",
  className,
  children
}: MpesaPaymentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'idle' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // M-Pesa payment initiation mutation
  const initiateMpesaMutation = useMutation({
    mutationFn: async (data: {
      tenantId: string;
      unitId: string;
      amount: number;
      phoneNumber: string;
      description: string;
    }) => {
      const response = await apiRequest("POST", "/api/mpesa/payment", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPaymentStatus({
          status: 'pending',
          message: data.message,
          paymentId: data.paymentId,
          checkoutRequestId: data.checkoutRequestId
        });
        
        // Start polling for payment status
        setTimeout(() => pollPaymentStatus(data.paymentId), 5000);
        
        toast({
          title: "Payment Request Sent",
          description: "Please check your phone and enter your M-Pesa PIN",
        });
      } else {
        setPaymentStatus({
          status: 'failed',
          message: data.message
        });
        
        toast({
          title: "Payment Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setPaymentStatus({
        status: 'failed',
        message: error.message || "Failed to initiate payment"
      });
      
      toast({
        title: "Payment Error",
        description: "Failed to initiate M-Pesa payment",
        variant: "destructive",
      });
    }
  });

  // Payment status checking mutation
  const checkStatusMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiRequest("GET", `/api/mpesa/status/${paymentId}`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === 'paid') {
        setPaymentStatus({
          status: 'success',
          message: "Payment completed successfully!"
        });
        
        toast({
          title: "Payment Successful",
          description: `Payment of KES ${amount.toLocaleString()} completed successfully`,
        });
        
        // Refresh payments data
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        
        // Close dialog after delay
        setTimeout(() => {
          setIsOpen(false);
          resetPaymentState();
        }, 3000);
        
      } else if (data.status === 'failed') {
        setPaymentStatus({
          status: 'failed',
          message: data.notes || "Payment failed"
        });
        
        toast({
          title: "Payment Failed",
          description: data.notes || "M-Pesa payment was not completed",
          variant: "destructive",
        });
      }
      // If still pending, continue polling
    }
  });

  const pollPaymentStatus = async (paymentId: string) => {
    let attempts = 0;
    const maxAttempts = 12; // Poll for 2 minutes (12 * 10 seconds)
    
    const poll = () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus({
          status: 'failed',
          message: "Payment timeout - please check M-Pesa and try again if needed"
        });
        return;
      }
      
      attempts++;
      setPaymentStatus(prev => ({ ...prev, status: 'checking' }));
      checkStatusMutation.mutate(paymentId);
      
      // Continue polling if payment is still pending
      setTimeout(poll, 10000); // Check every 10 seconds
    };
    
    poll();
  };

  const handlePayment = () => {
    if (!phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    setPaymentStatus({ status: 'initiating' });
    
    initiateMpesaMutation.mutate({
      tenantId,
      unitId,
      amount,
      phoneNumber,
      description
    });
  };

  const resetPaymentState = () => {
    setPaymentStatus({ status: 'idle' });
    setPhoneNumber("");
  };

  const formatPhoneNumber = (value: string) => {
    // Auto-format Kenyan phone numbers
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return `254${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      return `254${cleaned}`;
    }
    
    return cleaned;
  };

  const isProcessing = ['initiating', 'pending', 'checking'].includes(paymentStatus.status);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetPaymentState();
    }}>
      <DialogTrigger asChild>
        <Button 
          className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
          data-testid="mpesa-payment-button"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          {children || "Pay with M-Pesa"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            M-Pesa Payment
          </DialogTitle>
          <DialogDescription>
            Pay KES {amount.toLocaleString()} for {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {paymentStatus.status === 'idle' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                  data-testid="mpesa-phone-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your M-Pesa registered phone number
                </p>
              </div>
              
              <Button 
                onClick={handlePayment}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!phoneNumber || isProcessing}
                data-testid="confirm-mpesa-payment"
              >
                Pay KES {amount.toLocaleString()}
              </Button>
            </div>
          )}
          
          {paymentStatus.status === 'initiating' && (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600 mb-3" />
              <p className="text-sm text-muted-foreground">Initiating payment...</p>
            </div>
          )}
          
          {paymentStatus.status === 'pending' && (
            <div className="text-center py-6">
              <Smartphone className="w-12 h-12 mx-auto text-green-600 mb-3" />
              <p className="font-medium mb-2">Check Your Phone</p>
              <p className="text-sm text-muted-foreground">
                {paymentStatus.message}
              </p>
            </div>
          )}
          
          {paymentStatus.status === 'checking' && (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-sm text-muted-foreground">Verifying payment...</p>
            </div>
          )}
          
          {paymentStatus.status === 'success' && (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-3" />
              <p className="font-medium text-green-600 mb-2">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">
                {paymentStatus.message}
              </p>
            </div>
          )}
          
          {paymentStatus.status === 'failed' && (
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 mx-auto text-red-600 mb-3" />
              <p className="font-medium text-red-600 mb-2">Payment Failed</p>
              <p className="text-sm text-muted-foreground mb-4">
                {paymentStatus.message}
              </p>
              <Button 
                onClick={resetPaymentState}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}