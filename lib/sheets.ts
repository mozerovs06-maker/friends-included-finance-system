import { google } from "googleapis";
import { employee } from "./employees";
import { allocationLabel } from "./domain";
import { markDelivery } from "./repository";
import type { Transaction } from "./types";

function sheetsClient() {
  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "null",
  );
  if (!credentials || !process.env.GOOGLE_SHEET_ID)
    throw new Error("Google Sheets configuration is missing");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function saleRow(t: Transaction) {
  return [
    t.reference,
    t.submittedAt,
    t.source,
    employee(t.submittedByEmployeeId)?.name,
    t.customer,
    t.project,
    t.description,
    t.amountCents / 100,
    t.proposedSplit?.richard,
    t.proposedSplit?.anastasia,
    t.proposedSplit?.jeanClaude,
    t.approvedSplit?.richard ?? "",
    t.approvedSplit?.anastasia ?? "",
    t.approvedSplit?.jeanClaude ?? "",
    t.commissionRichardCents / 100,
    t.commissionAnastasiaCents / 100,
    t.commissionJeanClaudeCents / 100,
    t.commissionPoolCents / 100,
    t.status,
    t.approvedAt ?? "",
  ];
}

function expenseRow(t: Transaction) {
  return [
    t.reference,
    t.submittedAt,
    t.source,
    employee(t.submittedByEmployeeId)?.name,
    t.description,
    t.category,
    t.amountCents / 100,
    allocationLabel(t.proposedAllocation),
    allocationLabel(t.finalAllocation),
    t.status,
    t.approvedAt ?? "",
  ];
}

function publicTestRow(t: Transaction) {
  return [
    t.type,
    t.reference,
    t.submittedAt,
    t.source,
    employee(t.submittedByEmployeeId)?.name,
    t.description,
    t.amountCents / 100,
    t.customer ?? "",
    t.project ?? "",
    t.category ?? "",
    allocationLabel(t.proposedAllocation),
    allocationLabel(t.finalAllocation),
    t.proposedSplit?.richard ?? "",
    t.proposedSplit?.anastasia ?? "",
    t.proposedSplit?.jeanClaude ?? "",
    t.approvedSplit?.richard ?? "",
    t.approvedSplit?.anastasia ?? "",
    t.approvedSplit?.jeanClaude ?? "",
    t.commissionRichardCents / 100,
    t.commissionAnastasiaCents / 100,
    t.commissionJeanClaudeCents / 100,
    t.commissionPoolCents / 100,
    t.status,
    t.approvedAt ?? "",
  ];
}

export async function syncSheet(t: Transaction) {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const tab = t.testRecord
    ? "Public Tests"
    : t.type === "sale"
      ? "Sales"
      : "Expenses";
  const values = [t.testRecord ? publicTestRow(t) : saleOrExpense(t)];
  try {
    const lookup = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab}'!${t.testRecord ? "B:B" : "A:A"}`,
    });
    const row =
      (lookup.data.values ?? []).findIndex(
        (value) => value[0] === t.reference,
      ) + 1;
    const target = row > 0 ? row : (lookup.data.values?.length ?? 0) + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab}'!A${target}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    await markDelivery(t.reference, {
      sheet_status: "sent",
      sheet_row_id: `${tab}!${target}`,
      delivery_error: null,
      last_delivery_attempt_at: new Date().toISOString(),
    });
  } catch (error) {
    await markDelivery(t.reference, {
      sheet_status: "failed",
      delivery_error:
        error instanceof Error ? error.message.slice(0, 500) : "Sheets error",
      last_delivery_attempt_at: new Date().toISOString(),
    });
    throw error;
  }
}

function saleOrExpense(t: Transaction) {
  return t.type === "sale" ? saleRow(t) : expenseRow(t);
}
