// server/modules/payments/receipt.ts
import fs from "node:fs";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generatePaymentReceipt(txId: string): Promise<{ receiptUrl: string }> {
  if (!txId) throw new Error("txId is required");

  // 1) Load payment + basic joins (tenant + unit if present)
  const { rows } = await db.execute(sql`
    SELECT
      p.tx_id, p.amount, p.paid_at, p.method, p.source, p.msisdn,
      p.tenant_id, p.unit_id, p.invoice_id,
      u.first_name, u.last_name,
      un.unit_number
    FROM payments p
    LEFT JOIN users u   ON u.id  = p.tenant_id
    LEFT JOIN units un  ON un.id = p.unit_id
    WHERE p.tx_id = ${txId}
    LIMIT 1
  `);
  const payment = rows?.[0] as any;
  if (!payment) throw new Error(`Payment not found for tx_id=${txId}`);

  // 2) Ensure output folder exists
  const outDir = path.resolve("uploads", "receipts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 3) Build the PDF in-memory
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleSize = 20;
  const textSize = 12;

  let y = 800;
  const draw = (text: string, size = textSize) => {
    page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  // Header
  draw("RENT PILOT - PAYMENT RECEIPT", titleSize);
  y -= 10;

  // Body
  const tenantName =
    (payment.first_name && payment.last_name)
      ? `${payment.first_name} ${payment.last_name}`
      : "—";
  const unitNumber = payment.unit_number ?? "—";

  draw(`Receipt No: RP-${txId}`);
  draw(`Date: ${(payment.paid_at ?? new Date()).toString()}`);
  draw(`Tenant: ${tenantName}`);
  draw(`Unit: ${unitNumber}`);
  draw(`MPesa/MSISDN: ${payment.msisdn ?? "—"}`);
  draw(`Method: ${payment.method ?? "—"}   Source: ${payment.source ?? "—"}`);
  draw(`Invoice ID: ${payment.invoice_id ?? "—"}`);
  y -= 8;
  draw(`Amount: KES ${Number(payment.amount).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`, 14);

  y -= 20;
  draw("Thank you for your payment.");

  const pdfBytes = await pdf.save();

  // 4) Write file and update the DB with a URL we can serve statically
  const filename = `receipt-${txId}.pdf`;
  const filePath = path.join(outDir, filename);
  await writeFile(filePath, pdfBytes);

  const receiptUrl = `/uploads/receipts/${filename}`;
  await db.execute(sql`UPDATE payments SET receipt_url = ${receiptUrl} WHERE tx_id = ${txId}`);

  return { receiptUrl };
}

/**
 * NEW: generate receipt by payment.id (works even when tx_id is null)
 */
export async function generatePaymentReceiptById(paymentId: string): Promise<{ receiptUrl: string }> {
  if (!paymentId) throw new Error("paymentId is required");

  // If this payment already has a tx_id, reuse the existing generator to keep filenames consistent.
  const byId = await db.execute(sql`
    SELECT
      p.id, p.tx_id, p.amount, p.paid_at, p.payment_date, p.method, p.source, p.msisdn,
      p.tenant_id, p.unit_id, p.invoice_id,
      u.first_name, u.last_name,
      un.unit_number
    FROM payments p
    LEFT JOIN users u   ON u.id  = p.tenant_id
    LEFT JOIN units un  ON un.id = p.unit_id
    WHERE p.id = ${paymentId}
    LIMIT 1
  `);
  const payment = byId.rows?.[0] as any;
  if (!payment) throw new Error("Payment not found");

  if (payment.tx_id) {
    return await generatePaymentReceipt(String(payment.tx_id));
  }

  // Ensure output folder exists
  const outDir = path.resolve("uploads", "receipts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Build PDF
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleSize = 20;
  const textSize = 12;

  let y = 800;
  const draw = (text: string, size = textSize) => {
    page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  draw("RENT PILOT - PAYMENT RECEIPT", titleSize);
  y -= 10;

  const tenantName =
    (payment.first_name && payment.last_name)
      ? `${payment.first_name} ${payment.last_name}`
      : "—";
  const unitNumber = payment.unit_number ?? "—";
  const paidDate = payment.paid_at ?? payment.payment_date ?? new Date();
  const safeKey = `MANUAL-${String(payment.id).slice(0, 8)}`;

  draw(`Receipt No: RP-${safeKey}`);
  draw(`Date: ${new Date(paidDate).toString()}`);
  draw(`Tenant: ${tenantName}`);
  draw(`Unit: ${unitNumber}`);
  draw(`MPesa/MSISDN: ${payment.msisdn ?? "—"}`);
  draw(`Method: ${payment.method ?? "—"}   Source: ${payment.source ?? "—"}`);
  draw(`Invoice ID: ${payment.invoice_id ?? "—"}`);
  y -= 8;
  draw(`Amount: KES ${Number(payment.amount).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`, 14);
  y -= 20;
  draw("Thank you for your payment.");

  const pdfBytes = await pdf.save();

  const filename = `receipt-${safeKey}.pdf`;
  const filePath = path.join(outDir, filename);
  await writeFile(filePath, pdfBytes);

  const receiptUrl = `/uploads/receipts/${filename}`;
  await db.execute(sql`UPDATE payments SET receipt_url = ${receiptUrl} WHERE id = ${paymentId}`);

  return { receiptUrl };
}
