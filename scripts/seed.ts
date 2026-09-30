import { serverDb } from "../lib/supabase";
import { employees } from "../lib/employees";
import { homeworkSeed } from "../lib/seed-data";

async function main() {
  const db = serverDb();
  const { error: employeeError } = await db.from("employees").upsert(employees);
  if (employeeError) throw employeeError;
  for (const t of homeworkSeed) {
    const row = {
      reference: t.reference,
      type: t.type,
      source: t.source,
      submitted_by_employee_id: t.submittedByEmployeeId,
      original_telegram_chat_id: t.originalTelegramChatId,
      submitted_at: t.submittedAt,
      description: t.description,
      amount_cents: t.amountCents,
      status: t.status,
      test_record: t.testRecord,
      customer: t.customer,
      project: t.project,
      category: t.category,
      proposed_allocation: t.proposedAllocation,
      final_allocation: t.finalAllocation,
      allocation_changed: t.allocationChanged,
      proposed_split: t.proposedSplit,
      approved_split: t.approvedSplit,
      commission_pool_cents: t.commissionPoolCents,
      commission_richard_cents: t.commissionRichardCents,
      commission_anastasia_cents: t.commissionAnastasiaCents,
      commission_jean_claude_cents: t.commissionJeanClaudeCents,
      split_changed: t.splitChanged,
      approved_by: t.approvedBy,
      approved_at: t.approvedAt,
      sheet_status: "pending",
      telegram_submission_status: "not_linked",
      telegram_decision_status: "not_linked",
    };
    const { error } = await db
      .from("transactions")
      .upsert(row, { onConflict: "reference", ignoreDuplicates: true });
    if (error) throw error;
  }
  console.log(
    "Seed complete: exact S01–S05 and E01–E07 records inserted without resetting existing data.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
