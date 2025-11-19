import { db } from "./db";
import { auditLog, type InsertAuditLog } from "@shared/schema";
import type { Request } from "express";

export interface AuditLogData {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "SOFT_DELETE" | "RESTORE";
  oldData?: any;
  newData?: any;
  userId?: string;
  reason?: string;
  req?: Request; // For extracting IP and user agent
}

/**
 * Universal audit logging function
 * This logs all critical system actions for transparency and compliance
 */
export async function logAuditAction(data: AuditLogData): Promise<void> {
  try {
    const auditEntry: InsertAuditLog = {
      tableName: data.tableName,
      recordId: data.recordId,
      action: data.action,
      oldData: data.oldData ? JSON.stringify(data.oldData) : null,
      newData: data.newData ? JSON.stringify(data.newData) : null,
      userId: data.userId || null,
      userEmail: data.req?.user?.email || null,
      userRole: data.req?.user?.role || null,
      ipAddress: data.req ? getClientIP(data.req) : null,
      userAgent: data.req?.get('User-Agent') || null,
      reason: data.reason || null,
    };

    await db.insert(auditLog).values(auditEntry);
  } catch (error) {
    console.error("Failed to log audit action:", error);
    // Don't throw - audit logging should never break the main operation
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(req: Request): string | null {
  const forwarded = req.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }
  
  return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Helper function for soft delete operations
 */
export async function logSoftDelete(
  tableName: string,
  recordId: string,
  oldData: any,
  userId: string,
  reason?: string,
  req?: Request
): Promise<void> {
  await logAuditAction({
    tableName,
    recordId,
    action: "SOFT_DELETE",
    oldData,
    userId,
    reason: reason || "Record soft deleted by user",
    req
  });
}

/**
 * Helper function for permanent delete operations (super admin only)
 */
export async function logPermanentDelete(
  tableName: string,
  recordId: string,
  oldData: any,
  userId: string,
  reason?: string,
  req?: Request
): Promise<void> {
  await logAuditAction({
    tableName,
    recordId,
    action: "DELETE",
    oldData,
    userId,
    reason: reason || "Record permanently deleted by super admin",
    req
  });
}

/**
 * Helper function for creation operations
 */
export async function logCreate(
  tableName: string,
  recordId: string,
  newData: any,
  userId?: string,
  req?: Request
): Promise<void> {
  await logAuditAction({
    tableName,
    recordId,
    action: "CREATE",
    newData,
    userId,
    req
  });
}

/**
 * Helper function for update operations
 */
export async function logUpdate(
  tableName: string,
  recordId: string,
  oldData: any,
  newData: any,
  userId?: string,
  req?: Request
): Promise<void> {
  await logAuditAction({
    tableName,
    recordId,
    action: "UPDATE",
    oldData,
    newData,
    userId,
    req
  });
}

/**
 * Helper function to check if user is super admin
 */
export function isSuperAdmin(user: any): boolean {
  return user?.role === 'super_admin';
}

/**
 * Middleware to check super admin permissions for delete operations
 */
export function requireSuperAdmin(req: Request, res: any, next: Function) {
  if (!req.user || !isSuperAdmin(req.user)) {
    return res.status(403).json({ 
      message: "Forbidden", 
      error: "Only super administrators can perform delete operations" 
    });
  }
  next();
}