import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, CheckCircle, XCircle, Clock, Trash2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentEvent {
  id: string;
  type: string;
  timestamp: string;
  data: {
    tx_id?: string;
    amount?: number;
    msisdn?: string;
    account?: string;
    status?: string;
    invoice_id?: string;
    tenant_name?: string;
    error?: string;
    [key: string]: any;
  };
}

export function LiveEvents() {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    // Create SSE connection
    const es = new EventSource('/events');
    
    es.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        const newEvent: PaymentEvent = {
          id: crypto.randomUUID(),
          type: eventData.type || 'unknown',
          timestamp: new Date().toISOString(),
          data: eventData.data || eventData,
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
    };

    setEventSource(es);

    // Cleanup on unmount
    return () => {
      es.close();
      setIsConnected(false);
    };
  }, []);

  const clearEvents = () => {
    setEvents([]);
  };

  const reconnect = () => {
    if (eventSource) {
      eventSource.close();
    }
    
    // Recreate connection
    const es = new EventSource('/events');
    es.onopen = () => setIsConnected(true);
    es.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        const newEvent: PaymentEvent = {
          id: crypto.randomUUID(),
          type: eventData.type || 'unknown',
          timestamp: new Date().toISOString(),
          data: eventData.data || eventData,
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 50));
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };
    es.onerror = () => setIsConnected(false);
    setEventSource(es);
  };

  const getEventIcon = (type: string, status?: string) => {
    switch (type) {
      case 'payment.received':
        return status === 'failed' ? XCircle : CheckCircle;
      case 'payment.processing':
        return Clock;
      case 'payment.failed':
        return XCircle;
      default:
        return CreditCard;
    }
  };

  const getEventColor = (type: string, status?: string) => {
    switch (type) {
      case 'payment.received':
        return status === 'failed' ? 'text-red-500' : 'text-green-500';
      case 'payment.processing':
        return 'text-yellow-500';
      case 'payment.failed':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };

  const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'payment.received':
        return 'default';
      case 'payment.processing':
        return 'secondary';
      case 'payment.failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatAmount = (amount?: number) => {
    return amount ? `KES ${amount.toLocaleString()}` : 'N/A';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Live Payment Events
            </CardTitle>
            <CardDescription>
              Real-time payment processing updates
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              disabled={isConnected}
              data-testid="button-reconnect"
            >
              Reconnect
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearEvents}
              data-testid="button-clear-events"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events yet</p>
                <p className="text-sm">Payments will appear here in real-time</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const Icon = getEventIcon(event.type, event.data.status);
                const iconColor = getEventColor(event.type, event.data.status);
                
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    data-testid={`event-${event.type}`}
                  >
                    <Icon className={cn("h-5 w-5 mt-0.5", iconColor)} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getBadgeVariant(event.type)}>
                          {event.type.replace('.', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        {event.data.tx_id && (
                          <p><strong>Transaction:</strong> {event.data.tx_id}</p>
                        )}
                        
                        {event.data.amount && (
                          <p><strong>Amount:</strong> {formatAmount(event.data.amount)}</p>
                        )}
                        
                        {event.data.msisdn && (
                          <p><strong>Phone:</strong> {event.data.msisdn}</p>
                        )}
                        
                        {event.data.account && (
                          <p><strong>Account:</strong> {event.data.account}</p>
                        )}
                        
                        {event.data.tenant_name && (
                          <p><strong>Tenant:</strong> {event.data.tenant_name}</p>
                        )}
                        
                        {event.data.invoice_id && (
                          <p><strong>Invoice:</strong> {event.data.invoice_id}</p>
                        )}
                        
                        {event.data.status && (
                          <p><strong>Status:</strong> 
                            <Badge variant="outline" className="ml-2">
                              {event.data.status}
                            </Badge>
                          </p>
                        )}
                        
                        {event.data.error && (
                          <p className="text-red-600">
                            <strong>Error:</strong> {event.data.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}