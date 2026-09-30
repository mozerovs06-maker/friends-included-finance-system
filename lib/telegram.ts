import { allocationLabel } from "./domain";
import { employee } from "./employees";
import { markDelivery } from "./repository";
import type { Transaction } from "./types";

async function sendMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot configuration is missing");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );
  if (!response.ok)
    throw new Error(`Telegram delivery failed (${response.status})`);
}

export function submissionMessage(t: Transaction) {
  return t.type === "sale"
    ? `${t.reference} saved — €${(t.amountCents / 100).toFixed(2)} · Project ${t.project} · Pending approval.`
    : `${t.reference} saved — €${(t.amountCents / 100).toFixed(2)} · Proposed ${allocationLabel(t.proposedAllocation)} · ${t.status === "awaiting_allocation" ? "Awaiting allocation" : "Allocated automatically"}.`;
}

export function decisionMessage(t: Transaction) {
  if (t.type === "sale")
    return `${t.reference} approved${t.splitChanged ? " — commission split changed" : ""}. Sale €${(t.amountCents / 100).toFixed(2)}; total commission €${(t.commissionPoolCents / 100).toFixed(2)}. Richard: ${t.approvedSplit?.richard}% (€${(t.commissionRichardCents / 100).toFixed(2)}). Anastasia: ${t.approvedSplit?.anastasia}% (€${(t.commissionAnastasiaCents / 100).toFixed(2)}). Jean-Claude: ${t.approvedSplit?.jeanClaude}% (€${(t.commissionJeanClaudeCents / 100).toFixed(2)}).`;
  return `${t.reference} allocated${t.allocationChanged ? " — allocation changed" : ""}. €${(t.amountCents / 100).toFixed(2)}: ${t.description}. Final allocation: ${allocationLabel(t.finalAllocation)}.`;
}

export async function deliverTelegram(
  t: Transaction,
  kind: "submission" | "decision",
) {
  const chatId = t.originalTelegramChatId;
  const field =
    kind === "submission"
      ? "telegram_submission_status"
      : "telegram_decision_status";
  if (!chatId) {
    await markDelivery(t.reference, { [field]: "not_linked" });
    return;
  }
  try {
    await sendMessage(
      chatId,
      kind === "submission" ? submissionMessage(t) : decisionMessage(t),
    );
    await markDelivery(t.reference, { [field]: "sent", delivery_error: null });
  } catch (error) {
    await markDelivery(t.reference, {
      [field]: "failed",
      delivery_error:
        error instanceof Error ? error.message.slice(0, 500) : "Telegram error",
    });
    throw error;
  }
}

export function statusMessage(transactions: Transaction[]) {
  if (!transactions.length) return "No submissions yet.";
  return transactions
    .slice(0, 8)
    .map(
      (t) =>
        `${t.reference} · €${(t.amountCents / 100).toFixed(2)} · ${t.status.replaceAll("_", " ")} · ${employee(t.submittedByEmployeeId)?.name}`,
    )
    .join("\n");
}
