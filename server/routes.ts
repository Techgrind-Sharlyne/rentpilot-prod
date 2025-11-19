// server/routes.ts
import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertPropertySchema,
  insertUnitSchema,
  insertUserSchema,
  insertLeaseSchema,
  insertPaymentSchema,
  insertInvoiceSchema,
  insertMaintenanceRequestSchema,
} from "@shared/schema";
import { z } from "zod";
import {
  mpesaService,
  type MPesaPaymentRequest,
  type MPesaCallbackData,
  type MPesaPaybillCallbackData,
} from "./mpesa";
import { smsService } from "./smsService";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { getTenantFinanceSummary } from "./routes.finance-summary";
// ---------------------------------------------------------------------
// registerRoutes
// ---------------------------------------------------------------------
export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ===== Dashboard =====
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get("/api/dashboard/recent-payments", async (_req, res) => {
    try {
      const payments = await storage.getRecentPayments(5);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching recent payments:", error);
      res.status(500).json({ message: "Failed to fetch recent payments" });
    }
  });

  // ===== Summary =====
  app.get("/api/tenants/summary", getTenantFinanceSummary);

  // ===== Properties =====
  app.get("/api/properties", async (_req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) return res.status(404).json({ message: "Property not found" });
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const cleanedData = { ...req.body, zipCode: req.body.zipCode?.trim() || null };
      const validatedData = insertPropertySchema.parse(cleanedData);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(req.params.id, validatedData);
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting property:", error);
      res.status(400).json({ message: error.message || "Failed to delete property" });
    }
  });

  // ===== Units =====
  app.get("/api/units", async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const units = await storage.getUnits(propertyId);
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const unit = await storage.getUnit(req.params.id);
      if (!unit) return res.status(404).json({ message: "Unit not found" });
      res.json(unit);
    } catch (error) {
      console.error("Error fetching unit:", error);
      res.status(500).json({ message: "Failed to fetch unit" });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating unit:", error);
      res.status(500).json({ message: "Failed to create unit" });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(req.params.id, validatedData);
      res.json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      await storage.deleteUnit(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting unit:", error);
      res.status(400).json({ message: error.message || "Failed to delete unit" });
    }
  });

  // ===== Tenants =====
  app.get("/api/tenants", async (_req, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        secondaryPhone,
        idNumber,
        emergencyContactName,
        emergencyContactPhone,
        unitId,
        monthlyRent,
        leaseStartDate,
        leaseEndDate,
        leaseStatus,
        securityDeposit,
        waterDeposit,
        electricityDeposit,
        keyDeposit,
        moveInDate,
        petAllowed,
        specialTerms,
      } = req.body;

      const userData = {
        firstName,
        lastName,
        email,
        phone: phoneNumber,
        alternatePhone: secondaryPhone,
        nationalId: idNumber,
        emergencyContactName,
        emergencyContactPhone,
        role: "tenant" as const,
      };

      const validatedUserData = insertUserSchema.parse(userData);
      const tenant = await storage.createUser(validatedUserData);

      if (unitId) {
        const leaseData = {
          tenantId: tenant.id,
          unitId,
          monthlyRent: monthlyRent || 0,
          securityDeposit: securityDeposit || 0,
          startDate: leaseStartDate ? new Date(leaseStartDate) : new Date(),
          endDate: leaseEndDate ? new Date(leaseEndDate) : null,
          moveInDate: moveInDate ? new Date(moveInDate) : new Date(),
          status: leaseStatus || "active",
          terms: specialTerms,
          petAllowed: petAllowed || false,
        };
        const validatedLeaseData = insertLeaseSchema.parse(leaseData);
        await storage.createLease(validatedLeaseData);

        if (leaseStatus === "active" || !leaseStatus) {
          await storage.updateUnit(unitId, { status: "occupied" });
        }
      }

      res.status(201).json(tenant);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error?.code === "23505" && error?.constraint === "users_email_unique") {
        return res.status(409).json({
          message: "Email already exists",
          error: "A tenant with this email address already exists. Please use a different email address.",
        });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.put("/api/tenants/:id", async (req, res) => {
    try {
      const validatedData = insertUserSchema.partial().parse(req.body);
      const tenant = await storage.updateUser(req.params.id, validatedData);
      res.json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // ===== Leases =====
  app.get("/api/leases", async (_req, res) => {
    try {
      const leases = await storage.getLeases();
      res.json(leases);
    } catch (error) {
      console.error("Error fetching leases:", error);
      res.status(500).json({ message: "Failed to fetch leases" });
    }
  });

  app.get("/api/leases/:id", async (req, res) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      res.json(lease);
    } catch (error) {
      console.error("Error fetching lease:", error);
      res.status(500).json({ message: "Failed to fetch lease" });
    }
  });

  app.post("/api/leases", async (req, res) => {
    try {
      const validatedData = insertLeaseSchema.parse(req.body);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating lease:", error);
      res.status(500).json({ message: "Failed to create lease" });
    }
  });

  app.put("/api/leases/:id", async (req, res) => {
    try {
      const validatedData = insertLeaseSchema.partial().parse(req.body);
      const lease = await storage.updateLease(req.params.id, validatedData);
      res.json(lease);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating lease:", error);
      res.status(500).json({ message: "Failed to update lease" });
    }
  });

  app.delete("/api/leases/:id", async (req, res) => {
    try {
      await storage.deleteLease(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lease:", error);
      res.status(500).json({ message: "Failed to delete lease" });
    }
  });

  // ===== Payments CRUD =====
  app.get("/api/payments", async (_req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      res.json(payment);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.put("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating payment:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      await storage.deletePayment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  // ===== Tenant payment visibility =====
  app.get("/api/tenants/:id/payments", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByTenant(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching tenant payments:", error);
      res.status(500).json({ message: "Failed to fetch tenant payments" });
    }
  });

  app.get("/api/tenants/:id/payment-summary", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.params.id;
      const paymentStatus = await storage.getTenantPaymentStatus(tenantId);
      const arrears = await storage.getArrearsForTenant(tenantId);
      res.json({
        ...paymentStatus,
        arrears,
        balance: paymentStatus.totalDue - paymentStatus.totalPaid,
      });
    } catch (error) {
      console.error("Error fetching payment summary:", error);
      res.status(500).json({ message: "Failed to fetch payment summary" });
    }
  });

  app.get("/api/tenants/rent-status", isAuthenticated, async (_req, res) => {
    try {
      const rentStatus = await storage.getClearedRentStatus();
      res.json(rentStatus);
    } catch (error) {
      console.error("Error fetching rent status:", error);
      res.status(500).json({ message: "Failed to fetch rent status" });
    }
  });

  // ===== SMS =====
  app.post("/api/sms/payment-reminder", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, phoneNumber, tenantName, amount, dueDate } = req.body;
      if (!tenantId || !phoneNumber || !tenantName || !amount || !dueDate) {
        return res.status(400).json({
          message: "Missing required fields: tenantId, phoneNumber, tenantName, amount, dueDate",
        });
      }
      const result = await smsService.sendPaymentReminder(
        phoneNumber,
        tenantName,
        parseFloat(amount),
        new Date(dueDate)
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending payment reminder:", error);
      res.status(500).json({ message: "Failed to send payment reminder" });
    }
  });

  app.post("/api/sms/overdue-notification", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, phoneNumber, tenantName, overdueAmount, daysPastDue } = req.body;
      if (!tenantId || !phoneNumber || !tenantName || !overdueAmount || !daysPastDue) {
        return res.status(400).json({
          message:
            "Missing required fields: tenantId, phoneNumber, tenantName, overdueAmount, daysPastDue",
        });
      }
      const result = await smsService.sendOverdueNotification(
        phoneNumber,
        tenantName,
        parseFloat(overdueAmount),
        parseInt(daysPastDue)
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending overdue notification:", error);
      res.status(500).json({ message: "Failed to send overdue notification" });
    }
  });

  app.post("/api/sms/balance-inquiry", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.body;
      if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

      const tenant = await storage.getTenant(tenantId);
      const paymentStatus = await storage.getTenantPaymentStatus(tenantId);
      if (!tenant || !tenant.phone) {
        return res
          .status(404)
          .json({ message: "Tenant not found or phone number not available" });
      }
      const tenantName = `${tenant.firstName} ${tenant.lastName}`;
      const balance = paymentStatus.totalDue - paymentStatus.totalPaid;

      const result = await smsService.sendBalanceInquiry(
        tenant.phone,
        tenantName,
        paymentStatus.totalPaid,
        paymentStatus.totalDue,
        balance
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending balance inquiry:", error);
      res.status(500).json({ message: "Failed to send balance inquiry" });
    }
  });

  app.post("/api/sms/bulk-reminders", isAuthenticated, async (req, res) => {
    try {
      const { reminderType = "upcoming" } = req.body; // 'upcoming' or 'overdue'
      const rentStatus = await storage.getClearedRentStatus();
      const messages: Array<{ phoneNumber: string; message: string }> = [];

      for (const tenant of rentStatus) {
        if (!tenant.tenantName || !tenant.phone) continue;
        if (reminderType === "overdue" && tenant.status === "overdue" && tenant.arrearsAmount > 0) {
          messages.push({
            phoneNumber: tenant.phone,
            message: `Dear ${tenant.tenantName}, your rent payment of KES ${tenant.arrearsAmount.toLocaleString()} is overdue. Please settle this amount immediately. Contact your landlord for assistance.`,
          });
        } else if (reminderType === "upcoming" && tenant.status === "partial") {
          const remainingAmount = tenant.monthlyRent - tenant.amountPaid;
          messages.push({
            phoneNumber: tenant.phone,
            message: `Hello ${tenant.tenantName}, you have a remaining balance of KES ${remainingAmount.toLocaleString()} for your rent. Please complete your payment. Thank you.`,
          });
        }
      }

      const results = await smsService.sendBulkSMS(messages);
      res.json({
        success: true,
        totalSent: results.filter((r) => r.success).length,
        totalFailed: results.filter((r) => !r.success).length,
        details: results,
      });
    } catch (error) {
      console.error("Error sending bulk reminders:", error);
      res.status(500).json({ message: "Failed to send bulk reminders" });
    }
  });

  // ===== Invoices =====
  app.get("/api/invoices", async (_req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse({
        ...req.body,
        invoiceNumber: `INV-${Date.now()}`,
      });
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // ===== Maintenance =====
  app.get("/api/maintenance-requests", async (_req, res) => {
    try {
      const requests = await storage.getMaintenanceRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ message: "Failed to fetch maintenance requests" });
    }
  });

  app.get("/api/maintenance-requests/:id", async (req, res) => {
    try {
      const request = await storage.getMaintenanceRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Maintenance request not found" });
      res.json(request);
    } catch (error) {
      console.error("Error fetching maintenance request:", error);
      res.status(500).json({ message: "Failed to fetch maintenance request" });
    }
  });

  app.post("/api/maintenance-requests", async (req, res) => {
    try {
      const validatedData = insertMaintenanceRequestSchema.parse(req.body);
      const request = await storage.createMaintenanceRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating maintenance request:", error);
      res.status(500).json({ message: "Failed to create maintenance request" });
    }
  });

  app.put("/api/maintenance-requests/:id", async (req, res) => {
    try {
      const validatedData = insertMaintenanceRequestSchema.partial().parse(req.body);
      const request = await storage.updateMaintenanceRequest(req.params.id, validatedData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating maintenance request:", error);
      res.status(500).json({ message: "Failed to update maintenance request" });
    }
  });

  app.delete("/api/maintenance-requests/:id", async (req, res) => {
    try {
      await storage.deleteMaintenanceRequest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting maintenance request:", error);
      res.status(500).json({ message: "Failed to delete maintenance request" });
    }
  });

  // ===== M-Pesa: STK Push (init & status) =====
  app.post("/api/mpesa/payment", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, unitId, amount, phoneNumber, description } = req.body;
      if (!tenantId || !unitId || !amount || !phoneNumber) {
        return res
          .status(400)
          .json({ message: "Missing required fields: tenantId, unitId, amount, phoneNumber" });
      }

      const paymentData = {
        tenantId,
        unitId,
        amount: parseFloat(amount),
        paymentDate: new Date(),
        dueDate: new Date(),
        paymentMethod: "mpesa" as const,
        status: "pending" as const,
        description: description || "Rent Payment via M-Pesa",
        mpesaPhoneNumber: phoneNumber,
      };
      const payment = await storage.createPayment(paymentData);

      const mpesaRequest: MPesaPaymentRequest = {
        amount: parseFloat(amount),
        phoneNumber,
        accountReference: `RENT-${payment.id.slice(0, 8)}`,
        transactionDesc: description || "Rent Payment",
      };
      const mpesaResponse = await mpesaService.initiateSTKPush(mpesaRequest);

      if (mpesaResponse.ResponseCode === "0") {
        await storage.updatePayment(payment.id, {
          mpesaCheckoutRequestId: mpesaResponse.CheckoutRequestID,
        });
        res.json({
          success: true,
          message: "Payment request sent to your phone. Please enter your M-Pesa PIN.",
          paymentId: payment.id,
          checkoutRequestId: mpesaResponse.CheckoutRequestID,
        });
      } else {
        await storage.updatePayment(payment.id, {
          status: "failed",
          notes: mpesaResponse.ResponseDescription || "M-Pesa request failed",
        });
        res.status(400).json({
          success: false,
          message: mpesaResponse.ResponseDescription || "Failed to initiate payment",
        });
      }
    } catch (error) {
      console.error("Error initiating M-Pesa payment:", error);
      res.status(500).json({ success: false, message: "Failed to initiate M-Pesa payment" });
    }
  });

  app.get("/api/mpesa/status/:paymentId", isAuthenticated, async (req, res) => {
    try {
      const { paymentId } = req.params;
      const payment = await storage.getPaymentById(paymentId);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      if (!payment.mpesaCheckoutRequestId) {
        return res.status(400).json({ message: "No M-Pesa request found for this payment" });
      }

      const statusResponse = await mpesaService.querySTKPushStatus(
        payment.mpesaCheckoutRequestId
      );

      if (statusResponse.ResultCode === "0") {
        await storage.updatePayment(paymentId, {
          status: "paid",
          paymentDate: new Date(),
          notes: "Payment confirmed via M-Pesa",
        });
      } else if (statusResponse.ResultCode === "1032") {
        await storage.updatePayment(paymentId, {
          status: "failed",
          notes: "Payment cancelled by user",
        });
      }

      res.json({
        status: payment.status,
        mpesaStatus: statusResponse.ResultDesc,
        resultCode: statusResponse.ResultCode,
      });
    } catch (error) {
      console.error("Error checking M-Pesa status:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // ===== M-Pesa: STK Callback =====
  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const callbackData: MPesaCallbackData = req.body.Body.stkCallback;
      const { CheckoutRequestID } = callbackData;

      const payment = await storage.getPaymentByCheckoutRequestId(CheckoutRequestID);
      if (!payment) {
        console.log("Payment not found for checkout request ID:", CheckoutRequestID);
        return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      const result = mpesaService.processCallback(callbackData);

      if (result.success) {
        await storage.updatePayment(payment.id, {
          status: "paid",
          paymentDate: new Date(),
          mpesaTransactionId: result.transactionId,
          mpesaReceiptNumber: result.receiptNumber,
          transactionId: result.transactionId,
          notes: `M-Pesa payment successful. Receipt: ${result.receiptNumber}`,
        });

        try {
          const tenant = await storage.getTenant(payment.tenantId);
          if (tenant && tenant.phone) {
            const tenantName = `${tenant.firstName} ${tenant.lastName}`;
            await smsService.sendPaymentConfirmation(
              tenant.phone,
              tenantName,
              Number(payment.amount),
              result.receiptNumber
            );
          }
        } catch (smsError) {
          console.error("Failed to send SMS confirmation:", smsError);
        }
      } else {
        await storage.updatePayment(payment.id, {
          status: "failed",
          notes: `M-Pesa payment failed: ${callbackData.ResultDesc}`,
        });
      }

      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
      console.error("Error processing M-Pesa callback:", error);
      res.json({ ResultCode: 1, ResultDesc: "Failed" });
    }
  });

  // ===== 🔑 M-Pesa: Paybill callback (shared handler on two paths) =====
  const handlePaybillCallback: RequestHandler = async (req, res) => {
    try {
      console.log("Paybill callback received:", JSON.stringify(req.body, null, 2));

      const callbackData: MPesaPaybillCallbackData = req.body;
      const result = mpesaService.processPaybillCallback(callbackData);

      if (!result.success) {
        console.log("Paybill callback processing failed");
        return res.status(200).json({ ResultCode: 1, ResultDesc: "Failed to process callback" });
      }

      const tenantData = await storage.findTenantByPhoneOrReference(
        result.phoneNumber,
        result.accountReference
      );

      if (!tenantData) {
        console.log(
          `No tenant found for phone ${result.phoneNumber} or reference ${result.accountReference}`
        );
        // Always return 0 to avoid Daraja retries
        return res
          .status(200)
          .json({ ResultCode: 0, ResultDesc: "Payment received but no matching tenant found" });
      }

      await storage.createPaybillPayment({
        tenantId: tenantData.tenant.id,
        unitId: tenantData.unit.id,
        amount: result.amount,
        phoneNumber: result.phoneNumber,
        transactionId: result.transactionId,
        accountReference: result.accountReference,
      });

      console.log(
        `Automatic payment recorded for ${tenantData.tenant.firstName} ${tenantData.tenant.lastName}, Amount: KSh ${result.amount}`
      );

      return res.status(200).json({ ResultCode: 0, ResultDesc: "Payment processed successfully" });
    } catch (error) {
      console.error("Error processing M-Pesa paybill callback:", error);
      // Return success to avoid M-Pesa retries for our internal errors
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Callback received" });
    }
  };

  app.post("/api/mpesa/paybill-callback", handlePaybillCallback);
  app.post("/api/webhooks/paybill-callback", handlePaybillCallback);

  // ===== Payment insights =====
  app.get("/api/payments/rent-status", isAuthenticated, async (_req, res) => {
    try {
      const rentStatus = await storage.getClearedRentStatus();
      res.json(rentStatus);
    } catch (error) {
      console.error("Error fetching rent status:", error);
      res.status(500).json({ message: "Failed to fetch rent status" });
    }
  });

  app.get("/api/payments/overdue", isAuthenticated, async (_req, res) => {
    try {
      const overduePayments = await storage.getOverduePayments();
      res.json(overduePayments);
    } catch (error) {
      console.error("Error fetching overdue payments:", error);
      res.status(500).json({ message: "Failed to fetch overdue payments" });
    }
  });

  app.get("/api/payments/tenant-status/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const paymentStatus = await storage.getTenantPaymentStatus(req.params.tenantId);
      res.json(paymentStatus);
    } catch (error) {
      console.error("Error fetching tenant payment status:", error);
      res.status(500).json({ message: "Failed to fetch tenant payment status" });
    }
  });

  app.post("/api/mpesa/manual-payment", isAuthenticated, async (req, res) => {
    try {
      const { tenantId, amount, description = "Rent payment" } = req.body;
      if (!tenantId || !amount) {
        return res.status(400).json({ message: "Tenant ID and amount are required" });
      }

      const tenant = await storage.getUser(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      if (!tenant.phone) return res.status(400).json({ message: "Tenant phone number not found" });

      const tenantDetails = await storage.getTenant(tenantId);
      if (!tenantDetails?.currentLease) {
        return res.status(400).json({ message: "No active lease found for tenant" });
      }

      const payment = await storage.createPayment({
        tenantId,
        unitId: tenantDetails.currentLease.unitId,
        amount: amount.toString(),
        paymentDate: new Date(),
        dueDate: new Date(),
        paymentMethod: "mpesa" as const,
        status: "pending" as const,
        description,
        mpesaPhoneNumber: tenant.phone,
      });

      const mpesaRequest: MPesaPaymentRequest = {
        amount: Number(amount),
        phoneNumber: tenant.phone,
        accountReference: tenantDetails.currentLease.unit?.unitNumber || tenantId,
        transactionDesc: description,
      };

      const mpesaResponse = await mpesaService.initiateSTKPush(mpesaRequest);

      if (mpesaResponse.ResponseCode === "0") {
        await storage.updatePayment(payment.id, {
          mpesaCheckoutRequestId: mpesaResponse.CheckoutRequestID,
        });
        res.json({
          success: true,
          message: "STK push sent successfully",
          paymentId: payment.id,
          checkoutRequestId: mpesaResponse.CheckoutRequestID,
        });
      } else {
        await storage.updatePayment(payment.id, {
          status: "failed" as const,
          notes: mpesaResponse.ResponseDescription || "M-Pesa request failed",
        });
        res.status(400).json({
          success: false,
          message: mpesaResponse.ResponseDescription || "Failed to initiate payment",
        });
      }
    } catch (error) {
      console.error("Error initiating manual M-Pesa payment:", error);
      res.status(500).json({ message: "Failed to initiate payment" });
    }
  });

  // ===== Expenditures =====
  app.get("/api/expenditures", async (req, res) => {
    try {
      const { propertyId, category } = req.query;
      const expenditures = await storage.getExpenditures(
        propertyId as string,
        category as string
      );
      res.json(expenditures);
    } catch (error) {
      console.error("Error fetching expenditures:", error);
      res.status(500).json({ message: "Failed to fetch expenditures" });
    }
  });

  app.get("/api/expenditures/:id", async (req, res) => {
    try {
      const expenditure = await storage.getExpenditure(req.params.id);
      if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
      res.json(expenditure);
    } catch (error) {
      console.error("Error fetching expenditure:", error);
      res.status(500).json({ message: "Failed to fetch expenditure" });
    }
  });

  app.post("/api/expenditures", async (req, res) => {
    try {
      const expenditureData = {
        ...req.body,
        amount: parseFloat(req.body.amount),
        recurring: Boolean(req.body.recurring),
        paymentDate: new Date(req.body.paymentDate),
        nextDueDate: req.body.nextDueDate ? new Date(req.body.nextDueDate) : undefined,
      };
      const expenditure = await storage.createExpenditure(expenditureData);
      res.status(201).json(expenditure);
    } catch (error) {
      console.error("Error creating expenditure:", error);
      res.status(500).json({ message: "Failed to create expenditure" });
    }
  });

  app.put("/api/expenditures/:id", async (req, res) => {
    try {
      const expenditureData = {
        ...req.body,
        amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
        recurring: req.body.recurring !== undefined ? Boolean(req.body.recurring) : undefined,
      };
      const expenditure = await storage.updateExpenditure(req.params.id, expenditureData);
      if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
      res.json(expenditure);
    } catch (error) {
      console.error("Error updating expenditure:", error);
      res.status(500).json({ message: "Failed to update expenditure" });
    }
  });

  app.delete("/api/expenditures/:id", async (req, res) => {
    try {
      await storage.deleteExpenditure(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expenditure:", error);
      res.status(500).json({ message: "Failed to delete expenditure" });
    }
  });

  app.get("/api/expenditures/analytics/summary", async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      const analytics = await storage.getExpenditureAnalytics(
        propertyId as string,
        startDate as string,
        endDate as string
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching expenditure analytics:", error);
      res.status(500).json({ message: "Failed to fetch expenditure analytics" });
    }
  });

  // ===== Simulation & SSE =====
  const { mpesaMockC2B } = await import("./modules/payments/mock");
  const { sse } = await import("./modules/events/sse");

  app.get("/events", sse);
  app.post("/mock/mpesa/c2b", mpesaMockC2B);

  app.get("/api/tenants/:id/invoices", async (req, res) => {
    try {
      const { status } = req.query;
      const invoices = await storage.getTenantInvoices(req.params.id, status as string);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching tenant invoices:", error);
      res.status(500).json({ message: "Failed to fetch tenant invoices" });
    }
  });

  // ===== Static files (PDFs etc.) =====
  app.use("/uploads", (await import("express")).default.static(path.resolve("uploads")));

  // ===== Receipts & Invoice PDFs =====
  app.post("/api/payments/id/:paymentId/receipt", async (req, res) => {
    try {
      const { paymentId } = req.params as any;
      const found = await db.execute(sql`SELECT tx_id FROM payments WHERE id = ${paymentId} LIMIT 1`);
      const row = found.rows?.[0] as any;
      if (!row) return res.status(404).json({ message: "Payment not found" });

      if (row.tx_id) {
        const { generatePaymentReceipt } = await import("./modules/payments/receipt");
        const r = await generatePaymentReceipt(String(row.tx_id));
        return res.json({ ok: true, receiptUrl: r.receiptUrl });
      }

      const { generatePaymentReceiptById } = await import("./modules/payments/receipt");
      const r = await generatePaymentReceiptById(paymentId);
      res.json({ ok: true, receiptUrl: r.receiptUrl });
    } catch (e: any) {
      console.error("POST /api/payments/id/:paymentId/receipt failed", e);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  app.get("/api/payments/:txId/receipt.pdf", async (req, res) => {
    try {
      const { txId } = req.params as any;
      const { rows } = await db.execute(sql`
        SELECT p.id, p.tx_id, p.amount, p.paid_at, p.method, p.source, p.msisdn,
               p.tenant_id, p.unit_id, p.invoice_id,
               u.first_name, u.last_name, un.unit_number
        FROM payments p
        LEFT JOIN users u  ON u.id  = p.tenant_id
        LEFT JOIN units un ON un.id = p.unit_id
        WHERE p.tx_id = ${txId}
        LIMIT 1
      `);
      const p = rows?.[0] as any;
      if (!p) return res.status(404).json({ message: "Payment not found" });

      const bytes = await (async function renderReceiptPDF() {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595.28, 841.89]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        let y = 800;
        const draw = (t: string, s = 12) => {
          page.drawText(t, { x: 50, y, size: s, font, color: rgb(0, 0, 0) });
          y -= s + 6;
        };
        draw("RENT PILOT - PAYMENT RECEIPT", 20);
        y -= 10;
        draw(`Receipt No: RP-${(p.tx_id ?? p.id).toString().slice(0, 18)}`);
        draw(`Date: ${p.paid_at ? new Date(p.paid_at).toString() : new Date().toString()}`);
        draw(`Tenant: ${p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : "—"}`);
        draw(`Unit: ${p.unit_number ?? "—"}`);
        draw(`Method: ${p.method ?? "—"}   Source: ${p.source ?? "—"}`);
        draw(`MPesa/MSISDN: ${p.msisdn ?? "—"}`);
        draw(`Invoice ID: ${p.invoice_id ?? "—"}`);
        y -= 8;
        draw(
          `Amount: KES ${Number(p.amount ?? 0).toLocaleString("en-KE", {
            maximumFractionDigits: 2,
          })}`,
          14
        );
        y -= 20;
        draw("Thank you for your payment.");
        return await pdf.save();
      })();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="receipt-${p.tx_id || p.id}.pdf"`);
      res.send(Buffer.from(bytes));
    } catch (e) {
      console.error("GET /api/payments/:txId/receipt.pdf failed", e);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  app.get("/api/payments/id/:paymentId/receipt.pdf", async (req, res) => {
    try {
      const { paymentId } = req.params as any;
      const { rows } = await db.execute(sql`
        SELECT p.id, p.tx_id, p.amount, p.paid_at, p.method, p.source, p.msisdn,
               p.tenant_id, p.unit_id, p.invoice_id,
               u.first_name, u.last_name, un.unit_number
        FROM payments p
        LEFT JOIN users u  ON u.id  = p.tenant_id
        LEFT JOIN units un ON un.id = p.unit_id
        WHERE p.id = ${paymentId}
        LIMIT 1
      `);
      const p = rows?.[0] as any;
      if (!p) return res.status(404).json({ message: "Payment not found" });

      const bytes = await (async function renderReceiptPDF() {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595.28, 841.89]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        let y = 800;
        const draw = (t: string, s = 12) => {
          page.drawText(t, { x: 50, y, size: s, font, color: rgb(0, 0, 0) });
          y -= s + 6;
        };
        draw("RENT PILOT - PAYMENT RECEIPT", 20);
        y -= 10;
        draw(`Receipt No: RP-${(p.tx_id ?? p.id).toString().slice(0, 18)}`);
        draw(`Date: ${p.paid_at ? new Date(p.paid_at).toString() : new Date().toString()}`);
        draw(`Tenant: ${p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : "—"}`);
        draw(`Unit: ${p.unit_number ?? "—"}`);
        draw(`Method: ${p.method ?? "—"}   Source: ${p.source ?? "—"}`);
        draw(`MPesa/MSISDN: ${p.msisdn ?? "—"}`);
        draw(`Invoice ID: ${p.invoice_id ?? "—"}`);
        y -= 8;
        draw(
          `Amount: KES ${Number(p.amount ?? 0).toLocaleString("en-KE", {
            maximumFractionDigits: 2,
          })}`,
          14
        );
        y -= 20;
        draw("Thank you for your payment.");
        return await pdf.save();
      })();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="receipt-${p.id}.pdf"`);
      res.send(Buffer.from(bytes));
    } catch (e) {
      console.error("GET /api/payments/id/:paymentId/receipt.pdf failed", e);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params as any;
      const { rows } = await db.execute(sql`
        SELECT i.id, i.invoice_number, i.amount, i.description,
               i.period_month, i.period_year, i.issue_date, i.due_date,
               u.first_name, u.last_name, u.email, un.unit_number
        FROM invoices i
        LEFT JOIN users u  ON u.id  = i.tenant_id
        LEFT JOIN units un ON un.id = i.unit_id
        WHERE i.id = ${id}
        LIMIT 1
      `);
      const inv = rows?.[0] as any;
      if (!inv) return res.status(404).json({ message: "Invoice not found" });

      const bytes = await (async function renderInvoicePDF() {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595.28, 841.89]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        let y = 800;
        const draw = (t: string, s = 12) => {
          page.drawText(t, { x: 50, y, size: s, font, color: rgb(0, 0, 0) });
          y -= s + 6;
        };
        const invNo = inv.invoice_number || `INV-${String(inv.id).slice(0, 8)}`;
        draw("RENT PILOT - INVOICE", 20);
        y -= 10;
        draw(`Invoice No: ${invNo}`);
        draw(`Issue Date: ${inv.issue_date ? new Date(inv.issue_date).toDateString() : "—"}`);
        draw(`Due Date: ${inv.due_date ? new Date(inv.due_date).toDateString() : "—"}`);
        draw(`Tenant: ${[inv.first_name, inv.last_name].filter(Boolean).join(" ") || "—"}`);
        draw(`Email: ${inv.email || "—"}`);
        draw(`Unit: ${inv.unit_number || "—"}`);
        draw(`Period: ${(inv.period_month ?? "—")}/${inv.period_year ?? "—"}`);
        y -= 8;
        draw(
          `Amount: KES ${Number(inv.amount).toLocaleString("en-KE", {
            maximumFractionDigits: 2,
          })}`,
          14
        );
        if (inv.description) {
          y -= 12;
          draw("Description:");
          const desc = String(inv.description);
          (desc.match(/.{1,80}(\s|$)/g) || [desc]).forEach((line: string) => draw(line.trim()));
        }
        return await pdf.save();
      })();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="invoice-${id}.pdf"`);
      res.send(Buffer.from(bytes));
    } catch (e) {
      console.error("GET /api/invoices/:id/pdf failed", e);
      res.status(500).json({ message: "Failed to generate invoice PDF" });
    }
  });

  // ===== Invoice allocations / apply-payment =====
  app.get("/api/invoices/:id/allocations", async (req, res) => {
    try {
      const { id } = req.params as any;
      const rows = (
        await db.execute(sql`
          WITH allocs AS (
            SELECT
              p.tx_id,
              p.paid_at,
              p.receipt_url,
              pa.amount AS applied_amount,
              p.amount  AS payment_amount
            FROM payment_applications pa
            JOIN payments p ON p.id = pa.payment_id
            WHERE pa.invoice_id = ${id}
          )
          SELECT * FROM allocs
          UNION ALL
          SELECT p.tx_id, p.paid_at, p.receipt_url, p.amount AS applied_amount, p.amount AS payment_amount
          FROM payments p
          WHERE p.invoice_id = ${id}
            AND NOT EXISTS (
              SELECT 1 FROM payment_applications pa2 WHERE pa2.payment_id = p.id
            )
          ORDER BY paid_at DESC NULLS LAST
          LIMIT 200
        `)
      ).rows;

      res.json(rows ?? []);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to load allocations" });
    }
  });

  app.post("/api/invoices/:id/apply-payment", async (req, res) => {
    try {
      const { id: invoiceId } = req.params as any;
      const { paymentId, amount } = req.body as { paymentId: string; amount?: number };
      if (!paymentId) return res.status(400).json({ message: "paymentId is required" });

      const invRes = await db.execute(
        sql`SELECT id, amount FROM invoices WHERE id = ${invoiceId} LIMIT 1`
      );
      const invoice = invRes.rows?.[0] as any;
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const payRes = await db.execute(
        sql`SELECT id, amount FROM payments WHERE id = ${paymentId} LIMIT 1`
      );
      const payment = payRes.rows?.[0] as any;
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      const applyAmount = Number(amount ?? payment.amount ?? 0);
      if (!(applyAmount > 0)) return res.status(400).json({ message: "Invalid amount" });

      await db.execute(sql`
        INSERT INTO payment_applications (payment_id, invoice_id, amount)
        VALUES (${paymentId}, ${invoiceId}, ${applyAmount})
        ON CONFLICT DO NOTHING
      `);

      await db.execute(sql`
        UPDATE payments SET invoice_id = COALESCE(invoice_id, ${invoiceId})
        WHERE id = ${paymentId}
      `);

      const sumRes = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM payment_applications
        WHERE invoice_id = ${invoiceId}
      `);
      const totalApplied = Number((sumRes.rows?.[0] as any)?.total ?? 0);

      if (totalApplied >= Number(invoice.amount)) {
        await db.execute(
          sql`UPDATE invoices SET status = 'paid', updated_at = now() WHERE id = ${invoiceId}`
        );
      }

      res.json({ ok: true, totalApplied });
    } catch (e: any) {
      console.error("POST /api/invoices/:id/apply-payment failed", e);
      res.status(500).json({ message: "Failed to apply payment" });
    }
  });

  // ---- finalize server ----
  const httpServer = createServer(app);
  return httpServer;
}
