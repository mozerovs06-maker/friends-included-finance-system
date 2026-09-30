import { z } from "zod";
import { employee } from "./employees";
import type { Allocation, EmployeeId, Split, Transaction } from "./types";

const reference = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, and hyphens only");
const positiveCents = z.number().int().positive();
const percentage = z.number().min(0).max(100);
export const splitSchema = z
  .object({
    richard: percentage,
    anastasia: percentage,
    jeanClaude: percentage,
  })
  .refine(
    (value) =>
      Math.abs(value.richard + value.anastasia + value.jeanClaude - 100) <
      0.000001,
    "Commission shares must total exactly 100%",
  );

export const saleInputSchema = z.object({
  reference,
  amountCents: positiveCents,
  customer: z.string().trim().min(1).max(200),
  project: z.enum(["A", "B"]),
  description: z.string().trim().min(1).max(1000),
  proposedSplit: splitSchema,
  testRecord: z.boolean().default(false),
});

export const expenseInputSchema = z.object({
  reference,
  amountCents: positiveCents,
  category: z.enum(["Materials", "Travel", "Other"]),
  proposedAllocation: z.enum(["A", "B", "OVERHEAD"]),
  description: z.string().trim().min(1).max(1000),
  testRecord: z.boolean().default(false),
});

export function authorizeSubmission(
  actorId: EmployeeId,
  type: "sale" | "expense",
) {
  const actor = employee(actorId);
  if (!actor?.active) throw new Error("Unknown or inactive employee");
  if (type === "sale" && actor.role !== "salesperson")
    throw new Error("This role cannot submit sales");
  if (type === "expense" && actor.role !== "expense_reporter")
    throw new Error("This role cannot submit expenses");
}

export function authorizeManager(actorId: EmployeeId) {
  if (employee(actorId)?.role !== "manager")
    throw new Error("Manager access required");
}

export function commission(amountCents: number, split: Split) {
  const pool = Math.round(amountCents * 0.1);
  const raw = [
    (pool * split.richard) / 100,
    (pool * split.anastasia) / 100,
    (pool * split.jeanClaude) / 100,
  ];
  const rounded = raw.map(Math.round);
  const delta = pool - rounded.reduce((sum, value) => sum + value, 0);
  const shares = [split.richard, split.anastasia, split.jeanClaude];
  const max = Math.max(...shares);
  const winner = shares.findIndex((share) => share === max);
  rounded[winner] += delta;
  return {
    pool,
    richard: rounded[0],
    anastasia: rounded[1],
    jeanClaude: rounded[2],
  };
}

export function financials(transactions: Transaction[]) {
  const records = transactions.filter((t) => !t.testRecord);
  const approvedSales = records.filter(
    (t) => t.type === "sale" && t.status === "approved",
  );
  const expenses = records.filter((t) => t.type === "expense");
  const projects = (["A", "B"] as const).map((project) => {
    const sales = approvedSales.filter((t) => t.project === project);
    const income = sales.reduce((s, t) => s + t.amountCents, 0);
    const commissions = sales.reduce((s, t) => s + t.commissionPoolCents, 0);
    const allocated = expenses
      .filter((t) => t.finalAllocation === project)
      .reduce((s, t) => s + t.amountCents, 0);
    return {
      project,
      income,
      commissions,
      allocated,
      result: income - commissions - allocated,
    };
  });
  const income = approvedSales.reduce((s, t) => s + t.amountCents, 0);
  const commissions = approvedSales.reduce(
    (s, t) => s + t.commissionPoolCents,
    0,
  );
  const expenseTotal = expenses.reduce((s, t) => s + t.amountCents, 0);
  return {
    projects,
    income,
    commissions,
    expenseTotal,
    result: income - commissions - expenseTotal,
    overhead: expenses
      .filter((t) => t.finalAllocation === "OVERHEAD")
      .reduce((s, t) => s + t.amountCents, 0),
    awaiting: expenses
      .filter((t) => t.status === "awaiting_allocation")
      .reduce((s, t) => s + t.amountCents, 0),
    pendingSales: records
      .filter((t) => t.type === "sale" && t.status === "pending_approval")
      .reduce((s, t) => s + t.amountCents, 0),
    team: {
      richard: approvedSales.reduce((s, t) => s + t.commissionRichardCents, 0),
      anastasia: approvedSales.reduce(
        (s, t) => s + t.commissionAnastasiaCents,
        0,
      ),
      jeanClaude: approvedSales.reduce(
        (s, t) => s + t.commissionJeanClaudeCents,
        0,
      ),
    },
  };
}

export function allocationLabel(value: Allocation | null) {
  return value === "A"
    ? "Respectable Relatives"
    : value === "B"
      ? "Drunk University Friends"
      : value === "OVERHEAD"
        ? "Company overhead"
        : "Awaiting allocation";
}
