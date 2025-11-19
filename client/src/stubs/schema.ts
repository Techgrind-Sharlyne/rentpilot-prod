import { z } from "zod";
export const insertInvoiceSchema = z.object({});
export const invoiceSchema = insertInvoiceSchema;
export type Invoice = z.infer<typeof insertInvoiceSchema>;
