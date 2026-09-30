import { serverDb } from "./supabase";
import type { EmployeeId, Split, Transaction } from "./types";

function toTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    reference: String(row.reference),
    type: row.type as Transaction["type"],
    source: row.source as Transaction["source"],
    submittedByEmployeeId: row.submitted_by_employee_id as EmployeeId,
    originalTelegramChatId: row.original_telegram_chat_id
      ? String(row.original_telegram_chat_id)
      : null,
    submittedAt: String(row.submitted_at),
    description: String(row.description),
    amountCents: Number(row.amount_cents),
    status: row.status as Transaction["status"],
    testRecord: Boolean(row.test_record),
    customer: row.customer ? String(row.customer) : null,
    project: row.project as Transaction["project"],
    category: row.category as Transaction["category"],
    proposedAllocation:
      row.proposed_allocation as Transaction["proposedAllocation"],
    finalAllocation: row.final_allocation as Transaction["finalAllocation"],
    allocationChanged:
      row.allocation_changed == null ? null : Boolean(row.allocation_changed),
    proposedSplit: row.proposed_split as Split | null,
    approvedSplit: row.approved_split as Split | null,
    commissionPoolCents: Number(row.commission_pool_cents ?? 0),
    commissionRichardCents: Number(row.commission_richard_cents ?? 0),
    commissionAnastasiaCents: Number(row.commission_anastasia_cents ?? 0),
    commissionJeanClaudeCents: Number(row.commission_jean_claude_cents ?? 0),
    splitChanged: row.split_changed == null ? null : Boolean(row.split_changed),
    approvedBy: row.approved_by as EmployeeId | null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    sheetStatus: row.sheet_status as Transaction["sheetStatus"],
    sheetRowId: row.sheet_row_id ? String(row.sheet_row_id) : null,
    telegramSubmissionStatus:
      row.telegram_submission_status as Transaction["telegramSubmissionStatus"],
    telegramDecisionStatus:
      row.telegram_decision_status as Transaction["telegramDecisionStatus"],
    deliveryError: row.delivery_error ? String(row.delivery_error) : null,
    deliveryAttempts: Number(row.delivery_attempts ?? 0),
    lastDeliveryAttemptAt: row.last_delivery_attempt_at
      ? String(row.last_delivery_attempt_at)
      : null,
  };
}

export async function listTransactions(actorId: EmployeeId) {
  const db = serverDb();
  let query = db
    .from("transactions")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (actorId !== "svetlana")
    query = query
      .eq("submitted_by_employee_id", actorId)
      .eq("test_record", false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toTransaction(row));
}

export async function createTransaction(row: Record<string, unknown>) {
  const { data, error } = await serverDb()
    .from("transactions")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return toTransaction(data);
}

export async function transactionByReference(reference: string) {
  const { data, error } = await serverDb()
    .from("transactions")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data ? toTransaction(data) : null;
}

export async function decideTransaction(
  reference: string,
  actorId: EmployeeId,
  decision: { split?: Split; allocation?: string },
) {
  const db = serverDb();
  const { data, error } = await db.rpc("decide_transaction", {
    p_reference: reference,
    p_actor_id: actorId,
    p_split: decision.split ?? null,
    p_allocation: decision.allocation ?? null,
  });
  if (error) throw error;
  return toTransaction(data as Record<string, unknown>);
}

export async function telegramLink(userId: string) {
  const { data, error } = await serverDb()
    .from("telegram_links")
    .select("employee_id,current_chat_id")
    .eq("telegram_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { employee_id: EmployeeId; current_chat_id: string } | null;
}

export async function saveTelegramLink(
  userId: string,
  employeeId: EmployeeId,
  chatId: string,
) {
  const { error } = await serverDb().from("telegram_links").upsert(
    {
      telegram_user_id: userId,
      employee_id: employeeId,
      current_chat_id: chatId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );
  if (error) throw error;
}

export async function testTelegramLink(userId: string) {
  const { data, error } = await serverDb()
    .from("test_telegram_links")
    .select("test_role,current_chat_id")
    .eq("telegram_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as {
    test_role: "salesperson" | "expense_reporter";
    current_chat_id: string;
  } | null;
}

export async function saveTestTelegramLink(
  userId: string,
  role: "salesperson" | "expense_reporter",
) {
  const { error } = await serverDb().from("test_telegram_links").upsert(
    {
      telegram_user_id: userId,
      test_role: role,
      current_chat_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );
  if (error) throw error;
}

export async function markDelivery(
  reference: string,
  patch: Record<string, unknown>,
) {
  const { error } = await serverDb()
    .from("transactions")
    .update(patch)
    .eq("reference", reference);
  if (error) throw error;
}
