import {
  authorizeManager,
  authorizeSubmission,
  expenseInputSchema,
  saleInputSchema,
  splitSchema,
} from "./domain";
import {
  createTransaction,
  decideTransaction,
  transactionByReference,
} from "./repository";
import type { Allocation, EmployeeId, Split, Transaction } from "./types";

type Context = {
  actorId: EmployeeId;
  source: "website" | "telegram";
  telegramChatId?: string | null;
};

export async function submitSale(context: Context, input: unknown) {
  authorizeSubmission(context.actorId, "sale");
  const value = saleInputSchema.parse(input);
  if (await transactionByReference(value.reference))
    throw new Error("Reference already exists");
  return createTransaction({
    reference: value.reference.toUpperCase(),
    type: "sale",
    source: context.source,
    submitted_by_employee_id: context.actorId,
    original_telegram_chat_id: context.telegramChatId ?? null,
    description: value.description,
    amount_cents: value.amountCents,
    status: "pending_approval",
    test_record: value.testRecord,
    customer: value.customer,
    project: value.project,
    proposed_split: value.proposedSplit,
    sheet_status: "pending",
    telegram_submission_status: context.telegramChatId
      ? "pending"
      : "not_linked",
    telegram_decision_status: "pending",
  });
}

export async function submitExpense(context: Context, input: unknown) {
  authorizeSubmission(context.actorId, "expense");
  const value = expenseInputSchema.parse(input);
  if (await transactionByReference(value.reference))
    throw new Error("Reference already exists");
  const automatic = value.proposedAllocation === "OVERHEAD";
  return createTransaction({
    reference: value.reference.toUpperCase(),
    type: "expense",
    source: context.source,
    submitted_by_employee_id: context.actorId,
    original_telegram_chat_id: context.telegramChatId ?? null,
    description: value.description,
    amount_cents: value.amountCents,
    status: automatic ? "allocated_automatically" : "awaiting_allocation",
    test_record: value.testRecord,
    category: value.category,
    proposed_allocation: value.proposedAllocation,
    final_allocation: automatic ? "OVERHEAD" : null,
    sheet_status: "pending",
    telegram_submission_status: context.telegramChatId
      ? "pending"
      : "not_linked",
    telegram_decision_status: automatic ? "not_linked" : "pending",
  });
}

export async function approveSale(
  actorId: EmployeeId,
  reference: string,
  split: Split,
) {
  authorizeManager(actorId);
  splitSchema.parse(split);
  const current = await transactionByReference(reference);
  if (!current || current.type !== "sale") throw new Error("Sale not found");
  if (current.status === "approved") return current;
  return decideTransaction(reference, actorId, { split });
}

export async function allocateExpense(
  actorId: EmployeeId,
  reference: string,
  allocation: Allocation,
) {
  authorizeManager(actorId);
  const current = await transactionByReference(reference);
  if (!current || current.type !== "expense")
    throw new Error("Expense not found");
  if (current.status !== "awaiting_allocation") return current;
  return decideTransaction(reference, actorId, { allocation });
}

export function publicError(error: unknown) {
  if (
    error instanceof Error &&
    /(required|cannot|must|exists|not found|positive|total)/i.test(
      error.message,
    )
  )
    return error.message;
  return "The request could not be completed";
}

export function isPending(transaction: Transaction) {
  return (
    transaction.status === "pending_approval" ||
    transaction.status === "awaiting_allocation"
  );
}
