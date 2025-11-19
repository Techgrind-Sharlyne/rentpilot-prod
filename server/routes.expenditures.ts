import { Router } from "express";
import { db, sql } from "./db";
// Adjust the import path to your Drizzle schema
import * as s from "../shared/schema";
import { and, desc, eq, ilike, isNull, like, or } from "drizzle-orm";

const router = Router();

/**
 * GET /api/expenditures
 * Optional query params: propertyId, category, q
 */
router.get("/expenditures", async (req, res, next) => {
  try {
    const { propertyId, category, q } = req.query as {
      propertyId?: string;
      category?: string;
      q?: string;
    };

    // Build WHERE dynamically
    const conds: any[] = [];
    if (propertyId && propertyId !== "all" && propertyId !== "general" && propertyId !== "property") {
      conds.push(eq(s.expenditures.propertyId, propertyId));
    } else if (propertyId === "general") {
      conds.push(isNull(s.expenditures.propertyId));
    } else if (propertyId === "property") {
      conds.push(sql`${s.expenditures.propertyId} IS NOT NULL`);
    }

    if (category && category !== "all") {
      conds.push(eq(s.expenditures.category, category));
    }

    if (q && q.trim()) {
      const pat = `%${q.trim()}%`;
      conds.push(
        or(ilike(s.expenditures.description, pat), ilike(s.expenditures.recipient, pat))
      );
    }

    const rows = await db
      .select({
        id: s.expenditures.id,
        propertyId: s.expenditures.propertyId,
        category: s.expenditures.category,
        amount: s.expenditures.amount,
        description: s.expenditures.description,
        paymentDate: s.expenditures.paymentDate,
        recipient: s.expenditures.recipient,
        paymentMethod: s.expenditures.paymentMethod,
        recurring: s.expenditures.recurring,
        recurringPeriod: s.expenditures.recurringPeriod,
        nextDueDate: s.expenditures.nextDueDate,
        propertyName: s.properties.name,
      })
      .from(s.expenditures)
      .leftJoin(s.properties, eq(s.properties.id, s.expenditures.propertyId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(s.expenditures.paymentDate), desc(s.expenditures.createdAt))
      .limit(500);

    const data = rows.map((r) => ({
      id: r.id as string,
      propertyId: r.propertyId ?? undefined,
      category: r.category as any,
      amount: Number(r.amount),
      description: r.description as string,
      paymentDate: (r.paymentDate as any as Date)?.toISOString?.().slice(0, 10) ?? (r.paymentDate as any),
      recipient: r.recipient as string,
      paymentMethod: r.paymentMethod as string,
      recurring: Boolean(r.recurring),
      recurringPeriod: (r.recurringPeriod as string) ?? undefined,
      nextDueDate: r.nextDueDate ? (r.nextDueDate as any as Date).toISOString().slice(0, 10) : undefined,
      property: r.propertyName ? { name: r.propertyName } : null,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/expenditures
 * Body: { propertyId?, category, amount, description, paymentDate, recipient, paymentMethod, recurring?, recurringPeriod?, nextDueDate? }
 */
router.post("/expenditures", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    // Basic server-side required fields
    if (!body.category || !body.amount || !body.description || !body.paymentDate || !body.recipient || !body.paymentMethod) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [row] = await db
      .insert(s.expenditures)
      .values({
        id: sql`gen_random_uuid()`,
        propertyId: body.propertyId ?? null,
        category: body.category,
        amount: body.amount,
        description: body.description,
        paymentDate: new Date(body.paymentDate),
        recipient: body.recipient,
        paymentMethod: body.paymentMethod,
        recurring: !!body.recurring,
        recurringPeriod: body.recurring ? body.recurringPeriod ?? null : null,
        nextDueDate: body.recurring && body.nextDueDate ? new Date(body.nextDueDate) : null,
        createdAt: new Date(),
      })
      .returning({
        id: s.expenditures.id,
      });

    return res.status(201).json({ id: row.id });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/expenditures/:id
 */
router.put("/expenditures/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = req.body ?? {};
    const [row] = await db
      .update(s.expenditures)
      .set({
        propertyId: body.propertyId ?? null,
        category: body.category,
        amount: body.amount,
        description: body.description,
        paymentDate: new Date(body.paymentDate),
        recipient: body.recipient,
        paymentMethod: body.paymentMethod,
        recurring: !!body.recurring,
        recurringPeriod: body.recurring ? body.recurringPeriod ?? null : null,
        nextDueDate: body.recurring && body.nextDueDate ? new Date(body.nextDueDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(s.expenditures.id, id))
      .returning({ id: s.expenditures.id });

    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id: row.id });
  } catch (err) {
    next(err);
  }
});

export default router;
