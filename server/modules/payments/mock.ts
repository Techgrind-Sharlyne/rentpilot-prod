import type { Request, Response } from "express";
import axios from "axios";

export async function mpesaMockC2B(req: Request, res: Response) {
  console.log("[Mock C2B] Headers:", req.headers);
  console.log("[Mock C2B] Raw body:", req.body);
  
  const p = req.body || {};
  
  // Validate required fields
  if (!p.tx_id || !p.amount || !p.msisdn) {
    console.log("[Mock C2B] Validation failed:", { tx_id: p.tx_id, amount: p.amount, msisdn: p.msisdn });
    return res.status(400).json({ 
      ok: false, 
      error: "Missing required fields: tx_id, amount, msisdn",
      received: { tx_id: p.tx_id, amount: p.amount, msisdn: p.msisdn }
    });
  }

  try {
    // Prepare payload for internal webhook
    const payload = {
      idempotency_key: `mpesa::${p.tx_id}`,
      tx_id: p.tx_id,
      provider: "mpesa-mock",
      amount: Number(p.amount),
      msisdn: p.msisdn,
      account: p.account,
      paid_at: p.paid_at || new Date().toISOString(),
      meta: p.meta || { narration: "Simulated rent payment" },
      invoice_id: p.invoice_id
    };

    // Get the base URL for internal webhook call
    const baseUrl = process.env.APP_BASE_URL || 
                   `${req.protocol}://${req.get('host')}` || 
                   "http://localhost:5000";

    // Call our own webhook endpoint
    const response = await axios.post(`${baseUrl}/webhooks/mpesa`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'REMS-Mock-Client/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`Mock M-Pesa C2B processed: ${p.tx_id} -> ${response.status}`);
    
    res.json(response.data);
  } catch (error: any) {
    console.error("Mock C2B error:", error.message);
    
    if (error.response) {
      // Forward the error response from webhook
      res.status(error.response.status).json(error.response.data);
    } else {
      // Network or other error
      res.status(500).json({ 
        ok: false, 
        error: "MOCK_C2B_FAILED",
        details: error.message 
      });
    }
  }
}