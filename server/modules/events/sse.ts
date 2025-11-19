import type { Request, Response } from "express";

// Keep track of connected SSE clients
const clients: Response[] = [];

/**
 * Server-Sent Events endpoint handler
 * Establishes connection for real-time payment updates
 */
export function sse(req: Request, res: Response) {
  // Set SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control"
  });

  // Send initial connection confirmation
  res.flushHeaders();
  res.write("event: connected\n");
  res.write("data: {\"message\": \"SSE connection established\"}\n\n");

  // Add client to the list
  clients.push(res);
  console.log(`SSE client connected. Total clients: ${clients.length}`);

  // Handle client disconnect
  req.on("close", () => {
    const index = clients.indexOf(res);
    if (index >= 0) {
      clients.splice(index, 1);
      console.log(`SSE client disconnected. Total clients: ${clients.length}`);
    }
  });

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    if (res.destroyed) {
      clearInterval(heartbeat);
      return;
    }
    res.write("event: heartbeat\n");
    res.write("data: {\"timestamp\": \"" + new Date().toISOString() + "\"}\n\n");
  }, 30000); // Send heartbeat every 30 seconds

  // Clean up heartbeat on connection close
  req.on("close", () => {
    clearInterval(heartbeat);
  });
}

/**
 * Emit Server-Sent Event to all connected clients
 * @param eventType - Type of event (e.g., 'payment.applied')
 * @param data - Event data to send
 */
export function emitSse(eventType: string, data: any) {
  if (clients.length === 0) {
    console.log(`No SSE clients connected to receive event: ${eventType}`);
    return;
  }

  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`Emitting SSE event '${eventType}' to ${clients.length} clients`);

  // Send to all connected clients
  clients.forEach((client, index) => {
    try {
      if (!client.destroyed) {
        client.write(payload);
      } else {
        // Remove dead connections
        clients.splice(index, 1);
      }
    } catch (error) {
      console.error(`Error sending SSE to client ${index}:`, error);
      // Remove problematic client
      clients.splice(index, 1);
    }
  });
}

/**
 * Get count of connected SSE clients
 */
export function getConnectedClientCount(): number {
  return clients.length;
}